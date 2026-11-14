import { Navigate, useSearchParams } from "react-router-dom";
import ProfileChat from "../Profile/ProfileChat";
import { shopIdFor } from "../../store/shopStore";
import "../Profile/Workspace.css";
export default function Chat() {
  const [params] = useSearchParams();
  let account;
  try {
    account = JSON.parse(
      sessionStorage.getItem("bakeu-demo-profile") || "null",
    );
  } catch {}
  if (!account || !["client", "seller"].includes(account.role))
    return <Navigate to="/login" replace />;
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
      <h1>Сообщения</h1>
      <ProfileChat
        account={chatAccount}
        ownerId={chatAccount.role === "seller" ? shopIdFor(account) : undefined}
        initialShop={params.get("seller")}
      />
    </main>
  );
}
