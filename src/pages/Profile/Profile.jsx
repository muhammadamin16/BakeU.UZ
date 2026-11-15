import {
  accountApiEnabled,
  getServerProfile,
} from "../../bot/client/accountApi";
import {
  saveLocalProfile,
  readAccounts,
  accountId,
} from "../../store/localAccount";
import { clearSession, getSessionProfile } from "../../store/session";
import { useState, useEffect } from "react";
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

  const [serverApplication, setServerApplication] = useState(null);
  const [serverError, setServerError] = useState("");
  useEffect(() => {
    if (!accountApiEnabled || !account?.server) return;
    let cancelled = false;
    const refresh = async () => {
      try {
        const result = await getServerProfile();
        if (!cancelled) {
          setServerApplication(result.application);
          setServerError("");
        }
      } catch (error) {
        if (!cancelled) setServerError(error.message);
      }
    };
    void refresh();
    const timer = setInterval(refresh, 30000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [account?.id, account?.server]);

  if (params.get("shop"))
    return <SellerShop key={params.get("shop")} shopId={params.get("shop")} />;

  if (!account || !["client", "seller"].includes(account.role))
    return <Navigate to="/login" replace />;

  const saveAccount = async (next) => {
    const saved = await saveLocalProfile(account, next);
    setAccount(saved);
  };

  const logout = () => {
    clearSession();
    navigate("/login", { replace: true });
  };

  return (
    <main className="bw-page">
      {serverApplication && (
        <p className="bw-demo">
          Заявка магазина «{serverApplication.shop}»: {serverApplication.status}
          {serverApplication.reason ? ` · ${serverApplication.reason}` : ""}
        </p>
      )}
      {serverError && (
        <p className="bw-demo" role="status">
          {serverError}
        </p>
      )}
      <p className="bw-demo">
        {account.server
          ? "Аккаунт хранится на сервере. Заявка магазина проверяется администратором в Telegram. Товары, заказы и чат этого кабинета пока работают локально."
          : "Демо-кабинет · изменения сохраняются в этом браузере. Чат и заказы работают локально; оплата и доставка сообщений требуют сервера."}
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
