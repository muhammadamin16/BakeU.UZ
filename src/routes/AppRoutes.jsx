import { useMiniApp } from "../miniapp/context";
import Welcome from "../miniapp/pages/Welcome";
import AdminGate from "../miniapp/components/AdminGate";
import AdminRoutes from "../admin/routes/AdminRoutes";
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
import MapPage from "../pages/Map/Map";
import AiAssistant from "../pages/AiAssistant/AiAssistant";
import Chat from "../pages/Messages/Chat";

import Login from "../pages/Auth/Login/Login";
import Register from "../pages/Auth/Register/Register";
import Profile from "../pages/Profile/Profile";
import Seller from "../pages/Seller/Seller";

const AUTH_PATHS = ["/login", "/register"];

const NO_FOOTER_PREFIXES = ["/ai", "/profile", "/checkout", "/orders"];

function matchesPath(pathname, base) {
  return pathname === base || pathname.startsWith(`${base}/`);
}

export default function AppRoutes() {
  const { pathname } = useLocation();
  const { isMiniMode } = useMiniApp();

  const isAuthPage = AUTH_PATHS.includes(pathname);
  const isHome = pathname === "/";
  const showFooter =
    !isAuthPage &&
    !NO_FOOTER_PREFIXES.some((base) => matchesPath(pathname, base));

  if (matchesPath(pathname, "/miniapp")) return <Welcome />;
  if (matchesPath(pathname, "/admin"))
    return (
      <AdminGate allowLocalPreview>
        <AdminRoutes />
      </AdminGate>
    );

  return (
    <>
      {!isAuthPage && <Header />}

      <main className="container">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/product/:id" element={<Product />} />
          <Route path="/cart" element={<Cart />} />
          <Route path="/checkout" element={<Checkout />} />
          <Route path="/orders" element={<Orders />} />
          <Route path="/orders/:id" element={<OrderDetails />} />
          <Route path="/favorites" element={<Favorites />} />
          <Route path="/map" element={<MapPage />} />
          <Route path="/ai" element={<AiAssistant />} />
          <Route path="/messages" element={<Chat />} />
          <Route path="/seller" element={<Seller />} />

          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/profile" element={<Profile />} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      {isHome && !isMiniMode && <AuthModal />}

      <MobileNav />
      {showFooter && <Footer />}
    </>
  );
}
