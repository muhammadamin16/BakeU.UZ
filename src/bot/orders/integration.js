import {
  BridgeError,
  createOrdersApi,
  validateIdentity,
  validateOrder,
} from "./api.js";
import {
  normalizePhone,
  ownOrder,
  statusCodes,
  nextStatuses,
  statusLabels,
  validCoordinates,
} from "./domain.js";
import { renderScreen } from "../services/screens.js";
import {
  orderCard,
  shopCard,
  money,
  mainBack,
  firstPartyLink,
  text,
} from "./views.js";
import { createOrdersWorker } from "./worker.js";
const b = (text, callback_data) => ({ text, callback_data });
const roleFor = (intent) => (intent === "seller" ? "SELLER" : "CLIENT");
const sellingOrder = (who, order) => who.user.role === "SELLER" && order.sellerId === who.user.id && order.shopId === who.shopId;
const listCallback = (audience, view, page) =>
  `bo:list:${audience}:${view}:${page}`;
const validView = (view) =>
  Object.hasOwn(statusLabels, view) ||
  ["all", "active", "history"].includes(view);

export function createOrdersIntegration({
  settings,
  config,
  telegram,
  api = createOrdersApi(settings),
}) {
  const display = (ctx, payload) => renderScreen(ctx, payload);
  const ui = (ctx) => {
    const state = ctx.repo?.getState(ctx.chatId);
    return state?.kind === "orders" ? state : null;
  };
  // Navigation metadata only: no contacts, prices, snapshots or order histories.
  const remember = (ctx, state) =>
    ctx.repo?.setState(ctx.chatId, {
      kind: "orders",
      expiresAt: Date.now() + 300000,
      ...state,
    });
  const forget = (ctx) => {
    if (ui(ctx)) ctx.repo?.clearState(ctx.chatId);
  };
  async function currentIdentity(ctx) {
    const data = await api.identity(String(ctx.user.id));
    return data == null ? null : validateIdentity(data, String(ctx.user.id));
  }
  async function identity(ctx, role) {
    const record = await currentIdentity(ctx);
    if (!record) throw new BridgeError(401);
    if (role && record.user.role !== role && !(role === "CLIENT" && record.user.role === "SELLER" && record.user.canBuy === true)) throw new BridgeError(403);
    return record;
  }
  async function linking(ctx, intent) {
    remember(ctx, { screen: "link", intent });
    return display(ctx, {
      text:
        intent === "seller"
          ? "<b>🏬 Кабинет продавца BakeU</b>\n\nУ вас уже есть аккаунт продавца?\nПодтвердите номер телефона, указанный при регистрации. Затем подтвердите владение существующим аккаунтом на сайте. Бот не создаёт аккаунт продавца."
          : "<b>📦 МОИ ЗАКАЗЫ</b>\n\nПодтвердите свой номер телефона и владение существующим аккаунтом BakeU на сайте, чтобы открыть историю покупок.",
      reply_markup: {
        inline_keyboard: [
          [b("📱 Подтвердить номер", `bo:phone:${intent}`)],
          [
            {
              text: "🥐 Зарегистрироваться на BakeU",
              url: firstPartyLink(config, "/register"),
            },
          ],
          mainBack,
        ],
      },
    });
  }
  async function owned(ctx, id) {
    const who = await identity(ctx);
    const order = validateOrder(await api.order(String(ctx.user.id), id));
    if (order.id !== id || !ownOrder(who, order)) throw new BridgeError(403);
    return { who, order };
  }
  function backToList(ctx, order, who) {
    const state = ui(ctx);
    const intent = sellingOrder(who,order) ? "seller" : "buyer";
    if (
      state?.intent === intent &&
      state.screen === "list" &&
      state.orderIds.includes(order.id)
    )
      return listCallback(intent, state.view, state.page);
    if (
      state?.intent === intent &&
      /^bo:list:(seller|buyer):[a-z_]+:\d{1,5}$/.test(state.returnTo || "")
    )
      return state.returnTo;
    return intent === "seller" ? "bo:seller" : "bo:buyer";
  }
  async function showOrder(ctx, order, who, page = 0) {
    const returnTo = backToList(ctx, order, who);
    remember(ctx, {
      screen: "detail",
      intent: sellingOrder(who,order) ? "seller" : "buyer",
      returnTo,
    });
    return display(
      ctx,
      orderCard(order, {
        seller: sellingOrder(who,order),
        page,
        returnTo,
        siteUrl: config.siteUrl,
      }),
    );
  }
  async function showList(ctx, audience, view = "all", page = 0) {
    if (!validView(view) || !Number.isInteger(page) || page < 0 || page > 99999)
      throw new BridgeError(400);
    const who = await identity(ctx, roleFor(audience));
    const result = await api.list(String(ctx.user.id), audience, view, page);
    if (
      !Array.isArray(result.orders) ||
      result.orders.length > 5 ||
      result.orders.some((order) => !ownOrder(who, validateOrder(order)))
    )
      throw new BridgeError(502);
    const rows = result.orders.map(
      (order, index) =>
        `${index + 1}. #${text(order.number || order.id, 40)}${audience === "seller" ? ` — ${text(order.buyerName, 60)}` : ""} — ${money(order.total)} — ${text(statusLabels[order.status])}`,
    );
    const keyboard = result.orders.map((order, index) => [
      b(
        `${index + 1}. #${String(order.number || order.id).slice(0, 30)}`,
        `bo:detail:${order.id}:0`,
      ),
    ]);
    if (page > 0)
      keyboard.push([
        b("‹ Предыдущая страница", listCallback(audience, view, page - 1)),
      ]);
    if (
      Number.isInteger(result.nextPage) &&
      result.nextPage > page &&
      result.nextPage <= 99999
    )
      keyboard.push([
        b(
          "Следующая страница ›",
          listCallback(audience, view, result.nextPage),
        ),
      ]);
    keyboard.push([b("🔄 Обновить", listCallback(audience, view, page))]);
    if (audience === "buyer")
      keyboard.push([
        b("🔥 Активные", listCallback(audience, "active", 0)),
        b("🕘 История", listCallback(audience, "history", 0)),
        b("📦 Все", listCallback(audience, "all", 0)),
      ]);
    keyboard.push(
      [b("🔙 Назад", audience === "seller" ? "bo:seller" : "main")],
      [{ text: "🥐 Открыть BakeU", url: config.siteUrl }],
      mainBack,
    );
    remember(ctx, {
      screen: "list",
      intent: audience,
      userId: who.user.id,
      shopId: who.shopId || null,
      view,
      page,
      orderIds: result.orders.map((order) => order.id),
    });
    return display(ctx, {
      text: `<b>${audience === "seller" ? "📦 ЗАКАЗЫ МАГАЗИНА" : "📦 МОИ ЗАКАЗЫ"}</b>\n\n${rows.length ? rows.join("\n") + "\n\nНажмите номер заказа или отправьте число из текущего списка (1–5)." : audience === "seller" ? "📭 Пока нет заказов." : "📭 У вас пока нет заказов."}`,
      reply_markup: { inline_keyboard: keyboard },
    });
  }
  async function showShop(ctx) {
    const who = await identity(ctx, "SELLER");
    const shop = await api.shop(String(ctx.user.id));
    if (
      shop.id !== who.shopId ||
      shop.ownerId !== who.user.id ||
      !Number.isInteger(shop.productCount) ||
      shop.productCount < 0 ||
      !Number.isFinite(shop.revenue) ||
      shop.revenue < 0 ||
      shop.revenue > 1e12 ||
      !Object.keys(statusLabels).every(
        (status) =>
          Number.isSafeInteger(shop.counts?.[status]) &&
          shop.counts[status] >= 0,
      )
    )
      throw new BridgeError(502);
    remember(ctx, { screen: "shop", intent: "seller" });
    const keyboard = [[b("📦 Мои заказы", listCallback("seller", "all", 0))]];
    for (const status of Object.keys(statusLabels))
      keyboard.push([
        b(statusLabels[status], listCallback("seller", status, 0)),
      ]);
    keyboard.push(
      [b("🥐 Мои товары", "bo:products"), b("📊 Статистика", "bo:stats")],
      [
        {
          text: "⚙️ Настройки",
          url: firstPartyLink(config, "/account/orders"),
        },
      ],
      [
        {
          text: "🌐 Открыть магазин",
          url: firstPartyLink(config, `/shop/${encodeURIComponent(shop.id)}`),
        },
      ],
      mainBack,
    );
    return display(ctx, {
      text: shopCard(shop),
      reply_markup: { inline_keyboard: keyboard },
    });
  }
  async function destination(ctx, intent) {
    return intent === "seller" ? showShop(ctx) : showList(ctx, "buyer");
  }
  return {
    flush: createOrdersWorker(api, telegram, { enabled: settings.enabled }),
    async resolveRole(id) {
      try {
        return (await api.identity(String(id)))?.user.role || null;
      } catch {
        return null;
      }
    },
    async handle(ctx, update) {
      const data = update.callback_query?.data || "",
        contact = update.message?.contact;
      const message = update.message?.text?.trim() || "",
        state = ui(ctx);
      const numeric = /^\d+$/.test(message) && state?.screen === "list";
      const back = message === "🔙 Назад";
      if (!data.startsWith("bo:") && !contact && !back && !numeric)
        return false;
      const intent =
        /^bo:(buyer|list:buyer|phone:buyer|account:buyer)(:|$)/.test(data)
          ? "buyer"
          : /^bo:(seller|shop|stats|products|list:seller|phone:seller|account:seller)(:|$)/.test(
                data,
              )
            ? "seller"
            : state?.intent || "buyer";
      try {
        if (back) {
          forget(ctx);
          await telegram.send(ctx.chatId, {
            text: "Главное меню",
            reply_markup: { remove_keyboard: true },
          });
          await ctx.showMain();
          return true;
        }
        if (!settings.enabled) throw new BridgeError();
        const actor = String(ctx.user.id);
        if (numeric) {
          if (state.expiresAt <= Date.now()) {
            forget(ctx);
            await display(ctx, {
              text: "Список устарел. Откройте заказы заново.",
              reply_markup: { inline_keyboard: [mainBack] },
            });
            return true;
          }
          const who = await identity(ctx, roleFor(state.intent));
          if (
            who.user.id !== state.userId ||
            (who.shopId || null) !== state.shopId
          ) {
            forget(ctx);
            throw new BridgeError(409);
          }
          const selection = Number(message);
          if (
            !Number.isSafeInteger(selection) ||
            selection < 1 ||
            selection > state.orderIds.length
          ) {
            await display(ctx, {
              text: "Выберите номер из текущего списка заказов.",
              reply_markup: {
                inline_keyboard: [
                  [
                    b(
                      "🔄 Обновить список",
                      listCallback(state.intent, state.view, state.page),
                    ),
                  ],
                  mainBack,
                ],
              },
            });
            return true;
          }
          const result = await owned(ctx, state.orderIds[selection - 1]);
          await showOrder(ctx, result.order, result.who);
          return true;
        }
        if (contact) {
          if (String(contact.user_id || "") !== actor) {
            await telegram.send(ctx.chatId, {
              text: "Отправьте именно свой номер кнопкой «Подтвердить номер».",
            });
            return true;
          }
          const existing = await currentIdentity(ctx);
          if (existing) {
            await telegram.send(ctx.chatId, {
              text: "Аккаунт уже привязан.",
              reply_markup: { remove_keyboard: true },
            });
            await destination(ctx, intent);
            return true;
          }
          const challenge = await api.startLink(
            actor,
            normalizePhone(contact.phone_number),
            roleFor(intent),
          );
          const url = new URL(challenge.confirmationUrl),
            expected = new URL(config.siteUrl);
          if (
            url.origin !== expected.origin ||
            url.pathname !== expected.pathname ||
            url.username ||
            url.password ||
            !url.hash.startsWith("#/telegram/link?") ||
            !/^[A-Za-z0-9_-]{32,128}$/.test(challenge.id || "") ||
            new URLSearchParams(url.hash.split("?")[1]).get("challenge") !==
              challenge.id ||
            !Number.isFinite(Date.parse(challenge.expiresAt)) ||
            Date.parse(challenge.expiresAt) <= Date.now() ||
            Date.parse(challenge.expiresAt) > Date.now() + 600000
          )
            throw new BridgeError(502);
          remember(ctx, { screen: "link", intent });
          await telegram.send(ctx.chatId, {
            text: "Номер получен. Доступ ещё не выдан: войдите в существующий аккаунт и подтвердите привязку на сайте. Нового аккаунта бот не создаёт.",
            reply_markup: { remove_keyboard: true },
          });
          await display(ctx, {
            text: "🔐 Подтвердите владение аккаунтом BakeU. Ссылка одноразовая и ограничена по времени.",
            reply_markup: {
              inline_keyboard: [
                [{ text: "🔐 Подтвердить в BakeU", url: url.href }],
                [b("🔄 Проверить привязку", `bo:account:${intent}`)],
                mainBack,
              ],
            },
          });
          return true;
        }
        if (/^bo:phone(?::(buyer|seller))?$/.test(data)) {
          remember(ctx, { screen: "link", intent });
          await telegram.send(ctx.chatId, {
            text: "📱 Отправьте свой контакт кнопкой ниже. Совпадения телефона недостаточно: затем подтвердите существующий аккаунт на сайте.",
            reply_markup: {
              keyboard: [
                [{ text: "📱 Подтвердить номер", request_contact: true }],
                [{ text: "🔙 Назад" }],
              ],
              resize_keyboard: true,
              one_time_keyboard: true,
            },
          });
        } else if (/^bo:account(?::(buyer|seller))?$/.test(data)) {
          const who = await currentIdentity(ctx);
          if (!who) await linking(ctx, intent);
          else
            await destination(
              ctx,
              data === "bo:account" && !state
                ? who.user.role === "SELLER"
                  ? "seller"
                  : "buyer"
                : intent,
            );
        } else if (["bo:seller", "bo:shop", "bo:stats"].includes(data))
          await showShop(ctx);
        else if (data === "bo:buyer") await showList(ctx, "buyer");
        else if (/^bo:list:(seller|buyer):[a-z_]+:\d{1,5}$/.test(data)) {
          const [, , audience, view, page] = data.split(":");
          await showList(ctx, audience, view, Number(page));
        } else if (/^bo:products(?::\d{1,5})?$/.test(data)) {
          const who = await identity(ctx, "SELLER"),
            result = await api.products(actor);
          if (
            result.ownerId !== who.user.id ||
            result.shopId !== who.shopId ||
            !Array.isArray(result.items) ||
            result.items.some(
              (item) =>
                typeof item.title !== "string" ||
                !Number.isFinite(item.price) ||
                item.price < 0 ||
                item.price > 1e12,
            )
          )
            throw new BridgeError(502);
          const page = Number(data.split(":")[2] || 0),
            start = page * 8;
          const keyboard = [
            [
              {
                text: "🥐 Товары на сайте",
                url: firstPartyLink(
                  config,
                  `/shop/${encodeURIComponent(who.shopId)}`,
                ),
              },
            ],
          ];
          if (page > 0)
            keyboard.push([b("‹ Назад", `bo:products:${page - 1}`)]);
          if (start + 8 < result.items.length && page < 99999)
            keyboard.push([b("Далее ›", `bo:products:${page + 1}`)]);
          keyboard.push([b("🔙 Назад", "bo:seller")], mainBack);
          remember(ctx, { screen: "products", intent: "seller" });
          await display(ctx, {
            text: result.items.length
              ? "<b>🥐 Мои товары</b>\n\n" +
                result.items
                  .slice(start, start + 8)
                  .map((p) => `${text(p.title, 100)} — ${money(p.price)}`)
                  .join("\n")
              : "🥐 У вас пока нет товаров. Добавьте первый товар на BakeU.",
            reply_markup: { inline_keyboard: keyboard },
          });
        } else if (/^bo:detail:[A-Za-z0-9_-]{1,36}:\d{1,2}$/.test(data)) {
          const [, , id, page] = data.split(":");
          const result = await owned(ctx, id);
          await showOrder(ctx, result.order, result.who, Number(page));
        } else if (/^bo:act:[A-Za-z0-9_-]{1,36}:[a-z]:[a-z]$/.test(data)) {
          const [, , id, fromCode, toCode] = data.split(":");
          const { who, order } = await owned(ctx, id);
          const from = statusCodes[fromCode],
            target = statusCodes[toCode];
          if (
            !sellingOrder(who,order) ||
            from !== order.status ||
            !nextStatuses(from, order.fulfillment).includes(target)
          )
            throw new BridgeError(409);
          const changed = validateOrder(
            await api.transition(
              actor,
              id,
              from,
              target,
              `tg:${update.callback_query.id}`,
            ),
          );
          if (
            !ownOrder(who, changed) ||
            changed.id !== id ||
            changed.status !== target
          )
            throw new BridgeError(502);
          await showOrder(ctx, changed, who);
        } else if (/^bo:(location|contact):[A-Za-z0-9_-]{1,36}$/.test(data)) {
          const [, action, id] = data.split(":");
          const { who, order } = await owned(ctx, id);
          if (action === "contact" && !sellingOrder(who,order))
            throw new BridgeError(403);
          if (
            action === "location" &&
            order.fulfillment === "delivery" &&
            validCoordinates(order.location)
          )
            await telegram.call("sendLocation", {
              chat_id: ctx.chatId,
              latitude: order.location.latitude,
              longitude: order.location.longitude,
            });
          else
            await telegram.send(ctx.chatId, {
              text:
                action === "contact"
                  ? `📞 ${String(order.buyerPhone || "Телефон не указан").slice(0, 30)}`
                  : `📍 ${String(order.address || "Адрес не указан").slice(0, 500)}`,
            });
        } else throw new BridgeError(400);
      } catch (error) {
        if (error.status === 401) await linking(ctx, intent);
        else if (
          error.status === 404 &&
          error.code === "SELLER_NOT_FOUND" &&
          intent === "seller"
        ) {
          remember(ctx, { screen: "link", intent });
          await display(ctx, {
            text: "❌ Аккаунт продавца не найден. Зарегистрируйтесь на BakeU.",
            reply_markup: {
              inline_keyboard: [
                [
                  {
                    text: "🥐 Зарегистрироваться на BakeU",
                    url: firstPartyLink(config, "/register"),
                  },
                ],
                mainBack,
              ],
            },
          });
        } else
          await display(ctx, {
            text:
              error instanceof BridgeError
                ? error.message
                : "Не удалось выполнить действие. Обновите экран или попробуйте позже.",
            reply_markup: { inline_keyboard: [mainBack] },
          });
      }
      return true;
    },
  };
}
