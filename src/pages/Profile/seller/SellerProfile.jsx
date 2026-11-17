import {
  getDevicePosition,
  supportsLocation,
} from "../../../platform/device.js";
import { normalizeSearch } from "../../../i18n/alphabet.js";
import { getLocale } from "../../../i18n/index.js";
import { translateText } from "../../../i18n/index.js";
import ProductFields from "../../Product/ProductFields";
import { validateProductDetails } from "../../Product/validateProductDetails";
import { PRODUCT_CATEGORIES } from "../../Product/productDetails";
import ProfileChat from "../ProfileChat";
import { Orders, Reviews, Sales } from "../Activity";
import { useWorkspace, setAutoReply } from "../../../store/workspaceStore";
import { useState } from "react";
import { Link } from "react-router-dom";
import {
  Plus,
  Store,
  Package,
  BarChart3,
  Settings,
  MessageCircle,
  Star,
  Crown,
  LogOut,
  ExternalLink,
  Pencil,
} from "lucide-react";
import {
  useShopStore,
  shopIdFor,
  socialHandle,
  readPicture,
} from "../../../store/shopStore";
const sections = [
  ["overview", "Обзор", BarChart3],
  ["products", "Мои товары", Package],
  ["orders", "Заказы", Store],
  ["messages", "Сообщения", MessageCircle],
  ["reviews", "Отзывы", Star],
  ["stats", "Статистика", BarChart3],
  ["followers", "Подписчики", Star],
  ["settings", "Настройки", Settings],
  ["subscription", "Подписка", Crown],
];
const blankProduct = {
  name: "",
  price: "",
  category: "Торты",
  image: "",
  description: "",
  available: true,
};
export default function SellerProfile({ account, onLogout }) {
  const id = shopIdFor(account);
  const orders = useWorkspace((s) => s.orders).filter((o) => o.shopId === id);
  const reviews = useWorkspace((s) => s.reviews).filter((r) => r.shopId === id);
  const followers = useWorkspace((s) => s.follows).filter(
    (f) => f.shopId === id,
  );
  const reply = useWorkspace((s) => s.autoReplies[id]);
  const [replyText, setReplyText] = useState(
    reply?.text ||
      "Здравствуйте! Спасибо за сообщение. Укажите товар, дату и количество — мы уточним детали заказа.",
  );
  const [replyEnabled, setReplyEnabled] = useState(reply?.enabled !== false);
  const saved = useShopStore((s) => s.shops[id]);
  const allProducts = useShopStore((s) => s.products);
  const saveShop = useShopStore((s) => s.saveShop),
    saveProduct = useShopStore((s) => s.saveProduct),
    removeProduct = useShopStore((s) => s.removeProduct);
  const initial = () =>
    saved || {
      id,
      name: account.company || "Мой магазин",
      nickname: "",
      about: "",
      description: "",
      logo: "",
      banner: "",
      phone: account.phone || "",
      telegram: "",
      instagram: "",
      address: account.location || "",
      lat: 41.3111,
      lng: 69.2797,
      open: "09:00",
      close: "20:00",
      color: "#ead9bd",
      initials: (account.company || "ММ").slice(0, 2).toUpperCase(),
      rating: "—",
      reviewsCount: 0,
      reviews: [],
    };
  const [draft, setDraft] = useState(initial),
    [tab, setTab] = useState("overview"),
    [notice, setNotice] = useState(""),
    [editor, setEditor] = useState(null),
    [query, setQuery] = useState("");
  const products = Object.values(allProducts).filter((p) => p.shopId === id);
  const update = (key, value) => setDraft((d) => ({ ...d, [key]: value }));
  async function upload(event, key, product = false) {
    try {
      const picture = await readPicture(event.target.files?.[0]);
      if (picture)
        product
          ? setEditor((p) => ({ ...p, image: picture }))
          : update(key, picture);
    } catch (e) {
      setNotice(e.message);
    }
    event.target.value = "";
  }
  function save(event) {
    event.preventDefault();
    const telegram = socialHandle(draft.telegram, "telegram"),
      instagram = socialHandle(draft.instagram, "instagram");
    if (telegram === null || instagram === null) {
      setNotice(
        "Проверьте Telegram и Instagram: укажите ник или ссылку на профиль.",
      );
      return;
    }
    if (
      !draft.name.trim() ||
      !draft.address.trim() ||
      !Number.isFinite(Number(draft.lat)) ||
      Math.abs(Number(draft.lat)) > 90 ||
      !Number.isFinite(Number(draft.lng)) ||
      Math.abs(Number(draft.lng)) > 180
    ) {
      setNotice("Заполните название, адрес и корректные координаты.");
      return;
    }
    if (
      draft.nickname &&
      !/^[a-zA-Z0-9_.]{3,40}$/.test(draft.nickname.replace(/^@/, ""))
    ) {
      setNotice("Ник: 3–40 латинских букв, цифр, точек или подчёркиваний.");
      return;
    }
    try {
      saveShop({
        ...draft,
        telegram,
        instagram,
        lat: Number(draft.lat),
        lng: Number(draft.lng),
        description: draft.about.slice(0, 140),
        hours: `Ежедневно, ${draft.open}–${draft.close}`,
        nickname: draft.nickname.replace(/^@/, ""),
        initials: draft.name.slice(0, 2).toUpperCase(),
      });
      setNotice("Настройки сохранены. Изменения доступны в профиле магазина.");
    } catch {
      setNotice(
        "Не удалось сохранить: хранилище заполнено. Уменьшите изображения.",
      );
    }
  }
  function submitProduct(e) {
    e.preventDefault();
    const detailError = validateProductDetails(editor);
    if (detailError) {
      setNotice(detailError);
      return;
    }
    if (
      !editor.name.trim() ||
      !Number.isFinite(Number(editor.price)) ||
      Number(editor.price) <= 0 ||
      !editor.image
    ) {
      setNotice("Укажите название, цену больше нуля и фотографию.");
      return;
    }
    try {
      saveProduct({
        ...editor,
        id: editor.id || `product-${crypto.randomUUID()}`,
        shopId: id,
        price: Number(editor.variants?.[0]?.price || editor.price),
        variants: (editor.variants || []).map((v, i) => ({
          ...v,
          id: i === 0 ? "base" : v.id === "base" ? crypto.randomUUID() : v.id,
          price: Number(v.price),
        })),
      });
      setEditor(null);
      setNotice("Товар сохранён.");
    } catch {
      setNotice("Не удалось сохранить товар. Уменьшите фотографию.");
    }
  }
  function openAdd() {
    setTab("products");
    setEditor({ ...blankProduct });
    setNotice("");
  }
  const field = (label, key, type = "text") => (
    <label className="bw-field" key={key}>
      <span>{translateText(label)}</span>
      <input
        type={type}
        value={draft[key] ?? ""}
        onChange={(e) => update(key, e.target.value)}
        required={["name", "address"].includes(key)}
        step={type === "number" ? "any" : undefined}
      />
    </label>
  );
  return (
    <div className="bw-layout">
      <aside className="bw-sidebar">
        <span className="bw-kicker">{translateText("BAKEU · ПРОДАВЕЦ")}</span>
        {sections.map(([key, label, Icon]) => (
          <button
            key={key}
            className={tab === key ? "active" : ""}
            onClick={() => setTab(key)}
            aria-pressed={tab === key}
          >
            <Icon size={18} />
            {translateText(label)}
          </button>
        ))}
        <button onClick={onLogout}>
          <LogOut size={18} />
          {translateText("Выйти")}
        </button>
      </aside>
      <div className="bw-content">
        <header className="bw-heading">
          <div>
            <span className="bw-kicker">{translateText("ВАШ МАГАЗИН")}</span>
            <h1>
              {translateText("Привет, ")}
              {translateText(account.firstName)}!
            </h1>
            <p>
              {translateText("Всё для ваших вкусных идей — в одном месте.")}
            </p>
          </div>
          <div className="bw-actions">
            {saved && (
              <Link
                className="bw-btn"
                to={`/seller?shop=${encodeURIComponent(id)}`}
              >
                {translateText("Мой магазин ")}
                <ExternalLink size={16} />
              </Link>
            )}
            <button className="bw-btn primary" onClick={openAdd}>
              <Plus size={18} />
              {translateText("Добавить товар")}
            </button>
          </div>
        </header>
        <p role="status" className="bw-status">
          {translateText(notice)}
        </p>
        {tab === "overview" && (
          <>
            <div className="bw-stats">
              {[
                [
                  "Выручка",
                  new Intl.NumberFormat("ru-RU").format(
                    orders
                      .filter((o) => o.status === "Выполнен")
                      .reduce((n, o) => n + o.total, 0),
                  ) + " сум",
                ],
                ["Заказы", orders.length],
                ["Мои товары", products.length],
                [
                  "Рейтинг",
                  reviews.length
                    ? (
                        reviews.reduce((n, r) => n + r.rating, 0) /
                        reviews.length
                      ).toFixed(1)
                    : "—",
                ],
              ].map(([label, value]) => (
                <div className="bw-card" key={label}>
                  <small>{translateText(label)}</small>
                  <strong>{translateText(value)}</strong>
                </div>
              ))}
            </div>
            <div className="bw-two">
              <Sales ownerId={id} />
              <section className="bw-card">
                <h2>{translateText("Начните с магазина")}</h2>
                <p>
                  {translateText(
                    "Добавьте обложку, контакты и адрес, затем разместите первый товар.",
                  )}
                </p>
                <button className="bw-btn" onClick={() => setTab("settings")}>
                  {translateText("Настроить магазин ")}
                  <Settings size={16} />
                </button>
                <h3>{translateText("Быстрый доступ")}</h3>
                <div className="bw-actions">
                  <button className="bw-btn" onClick={() => setTab("products")}>
                    {translateText("Мои товары · ")}
                    {products.length}
                  </button>
                  <button className="bw-btn" onClick={() => setTab("messages")}>
                    {translateText("Сообщения")}
                  </button>
                </div>
              </section>
            </div>
          </>
        )}
        {tab === "products" && (
          <section className="bw-card">
            <div className="bw-heading">
              <h2>
                {translateText("Мои товары · ")}
                {products.length}
              </h2>
              <input
                aria-label={translateText("Поиск моих товаров")}
                placeholder={translateText("Найти товар…")}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            {editor && (
              <form className="bw-editor" onSubmit={submitProduct}>
                <h3>
                  {translateText(
                    editor.id ? "Редактировать товар" : "Новый товар",
                  )}
                </h3>
                <div className="bw-fields">
                  <label className="bw-field">
                    {translateText("Название")}
                    <input
                      required
                      value={editor.name}
                      onChange={(e) =>
                        setEditor((p) => ({ ...p, name: e.target.value }))
                      }
                    />
                  </label>
                  <label className="bw-field">
                    {translateText("Цена, сум")}
                    <input
                      required
                      min="1"
                      type="number"
                      value={editor.price}
                      onChange={(e) =>
                        setEditor((p) => ({ ...p, price: e.target.value }))
                      }
                    />
                  </label>
                  <label className="bw-field">
                    {translateText("Категория")}
                    <select
                      value={editor.category}
                      onChange={(e) =>
                        setEditor((p) => ({ ...p, category: e.target.value }))
                      }
                    >
                      {PRODUCT_CATEGORIES.map((c) => (
                        <option value={c} key={c}>
                          {translateText(c)}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="bw-field">
                    {translateText("Фото JPG / PNG / WebP")}
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={(e) => upload(e, "image", true)}
                    />
                  </label>
                </div>
                {editor.image && (
                  <img
                    className="bw-preview"
                    src={editor.image}
                    alt={translateText("Фото товара")}
                  />
                )}
                <label className="bw-field">
                  {translateText("Описание")}
                  <textarea
                    value={editor.description}
                    maxLength={1500}
                    onChange={(e) =>
                      setEditor((p) => ({ ...p, description: e.target.value }))
                    }
                  />
                </label>
                <ProductFields
                  value={editor}
                  onChange={setEditor}
                  onError={setNotice}
                />
                <div className="bw-actions">
                  <button className="bw-btn primary">
                    {translateText("Сохранить товар")}
                  </button>
                  <button
                    type="button"
                    className="bw-btn"
                    onClick={() => setEditor(null)}
                  >
                    {translateText("Отмена")}
                  </button>
                </div>
              </form>
            )}
            <div className="bw-product-grid">
              {products
                .filter((p) =>
                  normalizeSearch(p.name).includes(normalizeSearch(query)),
                )
                .map((p) => (
                  <article className="bw-product" key={p.id}>
                    <img src={p.image} alt={translateText(p.name)} />
                    <strong>{translateText(p.name)}</strong>
                    <span>
                      {translateText(p.price.toLocaleString(getLocale()))}
                      {translateText(" сум")}
                    </span>
                    <label>
                      <input
                        type="checkbox"
                        checked={p.available !== false}
                        onChange={(e) =>
                          saveProduct({ ...p, available: e.target.checked })
                        }
                      />{" "}
                      {translateText("В наличии")}
                    </label>
                    <div className="bw-actions">
                      <button
                        className="bw-btn"
                        aria-label={translateText(`Изменить ${p.name}`)}
                        onClick={() => setEditor({ ...p })}
                      >
                        <Pencil size={15} />
                        {translateText("Изменить")}
                      </button>
                      <button
                        className="bw-text"
                        onClick={() => {
                          if (
                            window.confirm(
                              translateText(`Удалить «${p.name}»?`),
                            )
                          )
                            removeProduct(p.id);
                        }}
                      >
                        {translateText("Удалить")}
                      </button>
                    </div>
                  </article>
                ))}
            </div>
            {!products.length && (
              <p>
                {translateText("Пока нет товаров. Нажмите «Добавить товар».")}
              </p>
            )}
            {!saved && (
              <p>
                {translateText(
                  "Чтобы магазин и товары появились в каталоге, сохраните настройки магазина.",
                )}
              </p>
            )}
          </section>
        )}
        {tab === "settings" && (
          <form className="bw-card" onSubmit={save}>
            <h2>{translateText("Настройки магазина")}</h2>
            <div
              className="bw-cover"
              style={
                draft.banner
                  ? { backgroundImage: `url(${draft.banner})` }
                  : undefined
              }
            >
              <label className="bw-btn">
                {translateText("Изменить баннер")}
                <input
                  hidden
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(e) => upload(e, "banner")}
                />
              </label>
            </div>
            <div className="bw-actions">
              <span className="bw-avatar">
                {draft.logo ? (
                  <img src={draft.logo} alt={translateText("Логотип")} />
                ) : (
                  draft.initials
                )}
              </span>
              <label className="bw-btn">
                {translateText("Изменить логотип")}
                <input
                  hidden
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(e) => upload(e, "logo")}
                />
              </label>
            </div>
            <div className="bw-fields">
              {translateText(field("Название магазина", "name"))}
              {translateText(field("Никнейм", "nickname"))}
              {translateText(field("Телефон", "phone", "tel"))}
              {translateText(field("Telegram", "telegram"))}
              {translateText(field("Instagram", "instagram"))}
              {translateText(field("Адрес", "address"))}
              {translateText(field("Широта", "lat", "number"))}
              {translateText(field("Долгота", "lng", "number"))}
              {translateText(field("Открытие", "open", "time"))}
              {translateText(field("Закрытие", "close", "time"))}
            </div>
            <button
              type="button"
              className="bw-btn"
              onClick={() => {
                if (!supportsLocation()) {
                  setNotice(
                    "Геолокация недоступна. Введите координаты вручную.",
                  );
                  return;
                }
                getDevicePosition(
                  (p) => {
                    update("lat", p.coords.latitude);
                    update("lng", p.coords.longitude);
                    setNotice(
                      "Координаты определены. Проверьте адрес и сохраните.",
                    );
                  },
                  () =>
                    setNotice(
                      "Не удалось определить местоположение. Введите координаты вручную.",
                    ),
                );
              }}
            >
              {translateText("Определить мою локацию")}
            </button>
            <label className="bw-field">
              {translateText("Описание магазина")}
              <textarea
                value={draft.about}
                maxLength={1500}
                onChange={(e) => update("about", e.target.value)}
              />
            </label>
            <div className="bw-actions">
              <button className="bw-btn primary">
                {translateText("Сохранить изменения")}
              </button>
              <button
                className="bw-btn"
                type="button"
                onClick={() => {
                  setDraft(initial());
                  setNotice("Изменения отменены.");
                }}
              >
                {translateText("Отмена")}
              </button>
            </div>
          </form>
        )}
        {tab === "orders" && <Orders account={account} ownerId={id} />}
        {tab === "reviews" && <Reviews account={account} ownerId={id} />}
        {tab === "stats" && <Sales ownerId={id} />}
        {tab === "followers" && (
          <section className="bw-card">
            <h2>
              {translateText("Подписчики · ")}
              {followers.length}
            </h2>
            {followers.length ? (
              followers.map((f) => (
                <div className="bw-address" key={f.buyerId}>
                  {translateText(f.name)}
                </div>
              ))
            ) : (
              <p>{translateText("Пока никто не подписался на магазин.")}</p>
            )}
          </section>
        )}
        {tab === "messages" && (
          <>
            <ProfileChat account={account} ownerId={id} />
            <form
              className="bw-card"
              onSubmit={(e) => {
                e.preventDefault();
                try {
                  setAutoReply(id, replyEnabled, replyText);
                  setNotice("Автоответчик сохранён");
                } catch {
                  setNotice("Не удалось сохранить автоответчик");
                }
              }}
            >
              <h2>{translateText("Автоответчик")}</h2>
              <p>
                {translateText(
                  "Отвечает один раз на первое сообщение нового покупателя. Ответ отмечается как автоматический.",
                )}
              </p>
              <label className="bw-check">
                <input
                  type="checkbox"
                  checked={replyEnabled}
                  onChange={(e) => setReplyEnabled(e.target.checked)}
                />{" "}
                {translateText("Включён")}
              </label>
              <label className="bw-field">
                {translateText("Текст приветствия")}
                <textarea
                  value={replyText}
                  maxLength={1000}
                  required
                  onChange={(e) => setReplyText(e.target.value)}
                />
              </label>
              <button className="bw-btn primary">
                {translateText("Сохранить автоответчик")}
              </button>
            </form>
          </>
        )}
        {tab === "subscription" && (
          <section className="bw-card">
            <Crown size={28} />
            <h2>{translateText("Подписка BakeU")}</h2>
            <p>
              {translateText(
                "Подписка не активирована. Оплата ещё не подключена.",
              )}
            </p>
            <p>
              {translateText(
                "После подключения оплаты здесь появятся тариф, срок действия и история платежей. Подписка позволит размещать товары на главной.",
              )}
            </p>
          </section>
        )}
      </div>
    </div>
  );
}
