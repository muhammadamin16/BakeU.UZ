import { lazy, Suspense } from "react";
import { translateText } from "../i18n/index.js";
import { useMiniApp } from "../miniapp/context";
import Welcome from "../miniapp/pages/Welcome";
import AdminGate from "../miniapp/components/AdminGate";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";

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
import GoPhoneAccount from "../pages/Auth/GoPhoneAccount.jsx";
import { goPhoneAccountsEnabled } from "../api/goAccount.js";
import Register from "../pages/Auth/Register/Register";
import Profile from "../pages/Profile/Profile";
import Seller from "../pages/Seller/Seller";

const AccountOrders = lazy(() => import("../telegramOrders/AccountOrders.jsx"));
const ServerStorefront = lazy(() =>
  import("../telegramOrders/AccountOrders.jsx").then((module) => ({
    default: module.ServerStorefront,
  })),
);

const AdminRoutes = lazy(() => import("../admin/routes/AdminRoutes"));
const MapPage = lazy(() => import("../pages/Map/Map"));
const AiAssistant = lazy(() => import("../pages/AiAssistant/AiAssistant"));

const AUTH_PATHS = ["/login", "/register"];

const NO_FOOTER_PREFIXES = ["/ai", "/profile", "/checkout", "/orders"];

function matchesPath(pathname, base) {
  return pathname === base || pathname.startsWith(`${base}/`);
}

export default function AppRoutes() {
  const { pathname } = useLocation();
  const { isMiniMode } = useMiniApp();
  const loading = <p role="status">{translateText("Загрузка…")}</p>;

  const isAuthPage = AUTH_PATHS.includes(pathname);
  const isHome = pathname === "/";
  const isMap = matchesPath(pathname.toLowerCase(), "/map");
  const compactFooter = isHome || pathname === "/seller";
  const contentClass = isMap
    ? "container site-content--map"
    : compactFooter
      ? "container site-content--compact-footer"
      : "container";
  const showFooter =
    !isAuthPage &&
    !isMap &&
    !NO_FOOTER_PREFIXES.some((base) => matchesPath(pathname, base));

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
  if (matchesPath(pathname, "/admin"))
    return (
      <AdminGate allowDemoPreview>
        <Suspense fallback={loading}>
          <AdminRoutes />
        </Suspense>
      </AdminGate>
    );

  return (
    <>
      {!isAuthPage && <Header />}

      <main className={contentClass}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/product/:id" element={<Product />} />
          <Route path="/cart" element={<Cart />} />
          <Route path="/checkout" element={<Checkout />} />
          <Route path="/orders" element={<Orders />} />
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
          <Route path="/orders/:id" element={<OrderDetails />} />
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

          <Route path="/login" element={goPhoneAccountsEnabled ? <GoPhoneAccount key="login" /> : <Login />} />
          <Route path="/register" element={goPhoneAccountsEnabled ? <GoPhoneAccount key="register" register /> : <Register />} />
          <Route path="/profile" element={goPhoneAccountsEnabled ? <Navigate to="/account/orders" replace /> : <Profile />} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      {isHome && !isMiniMode && <AuthModal />}

      <MobileNav />
      {showFooter && <Footer />}
    </>
  );
}
