import { useLocation } from "react-router-dom";
import { useMiniApp } from "./context";
import { canPreviewLocalAdmin } from "./adminAccess";

export function useAdminAccess() {
  const { pathname } = useLocation();
  const session = useMiniApp();
  const options = {
    development: import.meta.env.DEV,
    hostname: typeof window === "undefined" ? "" : window.location.hostname,
    miniMode: Boolean(session.isMiniMode),
  };
  return {
    ...session,
    verifiedAdmin: session.status === "ready" && session.isAdmin,
    localPreview: canPreviewLocalAdmin({ ...options, pathname }),
    canPreviewDemo: canPreviewLocalAdmin({ ...options, pathname: "/admin" }),
  };
}
