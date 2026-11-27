// This only changes presentation. The server always verifies the normal phone proof.
export const localTestMode = import.meta.env.VITE_BAKEU_LOCAL_TEST === "true" &&
  globalThis.location?.hostname === "localhost";
