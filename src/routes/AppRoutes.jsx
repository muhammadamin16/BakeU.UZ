import { Routes, Route } from "react-router-dom";
import Header from "../components/Header/Header";
import MobileNav from "../components/MobileNav/MobileNav";
import Home from "../pages/Home/Home";

export default function AppRoutes() {
  return (
    <>
      <Header />

      <Routes>
        <Route path="/" element={<Home />} />

        <Route
          path="*"
          element={
            <main className="container">
              <h2>Эту страницу добавим следующим этапом</h2>
            </main>
          }
        />
      </Routes>

      <MobileNav />
    </>
  );
}

