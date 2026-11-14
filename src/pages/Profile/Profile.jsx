import {
  saveLocalProfile,
  readAccounts,
  accountId,
} from "../../store/localAccount";
import { clearSession, getSessionProfile } from "../../store/session";
import { useState } from "react";
import { Navigate, useNavigate, useSearchParams } from "react-router-dom";
import ClientProfile from "./client/ClientProfile";
import SellerProfile from "./seller/SellerProfile";
import SellerShop from "../Seller/SellerShop";

import "./Workspace.css";

export default function Profile() {
  const navigate = useNavigate();
  const [params] = useSearchParams();

  const [account, setAccount] = useState(() => {
    try {
      const current = getSessionProfile();
      return current
        ? readAccounts()[accountId(current)]?.profile || current
        : null;
    } catch {
      return null;
    }
  });

  if (params.get("shop"))
    return <SellerShop key={params.get("shop")} shopId={params.get("shop")} />;

  if (!account || !["client", "seller"].includes(account.role))
    return <Navigate to="/login" replace />;

  const saveAccount = (next) => {
    const saved = saveLocalProfile(account, next);
    setAccount(saved);
  };

  const logout = () => {
    clearSession();
    navigate("/login", { replace: true });
  };

  return (
    <main className="bw-page">
      <p className="bw-demo">
        Демо-кабинет · изменения сохраняются в этом браузере. Чат и заказы
        работают локально; оплата, реальная доставка сообщений и уведомления
        требуют сервера.
      </p>
      {account.role === "seller" ? (
        <SellerProfile
          account={account}
          onLogout={logout}
          onSave={saveAccount}
          initialShop={params.get("chat")}
        />
      ) : (
        <ClientProfile
          account={account}
          onLogout={logout}
          onSave={saveAccount}
          initialShop={params.get("chat")}
        />
      )}
    </main>
  );
}