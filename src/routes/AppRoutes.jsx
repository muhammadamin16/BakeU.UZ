import { lazy, Suspense } from "react";
import { translateText } from "../i18n/index.js";
import { useMiniApp } from "../miniapp/context";
import Welcome from "../miniapp/pages/Welcome";
import { Routes, Route, Navigate, useLocation, useParams, Link } from "react-router-dom";

import Header from "../components/Header/Header";
import MobileNav from "../components/MobileNav/MobileNav";
import Footer from "../components/Footer/Footer";
import AuthModal from "../components/AuthModal/AuthModal";

import Product from "../pages/Product/Product";
import Cart from "../pages/Cart/Cart";
import Checkout from "../pages/Checkout/Checkout";
import Orders from "../pages/Orders/Orders";
import OrderDetails from "../pages/Orders/OrderDetails";
import Favorites from "../pages/Favorites/Favorites";
import Home from "../pages/Home/Home";
import Chat from "../pages/Messages/Chat";

import Login from "../pages/Auth/Login/Login";
import PhoneAccount from "../pages/Auth/PhoneAccount.jsx";
import { serverCatalogEnabled } from "../api/usePublicCatalog.js";
import { localAccountsEnabled, phoneAccountsEnabled } from "../api/account.js";
import { miniLaunch } from "../miniapp/telegram.js";
import Register from "../pages/Auth/Register/Register";
import Profile from "../pages/Profile/Profile";
import Seller from "../pages/Seller/Seller";

const ProductPage = lazy(() => import("../orders/ProductPage.jsx"));
const AccountOrders = lazy(() => import("../orders/AccountOrders.jsx"));
const ServerStorefront = lazy(() =>
  import("../orders/AccountOrders.jsx").then((module) => ({
    default: module.ServerStorefront,
  })),
);

const ServerWorkspace = lazy(() => import("../admin/routes/AdminRoutes.jsx"));
const MapPage = lazy(() => import("../pages/Map/Map"));
const AiAssistant = lazy(() => import("../pages/AiAssistant/AiAssistant"));

const AUTH_PATHS = ["/login", "/register"];

const NO_FOOTER_PREFIXES = ["/ai", "/profile", "/checkout", "/orders"];

function matchesPath(pathname, base) {
  return pathname === base || pathname.startsWith(`${base}/`);
}

function OrderRedirect() {
  const { id } = useParams();
  return <Navigate to={`/account/orders?order=${encodeURIComponent(id)}`} replace />;
}

export default function AppRoutes() {
  const { pathname } = useLocation();
  const { isMiniMode, status: miniStatus, accountLinked, retry: retryMini, error: miniError } = useMiniApp();
  const loading = <p role="status">{translateText("Загрузка…")}</p>;

  const isAuthPage = AUTH_PATHS.includes(pathname);
  const isHome = pathname === "/";
  const isMap = matchesPath(pathname.toLowerCase(), "/map");
  const compactFooter = isHome || pathname === "/seller";
  const contentClass = [
    "container",
    isMap && "site-content--map",
    compactFooter && "site-content--compact-footer",
    pathname === "/ai" && "site-content--ai",
  ].filter(Boolean).join(" ");
  const showFooter =
    !isAuthPage &&
    !isMap &&
    !NO_FOOTER_PREFIXES.some((base) => matchesPath(pathname, base));

  const privateAccountPage = ["/account/orders", "/profile", "/orders", "/checkout", "/cart", "/messages"].some((base) => matchesPath(pathname, base));
  if (phoneAccountsEnabled && miniLaunch.isTelegram && privateAccountPage && (miniStatus !== "ready" || accountLinked === false))
    return <main className="tg-orders-panel" style={{ maxWidth: 720, margin: "24px auto" }}>
      <h1>Аккаунт BakeU</h1>
      {miniStatus === "loading" ? loading : <>
        <p role="status">{miniError || "Подтвердите аккаунт для этого Telegram-профиля. Ваши заказы сохранятся в одном аккаунте."}</p>
        <Link to="/register">Создать подтверждённый аккаунт</Link>
        <Link to="/miniapp">На главную</Link>
        <button type="button" onClick={retryMini}>Проверить привязку снова</button>
      </>}
    </main>;

  if (
    matchesPath(pathname, "/telegram/link") ||
    matchesPath(pathname, "/account/orders")
  )
    return (
      <Suspense fallback={loading}>
        <AccountOrders />
      </Suspense>
    );
  if (matchesPath(pathname, "/shop"))
    return (
      <Suspense fallback={loading}>
        <ServerStorefront />
      </Suspense>
    );
  if (matchesPath(pathname, "/miniapp")) return <Welcome />;
  if (matchesPath(pathname, "/admin")) {
    if (phoneAccountsEnabled && miniLaunch.isTelegram && miniStatus === "loading") return loading;
    return <Suspense fallback={loading}><ServerWorkspace /></Suspense>;
  }

  return (
    <>
      {!isAuthPage && <Header />}

      <main className={contentClass}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/product/:id" element={serverCatalogEnabled ? <Suspense fallback={loading}><ProductPage /></Suspense> : <Product />} />
          <Route path="/cart" element={(phoneAccountsEnabled || localAccountsEnabled) ? <Navigate to="/account/orders?checkout=1" replace /> : <Cart />} />
          <Route path="/checkout" element={(phoneAccountsEnabled || localAccountsEnabled) ? <Navigate to="/account/orders?checkout=1" replace /> : <Checkout />} />
          <Route path="/orders" element={(phoneAccountsEnabled || localAccountsEnabled) ? <Navigate to="/account/orders" replace /> : <Orders />} />
          <Route
            path="/telegram/link"
            element={
              <Suspense fallback={loading}>
                <AccountOrders />
              </Suspense>
            }
          />
          <Route
            path="/account/orders"
            element={
              <Suspense fallback={loading}>
                <AccountOrders />
              </Suspense>
            }
          />
          <Route path="/orders/:id" element={(phoneAccountsEnabled || localAccountsEnabled) ? <OrderRedirect /> : <OrderDetails />} />
          <Route path="/favorites" element={<Favorites />} />
          <Route
            path="/map"
            element={
              <Suspense fallback={loading}>
                <MapPage />
              </Suspense>
            }
          />
          <Route
            path="/ai"
            element={
              <Suspense fallback={loading}>
                <AiAssistant />
              </Suspense>
            }
          />
          <Route path="/messages" element={<Chat />} />
          <Route path="/seller" element={<Seller />} />

          <Route path="/login" element={phoneAccountsEnabled ? <PhoneAccount key="login" /> : localAccountsEnabled ? <Navigate to="/account/orders?auth=login" replace /> : <Login />} />
          <Route path="/register" element={phoneAccountsEnabled ? <PhoneAccount key="register" register /> : localAccountsEnabled ? <Navigate to="/account/orders?auth=buyer&register=1" replace /> : <Register />} />
          <Route path="/profile" element={(phoneAccountsEnabled || localAccountsEnabled) ? <Navigate to="/account/orders" replace /> : <Profile />} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      {isHome && !isMiniMode && !localAccountsEnabled && <AuthModal />}

      <MobileNav />
      {showFooter && <Footer />}
    </>
  );
}
