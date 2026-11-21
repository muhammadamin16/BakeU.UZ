// Authenticated favorites are never persisted in the guest browser store.
export function createFavoritesController({ request, guest, publish }) {
  let owner, revision = "", items = {}, generation = 0, loading;
  function reset(user) { generation++; owner = user?.uid; items = {}; revision = ""; publish({ items: {}, error: "" }); }
  async function load() {
    if (loading) return loading;
    const epoch = generation;
    loading = (async () => {
      let user;
      try { user = await request("/me"); }
      catch (error) {
        if (error.status !== 401) throw error;
        if (owner) { reset(); throw error; }
        if (epoch === generation) { owner = null; items = guest.read(); publish({ items }); }
        return;
      }
      if (owner && owner !== user.uid) { reset(user); throw Error("Аккаунт изменился. Повторите действие."); }
      const result = await request("/favorites", { headers: { "X-BakeU-Account": user.uid } });
      if (epoch !== generation) return;
      if (result.uid !== user.uid || !Array.isArray(result.productIds)) throw Error("Неверный ответ сервера.");
      owner = user.uid; revision = result.revision;
      items = Object.fromEntries(result.productIds.map((id) => [id, { id, productId: id }]));
      publish({ items, error: "" });
    })().finally(() => { loading = undefined; });
    return loading;
  }
  async function change(id, remove, clear = false) {
    if (owner === undefined) await load();
    const expected = owner, epoch = generation;
    let current;
    try { current = await request("/me"); }
    catch (error) { if (error.status !== 401 || expected) throw error; }
    if ((current?.uid || null) !== expected || epoch !== generation) {
      reset(current); throw Error("Аккаунт изменился. Повторите действие.");
    }
    if (!expected) {
      guest.change(id, remove, clear); items = guest.read(); publish({ items }); return;
    }
    const result = await request(clear ? `/favorites?revision=${encodeURIComponent(revision)}` : `/favorites/${encodeURIComponent(id)}`, {
      method: remove || clear ? "DELETE" : "PUT", headers: { "X-BakeU-Account": expected },
    });
    if (epoch !== generation) return;
    if (result.uid !== expected || !Array.isArray(result.productIds)) throw Error("Неверный ответ сервера.");
    revision = result.revision; items = Object.fromEntries(result.productIds.map((value) => [value, { id: value, productId: value }]));
    publish({ items, error: "" });
  }
  return { load, reset, change, saved: (id) => Boolean(items[id]) };
}
