import {
  UserRound,
  Mail,
  Phone,
  ShoppingBag,
  Heart,
  LogOut,
  ArrowRight,
} from "lucide-react";
export default function ClientProfile({ account, onLogout }) {
  return (
    <div className="bp-dashboard">
      <div className="bp-dashboard-top">
        <div>
          <span className="bp-kicker">ЛИЧНЫЙ КАБИНЕТ</span>
          <h1>Здравствуйте, {account.firstName}!</h1>
          <p>Добро пожаловать в ваш профиль BakeU.</p>
        </div>
        <button className="bp-logout" onClick={onLogout}>
          <LogOut size={17} /> Выйти
        </button>
      </div>
      <div className="bp-dashboard-grid">
        <section className="bp-panel">
          <div className="bp-account-avatar">
            <UserRound size={28} />
          </div>
          <span className="bp-account-role">ПОКУПАТЕЛЬ</span>
          <h2>
            {account.firstName} {account.lastName}
          </h2>
          <div className="bp-detail">
            <Mail size={18} />
            <span>{account.email}</span>
          </div>
          <div className="bp-detail">
            <Phone size={18} />
            <span>{account.phone}</span>
          </div>
        </section>
        <section className="bp-panel">
          <h2>Ваши возможности</h2>
          <p>
            Покупайте ингредиенты и открывайте новые рецепты вместе с BakeU.
          </p>
          <div className="bp-feature">
            <ShoppingBag size={22} />
            <span>
              <strong>Мои покупки</strong>
              <small>Заказы появятся после подключения backend</small>
            </span>
            <ArrowRight size={17} />
          </div>
          <div className="bp-feature">
            <Heart size={22} />
            <span>
              <strong>Избранное</strong>
              <small>Сохраняйте любимые товары и рецепты</small>
            </span>
            <ArrowRight size={17} />
          </div>
        </section>
      </div>
    </div>
  );
}
