import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { discoverGoApi, createGoTransport, pinGoAccount } from "./transport.js";
import { createWebsiteOrdersClient } from "./client.js";
import { createServerCart, includesSavedCart, lineKey, restoreCart } from "./serverCart.js";
import { useCartStore } from "../store/cartStore.js";
import { planGuestImport } from "./guestCart.js";
import GuestCart from "./GuestCart.jsx";
import ServerOrdersPanel from "./ServerOrdersPanel.jsx";
import ServerNotifications from "./ServerNotifications.jsx";
import DeliveryFields from "./DeliveryFields.jsx";
import { goAccount as sharedGoAccount, goAPIBase, goPhoneAccountsEnabled } from "../api/goAccount.js";
import "./orders.css";
import SellerSummary from "./SellerSummary.jsx";
import { translateText as t } from "../i18n/index.js";
const OpenOwnShop = lazy(() => import("./OpenOwnShop.jsx"));
const MarketModeration = lazy(() => import("./MarketModeration.jsx"));
const configured = (
  goAPIBase ||
  import.meta.env.VITE_GO_BACKEND_URL ||
  ""
).trim();
const SellerSettings = lazy(
  () => import("../pages/Profile/seller/ServerStorefront.jsx"),
);
const botBase = (
  import.meta.env.VITE_ACCOUNT_API_URL ||
  (import.meta.env.DEV
    ? "/api"
    : "https://bakeu-bot-production.up.railway.app/api")
).trim();
function CatalogCheckout({ transport, client, onCreated, productId }) {
  const [catalog, setCatalog] = useState({
      products: [],
      markets: [],
      error: "",
    }),
    [qty, setQty] = useState(() => productId ? { [lineKey(productId)]: 1 } : {}),
    [choices, setChoices] = useState({}),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const cart = useMemo(() => createServerCart(transport.request), [transport]);
  const [savedCart, setSavedCart] = useState(null);
  const savedLines = savedCart?.items;
  const [loadingCart, setLoadingCart] = useState(true);
  const [cartNotice, setCartNotice] = useState("");
  const [needsCartReview, setNeedsCartReview] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    cart.load(controller.signal).then((snapshot) => {
      if (!controller.signal.aborted) setSavedCart(snapshot);
    }).catch((failure) => {
      if (!controller.signal.aborted) setCartNotice(failure.message || "Не удалось загрузить корзину.");
    }).finally(() => {
      if (!controller.signal.aborted) setLoadingCart(false);
    });
    return () => controller.abort();
  }, [cart]);
  async function changeCart(action, line) {
    setBusy(true);
    setCartNotice("");
    try {
      if (action !== "load" && !savedCart) throw Error("Сначала обновите корзину.");
      const snapshot = action === "load" ? await cart.load() : await cart[action](line, savedCart.revision);
      setSavedCart(snapshot);
      if (!snapshot.items.length) setNeedsCartReview(false);
      setCartNotice("Серверная корзина обновлена.");
    } catch (failure) {
      if (failure.status === 409) {
        setSavedCart(null);
        setCartNotice("Корзина изменилась на другом устройстве. Обновите её и повторите действие.");
      } else {
        setCartNotice(failure.message || "Не удалось обновить корзину.");
      }
    } finally {
      setBusy(false);
    }
  }

  const guestItems = useCartStore((state) => state.items);
  const guestProducts = useCartStore((state) => state.products);
  async function importGuestCart() {
    setBusy(true);
    let imported = 0;
    try {
      let snapshot = await cart.load();
      const { lines, skipped } = planGuestImport(guestItems, guestProducts, catalog.products, snapshot.items);
      for (const line of lines) {
        snapshot = await cart.save(line, snapshot.revision);
        imported++;
        setSavedCart(snapshot);
      }
      setSavedCart(snapshot);
      setCartNotice(`Добавлено: ${imported}. Пропущено: ${skipped}. Гостевая корзина сохранена отдельно.`);
    } catch (error) {
      setCartNotice(`Добавлено: ${imported}. ${error.status === 409 ? "Корзина изменилась. Повторите перенос." : error.message}`);
    } finally {
      setBusy(false);
    }
  }
  const attempt = useRef(null);
  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    (async () => {
      try {
        const products = await transport.request("/products", {
          signal: controller.signal,
        });
        const markets = [];
        let after = "";
        do {
          const result = await transport.request(
            "/markets?limit=100&after=" + encodeURIComponent(after),
            { signal: controller.signal },
          );
          markets.push(...result.items);
          after = result.next || "";
        } while (after && markets.length < 10000);
        if (active)
          setCatalog({
            products: Array.isArray(products) ? products.filter((product) => product.available) : [],
            markets,
            error: "",
          });
      } catch {
        if (active)
          setCatalog({
            products: [],
            markets: [],
            error: "Не удалось загрузить товары.",
          });
      }
    })();
    return () => {
      active = false;
      controller.abort();
    };
  }, [transport]);
  const rows = catalog.products.flatMap((product) => [
    { product, variant: null, key: lineKey(product.id) },
    ...(product.variants || []).filter(({ id }) => id).map((variant) => ({
      product, variant, key: lineKey(product.id, variant.id),
    })),
  ]);
  const selected = rows.filter(({ key }) => qty[key] > 0);
  const groups = catalog.markets.filter((market) =>
    selected.some(({ product }) => product.sellerId === market.sellerId),
  );
  const update = () => {
    setSaved(false);
    attempt.current = null;
    setError("");
  };
  return (
    <form
      className="tg-orders-panel"
      onSubmit={async (e) => {
        e.preventDefault();
        if (busy) return;
        if (needsCartReview) {
          setError("Проверьте сохранённые позиции перед оформлением.");
          return;
        }
        setBusy(true);
        setError("");
        try {
          if (!attempt.current) {
            const items = selected.map(({ product, variant, key }) => ({
              productId: product.id,
              variantId: variant?.id || "",
              qty: qty[key],
            }));
            const latestCart = await cart.load();
            setSavedCart(latestCart);
            if (!includesSavedCart(latestCart.items, items)) {
              throw Error("Корзина изменилась. Загрузите её в оформление или обновите сохранённые позиции.");
            }
            const deliveries = Object.fromEntries(groups.map((market) => [
              market.id, choices[market.id] || {
                fulfillment: market.fulfillment === "pickup" ? "pickup" : "delivery",
              },
            ]));
            attempt.current = { items, deliveries, requestId: crypto.randomUUID(), cartRevision: latestCart.revision };
          }
          await client.checkout(attempt.current);
          setQty({});
          setChoices({});
          attempt.current = null;
          setSavedCart(null);
          await cart.load().then(setSavedCart).catch(() => setCartNotice("Обновите корзину, чтобы загрузить актуальные позиции."));
          setSaved(true);
          onCreated();
        } catch (failure) {
          if (failure.status === 409) {
            attempt.current = null;
            setError("Корзина или заказ изменились. Обновите корзину перед повторной отправкой.");
          } else {
            setError(failure.message || "Заказ не сохранён.");
          }
        } finally {
          setBusy(false);
        }
      }}
    >
      <fieldset disabled={busy || loadingCart}>
        <h2>Оформить заказ</h2>
        <p>
          Выберите товары. Оплата и стоимость доставки согласуются с продавцом.
        </p>
        {catalog.error && <p role="alert">{catalog.error}</p>}
        <section aria-label="Серверная корзина">
          <h3>Сохранённая корзина</h3>
          {Object.keys(guestItems).length > 0 && (
            <button type="button" disabled={!catalog.products.length} onClick={importGuestCart}>
              Добавить доступные позиции из гостевой корзины
            </button>
          )}
          {cartNotice && <p role="status">{cartNotice}</p>}
          <button type="button" onClick={() => changeCart("load")}>Обновить корзину</button>
          {savedLines?.length === 0 && <p>Сохранённых товаров пока нет.</p>}
          {savedLines?.length > 0 && (
            <>
              <button type="button" disabled={!catalog.products.length} onClick={() => {
                const restored = restoreCart(savedLines, catalog.products);
                setQty(restored.qty);
                setChoices({});
                setNeedsCartReview(restored.skipped.length > 0);
                setCartNotice(restored.skipped.length ? "В корзине есть недоступные или повторяющиеся позиции. Удалите лишние строки и загрузите корзину снова." : "Корзина загружена.");
                update();
              }}>Загрузить в оформление</button>
              <ul>
                {savedLines.map((line) => {
                  const product = catalog.products.find(({ id }) => id === line.productId);
                  const variant = product?.variants?.find(({ id }) => id === line.variantId);
                  return (
                    <li key={JSON.stringify([line.productId, line.variantId])}>
                      {product?.title || "Недоступный товар"}{line.variantId ? ` · ${variant?.name || "Недоступный вариант"}` : ""} × {line.qty}
                      {" "}<button type="button" onClick={() => changeCart("remove", line)}>Убрать из корзины</button>
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </section>

        {rows.map(({ product, variant, key }) => {
          const label = variant ? `${product.title} · ${variant.name}` : product.title;
          return (
            <div key={key} className="tg-orders-line">
              {!variant && product.imageURLs?.[0] && (
                <img src={new URL(product.imageURLs[0], transport.base).href}
                  width="64" height="64" alt={product.title} />
              )}
              <label>
                {label} · {Number(variant?.price ?? product.price).toLocaleString("ru-RU")} сум
                <input aria-label={`Количество: ${label}`} type="number" min="0" max="1000"
                  value={qty[key] || 0} onChange={(event) => {
                    setQty({ ...qty, [key]: Number(event.target.value) });
                    update();
                  }} />
              </label>
              <button type="button" disabled={!savedCart || !qty[key]}
                onClick={() => changeCart("save", { productId: product.id, variantId: variant?.id || "", qty: qty[key] })}>
                Сохранить в корзине
              </button>
            </div>
          );
        })}
        {!catalog.error && !catalog.products.length && <p>Товаров пока нет.</p>}
        {groups.map((m) => (
          <section key={m.id}>
            <h3>{m.name}</h3>
            <p>{m.address}</p>
            <DeliveryFields
              value={
                choices[m.id] || {
                  fulfillment:
                    m.fulfillment === "pickup" ? "pickup" : "delivery",
                }
              }
              pickupAvailable={m.fulfillment !== "delivery"}
              deliveryAvailable={m.fulfillment !== "pickup"}
              onChange={(value) => {
                if (busy) return;
                setChoices({ ...choices, [m.id]: value });
                update();
              }}
            />
          </section>
        ))}
        {saved && <p role="status">Заказ сохранён. Он появится в истории заказов.</p>}
        {error && <p role="alert">{error}</p>}
        <button disabled={busy || !selected.length || groups.length === 0}>
          {busy ? "Сохраняем заказ…" : "Оформить заказ"}
        </button>
      </fieldset>
    </form>
  );
}
function ConnectedAccount({ transport, challenge, productId, orderId }) {
  const [account, setAccount] = useState(null),
    [email, setEmail] = useState(""),
    [password, setPassword] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [confirmed, setConfirmed] = useState(false),
    [revision, setRevision] = useState(0);
  const [ordersAudience, setOrdersAudience] = useState("auto");
  const [restoring, setRestoring] = useState(() => transport.shared && !challenge);
  useEffect(() => {
    if (!transport.shared || challenge) return;
    const controller = new AbortController();
    transport.request("/me", { signal: controller.signal }).then((user) => {
      if (!controller.signal.aborted && user?.uid && ["customer", "seller"].includes(user.role)) {
        setAccount(user);
      }
    }).catch((failure) => {
      if (!controller.signal.aborted && failure.status !== 401) {
        setError(failure.message || "Не удалось восстановить сессию.");
      }
    }).finally(() => {
      if (!controller.signal.aborted) setRestoring(false);
    });
    return () => controller.abort();
  }, [transport, challenge]);
  const uid = account?.uid,
    role = account?.role;
  const pinned = useMemo(
    () => pinGoAccount(transport, uid, role),
    [transport, uid, role],
  );
  const sellerApi = useMemo(() => ({
    request: (path, method, body) => pinned.request(path, { method, body }),
    requestWithOptions: pinned.request,
    login: transport.login,
    logout: transport.logout,
  }), [pinned, transport]);
  const client = useMemo(
    () => createWebsiteOrdersClient(pinned.request, { audience: ordersAudience }),
    [pinned, ordersAudience],
  );
  const buyerClient = useMemo(() => createWebsiteOrdersClient(pinned.request, { audience: "buyer" }), [pinned]);

  return (
    <div className="tg-orders-panel">
      <h1>{challenge ? "Подтверждение Telegram" : "Мои заказы BakeU"}</h1>
      {!account && goPhoneAccountsEnabled && <p><Link to="/login">Войти по подтверждённому телефону</Link> · <Link to="/register">Создать аккаунт</Link></p>}
      {restoring && <p role="status">Восстанавливаем сессию…</p>}
      {!challenge && !account && !restoring && goPhoneAccountsEnabled && <GuestCart />}
      {!account && !restoring && (
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            if (busy) return;
            setBusy(true);
            setError("");
            try {
              const logged = await transport.login(email, password);
              if (challenge) {
                await createWebsiteOrdersClient(pinGoAccount(transport, logged.uid, logged.role).request).confirmLink(challenge, password);
                setConfirmed(true);
              }
              const user = await transport.request("/me", { headers: { "X-BakeU-Account": logged.uid } });
              if (user.uid !== logged.uid) throw new Error("Сессия изменилась. Войдите снова.");
              setAccount(user);
            } catch (failure) {
              await transport.logout().catch(() => {});
              setError(failure.message || "Войти не удалось.");
            } finally {
              setPassword("");
              setBusy(false);
            }
          }}
        >
          <p>
            Войдите в существующий аккаунт BakeU. Привязка не создаёт аккаунт и
            не объединяет пользователей по номеру телефона.
          </p>
          <label>
            Email
            <input
              type="email"
              autoComplete="username"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>
          <label>
            Пароль
            <input
              type="password"
              autoComplete="current-password"
              maxLength={72}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>
          <button disabled={busy}>
            {busy
              ? "Проверяем…"
              : challenge
                ? "Войти и привязать Telegram"
                : "Войти"}
          </button>
        </form>
      )}
      {error && <p role="alert">{error}</p>}
      {confirmed && (
        <p role="status">
          Telegram успешно привязан. Вернитесь в бот и нажмите «Мои заказы» или
          «Я продавец».
        </p>
      )}
      {account && (
        <>
          <p>{account.name}</p>
          <button
            onClick={async () => {
              await transport.logout().catch(() => {});
              setAccount(null);
              setConfirmed(false);
            }}
          >
            Выйти
          </button>
          <ServerProfile
            key={account.uid}
            account={account}
            transport={pinned}
            onSaved={setAccount}
          />
          {account.capabilities?.openShop && <Suspense fallback={<p>Загрузка…</p>}><OpenOwnShop key={account.uid} account={account} transport={pinned} onOpened={async () => {
            const fresh = await transport.request("/me", { headers: { "X-BakeU-Account": account.uid } });
            if (fresh.uid !== account.uid || fresh.role !== "seller") throw new Error("Сессия изменилась. Обновите страницу.");
            setAccount(fresh);
          }} /></Suspense>}
          {account.capabilities?.admin && <Suspense fallback={<p>Загрузка…</p>}><MarketModeration transport={pinned} /></Suspense>}
          {account.role === "seller" && <SellerSummary transport={pinned} />}
          {account.role === "seller" && transport.shared && !account.capabilities?.openShop && (
            <Suspense fallback={<p>Загрузка настроек…</p>}>
              <SellerSettings accountApi={sellerApi} />
            </Suspense>
          )}
          {account.role === "seller" && <div role="group" aria-label={t("Раздел заказов")}><button type="button" onClick={() => setOrdersAudience("buyer")}>{t("Мои покупки")}</button><button type="button" onClick={() => setOrdersAudience("seller")}>{t("Заказы моего магазина")}</button></div>}
          <ServerOrdersPanel
            client={client}
            sessionKey={account.uid + ":" + ordersAudience + ":" + revision}
            transitionsEnabled
            orderId={orderId}
          />
          <ServerNotifications
            client={client}
            sessionKey={account.uid + ":" + revision}
          />
          {["customer", "seller"].includes(account.role) && (
            <CatalogCheckout
              key={account.uid + ":" + productId}
              productId={productId}
              client={buyerClient}
              transport={pinned}
              onCreated={() => { setOrdersAudience("buyer"); setRevision((v) => v + 1); }}
            />
          )}
        </>
      )}
    </div>
  );
}
function ServerProfile({ account, transport, onSaved }) {
  const [form, setForm] = useState({
      name: account.name || "",
      phone: account.phone || "",
      address: account.address || "",
    }),
    [busy, setBusy] = useState(false),
    [status, setStatus] = useState("");
  return (
    <details>
      <summary>Настройки профиля</summary>
      {account.verifiedPhoneE164 && <p>Подтверждённый номер аккаунта: <strong>{account.verifiedPhoneE164}</strong>. Телефон ниже — контакт для заказов.</p>}
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          if (busy) return;
          setBusy(true);
          setStatus("");
          try {
            const user = await transport.request("/profile", {
              method: "POST",
              body: form,
            });
            onSaved(user);
            setStatus("Профиль сохранён.");
          } catch (error) {
            setStatus(error.message || "Сохранить не удалось.");
          } finally {
            setBusy(false);
          }
        }}
      >
        <fieldset disabled={busy}>
          {["name", "phone", "address"].map((key, index) => (
            <label key={key}>
              {["Имя", "Телефон", "Адрес"][index]}
              <input
                required={key !== "address"}
                value={form[key]}
                maxLength={key === "address" ? 500 : 150}
                onChange={(e) => setForm({ ...form, [key]: e.target.value })}
              />
            </label>
          ))}
          <button>Сохранить</button>
        </fieldset>
        {status && <p role="status">{status}</p>}
      </form>
    </details>
  );
}
export default function AccountOrders() {
  const [params] = useSearchParams();
  const challenge = params.get("challenge") || "";
  const orderId = params.get("order") || "";
  const requestedProduct = params.get("product") || "";
  const productId = /^[A-Za-z0-9_-]{1,36}$/.test(requestedProduct) ? requestedProduct : "";
  const [connection, setConnection] = useState({
    transport: null,
    error: "",
    loading: true,
  });
  useEffect(() => {
    let active = true;
    discoverGoApi({ configured, botBase })
      .then((base) => {
        const transport =
          sharedGoAccount && goAPIBase
            ? {
                base,
                shared: true,
                request: sharedGoAccount.requestWithOptions,
                login: sharedGoAccount.login,
                logout: sharedGoAccount.logout,
              }
            : createGoTransport(base, {
                browserSession:
                  import.meta.env.VITE_GO_BROWSER_SESSIONS === "true",
              });
        transport.base = base;
        if (active) setConnection({ transport, error: "", loading: false });
      })
      .catch((error) => {
        if (active)
          setConnection({
            transport: null,
            error: error.message,
            loading: false,
          });
      });
    return () => {
      active = false;
    };
  }, []);
  return (
    <div style={{ maxWidth: 960, margin: "24px auto", paddingBottom: 100 }}>
      <Link to="/">← На главную</Link>
      {connection.loading && <p role="status">Подключаемся…</p>}
      {connection.error && <p role="alert">{connection.error}</p>}
      {connection.transport && (
        <ConnectedAccount
          key={challenge}
          transport={connection.transport}
          challenge={challenge}
          productId={productId}
          orderId={orderId}
        />
      )}
    </div>
  );
}

export function ServerStorefront() {
  const id = window.location.hash.split("?")[0].split("/shop/")[1] || "";
  const [state, setState] = useState({
    market: null,
    products: [],
    base: "",
    error: "",
  });
  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    (async () => {
      try {
        if (!/^[a-f0-9]{24}$/.test(id)) throw new Error("Магазин не найден.");
        const base = await discoverGoApi({ configured, botBase });
        const api = createGoTransport(base);
        const market = await api.request("/markets/" + id, {
          signal: controller.signal,
        });
        const products = await api.request(
          "/products?seller=" + encodeURIComponent(market.sellerId),
          { signal: controller.signal },
        );
        if (active)
          setState({
            market,
            products: Array.isArray(products) ? products.filter((product) => product.available) : [],
            base,
            error: "",
          });
      } catch (error) {
        if (active)
          setState({
            market: null,
            products: [],
            base: "",
            error: error.message,
          });
      }
    })();
    return () => {
      active = false;
      controller.abort();
    };
  }, [id]);
  return (
    <main
      className="tg-orders-panel"
      style={{ maxWidth: 960, margin: "24px auto" }}
    >
      <Link to="/">← На главную</Link>
      {state.error && <p role="alert">{state.error}</p>}
      {state.market && (
        <>
          <h1>{state.market.name}</h1>
          <p>{state.market.description}</p>
          <p>
            {state.market.address ||
              [state.market.city, state.market.area].filter(Boolean).join(", ")}
          </p>
          {state.products
            .filter((p) => p.sellerId === state.market.sellerId)
            .map((p) => (
              <article key={p.id}>
                {p.imageURLs?.[0] && (
                  <img
                    src={new URL(p.imageURLs[0], state.base).href}
                    width="100"
                    height="100"
                    alt={p.title}
                  />
                )}
                <h2>{p.title}</h2>
                <p>{p.description}</p>
                <strong>{Number(p.price).toLocaleString("ru-RU")} сум</strong>
              </article>
            ))}
          <Link to={"/account/orders?shop=" + id}>
            Выбрать товары и оформить заказ
          </Link>
        </>
      )}
    </main>
  );
}
