import {
  Store,
  Mail,
  Phone,
  MapPin,
  PackagePlus,
  ClipboardList,
  LogOut,
  ArrowRight,
  UserRound,
} from "lucide-react";
export default function SellerProfile({ account, onLogout }) {
  return (
    <div className="bp-dashboard">
      <div className="bp-dashboard-top">
        <div>
          <span className="bp-kicker">КАБИНЕТ ПРОДАВЦА</span>
          <h1>Добро пожаловать, {account.firstName}!</h1>
          <p>Управляйте своим магазином в BakeU.</p>
        </div>
        <button className="bp-logout" onClick={onLogout}>
          <LogOut size={17} /> Выйти
        </button>
      </div>
      <div className="bp-dashboard-grid">
        <section className="bp-panel">
          <div className="bp-account-avatar">
            <Store size={28} />
          </div>
          <span className="bp-account-role">ПРОДАВЕЦ</span>
          <h2>{account.company}</h2>
          <div className="bp-detail">
            <UserRound size={18} />
            <span>
              {account.firstName} {account.lastName}
            </span>
          </div>
          <div className="bp-detail">
            <Mail size={18} />
            <span>{account.email}</span>
          </div>
          <div className="bp-detail">
            <Phone size={18} />
            <span>{account.phone}</span>
          </div>
          <div className="bp-detail">
            <MapPin size={18} />
            <span>{account.location}</span>
          </div>
        </section>
        <section className="bp-panel">
          <h2>Панель магазина</h2>
          <p>Основные разделы для будущего управления продажами.</p>
          <div className="bp-feature">
            <PackagePlus size={22} />
            <span>
              <strong>Мои товары</strong>
              <small>Добавление товаров — следующий этап</small>
            </span>
            <ArrowRight size={17} />
          </div>
          <div className="bp-feature">
            <ClipboardList size={22} />
            <span>
              <strong>Заказы</strong>
              <small>История и обработка заказов — следующий этап</small>
            </span>
            <ArrowRight size={17} />
          </div>
        </section>
      </div>
    </div>
  );
}
