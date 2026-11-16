import { useLocation } from "react-router-dom";
import { useMiniApp } from "./context";
import { canPreviewAdminDemo } from "./adminAccess";

export function useAdminAccess() {
  const { pathname } = useLocation();
  const session = useMiniApp();
  const options = {
    miniMode: Boolean(session.isMiniMode),
  };
  return {
    ...session,
    verifiedAdmin: session.status === "ready" && session.isAdmin,
    demoPreview: canPreviewAdminDemo({ ...options, pathname }),
    canPreviewDemo: canPreviewAdminDemo({ ...options, pathname: "/admin" }),
  };
}
