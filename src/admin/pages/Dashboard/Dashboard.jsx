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
import StatCard from "../../components/StatCard/StatCard";
import { Badge, PageTitle, Modal, RecordForm } from "../../components/AdminUI";
import "./Dashboard.css";
function Mini({ icon: Icon, label, value, tone = "orange" }) {
  return (
    <div className={`ad-mini ${tone}`}>
      <Icon size={21} />
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
      </div>
    </div>
  );
}
function Heading({ icon: Icon, title, to, label }) {
  return (
    <div className="ad-section-heading">
      <h2>
        <Icon size={23} />
        {title}
      </h2>
      <Link className="ad-btn small" to={to}>
        {label} ›
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
  const matches = (row) =>
    Object.values(row).some((v) => String(v).toLowerCase().includes(q));
  const inPeriod = (row) =>
    !row.date ||
    new Date(row.date + "T23:59:59").getTime() >=
      now - Number(period) * 86400000;
  const applications = data.applications.filter(
    (x) => matches(x) && inPeriod(x),
  );
  const customers = data.customers.filter((x) => matches(x) && inPeriod(x));
  const orders = data.orders.filter((x) => matches(x) && inPeriod(x));
  const subs = data.subscriptions.filter(matches);
  const pending = applications.filter((x) => x.status === "На проверке");
  const active = subs.filter((x) => x.status === "Активна");
  const notes = data.notifications.filter(matches);
  const paid = subs.reduce((sum, x) => sum + Number(x.paid || 0), 0);
  return (
    <>
      <PageTitle title="Обзор BakeU">
        <span className="ad-demo">Демо-данные</span>
        <label className="ad-period">
          <CalendarDays size={18} />
          <select
            aria-label="Период"
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
          >
            <option value="7">Последние 7 дней</option>
            <option value="30">Последние 30 дней</option>
            <option value="365">Последний год</option>
          </select>
        </label>
      </PageTitle>
      <div className="ad-stats">
        <StatCard
          icon={Users}
          label="Покупатели"
          value={customers.length}
          to="/admin/customers"
        />
        <StatCard
          icon={Store}
          label="Магазины"
          value={data.shops.filter(matches).length}
          to="/admin/shops"
        />
        <StatCard
          icon={Package}
          label="Товары"
          value={data.products.filter(matches).length}
          to="/admin/products"
        />
        <StatCard
          icon={ShoppingCart}
          label="Заказы"
          value={orders.length}
          to="/admin/orders"
        />
        <StatCard
          icon={CreditCard}
          label="Активные подписки"
          value={active.length}
          to="/admin/subscriptions"
        />
      </div>
      <div className="ad-dashboard-grid">
        <section className="ad-panel ad-applications">
          <Heading
            icon={Store}
            title="Заявки на открытие магазина"
            to="/admin/applications"
            label="Все заявки"
          />
          <div className="ad-minis">
            <Mini icon={Clock} label="На проверке" value={pending.length} />
            <Mini
              icon={CheckCircle2}
              label="Одобрено"
              value={applications.filter((x) => x.status === "Одобрено").length}
              tone="green"
            />
            <Mini
              icon={XCircle}
              label="Отклонено"
              value={
                applications.filter((x) => x.status === "Отклонено").length
              }
              tone="red"
            />
            <Mini
              icon={Store}
              label="Открыто"
              value={data.shops.filter((x) => x.status === "Открыт").length}
            />
          </div>
          <div className="ad-table-wrap">
            <table className="ad-table">
              <thead>
                <tr>
                  <th>Заявитель</th>
                  <th>Дата заявки</th>
                  <th>Действия</th>
                </tr>
              </thead>
              <tbody>
                {pending.slice(0, 3).map((a) => (
                  <tr key={a.id}>
                    <td>
                      <strong>{a.name}</strong>
                      <small>Магазин: {a.shop}</small>
                    </td>
                    <td>{date(a.date)}</td>
                    <td>
                      <div className="ad-row-actions">
                        <button
                          className="ad-btn small green"
                          onClick={() => data.decide(a.id, "Одобрено")}
                        >
                          ✓ Одобрить
                        </button>
                        <button
                          className="ad-btn small red"
                          onClick={() => data.decide(a.id, "Отклонено")}
                        >
                          × Отклонить
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!pending.length && (
              <p className="ad-empty">Все заявки обработаны</p>
            )}
          </div>
        </section>
        <section className="ad-panel ad-dashboard-notes">
          <Heading
            icon={Bell}
            title="Уведомления"
            to="/admin/notifications"
            label="Все уведомления"
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
                  <strong>{n.title}</strong>
                  <p>{n.text}</p>
                </div>
                <small>{n.time}</small>
              </Link>
            ))
          ) : (
            <p className="ad-empty">Уведомления отключены в настройках</p>
          )}
          {!notes.length && <p className="ad-empty">Уведомлений нет</p>}
        </section>
        <section className="ad-panel">
          <Heading
            icon={CreditCard}
            title="Покупки подписок"
            to="/admin/subscriptions"
            label="Все подписки"
          />
          <div className="ad-minis">
            <Mini
              icon={CheckCircle2}
              label="Активны"
              value={active.length}
              tone="green"
            />
            <Mini
              icon={Clock}
              label="Скоро истекают"
              value={subs.filter((x) => x.status === "Скоро истекает").length}
            />
            <Mini
              icon={XCircle}
              label="Истекли"
              value={subs.filter((x) => x.status === "Истекла").length}
              tone="red"
            />
            <Mini icon={Coins} label="Оплачено" value={money(paid)} />
          </div>
          <div className="ad-table-wrap">
            <table className="ad-table">
              <thead>
                <tr>
                  <th>Продавец / магазин</th>
                  <th>Тариф</th>
                  <th>Оплачено</th>
                  <th>Действует до</th>
                  <th>Статус</th>
                </tr>
              </thead>
              <tbody>
                {subs.slice(0, 3).map((s) => (
                  <tr key={s.id}>
                    <td>
                      <strong>{s.name}</strong>
                      <small>{s.shop}</small>
                    </td>
                    <td>
                      <span className="ad-badge orange">{s.plan}</span>
                    </td>
                    <td>{money(s.paid)}</td>
                    <td>{date(s.until)}</td>
                    <td>
                      <Badge>{s.status}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!subs.length && <p className="ad-empty">Подписок пока нет</p>}
          </div>
        </section>
        <section className="ad-panel">
          <div className="ad-section-heading">
            <h2>
              <UserPlus size={23} />
              Новые пользователи
            </h2>
          </div>
          <div className="ad-user-summary">
            <Link to="/admin/customers">
              <Users size={23} />
              Покупатели <b>+{customers.length}</b>
            </Link>
            <Link to="/admin/shops">
              <Store size={23} />
              Продавцы <b>+{data.shops.filter(matches).length}</b>
            </Link>
          </div>
          <div className="ad-table-wrap">
            <table className="ad-table">
              <thead>
                <tr>
                  <th>Пользователь</th>
                  <th>Роль</th>
                  <th>Дата регистрации</th>
                </tr>
              </thead>
              <tbody>
                {customers.slice(0, 3).map((c) => (
                  <tr key={c.id}>
                    <td>{c.name}</td>
                    <td>
                      <span className="ad-badge orange">Покупатель</span>
                    </td>
                    <td>{date(c.date)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!customers.length && <p className="ad-empty">Пользователей нет</p>}
          </div>
          <button
            className="ad-btn primary ad-full"
            onClick={() => setAdding(true)}
          >
            <UserPlus size={18} />
            Добавить пользователя
          </button>
        </section>
      </div>
      {adding && (
        <Modal title="Добавить пользователя" onClose={() => setAdding(false)}>
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
