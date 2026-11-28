// A verified Telegram launch is exchanged for the same Backend session used by the
// website. Telegram identity never selects a user through editable profile data.
export function createMiniAccountSession({ accountAPI, openLaunch, setAdminToken }) {
  let expectedUID = "", telegramUser, signedOut = false;
  const view = (user) => ({
    user: user ? { ...user, id: user.uid, firstName: user.name || telegramUser.firstName, telegramId: telegramUser.id } : telegramUser,
    isAdmin: user?.capabilities?.admin === true,
    links: {},
    accountLinked: Boolean(user),
  });
  return {
    async authenticate(initData, { force = false } = {}) {
      if (!initData) return null;
      if (!accountAPI) throw new Error("Вход временно недоступен. Повторите позже.");
      if (force) { expectedUID = ""; signedOut = false; }
      if (signedOut) return null;
      if (expectedUID) {
        let user;
        try { user = await accountAPI.request("/me"); }
        catch (error) {
          if (error.status !== 401) throw error;
          signedOut = true;
          setAdminToken("");
          return null;
        }
        if (user?.uid !== expectedUID) throw new Error("Аккаунт изменился. Откройте Mini App заново.");
        return view(user);
      }
      const launch = await openLaunch(initData);
      if (!launch?.telegramUser?.id || ![true, false].includes(launch.linked)) throw new Error("Не удалось подтвердить Telegram.");
      telegramUser = launch.telegramUser;
      setAdminToken("");
      if (!launch.linked) {
        // A different Telegram actor must not inherit an earlier website cookie.
        await accountAPI.logout();
        return view(null);
      }
      const user = await accountAPI.exchangeTelegram(launch.ticket);
      if (!user?.uid || user.uid !== launch.uid || !["seller", "customer"].includes(user.role)) throw new Error("Вход в аккаунт не подтверждён.");
      expectedUID = user.uid;
      return view(user);
    },
  };
}
