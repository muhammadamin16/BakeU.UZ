import { useLayoutEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Clock3,
  MapPin,
  ShoppingBag,
  Store,
  UserRound,
} from "lucide-react";
import { useCartStore } from "../../store/cartStore";
import { submitCheckout } from "../../store/workspaceStore";
import { getSessionProfile } from "../../store/session";
import { accountId } from "../../store/localAccount";
import { useCatalog } from "../../store/sellerData";
import {
  checkoutGroups,
  checkoutMoney,
  emptySchedule,
  groupSignature,
  localDay,
} from "../../store/checkout";
import ProductImage from "../../components/ProductImage/ProductImage";
import SellerContact from "./SellerContact";
import "./Checkout.css";

const DRAFT_KEY = "bakeu-checkout-draft-v1";
function initialDraft(account) {
  const defaults = {
    checkoutId: crypto.randomUUID(),
    name: [account?.firstName, account?.lastName].filter(Boolean).join(" "),
    phone: account?.phone || "",
    address: account?.addresses?.[0] || "",
    sellers: {},
  };
  try {
    const saved = JSON.parse(sessionStorage.getItem(DRAFT_KEY) || "null");
    if (
      saved &&
      (!saved.buyerId || saved.buyerId === (account && accountId(account)))
    )
      return {
        ...defaults,
        ...saved,
        name: saved.name || defaults.name,
        phone: saved.phone || defaults.phone,
      };
  } catch {
    /* An unavailable draft must not prevent checkout. */
  }
  return defaults;
}

export default function Checkout() {
  const navigate = useNavigate();
  const cart = useCartStore();
  const { products: catalog, shops } = useCatalog();
  const [account] = useState(getSessionProfile);
  const [draft, setDraft] = useState(() => initialDraft(account));
  const [error, setError] = useState("");
  const [draftError, setDraftError] = useState("");
  const [busy, setBusy] = useState(false);
  const submitting = useRef(false);
  const errorRef = useRef(null);
  const { groups, issues } = checkoutGroups(cart, catalog, shops);
  const total = groups.reduce((n, g) => n + g.total, 0);
  const agreed = groups.filter((g) => {
    const schedule = draft.sellers[g.shop.id] || emptySchedule();
    return schedule.agreedFor === groupSignature(g, schedule);
  }).length;
  const delivery = groups.some(
    (g) => draft.sellers[g.shop.id]?.method === "delivery",
  );
  useLayoutEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, []);

  function update(patch) {
    const next = {
      ...draft,
      ...patch,
      buyerId: account ? accountId(account) : undefined,
    };
    try {
      sessionStorage.setItem(DRAFT_KEY, JSON.stringify(next));
      setDraftError("");
    } catch {
      setDraftError(
        "Черновик не сохраняется в этой вкладке. Не закрывайте страницу до оформления.",
      );
    }
    setDraft(next);
    setError("");
  }
  function updateSeller(id, patch) {
    update({
      sellers: {
        ...draft.sellers,
        [id]: { ...emptySchedule(), ...draft.sellers[id], ...patch },
      },
    });
  }
  function submit(event) {
    event.preventDefault();
    if (submitting.current) return;
    submitting.current = true;
    setBusy(true);
    try {
      const currentAccount = getSessionProfile();
      if (
        !currentAccount ||
        !account ||
        accountId(currentAccount) !== accountId(account)
      )
        throw Error(
          "Сессия изменилась. Обновите страницу и войдите в свой аккаунт.",
        );
      const orders = submitCheckout(
        currentAccount,
        useCartStore.getState(),
        draft,
        catalog,
        shops,
        draft.checkoutId,
      );
      let cartKept = false;
      try {
        useCartStore.getState().consume(
          orders.flatMap((o) => o.items),
          draft.checkoutId,
        );
      } catch {
        cartKept = true;
      }
      try {
        sessionStorage.removeItem(DRAFT_KEY);
      } catch {
        /* The saved checkout ID prevents duplicates. */
      }
      navigate(
        "/orders/" + orders[0].checkoutId + (cartKept ? "?cart=kept" : ""),
        { replace: true },
      );
    } catch (failure) {
      setError(
        failure.message || "Не удалось сохранить заявку. Попробуйте ещё раз.",
      );
      submitting.current = false;
      setBusy(false);
      requestAnimationFrame(() => errorRef.current?.focus());
    }
  }
  return (
    <div className="ck-page">
      <Link to="/cart" className="ck-back">
        <ArrowLeft size={17} />В корзину
      </Link>
      <header className="ck-page-heading">
        <span className="ck-eyebrow">ВАША ВЫПЕЧКА · ВАШЕ ВРЕМЯ</span>
        <h1>Оформление заказа</h1>
        <p>
          Свяжитесь с каждым продавцом и согласуйте детали. Мы разделим корзину
          на отдельные заявки.
        </p>
      </header>
      {!Object.keys(cart.items).length ? (
        <section className="ck-card ck-empty">
          <ShoppingBag size={36} />
          <h2>В корзине пока пусто</h2>
          <p>Выберите выпечку, чтобы оформить заказ.</p>
          <Link className="ck-button primary" to="/">
            Выбрать вкусное
            <ArrowRight size={17} />
          </Link>
          <Link className="ck-button" to="/orders">
            Мои заказы
          </Link>
        </section>
      ) : (
        <form className="ck-layout" onSubmit={submit} noValidate>
          <div className="ck-main">
            <section className="ck-card">
              <div className="ck-step-heading">
                <span>1</span>
                <div>
                  <h2>Ваши контакты</h2>
                  <p>Продавец сможет уточнить детали по этому номеру.</p>
                </div>
                <UserRound size={21} />
              </div>
              {!account && (
                <p className="ck-notice">
                  Можно проверить заказ и связаться с продавцами сейчас. Для
                  сохранения заявки{" "}
                  <Link to="/login?next=%2Fcheckout">войдите</Link> или{" "}
                  <Link to="/register?next=%2Fcheckout">создайте аккаунт</Link>.
                </p>
              )}
              <div className="ck-fields">
                <label className="ck-field">
                  Имя и фамилия
                  <input
                    autoComplete="name"
                    value={draft.name}
                    onChange={(e) => update({ name: e.target.value })}
                    maxLength={100}
                    placeholder="Как к вам обращаться"
                    required
                  />
                </label>
                <label className="ck-field">
                  Ваш телефон
                  <input
                    type="tel"
                    autoComplete="tel"
                    inputMode="tel"
                    value={draft.phone}
                    onChange={(e) => update({ phone: e.target.value })}
                    placeholder="+998 90 123 45 67"
                    maxLength={24}
                    required
                  />
                </label>
              </div>
              {delivery && (
                <label className="ck-field">
                  Адрес доставки
                  <input
                    autoComplete="street-address"
                    value={draft.address}
                    onChange={(e) => update({ address: e.target.value })}
                    placeholder="Город, улица, дом, квартира"
                    maxLength={300}
                    required
                    list="ck-addresses"
                  />
                  <datalist id="ck-addresses">
                    {(account?.addresses || []).map((a) => (
                      <option key={a} value={a} />
                    ))}
                  </datalist>
                </label>
              )}
              {draftError && (
                <p role="status" className="ck-notice">
                  {draftError}
                </p>
              )}
            </section>
            <div className="ck-step-heading ck-section-heading">
              <span>2</span>
              <div>
                <h2>Договоритесь с продавцами</h2>
                <p>Отдельное время и способ получения для каждого магазина.</p>
              </div>
            </div>
            {issues.length > 0 && (
              <section className="ck-card ck-error" role="alert">
                <h2>Нужно обновить корзину</h2>
                {issues.map((issue) => (
                  <p key={issue.id}>
                    <strong>{issue.name}.</strong> {issue.reason}{" "}
                    <button
                      type="button"
                      className="ck-text-button"
                      onClick={() => cart.remove(issue.id)}
                    >
                      Удалить
                    </button>
                  </p>
                ))}
                <Link to="/cart">Вернуться в корзину</Link>
              </section>
            )}
            {groups.map((group, index) => {
              const slot = draft.sellers[group.shop.id] || emptySchedule();
              const agreedFor = groupSignature(group, slot);
              const isAgreed = slot.agreedFor === agreedFor;
              const preview = {
                id: "draft",
                shopName: group.shop.name,
                items: group.items,
                total: group.total,
                buyerName: draft.name,
                buyerPhone: draft.phone,
                address: draft.address,
                fulfillment: slot.method,
                schedule: { date: slot.date, time: slot.time },
                note: slot.note,
              };
              return (
                <section
                  className="ck-card ck-seller"
                  key={group.shop.id}
                  aria-label={"Заказ у " + group.shop.name}
                >
                  <header className="ck-seller-heading">
                    <span className="ck-shop-icon">
                      <Store size={24} />
                    </span>
                    <div>
                      <small>
                        ПРОДАВЕЦ {index + 1} ИЗ {groups.length}
                      </small>
                      <h2>
                        <Link
                          to={
                            "/profile?shop=" + encodeURIComponent(group.shop.id)
                          }
                        >
                          {group.shop.name}
                        </Link>
                      </h2>
                    </div>
                    <span className={"ck-pill" + (isAgreed ? " agreed" : "")}>
                      {isAgreed ? (
                        <>
                          <Check size={14} />
                          Согласовано вами
                        </>
                      ) : (
                        <>
                          <Clock3 size={14} />
                          Уточните время
                        </>
                      )}
                    </span>
                  </header>
                  <div className="ck-items">
                    {group.items.map((p) => (
                      <div className="ck-item" key={p.id}>
                        <ProductImage src={p.image} name={p.name} />
                        <div>
                          <Link
                            to={"/product/" + encodeURIComponent(p.productId)}
                          >
                            {p.name}
                          </Link>
                          {p.variantLabel && <small>{p.variantLabel}</small>}
                          <small>
                            {p.quantity} × {checkoutMoney(p.price)}
                          </small>
                        </div>
                        <strong>{checkoutMoney(p.price * p.quantity)}</strong>
                      </div>
                    ))}
                  </div>
                  {group.priceChanged && (
                    <p className="ck-notice">
                      Цена обновилась. В оформлении указана текущая цена из
                      каталога — проверьте её с продавцом.
                    </p>
                  )}
                  <div className="ck-group-total">
                    <span>Товары у этого продавца</span>
                    <strong>{checkoutMoney(group.total)}</strong>
                  </div>
                  <fieldset className="ck-methods">
                    <legend>Способ получения</legend>
                    {[
                      ["pickup", "Самовывоз"],
                      ["delivery", "Доставка по договорённости"],
                    ].map(([value, label]) => (
                      <label key={value}>
                        <input
                          type="radio"
                          name={"method-" + group.shop.id}
                          value={value}
                          checked={slot.method === value}
                          onChange={() =>
                            updateSeller(group.shop.id, {
                              method: value,
                              agreedFor: "",
                            })
                          }
                        />
                        {label}
                      </label>
                    ))}
                  </fieldset>
                  {slot.method === "pickup" ? (
                    <p className="ck-location">
                      <MapPin size={16} />
                      {group.shop.address ||
                        "Место самовывоза уточните у продавца"}
                    </p>
                  ) : (
                    <p className="ck-muted">
                      Возможность, стоимость и время доставки согласуйте с этим
                      продавцом отдельно.
                    </p>
                  )}
                  <div className="ck-fields">
                    <label className="ck-field">
                      Дата получения
                      <input
                        aria-label={"Дата для " + group.shop.name}
                        type="date"
                        min={localDay()}
                        value={slot.date}
                        onChange={(e) =>
                          updateSeller(group.shop.id, {
                            date: e.target.value,
                            agreedFor: "",
                          })
                        }
                        required
                      />
                    </label>
                    <label className="ck-field">
                      Время получения
                      <input
                        aria-label={"Время для " + group.shop.name}
                        type="time"
                        value={slot.time}
                        onChange={(e) =>
                          updateSeller(group.shop.id, {
                            time: e.target.value,
                            agreedFor: "",
                          })
                        }
                        required
                      />
                    </label>
                  </div>
                  <label className="ck-field">
                    Комментарий продавцу
                    <textarea
                      aria-label={"Комментарий для " + group.shop.name}
                      value={slot.note}
                      onChange={(e) =>
                        updateSeller(group.shop.id, { note: e.target.value })
                      }
                      maxLength={1000}
                      rows={2}
                      placeholder="Начинка, надпись на торте, детали получения…"
                    />
                  </label>
                  <SellerContact shop={group.shop} order={preview} draft />
                  <label
                    className={"ck-agreement" + (isAgreed ? " is-checked" : "")}
                  >
                    <input
                      type="checkbox"
                      aria-label={"Согласовано с " + group.shop.name}
                      checked={isAgreed}
                      onChange={(e) =>
                        updateSeller(group.shop.id, {
                          agreedFor: e.target.checked ? agreedFor : "",
                        })
                      }
                    />
                    <span>
                      Я согласовал с продавцом наличие, дату, время и способ
                      получения.
                    </span>
                  </label>
                </section>
              );
            })}
          </div>
          <aside className="ck-card ck-summary">
            <div className="ck-step-heading">
              <span>3</span>
              <div>
                <h2>Проверьте заказ</h2>
                <p>{groups.length} отдельных заявок продавцам</p>
              </div>
            </div>
            <dl>
              {groups.map((g) => (
                <div key={g.shop.id}>
                  <dt>{g.shop.name}</dt>
                  <dd>{checkoutMoney(g.total)}</dd>
                </div>
              ))}
            </dl>
            <div className="ck-grand-total">
              <span>За товары</span>
              <strong>{checkoutMoney(total)}</strong>
            </div>
            <p className="ck-muted">
              Доставка не включена. Оплата напрямую продавцу после согласования;
              сейчас деньги не списываются.
            </p>
            <p className="ck-progress">
              <Check size={17} />
              Согласовано: {agreed} из {groups.length}
            </p>
            <p className="ck-notice">
              Заявки и чат сохранятся в этом браузере. Чтобы передать заказ
              продавцу на другой телефон, отправьте подготовленный SMS или
              скопированный текст.
            </p>
            {error && (
              <p className="ck-error" ref={errorRef} role="alert" tabIndex={-1}>
                {error}
              </p>
            )}
            {account ? (
              <button
                className="ck-button primary"
                type="submit"
                disabled={busy || !!issues.length || !groups.length}
              >
                {busy ? "Сохраняем…" : "Сохранить заявки"}
                <ArrowRight size={17} />
              </button>
            ) : (
              <Link className="ck-button primary" to="/login?next=%2Fcheckout">
                Войти и продолжить
                <ArrowRight size={17} />
              </Link>
            )}
            <Link to="/cart" className="ck-text-button">
              Изменить корзину
            </Link>
          </aside>
        </form>
      )}
    </div>
  );
}
