import { translateText } from "../../../i18n/index.js";
import { ArrowUpRight } from "lucide-react";
import { matchesSearch } from "../../utils/management";
import { money, date } from "../../utils/format";
import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  Users,
  Store,
  Package,
  ShoppingCart,
  CreditCard,
  ClipboardList,
  Bell,
  UserPlus,
  Clock,
  CheckCircle2,
  XCircle,
  Coins,
  CalendarDays,
} from "lucide-react";
import { useAdminStore } from "../../store/adminStore";
import { ApplicationDecisionActions } from "../../components/ManagementActions";
import StatCard from "../../components/StatCard/StatCard";
import { Badge, PageTitle, Modal, RecordForm } from "../../components/AdminUI";
import "./Dashboard.css";
function Mini({ icon: Icon, label, value, tone = "orange" }) {
  return (
    <div className={`ad-mini ${tone}`}>
      <Icon size={21} />
      <div>
        <span>{translateText(label)}</span>
        <strong>{translateText(value)}</strong>
      </div>
    </div>
  );
}
function Heading({ icon: Icon, title, to, label }) {
  return (
    <div className="ad-section-heading">
      <h2>
        <Icon size={23} />
        {translateText(title)}
      </h2>
      <Link className="ad-btn small" to={to}>
        {translateText(label)} ›
      </Link>
    </div>
  );
}
const userFields = [
  { key: "name", label: "Имя" },
  { key: "phone", label: "Телефон", type: "tel" },
  { key: "email", label: "Email", type: "email" },
  { key: "date", label: "Дата регистрации", type: "date" },
  { key: "status", label: "Статус", options: ["Активен", "Заблокирован"] },
];
export default function Dashboard() {
  const data = useAdminStore();
  const [now] = useState(() => Date.now());
  const [period, setPeriod] = useState("30");
  const [adding, setAdding] = useState(false);
  const [params] = useSearchParams();
  const q = (params.get("q") || "").toLowerCase();
  const matches = (row) => matchesSearch(row, q);
  const inPeriod = (row) =>
    !row.date ||
    new Date(row.date + "T23:59:59").getTime() >=
      now - Number(period) * 86400000;
  const applications = data.applications.filter(
    (x) => matches(x) && inPeriod(x),
  );
  const customers = data.customers.filter((x) => matches(x) && inPeriod(x));
  const sellers = data.sellers.filter(matches);
  const orders = data.orders.filter((x) => matches(x) && inPeriod(x));
  const subs = data.subscriptions.filter(matches);
  const pending = applications.filter((x) => x.status === "На проверке");
  const active = subs.filter((x) => x.status === "Активна");
  const notes = data.notifications.filter(matches);
  const paid = subs.reduce((sum, x) => sum + Number(x.paid || 0), 0);
  return (
    <>
      <PageTitle title={translateText("Обзор BakeU")}>
        <span className="ad-demo">{translateText("Демо-данные")}</span>
        <label className="ad-period">
          <CalendarDays size={18} />
          <select
            aria-label={translateText("Период")}
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
          >
            <option value="7">{translateText("Последние 7 дней")}</option>
            <option value="30">{translateText("Последние 30 дней")}</option>
            <option value="365">{translateText("Последний год")}</option>
          </select>
        </label>
      </PageTitle>
      <div className="ad-stats">
        <StatCard
          icon={Users}
          label={translateText("Покупатели")}
          value={customers.length}
          to="/admin/customers"
        />
        <StatCard
          icon={Store}
          label={translateText("Магазины")}
          value={data.shops.filter(matches).length}
          to="/admin/shops"
        />
        <StatCard
          icon={Package}
          label={translateText("Товары")}
          value={data.products.filter(matches).length}
          to="/admin/products"
        />
        <StatCard
          icon={ShoppingCart}
          label={translateText("Заказы")}
          value={orders.length}
          to="/admin/orders"
        />
        <StatCard
          icon={CreditCard}
          label={translateText("Активные подписки")}
          value={active.length}
          to="/admin/subscriptions"
        />
      </div>
      <div className="ad-dashboard-grid">
        <section className="ad-panel ad-applications">
          <Heading
            icon={Store}
            title={translateText("Заявки на открытие магазина")}
            to="/admin/applications"
            label={translateText("Все заявки")}
          />
          <div className="ad-minis">
            <Mini
              icon={Clock}
              label={translateText("На проверке")}
              value={pending.length}
            />
            <Mini
              icon={CheckCircle2}
              label={translateText("Одобрено")}
              value={applications.filter((x) => x.status === "Одобрено").length}
              tone="green"
            />
            <Mini
              icon={XCircle}
              label={translateText("Отклонено")}
              value={
                applications.filter((x) => x.status === "Отклонено").length
              }
              tone="red"
            />
            <Mini
              icon={Store}
              label={translateText("Открыто")}
              value={data.shops.filter((x) => x.status === "Открыт").length}
            />
          </div>
          <div className="ad-table-wrap">
            <table className="ad-table">
              <thead>
                <tr>
                  <th>{translateText("Заявитель")}</th>
                  <th>{translateText("Дата заявки")}</th>
                  <th>{translateText("Действия")}</th>
                </tr>
              </thead>
              <tbody>
                {pending.slice(0, 3).map((a) => (
                  <tr key={a.id}>
                    <td>
                      <strong>{translateText(a.name)}</strong>
                      <small>
                        {translateText("Магазин: ")}
                        {translateText(a.shop)}
                      </small>
                    </td>
                    <td>{translateText(date(a.date))}</td>
                    <td>
                      <div className="ad-row-actions">
                        <ApplicationDecisionActions application={a} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!pending.length && (
              <p className="ad-empty">
                {translateText("Все заявки обработаны")}
              </p>
            )}
          </div>
        </section>
        <section className="ad-panel ad-dashboard-notes">
          <Heading
            icon={Bell}
            title={translateText("Уведомления")}
            to="/admin/notifications"
            label={translateText("Все уведомления")}
          />
          {data.settings.notifications ? (
            notes.slice(0, 4).map((n, i) => (
              <Link
                to="/admin/notifications"
                className={`ad-notice ${n.read ? "read" : ""}`}
                key={n.id}
              >
                <span className="ad-notice-icon">
                  {i === 0 ? (
                    <ClipboardList size={20} />
                  ) : i === 1 ? (
                    <CreditCard size={20} />
                  ) : i === 2 ? (
                    <Store size={20} />
                  ) : (
                    <UserPlus size={20} />
                  )}
                </span>
                <div>
                  <strong>{translateText(n.title)}</strong>
                  <p>{translateText(n.text)}</p>
                </div>
                <small>{translateText(n.time)}</small>
              </Link>
            ))
          ) : (
            <p className="ad-empty">
              {translateText("Уведомления отключены в настройках")}
            </p>
          )}
          {!notes.length && (
            <p className="ad-empty">{translateText("Уведомлений нет")}</p>
          )}
        </section>
        <section className="ad-panel">
          <Heading
            icon={CreditCard}
            title={translateText("Покупки подписок")}
            to="/admin/subscriptions"
            label={translateText("Все подписки")}
          />
          <div className="ad-minis">
            <Mini
              icon={CheckCircle2}
              label={translateText("Активны")}
              value={active.length}
              tone="green"
            />
            <Mini
              icon={Clock}
              label={translateText("Скоро истекают")}
              value={subs.filter((x) => x.status === "Скоро истекает").length}
            />
            <Mini
              icon={XCircle}
              label={translateText("Истекли")}
              value={subs.filter((x) => x.status === "Истекла").length}
              tone="red"
            />
            <Mini
              icon={Coins}
              label={translateText("Оплачено")}
              value={money(paid)}
            />
          </div>
          <div className="ad-table-wrap">
            <table className="ad-table">
              <thead>
                <tr>
                  <th>{translateText("Продавец / магазин")}</th>
                  <th>{translateText("Тариф")}</th>
                  <th>{translateText("Оплачено")}</th>
                  <th>{translateText("Действует до")}</th>
                  <th>{translateText("Статус")}</th>
                </tr>
              </thead>
              <tbody>
                {subs.slice(0, 3).map((s) => (
                  <tr key={s.id}>
                    <td>
                      <strong>{translateText(s.name)}</strong>
                      <small>{translateText(s.shop)}</small>
                    </td>
                    <td>
                      <span className="ad-badge orange">
                        {translateText(s.plan)}
                      </span>
                    </td>
                    <td>{translateText(money(s.paid))}</td>
                    <td>{translateText(date(s.until))}</td>
                    <td>
                      <Badge>{translateText(s.status)}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!subs.length && (
              <p className="ad-empty">{translateText("Подписок пока нет")}</p>
            )}
          </div>
        </section>
        <section className="ad-panel">
          <div className="ad-section-heading">
            <h2>
              <UserPlus size={23} />
              {translateText("Новые пользователи")}
            </h2>
          </div>
          <div className="ad-user-summary">
            <Link to="/admin/customers">
              <Users size={23} />
              {translateText("Покупатели ")}
              <b>+{customers.length}</b>
            </Link>
            <Link to="/admin/sellers">
              <Store size={23} />
              {translateText("Продавцы ")}
              <b>+{sellers.length}</b>
            </Link>
          </div>
          <div className="ad-table-wrap">
            <table className="ad-table">
              <thead>
                <tr>
                  <th>{translateText("Пользователь")}</th>
                  <th>{translateText("Роль")}</th>
                  <th>{translateText("Дата регистрации")}</th>
                </tr>
              </thead>
              <tbody>
                {customers.slice(0, 3).map((c) => (
                  <tr key={c.id}>
                    <td>
                      <Link
                        className="ad-text-link"
                        to={`/admin/customers/${encodeURIComponent(c.id)}`}
                      >
                        {translateText(c.name)}{" "}
                        <ArrowUpRight
                          size={12}
                          className="ad-inline-arrow"
                          aria-hidden="true"
                        />
                      </Link>
                    </td>
                    <td>
                      <span className="ad-badge orange">
                        {translateText("Покупатель")}
                      </span>
                    </td>
                    <td>{translateText(date(c.date))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!customers.length && (
              <p className="ad-empty">{translateText("Пользователей нет")}</p>
            )}
          </div>
          <button
            className="ad-btn primary ad-full"
            onClick={() => setAdding(true)}
          >
            <UserPlus size={18} />
            {translateText("Добавить пользователя")}
          </button>
        </section>
      </div>
      {adding && (
        <Modal
          title={translateText("Добавить пользователя")}
          onClose={() => setAdding(false)}
        >
          <RecordForm
            fields={userFields}
            initial={{
              status: "Активен",
              date: new Date(now).toISOString().slice(0, 10),
            }}
            onClose={() => setAdding(false)}
            onSave={(x) => {
              data.save("customers", x);
              setAdding(false);
            }}
          />
        </Modal>
      )}
    </>
  );
}
