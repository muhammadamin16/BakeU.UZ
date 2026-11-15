import { createContext, useContext } from "react";
export const MiniAppContext = createContext({
  status: "guest",
  user: null,
  isAdmin: false,
  isMiniMode: false,
  error: "",
  links: {},
  retry: async () => {},
});
export const useMiniApp = () => useContext(MiniAppContext);
