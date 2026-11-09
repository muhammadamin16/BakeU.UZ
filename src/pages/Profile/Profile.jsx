import { Navigate, useNavigate } from "react-router-dom";
import ClientProfile from "./client/ClientProfile";
import SellerProfile from "./seller/SellerProfile";
import "./Profile.css";

export default function Profile() {
  const navigate = useNavigate();
  let account = null;
  try {
    account = JSON.parse(
      sessionStorage.getItem("bakeu-demo-profile") || "null",
    );
  } catch {
    /* ignore invalid demo data */
  }
  if (!account || !["client", "seller"].includes(account.role))
    return <Navigate to="/login" replace />;
  const logout = () => {
    sessionStorage.removeItem("bakeu-demo-profile");
    navigate("/login", { replace: true });
  };
  return (
    <main className="bp-page container" >
      <div className="bp-shell bp-profile-shell">
        <p className="bp-notice" role="status">
          Демо-профиль: данные не отправлялись на сервер
        </p>
        {account.role === "seller" ? (
          <SellerProfile account={account} onLogout={logout} />
        ) : (
          <ClientProfile account={account} onLogout={logout} />
        )}
      </div>
    </main>
  );
}
