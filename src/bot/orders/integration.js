import { BridgeError, createOrdersApi, validateOrder } from "./api.js";
import {
  normalizePhone,
  ownOrder,
  statusCodes,
  nextStatuses,
  statusLabels,
  validCoordinates,
} from "../../telegramOrders/domain.js";
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
export function createOrdersIntegration({
  settings,
  config,
  telegram,
  api = createOrdersApi(settings),
}) {
  const display = (ctx, payload) => renderScreen(ctx, payload);
  async function identity(ctx, role) {
    const record = await api.identity(String(ctx.user.id));
    if (!record) throw new BridgeError(401);
    if (role && record.user.role !== role) throw new BridgeError(403);
    return record;
  }
  async function linking(ctx) {
    return display(ctx, {
      text: "Добро пожаловать в BakeU!\n\nЕсли у вас уже есть аккаунт, подтвердите номер телефона, чтобы получить доступ к своему профилю. Затем подтвердите привязку в своём аккаунте на сайте.",
      reply_markup: {
        inline_keyboard: [
          [b("📱 Подтвердить номер", "bo:phone")],
          [
            {
              text: "🥐 Создать аккаунт",
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
    const order = await api.order(String(ctx.user.id), id);
    if (!ownOrder(who, order)) throw new BridgeError(403);
    return { who, order };
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
      const data = update.callback_query?.data || "";
      const contact = update.message?.contact;
      const back = update.message?.text === "🔙 Назад";
      if (!data.startsWith("bo:") && !contact && !back) return false;
      try {
        if (back) {
          await telegram.send(ctx.chatId, {
            text: "Главное меню",
            reply_markup: { remove_keyboard: true },
          });
          await ctx.showMain();
          return true;
        }
        if (!settings.enabled) throw new BridgeError();
        const actor = String(ctx.user.id);
        if (contact) {
          if (String(contact.user_id || "") !== actor) {
            await telegram.send(ctx.chatId, {
              text: "Отправьте именно свой номер кнопкой «Подтвердить номер».",
            });
            return true;
          }
          const existing = await api.identity(actor);
          if (existing) {
            await telegram.send(ctx.chatId, {
              text: "Аккаунт уже привязан.",
              reply_markup: { remove_keyboard: true },
            });
            await ctx.showMain();
            return true;
          }
          const challenge = await api.startLink(
            actor,
            normalizePhone(contact.phone_number),
          );
          const url = new URL(challenge.confirmationUrl);
          const expected = new URL(config.siteUrl);
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
          await telegram.send(ctx.chatId, {
            text: "Номер получен. Доступ ещё не выдан: войдите в существующий аккаунт и подтвердите привязку на сайте. Нового аккаунта бот не создаёт.",
            reply_markup: { remove_keyboard: true },
          });
          await display(ctx, {
            text: "🔐 Подтвердите владение аккаунтом BakeU. Ссылка одноразовая и ограничена по времени.",
            reply_markup: {
              inline_keyboard: [
                [{ text: "🔐 Подтвердить в BakeU", url: url.href }],
                [b("🔄 Проверить привязку", "bo:account")],
                mainBack,
              ],
            },
          });
          return true;
        }
        if (data === "bo:account") {
          const who = await api.identity(actor);
          if (!who) await linking(ctx);
          else await ctx.showMain();
        } else if (data === "bo:phone") {
          await telegram.send(ctx.chatId, {
            text: "📱 Нажмите кнопку, чтобы отправить свой контакт. Сам по себе телефон не предоставляет доступ к аккаунту.",
            reply_markup: {
              keyboard: [
                [{ text: "📱 Подтвердить номер", request_contact: true }],
                [{ text: "🔙 Назад" }],
              ],
              resize_keyboard: true,
              one_time_keyboard: true,
            },
          });
        } else if (data === "bo:shop" || data === "bo:stats") {
          const who = await identity(ctx, "SELLER");
          const shop = await api.shop(actor);
          if (
            shop.id !== who.shopId ||
            shop.ownerId !== who.user.id ||
            !Number.isInteger(shop.productCount) ||
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
          await display(ctx, {
            text: shopCard(shop),
            reply_markup: {
              inline_keyboard: [
                [b("📦 Новые заказы", "bo:list:seller:pending:0")],
                [b("👨‍🍳 В приготовлении", "bo:list:seller:preparing:0")],
                [
                  b("✅ Принятые", "bo:list:seller:accepted:0"),
                  b("🥐 Готовые", "bo:list:seller:ready:0"),
                ],
                [b("🚚 Доставка", "bo:list:seller:delivering:0")],
                [b("✅ Завершённые заказы", "bo:list:seller:completed:0")],
                [b("📬 Доставленные", "bo:list:seller:delivered:0")],
                [
                  b("❌ Отменённые", "bo:list:seller:cancelled:0"),
                  b("🚫 Отклонённые", "bo:list:seller:rejected:0"),
                ],
                [
                  b("📊 Статистика", "bo:stats"),
                  b("🥐 Мои товары", "bo:products"),
                ],
                [
                  {
                    text: "⚙️ Настройки магазина",
                    url: firstPartyLink(config, "/profile"),
                  },
                ],
                [
                  {
                    text: "🌐 Открыть магазин на сайте",
                    url: firstPartyLink(
                      config,
                      `/shop/${encodeURIComponent(shop.id)}`,
                    ),
                  },
                ],
                mainBack,
              ],
            },
          });
        } else if (/^bo:products(?::\d{1,5})?$/.test(data)) {
          const who = await identity(ctx, "SELLER");
          const result = await api.products(actor);
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
                text: "🥐 Управлять товарами",
                url: firstPartyLink(config, "/profile"),
              },
            ],
          ];
          if (page > 0)
            keyboard.push([b("‹ Назад", `bo:products:${page - 1}`)]);
          if (start + 8 < result.items.length && page < 99999)
            keyboard.push([b("Далее ›", `bo:products:${page + 1}`)]);
          keyboard.push(mainBack);
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
        } else if (data === "bo:buyer") {
          await identity(ctx, "CLIENT");
          await display(ctx, {
            text: "<b>📦 МОИ ЗАКАЗЫ BAKEU</b>",
            reply_markup: {
              inline_keyboard: [
                [b("🔥 Активные заказы", "bo:list:buyer:active:0")],
                [b("🕘 История заказов", "bo:list:buyer:history:0")],
                [{ text: "🥐 Открыть BakeU", url: config.siteUrl }],
                mainBack,
              ],
            },
          });
        } else if (/^bo:list:(seller|buyer):[a-z_]+:\d{1,5}$/.test(data)) {
          const [, , audience, view, pageText] = data.split(":");
          const page = Number(pageText);
          const who = await identity(
            ctx,
            audience === "seller" ? "SELLER" : "CLIENT",
          );
          if (
            !Object.hasOwn(statusLabels, view) &&
            !["active", "history"].includes(view)
          )
            throw new BridgeError(400);
          const result = await api.list(actor, audience, view, page);
          if (
            !Array.isArray(result.orders) ||
            result.orders.length > 5 ||
            result.orders.some((order) => !ownOrder(who, validateOrder(order)))
          )
            throw new BridgeError(502);
          const keyboard = result.orders.map((order) => [
            b(
              `#${String(order.number || order.id).slice(0, 30)} · ${statusLabels[order.status]}`,
              `bo:detail:${order.id}:0`,
            ),
          ]);
          if (page > 0)
            keyboard.push([
              b("‹ Назад", `bo:list:${audience}:${view}:${page - 1}`),
            ]);
          if (
            Number.isInteger(result.nextPage) &&
            result.nextPage > page &&
            result.nextPage <= 99999
          )
            keyboard.push([
              b("Далее ›", `bo:list:${audience}:${view}:${result.nextPage}`),
            ]);
          keyboard.push(
            [{ text: "🥐 Открыть BakeU", url: config.siteUrl }],
            mainBack,
          );
          await display(ctx, {
            text: result.orders.length
              ? "<b>📦 Заказы</b>\nВыберите заказ для просмотра сохранённых данных и истории."
              : audience === "seller"
                ? "📭 Пока нет заказов."
                : "📭 У вас пока нет заказов.\n\nОткройте BakeU и выберите любимую домашнюю выпечку!",
            reply_markup: { inline_keyboard: keyboard },
          });
        } else if (/^bo:detail:[A-Za-z0-9_-]{1,36}:\d{1,2}$/.test(data)) {
          const [, , id, page] = data.split(":");
          const result = await owned(ctx, id);
          await display(
            ctx,
            orderCard(result.order, {
              seller: result.who.user.role === "SELLER",
              page: Number(page),
            }),
          );
        } else if (/^bo:act:[A-Za-z0-9_-]{1,36}:[a-z]:[a-z]$/.test(data)) {
          const [, , id, fromCode, toCode] = data.split(":");
          const { who, order } = await owned(ctx, id);
          const from = statusCodes[fromCode],
            target = statusCodes[toCode];
          if (
            who.user.role !== "SELLER" ||
            from !== order.status ||
            !nextStatuses(from, order.fulfillment).includes(target)
          )
            throw new BridgeError(409);
          const changed = await api.transition(
            actor,
            id,
            from,
            target,
            `tg:${update.callback_query.id}`,
          );
          if (
            !ownOrder(who, changed) ||
            changed.id !== id ||
            changed.status !== target
          )
            throw new BridgeError(502);
          await display(ctx, orderCard(changed, { seller: true }));
        } else if (/^bo:(location|contact):[A-Za-z0-9_-]{1,36}$/.test(data)) {
          const [, action, id] = data.split(":");
          const { who, order } = await owned(ctx, id);
          if (who.user.role !== "SELLER") throw new BridgeError(403);
          if (action === "location" && validCoordinates(order.location))
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
                  : `📍 ${String(order.address || "Адрес не указан").slice(0, 300)}`,
            });
        } else throw new BridgeError(400);
      } catch (error) {
        if (error.status === 401) await linking(ctx);
        else
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
