import { useCallback, useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { MiniAppContext } from "./context";
import { authenticateMiniApp } from "./api";
import { miniLaunch } from "./telegram";
import "./miniapp.css";
export default function MiniAppProvider({ children }) {
  const [state, setState] = useState({
    status: "loading",
    user: null,
    isAdmin: false,
    error: "",
    links: {},
  });
  const location = useLocation();
  const navigate = useNavigate();
  const retry = useCallback(async () => {
    setState((previous) => ({ ...previous, status: "loading", error: "" }));
    try {
      const session = await authenticateMiniApp({ force: true });
      setState(
        session
          ? { ...session, status: "ready", error: "" }
          : {
              status: "guest",
              user: null,
              isAdmin: false,
              error: "",
              links: {},
            },
      );
    } catch (error) {
      setState({
        status: "error",
        user: null,
        isAdmin: false,
        error: error.message,
        links: {},
      });
    }
  }, []);
  useEffect(() => {
    let active = true;
    const refresh = async () => {
      try {
        const session = await authenticateMiniApp();
        if (active)
          setState(
            session
              ? { ...session, status: "ready", error: "" }
              : {
                  status: "guest",
                  user: null,
                  isAdmin: false,
                  error: "",
                  links: {},
                },
          );
      } catch (error) {
        if (active)
          setState({
            status: "error",
            user: null,
            isAdmin: false,
            error: error.message,
            links: {},
          });
      }
    };
    void refresh();
    const onVisible = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    const timer = setInterval(refresh, 60000);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      active = false;
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);
  useEffect(() => {
    const sdk = miniLaunch.sdk;
    if (!miniLaunch.isTelegram || !sdk) return;
    const sync = () => {
      document.documentElement.style.setProperty(
        "--mini-viewport",
        `${sdk.viewportStableHeight || window.innerHeight}px`,
      );
      document.documentElement.style.setProperty(
        "--mini-safe-top",
        `${sdk.contentSafeAreaInset?.top || 0}px`,
      );
      document.documentElement.style.setProperty(
        "--mini-safe-bottom",
        `${sdk.contentSafeAreaInset?.bottom || 0}px`,
      );
    };
    for (const fn of [
      () => sdk.ready(),
      () => sdk.expand(),
      () => sdk.setHeaderColor("#f7edf3"),
      () => sdk.setBackgroundColor("#f7edf3"),
    ])
      try {
        fn();
      } catch {
        /* Older Telegram clients can still browse. */
      }
    sync();
    sdk.onEvent?.("viewportChanged", sync);
    sdk.onEvent?.("safeAreaChanged", sync);
    sdk.onEvent?.("contentSafeAreaChanged", sync);
    return () => {
      sdk.offEvent?.("viewportChanged", sync);
      sdk.offEvent?.("safeAreaChanged", sync);
      sdk.offEvent?.("contentSafeAreaChanged", sync);
    };
  }, []);
  useEffect(() => {
    const button = miniLaunch.sdk?.BackButton;
    if (!miniLaunch.isTelegram || !button) return;
    const back = () => {
      if (location.pathname === "/" || location.key === "default")
        navigate("/miniapp");
      else navigate(-1);
    };
    if (location.pathname === "/miniapp") button.hide();
    else button.show();
    button.onClick(back);
    return () => {
      button.offClick(back);
      button.hide();
    };
  }, [location.pathname, location.key, navigate]);
  return (
    <MiniAppContext.Provider
      value={{ ...state, isMiniMode: miniLaunch.mode, retry }}
    >
      {children}
    </MiniAppContext.Provider>
  );
}
