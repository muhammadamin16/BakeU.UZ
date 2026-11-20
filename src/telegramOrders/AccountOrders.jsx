import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { discoverGoApi, createGoTransport, pinGoAccount } from "./transport.js";
import { createWebsiteOrdersClient } from "./client.js";
import ServerOrdersPanel from "./ServerOrdersPanel.jsx";
import ServerNotifications from "./ServerNotifications.jsx";
import DeliveryFields from "./DeliveryFields.jsx";
import { goAccount as sharedGoAccount, goAPIBase, goPhoneAccountsEnabled } from "../api/goAccount.js";
import "./orders.css";
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
    : "https://bakeuuz-production.up.railway.app/api")
).trim();
function CatalogCheckout({ transport, client, onCreated, productId }) {
  const [catalog, setCatalog] = useState({
      products: [],
      markets: [],
      error: "",
    }),
    [qty, setQty] = useState(() => productId ? { [productId]: 1 } : {}),
    [choices, setChoices] = useState({}),
    [variants, setVariants] = useState({}),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [attempt, setAttempt] = useState(() => crypto.randomUUID());
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
  const selected = catalog.products.filter((p) => qty[p.id] > 0);
  const groups = catalog.markets.filter((m) =>
    selected.some((p) => p.sellerId === m.sellerId),
  );
  const update = () => {
    setSaved(false);
    setAttempt(crypto.randomUUID());
    setError("");
  };
  return (
    <form
      className="tg-orders-panel"
      onSubmit={async (e) => {
        e.preventDefault();
        if (busy) return;
        setBusy(true);
        setError("");
        try {
          const deliveries = Object.fromEntries(
            groups.map((m) => [
              m.id,
              choices[m.id] || {
                fulfillment: m.fulfillment === "pickup" ? "pickup" : "delivery",
              },
            ]),
          );
          await client.checkout({
            items: selected.map((p) => ({ productId: p.id, qty: qty[p.id], ...(variants[p.id] ? { variantId: variants[p.id] } : {}) })),
            deliveries,
            requestId: attempt,
          });
          setQty({});
          setChoices({});
          setVariants({});
          setAttempt(crypto.randomUUID());
          setSaved(true);
          onCreated();
        } catch (failure) {
          setError(failure.message || "Заказ не сохранён.");
        } finally {
          setBusy(false);
        }
      }}
    >
      <fieldset disabled={busy}>
        <h2>Оформить заказ</h2>
        <p>
          Выберите товары. Оплата и стоимость доставки согласуются с продавцом.
        </p>
        {catalog.error && <p role="alert">{catalog.error}</p>}
        {catalog.products.map((p) => (
          <div
            key={p.id}
            style={{
              display: "flex",
              gap: 12,
              alignItems: "center",
              margin: "12px 0",
            }}
          >
            {p.imageURLs?.[0] && (
              <img
                src={new URL(p.imageURLs[0], transport.base).href}
                width="64"
                height="64"
                alt={p.title}
                style={{ objectFit: "cover", borderRadius: 14 }}
              />
            )}
            <span>
              {p.title} · {Number(p.variants?.find((v) => v.id === variants[p.id])?.price ?? p.price).toLocaleString("ru-RU")} сум
            </span>
            {p.variants?.some((variant) => variant.id) && <select aria-label={"Вариант: " + p.title} value={variants[p.id] || ""} disabled={busy} onChange={(event) => { setVariants({ ...variants, [p.id]: event.target.value }); update(); }}>
              <option value="">Базовый вариант — {Number(p.price).toLocaleString("ru-RU")} сум</option>
              {p.variants.filter((variant) => variant.id).map((variant) => <option key={variant.id} value={variant.id}>{variant.name} — {Number(variant.price).toLocaleString("ru-RU")} сум</option>)}
            </select>}
            <input
              aria-label={"Количество: " + p.title}
              type="number"
              min="0"
              max="1000"
              value={qty[p.id] || 0}
              disabled={busy}
              onChange={(e) => {
                setQty({ ...qty, [p.id]: Number(e.target.value) });
                update();
              }}
            />
          </div>
        ))}
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
function ConnectedAccount({ transport, challenge, productId }) {
  const [account, setAccount] = useState(null),
    [email, setEmail] = useState(""),
    [password, setPassword] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [confirmed, setConfirmed] = useState(false),
    [revision, setRevision] = useState(0);
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
    () => createWebsiteOrdersClient(pinned.request),
    [pinned],
  );

  return (
    <div className="tg-orders-panel">
      <h1>{challenge ? "Подтверждение Telegram" : "Мои заказы BakeU"}</h1>
      {!account && goPhoneAccountsEnabled && <p><Link to="/login">Войти по подтверждённому телефону</Link> · <Link to="/register">Создать аккаунт</Link></p>}
      {restoring && <p role="status">Восстанавливаем сессию…</p>}
      {!account && !restoring && (
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            if (busy) return;
            setBusy(true);
            setError("");
            try {
              const user = await transport.login(email, password);
              if (challenge) {
                await client.confirmLink(challenge, password);
                setConfirmed(true);
              }
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
          {account.role === "seller" && transport.shared && (
            <Suspense fallback={<p>Загрузка настроек…</p>}>
              <SellerSettings accountApi={sellerApi} />
            </Suspense>
          )}
          <ServerOrdersPanel
            client={client}
            sessionKey={account.uid + ":" + revision}
            transitionsEnabled
          />
          <ServerNotifications
            client={client}
            sessionKey={account.uid + ":" + revision}
          />
          {account.role === "customer" && (
            <CatalogCheckout
              key={account.uid + ":" + productId}
              productId={productId}
              client={client}
              transport={pinned}
              onCreated={() => setRevision((v) => v + 1)}
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
