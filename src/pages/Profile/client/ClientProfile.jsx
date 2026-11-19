import { applyForShop, accountApiEnabled } from "../../../bot/client/accountApi";
import { translateText } from "../../../i18n/index.js";
import "./ClientProfile.css";
import ProfileChat from "../ProfileChat";
import { Orders, Reviews } from "../Activity";
import { useWorkspace, followShop } from "../../../store/workspaceStore";
import { accountId } from "../../../store/localAccount";
import { useCatalog } from "../../../store/sellerData";
import { useState } from "react";
import { Link } from "react-router-dom";
import {
  Heart,
  ShoppingBag,
  MessageCircle,
  MapPin,
  Settings,
  LogOut,
  Plus,
  UserRound,
  ChevronRight,
  Pencil,
  Star,
  Package,
  Mail,
  ShieldCheck,
  Store,
  ArrowLeft,
} from "lucide-react";
import { useFavoriteStore } from "../../../store/favoriteStore";
import { readPicture } from "../../../store/shopStore";
export default function ClientProfile({
  account,
  onLogout,
  onSave,
  initialShop,
  serverApplication,
  onApplication,
}) {
  const follows = useWorkspace((s) => s.follows).filter(
    (f) => f.buyerId === accountId(account),
  );
  const orders = useWorkspace((s) => s.orders).filter(
    (o) => o.buyerId === accountId(account),
  );
  const reviews = useWorkspace((s) => s.reviews).filter(
    (r) => r.buyerId === accountId(account),
  );
  const { shops } = useCatalog();
  const favorites = useFavoriteStore((s) => s.items);
  const [draft, setDraft] = useState({ ...account }),
    [section, setSection] = useState(initialShop ? "messages" : "overview"),
    [notice, setNotice] = useState(""),
    [address, setAddress] = useState("");
  const [shopForm, setShopForm] = useState({ firstName: account.firstName || "", lastName: account.lastName || "", phone: account.phone || "", shop: "", address: "" });
  const [shopBusy, setShopBusy] = useState(false);
  const threads = useWorkspace((s) => s.threads).filter(
    (t) => t.buyerId === accountId(account),
  );
  const unread = threads.reduce(
    (n, t) =>
      n + t.messages.filter((m) => m.from !== "buyer" && !m.read).length,
    0,
  );
  const [chatShop, setChatShop] = useState(initialShop);
  const currentOrder = [...orders]
    .filter((o) => !["Выполнен", "Отменён"].includes(o.status))
    .sort((a, b) => b.at - a.at)[0];
  const money = (n) => new Intl.NumberFormat("ru-RU").format(n) + " сум";
  const nav = [
    ["overview", "Мой профиль", UserRound],
    ["orders", "Мои заказы", ShoppingBag],
    ["favorites", "Избранное", Heart],
    ["messages", "Сообщения", MessageCircle],
    ["addresses", "Мои адреса", MapPin],
    ["settings", "Настройки", Settings],
  ];
  async function submitShop(event) {
    event.preventDefault();
    if (shopBusy) return;
    if (!accountApiEnabled || !account.server) {
      setNotice("Для открытия магазина войдите в серверный аккаунт BakeU.");
      return;
    }
    if (!shopForm.firstName.trim() || !shopForm.lastName.trim() || !shopForm.phone.trim() || !shopForm.shop.trim() || !shopForm.address.trim()) {
      setNotice("Заполните все поля заявки.");
      return;
    }
    setShopBusy(true);
    setNotice("");
    try {
      // Keep verified account contact details intact; send only shop fields to the server.
      const result = await applyForShop({ shop: shopForm.shop.trim(), address: shopForm.address.trim() });
      onApplication?.(result.application);
      setNotice("Заявка отправлена. Дождитесь проверки администратором.");
      setSection("overview");
    } catch (error) {
      setNotice(error.message || "Не удалось отправить заявку.");
    } finally {
      setShopBusy(false);
    }
  }
  function openConversation(shopId) {
    setChatShop(shopId);
    setSection("messages");
  }
  function row(label, Icon, action, extra) {
    return (
      <button type="button" className="cu-row" onClick={action}>
        <Icon size={20} />
        <span>{translateText(label)}</span>
        {translateText(extra)}
        <ChevronRight size={17} />
      </button>
    );
  }
  const update = (key, value) => setDraft((d) => ({ ...d, [key]: value }));
  async function save(e) {
    e.preventDefault();
    if (!draft.firstName?.trim()) {
      setNotice("Введите имя.");
      return;
    }
    try {
      await onSave({ ...draft });
      setNotice("Профиль сохранён.");
    } catch (error) {
      setNotice(error.message || "Не удалось сохранить профиль.");
    }
  }
  async function saveAddresses(addresses) {
    try {
      await onSave({ ...account, addresses });
      setDraft((d) => ({ ...d, addresses }));
      setAddress("");
      setNotice("Адреса сохранены.");
    } catch {
      setNotice("Не удалось сохранить адрес.");
    }
  }
  return (
    <div className="cu-layout">
      <aside className="cu-sidebar">
        <span className="cu-eyebrow">{translateText("МОЙ BAKEU")}</span>
        <nav aria-label={translateText("Разделы покупателя")}>
          {nav.map(([key, label, Icon]) => (
            <button
              type="button"
              key={key}
              className={section === key ? "active" : ""}
              aria-current={section === key ? "page" : undefined}
              onClick={() => setSection(key)}
            >
              <Icon size={21} />
              <span>{translateText(label)}</span>
              {key === "messages" && unread > 0 && (
                <b>{translateText(unread)}</b>
              )}
            </button>
          ))}
        </nav>
        <button className="cu-logout" onClick={onLogout}>
          <LogOut size={20} />
          {translateText("Выйти")}
        </button>
      </aside>
      <div className="cu-main">
        {section !== "overview" && (
          <div className="cu-section-head">
            <button className="bw-btn" onClick={() => setSection("overview")}>
              <ArrowLeft size={17} />
              {translateText("Мой профиль")}
            </button>
          </div>
        )}
        <section className="cu-identity cu-card">
          <div className="cu-person">
            <span className="cu-avatar">
              {account.avatar ? (
                <img src={account.avatar} alt={translateText("Моё фото")} />
              ) : (
                <UserRound size={38} />
              )}
            </span>
            <div>
              <span className="cu-eyebrow">
                {translateText("ПРОФИЛЬ ПОКУПАТЕЛЯ")}
              </span>
              <h1>
                {translateText(account.firstName)}{" "}
                {translateText(account.lastName)}
              </h1>
              <p>
                {translateText(
                  account.nickname ? `@${account.nickname}` : account.email,
                )}
              </p>
              <div className="cu-profile-actions">
              <button className="bw-btn" onClick={() => setSection("settings")}>
                <Pencil size={16} />
                {translateText("Редактировать профиль")}
              </button>
                <button type="button" className="bw-btn primary" onClick={() => setSection("open-shop")} disabled={serverApplication?.status === "На проверке" || serverApplication?.status === "Одобрено"}>
                  <Store size={16} />
                  {translateText(serverApplication?.status === "На проверке" ? "Магазин на проверке" : serverApplication?.status === "Одобрено" ? "Магазин одобрен" : "Открыть магазин")}
                </button>
              </div>
            </div>
          </div>
          <div className="cu-stats">
            <button onClick={() => setSection("orders")}>
              <Package />
              <strong>{orders.length}</strong>
              <span>{translateText("Заказов")}</span>
            </button>
            <button onClick={() => setSection("favorites")}>
              <Heart />
              <strong>{translateText(Object.keys(favorites).length)}</strong>
              <span>{translateText("Избранное")}</span>
            </button>
            <button onClick={() => setSection("reviews")}>
              <Star />
              <strong>{reviews.length}</strong>
              <span>{translateText("Отзывов")}</span>
            </button>
          </div>
        </section>
        {notice && (
          <p className="cu-notice" role="status">
            {translateText(notice)}
          </p>
        )}
        {section === "overview" && (
          <>
            <div className="cu-overview">
              <div className="cu-column">
                <section className="cu-card cu-current">
                  <div className="cu-card-title">
                    <h2>{translateText("Текущий заказ")}</h2>
                    <button
                      onClick={() => setSection("orders")}
                      aria-label={translateText("Все заказы")}
                    >
                      <ChevronRight size={20} />
                    </button>
                  </div>
                  {currentOrder ? (
                    <>
                      <div className="cu-order-summary">
                        {currentOrder.items[0]?.image && (
                          <img
                            src={currentOrder.items[0].image}
                            alt={translateText(currentOrder.items[0].name)}
                          />
                        )}
                        <div>
                          <span className="cu-pill">
                            {translateText(currentOrder.status)}
                          </span>
                          <h3>
                            {translateText("Заказ №")}
                            {translateText(currentOrder.id.slice(0, 6))}
                          </h3>
                          <p>
                            {translateText(
                              currentOrder.items
                                .map((p) => `${p.name} × ${p.quantity}`)
                                .join(", "),
                            )}
                          </p>
                          <strong>
                            {translateText(money(currentOrder.total))}
                          </strong>
                        </div>
                      </div>
                      <ol
                        className="cu-progress"
                        aria-label={translateText("Статус заказа")}
                      >
                        {["Ожидает", "Готовится", "Доставка"].map(
                          (label, i) => (
                            <li
                              key={label}
                              className={
                                i <=
                                ({ Новый: 0, Готовится: 1, Доставка: 2 }[
                                  currentOrder.status
                                ] ?? 0)
                                  ? "done"
                                  : ""
                              }
                            >
                              <i />
                              {translateText(label)}
                            </li>
                          ),
                        )}
                      </ol>
                      <div className="cu-actions">
                        <button
                          className="bw-btn primary"
                          onClick={() => setSection("orders")}
                        >
                          <MapPin size={17} />
                          {translateText("Статус заказа")}
                        </button>
                        <button
                          className="bw-btn"
                          onClick={() => openConversation(currentOrder.shopId)}
                        >
                          <MessageCircle size={17} />
                          {translateText("Написать продавцу")}
                        </button>
                      </div>
                    </>
                  ) : (
                    <div className="cu-empty">
                      <ShoppingBag size={35} />
                      <h3>
                        {translateText("Время выбрать что-нибудь вкусное")}
                      </h3>
                      <p>
                        {translateText(
                          "Здесь появится ваш текущий заказ и его статус.",
                        )}
                      </p>
                      <Link
                        to="/seller?tab=products"
                        className="bw-btn primary"
                      >
                        {translateText("Выбрать выпечку ")}
                        <ChevronRight size={17} />
                      </Link>
                    </div>
                  )}
                </section>
                <section className="cu-card cu-mobile-menu">
                  {translateText(
                    row("Мои заказы", ShoppingBag, () => setSection("orders")),
                  )}
                  {translateText(
                    row("Избранное", Heart, () => setSection("favorites")),
                  )}
                  {row(
                    "Сообщения",
                    MessageCircle,
                    () => setSection("messages"),
                    unread > 0 ? (
                      <b className="cu-count">{translateText(unread)}</b>
                    ) : null,
                  )}
                  {translateText(
                    row("Мои отзывы", Star, () => setSection("reviews")),
                  )}
                </section>
                <section className="cu-card">
                  <div className="cu-card-title">
                    <h2>{translateText("Мои адреса")}</h2>
                    <button
                      onClick={() => setSection("addresses")}
                      aria-label={translateText("Изменить адреса")}
                    >
                      <Pencil size={17} />
                    </button>
                  </div>
                  {(account.addresses || []).slice(0, 2).map((address, i) => (
                    <button
                      className="cu-row cu-address"
                      key={i}
                      onClick={() => setSection("addresses")}
                    >
                      <MapPin size={20} />
                      <span>
                        <strong>
                          {translateText(
                            i === 0 ? "Основной адрес" : "Дополнительный адрес",
                          )}
                        </strong>
                        <small>{translateText(address)}</small>
                      </span>
                      <ChevronRight size={17} />
                    </button>
                  ))}
                  {!account.addresses?.length && (
                    <p>
                      {translateText("Добавьте адрес для будущих заказов.")}
                    </p>
                  )}
                  <button
                    className="cu-add"
                    onClick={() => setSection("addresses")}
                  >
                    <Plus size={17} />
                    {translateText("Добавить адрес")}
                  </button>
                </section>
              </div>
              <div className="cu-column">
                <section className="cu-card cu-recent">
                  <div className="cu-card-title">
                    <h2>{translateText("Недавние сообщения")}</h2>
                    <button
                      onClick={() => setSection("messages")}
                      aria-label={translateText("Все сообщения")}
                    >
                      <ChevronRight size={20} />
                    </button>
                  </div>
                  {[...threads]
                    .sort(
                      (a, b) =>
                        (b.messages.at(-1)?.at || 0) -
                        (a.messages.at(-1)?.at || 0),
                    )
                    .slice(0, 3)
                    .map((t) => (
                      <button
                        className="cu-row cu-thread"
                        key={t.id}
                        onClick={() => openConversation(t.shopId)}
                      >
                        <span className="cu-thread-avatar">
                          {translateText(t.shopName.slice(0, 1))}
                        </span>
                        <span>
                          <strong>{translateText(t.shopName)}</strong>
                          <small>
                            {translateText(
                              t.messages.at(-1)?.text || "Начните разговор",
                            )}
                          </small>
                        </span>
                        <ChevronRight size={17} />
                      </button>
                    ))}
                  {!threads.length && (
                    <>
                      <p>
                        {translateText(
                          "Обсудите начинку, оформление и дату заказа с мастером.",
                        )}
                      </p>
                      <button
                        className="bw-btn"
                        onClick={() => setSection("messages")}
                      >
                        <MessageCircle size={17} />
                        {translateText("Открыть сообщения")}
                      </button>
                    </>
                  )}
                </section>
                <section className="cu-card cu-settings">
                  <h2>{translateText("Настройки аккаунта")}</h2>
                  {translateText(
                    row("Личные данные", UserRound, () =>
                      setSection("settings"),
                    ),
                  )}
                  {translateText(
                    row("Телефон и email", Mail, () => setSection("settings")),
                  )}
                  {translateText(
                    row("Любимые магазины", Store, () =>
                      setSection("following"),
                    ),
                  )}
                  {translateText(
                    row("Мои отзывы", Star, () => setSection("reviews")),
                  )}
                  {translateText(
                    row("Безопасность", ShieldCheck, () =>
                      setSection("security"),
                    ),
                  )}
                </section>
              </div>
            </div>
            <section className="cu-card">
              <div className="cu-card-title">
                <h2>
                  <Heart size={22} />
                  {translateText("Избранное")}
                </h2>
                <Link to="/favorites">
                  {translateText("Смотреть всё ")}
                  <ChevronRight size={17} />
                </Link>
              </div>
              <div className="cu-favorites">
                {Object.values(favorites)
                  .slice(0, 3)
                  .map((p) => (
                    <Link key={p.id} to="/favorites" className="cu-favorite">
                      {p.image && (
                        <img src={p.image} alt={translateText(p.name)} />
                      )}
                      <span>
                        <strong>{translateText(p.name)}</strong>
                        <small>{translateText(money(p.price))}</small>
                      </span>
                      <Heart size={19} fill="currentColor" />
                    </Link>
                  ))}
              </div>
              {!Object.keys(favorites).length && (
                <p>
                  {translateText(
                    "Сохраняйте понравившуюся выпечку сердечком в каталоге.",
                  )}
                </p>
              )}
            </section>
          </>
        )}
        {section === "open-shop" && (
          <section className="cu-card cu-shop-registration">
            <span className="cu-eyebrow">{translateText("BAKEU ДЛЯ ПРОДАВЦОВ")}</span>
            <h2><Store size={22} /> {translateText("Открыть свой магазин")}</h2>
            <p>{translateText("Заполните заявку. После проверки администратором ваш аккаунт станет аккаунтом продавца. Покупательские данные сохранятся.")}</p>
            {serverApplication?.status === "На проверке" || serverApplication?.status === "Одобрено" ? (
              <p role="status">{translateText(`Заявка: ${serverApplication.status}`)}</p>
            ) : (
              <form className="cu-shop-form" onSubmit={submitShop}>
                <label className="bw-field"><span>{translateText("Имя")}</span><input autoComplete="given-name" required value={shopForm.firstName} onChange={e => setShopForm(s => ({...s, firstName: e.target.value}))} /></label>
                <label className="bw-field"><span>{translateText("Фамилия")}</span><input autoComplete="family-name" required value={shopForm.lastName} onChange={e => setShopForm(s => ({...s, lastName: e.target.value}))} /></label>
                <label className="bw-field"><span>{translateText("Название магазина")}</span><input required minLength={2} maxLength={150} value={shopForm.shop} onChange={e => setShopForm(s => ({...s, shop: e.target.value}))} placeholder={translateText("Например, Домашние торты")} /></label>
                <label className="bw-field"><span>{translateText("Номер телефона")}</span><input required type="tel" autoComplete="tel" readOnly value={shopForm.phone} title={translateText("Подтверждённый номер аккаунта")} /></label>
                <label className="bw-field cu-shop-form-wide"><span>{translateText("Адрес магазина")}</span><input required minLength={2} maxLength={250} value={shopForm.address} onChange={e => setShopForm(s => ({...s, address: e.target.value}))} placeholder={translateText("Город, район, улица")} /></label>
                <p className="cu-shop-form-wide">{translateText("Имя и номер телефона используются из вашего подтверждённого аккаунта. Изменить их можно в настройках профиля.")}</p>
                <button className="bw-btn primary cu-shop-form-wide" type="submit" disabled={shopBusy}>{translateText(shopBusy ? "Отправляем заявку…" : "Отправить заявку на открытие")}</button>
              </form>
            )}
          </section>
        )}
        {section === "favorites" && (
          <section className="cu-card">
            <h2>{translateText("Избранные товары")}</h2>
            <p>
              {translateText("Все сохранённые товары доступны в избранном.")}
            </p>
            <Link className="bw-btn primary" to="/favorites">
              {translateText("Открыть избранное")}
            </Link>
          </section>
        )}
        {section === "security" && (
          <section className="cu-card">
            <h2>{translateText("Безопасность")}</h2>
            <p>
              {translateText(
                "Это локальный демо-аккаунт. Смена пароля и подтверждение контактов пока не подключены.",
              )}
            </p>
            <button className="bw-btn" onClick={onLogout}>
              <LogOut size={17} />
              {translateText("Выйти из аккаунта")}
            </button>
          </section>
        )}
        {section === "orders" && <Orders account={account} />}
        {section === "reviews" && <Reviews account={account} />}
        {section === "messages" && (
          <ProfileChat
            key={chatShop || "all"}
            account={account}
            initialShop={chatShop}
          />
        )}
        {section === "following" && (
          <section className="bw-card">
            <h2>
              {translateText("Любимые магазины · ")}
              {follows.length}
            </h2>
            <p>
              {translateText(
                "Подписки сохраняются отдельно для вашего аккаунта.",
              )}
            </p>
            {shops.map((shop) => (
              <div className="bw-follow" key={shop.id}>
                <Link to={`/seller?shop=${shop.id}`}>
                  <strong>{translateText(shop.name)}</strong>
                  <small>{translateText(shop.description)}</small>
                </Link>
                <button
                  className="bw-btn"
                  aria-pressed={follows.some((f) => f.shopId === shop.id)}
                  onClick={() => {
                    try {
                      followShop(account, shop.id);
                    } catch {
                      setNotice("Не удалось сохранить подписку");
                    }
                  }}
                >
                  {translateText(
                    follows.some((f) => f.shopId === shop.id)
                      ? "Отписаться"
                      : "Подписаться",
                  )}
                </button>
              </div>
            ))}
          </section>
        )}
        {section === "addresses" && (
          <section className="bw-card">
            <h2>{translateText("Мои адреса")}</h2>
            {(account.addresses || []).map((a, i) => (
              <div className="bw-address" key={i}>
                <MapPin size={18} />
                <span>{translateText(a)}</span>
                <button
                  className="bw-text"
                  onClick={() =>
                    saveAddresses(
                      account.addresses.filter((_, index) => index !== i),
                    )
                  }
                >
                  {translateText("Удалить")}
                </button>
              </div>
            ))}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (address.trim())
                  saveAddresses([...(account.addresses || []), address.trim()]);
              }}
            >
              <label className="bw-field">
                {translateText("Новый адрес")}
                <input
                  required
                  maxLength={250}
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder={translateText("Город, улица, дом, квартира")}
                />
              </label>
              <button className="bw-btn">
                <Plus size={17} />
                {translateText("Добавить адрес")}
              </button>
            </form>
          </section>
        )}
        {section === "settings" && (
          <form className="bw-card" onSubmit={save}>
            <h2>{translateText("Личные данные")}</h2>
            <label className="bw-field">
              {translateText("Фотография")}
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={async (e) => {
                  try {
                    const img = await readPicture(e.target.files?.[0]);
                    if (img) update("avatar", img);
                  } catch (err) {
                    setNotice(err.message);
                  }
                }}
              />
            </label>
            {draft.avatar && (
              <img
                className="bw-preview"
                src={draft.avatar}
                alt={translateText("Новое фото")}
              />
            )}
            <div className="bw-fields">
              {[
                ["Имя", "firstName", "text"],
                ["Фамилия", "lastName", "text"],
                ["Никнейм", "nickname", "text"],
                ["Email", "email", "email"],
                ["Телефон", "phone", "tel"],
              ].map(([label, key, type]) => (
                <label className="bw-field" key={key}>
                  {translateText(label)}
                  <input
                    type={type}
                    required={key === "firstName" || key === "email"}
                    value={draft[key] || ""}
                    onChange={(e) =>
                      update(
                        key,
                        e.target.value.replace(
                          key === "nickname" ? /^@/ : /^$/,
                          "",
                        ),
                      )
                    }
                  />
                </label>
              ))}
            </div>
            <p>
              {translateText(
                "Подтверждение email и телефона, смена пароля и отправка уведомлений будут доступны после подключения сервера.",
              )}
            </p>
            <div className="bw-actions">
              <button className="bw-btn primary">
                {translateText("Сохранить профиль")}
              </button>
              <button
                type="button"
                className="bw-btn"
                onClick={() => {
                  setDraft({ ...account });
                  setNotice("Изменения отменены.");
                }}
              >
                {translateText("Отмена")}
              </button>
            </div>
          </form>
        )}
        <button className="cu-mobile-logout" onClick={onLogout}>
          <LogOut size={18} />
          {translateText("Выйти")}
        </button>
      </div>
    </div>
  );
}
