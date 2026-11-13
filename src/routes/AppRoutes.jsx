
import { Routes, Route, Navigate, useLocation } from "react-router-dom";

import Header from "../components/Header/Header";
import MobileNav from "../components/MobileNav/MobileNav";
import Footer from "../components/Footer/Footer";
import AuthModal from "../components/AuthModal/AuthModal";

import Cart from "../pages/Cart/Cart";
import Favorites from "../pages/Favorites/Favorites";
import Home from "../pages/Home/Home";
import Map from "../pages/Map/Map";
import AiAssistant from "../pages/AiAssistant/AiAssistant";
import Chat from "../pages/Messages/Chat";

import Login from "../pages/Auth/Login/Login";
import Register from "../pages/Auth/Register/Register";
import Profile from "../pages/Profile/Profile";
import Seller from "../pages/Seller/Seller";

export default function AppRoutes() {
  const location = useLocation();

  const isAuthPage = ["/login", "/register"].includes(
    location.pathname
  );

  return (
    <>
      {!isAuthPage && <Header />}

      <main className="container">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/cart" element={<Cart />} />
          <Route path="/favorites" element={<Favorites />} />
          <Route path="/map" element={<Map />} />
          <Route path="/ai" element={<AiAssistant />} />
          <Route path="/messages" element={<Chat />} />
          <Route path="/seller" element={<Seller />} />

          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/profile" element={<Profile />} />

          <Route
            path="*"
            element={<Navigate to="/" replace />}
          />
        </Routes>
      </main>

      {/* Home sahifasida modal */}
      {location.pathname === "/" && <AuthModal />}

      {!isAuthPage && <MobileNav />}
      {!isAuthPage && <Footer />}
    </>
  );
}
