import { translateText } from "../../i18n/index.js";
import { getSessionProfile } from "../../store/session";
import { Link, Navigate, useSearchParams } from "react-router-dom";
import ProfileChat from "../Profile/ProfileChat";
import { shopIdFor } from "../../store/shopStore";
import "../Profile/Workspace.css";
import ServerChat from "./ServerChat.jsx";
import { goPhoneAccountsEnabled } from "../../api/goAccount.js";
export default function Chat() {
  return goPhoneAccountsEnabled ? <ServerChat /> : <DemoChat />;
}
function DemoChat() {
  const [params] = useSearchParams();
  const account = getSessionProfile();
  if (!account || !["client", "seller"].includes(account.role))
    return (
      <Navigate
        to={
          "/login?next=" + encodeURIComponent("/messages?" + params.toString())
        }
        replace
      />
    );
  const targetShop = params.get("seller");
  const buyingFromAnotherShop =
    targetShop &&
    account.role === "seller" &&
    targetShop !== shopIdFor(account);
  const chatAccount = buyingFromAnotherShop
    ? { ...account, role: "client" }
    : account;
  return (
    <main className="bw-page">
      {params.get("checkout") === "1" && (
        <Link className="bw-btn" to="/checkout">
          {translateText("Вернуться к оформлению")}
        </Link>
      )}
      <h1>{translateText("Сообщения")}</h1>
      <ProfileChat
        account={chatAccount}
        ownerId={chatAccount.role === "seller" ? shopIdFor(account) : undefined}
        initialShop={params.get("seller")}
      />
    </main>
  );
}
