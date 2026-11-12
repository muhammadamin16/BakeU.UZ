import { Routes, Route, Navigate } from "react-router-dom";

import Header from "../components/Header/Header";
import MobileNav from "../components/MobileNav/MobileNav";
import Footer from "../components/Footer/Footer";

import Home from "../pages/Home/Home";
import Map from "../pages/Map/Map";
import AiAssistant from "../pages/AiAssistant/AiAssistant";
import Chat from "../pages/Messages/Chat";

import Login from "../pages/Auth/Login";
import Register from "../pages/Auth/Register";
import Profile from "../pages/Profile/Profile";
import Seller from "../pages/Seller/Seller";

export default function AppRoutes() {
  return (
    <>
      <Header />

      <div className="container">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/map" element={<Map />} />
          <Route path="/ai" element={<AiAssistant />} />
          <Route path="/seller" element={<Seller />} />
          <Route path="/messages" element={<Chat />} />

          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/profile" element={<Profile />} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>

        <MobileNav />
      </div>

      <Footer />
    </>
  );
}