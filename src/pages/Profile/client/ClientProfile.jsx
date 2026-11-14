import "./ClientProfile.css";
import ProfileChat from "../ProfileChat";
import { Orders, Reviews } from "../Activity";
import { useWorkspace, followShop } from "../../../store/workspaceStore";
import { accountId } from "../../../store/localAccount";
import { useCatalog } from "../../Seller/sellerData";
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
  Bell,
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
  function openConversation(shopId) {
    setChatShop(shopId);
    setSection("messages");
  }
  function row(label, Icon, action, extra) {
    return (
      <button type="button" className="cu-row" onClick={action}>
        <Icon size={20} />
        <span>{label}</span>
        {extra}
        <ChevronRight size={17} />
      </button>
    );
  }
  const update = (key, value) => setDraft((d) => ({ ...d, [key]: value }));
  function save(e) {
    e.preventDefault();
    if (!draft.firstName?.trim()) {
      setNotice("Введите имя.");
      return;
    }
    try {
      onSave({ ...draft });
      setNotice("Профиль сохранён.");
    } catch (error) {
      setNotice(error.message || "Не удалось сохранить профиль.");
    }
  }
  function saveAddresses(addresses) {
    try {
      onSave({ ...account, addresses });
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
        <span className="cu-eyebrow">МОЙ BAKEU</span>
        <nav aria-label="Разделы покупателя">
          {nav.map(([key, label, Icon]) => (
            <button
              type="button"
              key={key}
              className={section === key ? "active" : ""}
              aria-current={section === key ? "page" : undefined}
              onClick={() => setSection(key)}
            >
              <Icon size={21} />
              <span>{label}</span>
              {key === "messages" && unread > 0 && <b>{unread}</b>}
            </button>
          ))}
        </nav>
        <button className="cu-logout" onClick={onLogout}>
          <LogOut size={20} />
          Выйти
        </button>
      </aside>
      <div className="cu-main">
        {section !== "overview" && (
          <div className="cu-section-head">
            <button className="bw-btn" onClick={() => setSection("overview")}>
              <ArrowLeft size={17} />
              Мой профиль
            </button>
          </div>
        )}
        <section className="cu-identity cu-card">
          <div className="cu-person">
            <span className="cu-avatar">
              {account.avatar ? (
                <img src={account.avatar} alt="Моё фото" />
              ) : (
                <UserRound size={38} />
              )}
            </span>
            <div>
              <span className="cu-eyebrow">ПРОФИЛЬ ПОКУПАТЕЛЯ</span>
              <h1>
                {account.firstName} {account.lastName}
              </h1>
              <p>{account.nickname ? `@${account.nickname}` : account.email}</p>
              <button className="bw-btn" onClick={() => setSection("settings")}>
                <Pencil size={16} />
                Редактировать профиль
              </button>
            </div>
          </div>
          <div className="cu-stats">
            <button onClick={() => setSection("orders")}>
              <Package />
              <strong>{orders.length}</strong>
              <span>Заказов</span>
            </button>
            <button onClick={() => setSection("favorites")}>
              <Heart />
              <strong>{Object.keys(favorites).length}</strong>
              <span>Избранное</span>
            </button>
            <button onClick={() => setSection("reviews")}>
              <Star />
              <strong>{reviews.length}</strong>
              <span>Отзывов</span>
            </button>
          </div>
        </section>
        {notice && (
          <p className="cu-notice" role="status">
            {notice}
          </p>
        )}
        {section === "overview" && (
          <>
            <div className="cu-overview">
              <div className="cu-column">
                <section className="cu-card cu-current">
                  <div className="cu-card-title">
                    <h2>Текущий заказ</h2>
                    <button
                      onClick={() => setSection("orders")}
                      aria-label="Все заказы"
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
                            alt={currentOrder.items[0].name}
                          />
                        )}
                        <div>
                          <span className="cu-pill">{currentOrder.status}</span>
                          <h3>Заказ №{currentOrder.id.slice(0, 6)}</h3>
                          <p>
                            {currentOrder.items
                              .map((p) => `${p.name} × ${p.quantity}`)
                              .join(", ")}
                          </p>
                          <strong>{money(currentOrder.total)}</strong>
                        </div>
                      </div>
                      <ol className="cu-progress" aria-label="Статус заказа">
                        {["Принят", "Готовится", "Доставка"].map((label, i) => (
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
                            {label}
                          </li>
                        ))}
                      </ol>
                      <div className="cu-actions">
                        <button
                          className="bw-btn primary"
                          onClick={() => setSection("orders")}
                        >
                          <MapPin size={17} />
                          Статус заказа
                        </button>
                        <button
                          className="bw-btn"
                          onClick={() => openConversation(currentOrder.shopId)}
                        >
                          <MessageCircle size={17} />
                          Написать продавцу
                        </button>
                      </div>
                    </>
                  ) : (
                    <div className="cu-empty">
                      <ShoppingBag size={35} />
                      <h3>Время выбрать что-нибудь вкусное</h3>
                      <p>Здесь появится ваш текущий заказ и его статус.</p>
                      <Link
                        to="/seller?tab=products"
                        className="bw-btn primary"
                      >
                        Выбрать выпечку <ChevronRight size={17} />
                      </Link>
                    </div>
                  )}
                </section>
                <section className="cu-card cu-mobile-menu">
                  {row("Мои заказы", ShoppingBag, () => setSection("orders"))}
                  {row("Избранное", Heart, () => setSection("favorites"))}
                  {row(
                    "Сообщения",
                    MessageCircle,
                    () => setSection("messages"),
                    unread > 0 ? <b className="cu-count">{unread}</b> : null,
                  )}
                  {row("Мои отзывы", Star, () => setSection("reviews"))}
                </section>
                <section className="cu-card">
                  <div className="cu-card-title">
                    <h2>Мои адреса</h2>
                    <button
                      onClick={() => setSection("addresses")}
                      aria-label="Изменить адреса"
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
                          {i === 0 ? "Основной адрес" : "Дополнительный адрес"}
                        </strong>
                        <small>{address}</small>
                      </span>
                      <ChevronRight size={17} />
                    </button>
                  ))}
                  {!account.addresses?.length && (
                    <p>Добавьте адрес для будущих заказов.</p>
                  )}
                  <button
                    className="cu-add"
                    onClick={() => setSection("addresses")}
                  >
                    <Plus size={17} />
                    Добавить адрес
                  </button>
                </section>
              </div>
              <div className="cu-column">
                <section className="cu-card cu-recent">
                  <div className="cu-card-title">
                    <h2>Недавние сообщения</h2>
                    <button
                      onClick={() => setSection("messages")}
                      aria-label="Все сообщения"
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
                          {t.shopName.slice(0, 1)}
                        </span>
                        <span>
                          <strong>{t.shopName}</strong>
                          <small>
                            {t.messages.at(-1)?.text || "Начните разговор"}
                          </small>
                        </span>
                        <ChevronRight size={17} />
                      </button>
                    ))}
                  {!threads.length && (
                    <>
                      <p>
                        Обсудите начинку, оформление и дату заказа с мастером.
                      </p>
                      <button
                        className="bw-btn"
                        onClick={() => setSection("messages")}
                      >
                        <MessageCircle size={17} />
                        Открыть сообщения
                      </button>
                    </>
                  )}
                </section>
                <section className="cu-card cu-settings">
                  <h2>Настройки аккаунта</h2>
                  {row("Личные данные", UserRound, () =>
                    setSection("settings"),
                  )}
                  {row("Телефон и email", Mail, () => setSection("settings"))}
                  {row("Любимые магазины", Store, () =>
                    setSection("following"),
                  )}
                  {row("Мои отзывы", Star, () => setSection("reviews"))}
                  {row("Безопасность", ShieldCheck, () =>
                    setSection("security"),
                  )}
                </section>
              </div>
            </div>
            <section className="cu-card">
              <div className="cu-card-title">
                <h2>
                  <Heart size={22} />
                  Избранное
                </h2>
                <Link to="/favorites">
                  Смотреть всё <ChevronRight size={17} />
                </Link>
              </div>
              <div className="cu-favorites">
                {Object.values(favorites)
                  .slice(0, 3)
                  .map((p) => (
                    <Link key={p.id} to="/favorites" className="cu-favorite">
                      {p.image && <img src={p.image} alt={p.name} />}
                      <span>
                        <strong>{p.name}</strong>
                        <small>{money(p.price)}</small>
                      </span>
                      <Heart size={19} fill="currentColor" />
                    </Link>
                  ))}
              </div>
              {!Object.keys(favorites).length && (
                <p>Сохраняйте понравившуюся выпечку сердечком в каталоге.</p>
              )}
            </section>
          </>
        )}
        {section === "favorites" && (
          <section className="cu-card">
            <h2>Избранные товары</h2>
            <p>Все сохранённые товары доступны в избранном.</p>
            <Link className="bw-btn primary" to="/favorites">
              Открыть избранное
            </Link>
          </section>
        )}
        {section === "security" && (
          <section className="cu-card">
            <h2>Безопасность</h2>
            <p>
              Это локальный демо-аккаунт. Смена пароля и подтверждение контактов
              пока не подключены.
            </p>
            <button className="bw-btn" onClick={onLogout}>
              <LogOut size={17} />
              Выйти из аккаунта
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
            <h2>Любимые магазины · {follows.length}</h2>
            <p>Подписки сохраняются отдельно для вашего аккаунта.</p>
            {shops.map((shop) => (
              <div className="bw-follow" key={shop.id}>
                <Link to={`/seller?shop=${shop.id}`}>
                  <strong>{shop.name}</strong>
                  <small>{shop.description}</small>
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
                  {follows.some((f) => f.shopId === shop.id)
                    ? "Отписаться"
                    : "Подписаться"}
                </button>
              </div>
            ))}
          </section>
        )}
        {section === "addresses" && (
          <section className="bw-card">
            <h2>Мои адреса</h2>
            {(account.addresses || []).map((a, i) => (
              <div className="bw-address" key={i}>
                <MapPin size={18} />
                <span>{a}</span>
                <button
                  className="bw-text"
                  onClick={() =>
                    saveAddresses(
                      account.addresses.filter((_, index) => index !== i),
                    )
                  }
                >
                  Удалить
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
                Новый адрес
                <input
                  required
                  maxLength={250}
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Город, улица, дом, квартира"
                />
              </label>
              <button className="bw-btn">
                <Plus size={17} />
                Добавить адрес
              </button>
            </form>
          </section>
        )}
        {section === "settings" && (
          <form className="bw-card" onSubmit={save}>
            <h2>Личные данные</h2>
            <label className="bw-field">
              Фотография
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
              <img className="bw-preview" src={draft.avatar} alt="Новое фото" />
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
                  {label}
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
              Подтверждение email и телефона, смена пароля и отправка
              уведомлений будут доступны после подключения сервера.
            </p>
            <div className="bw-actions">
              <button className="bw-btn primary">Сохранить профиль</button>
              <button
                type="button"
                className="bw-btn"
                onClick={() => {
                  setDraft({ ...account });
                  setNotice("Изменения отменены.");
                }}
              >
                Отмена
              </button>
            </div>
          </form>
        )}
        <button className="cu-mobile-logout" onClick={onLogout}>
          <LogOut size={18} />
          Выйти
        </button>
      </div>
    </div>
  );
}
