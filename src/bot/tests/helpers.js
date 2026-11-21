import { randomUUID } from "node:crypto";
import { openDatabase } from "../database/index.js";
import { createRepository } from "../database/repository.js";
import { createAuth } from "../services/auth.js";
import { createNotifications } from "../services/adminNotifications.js";
export const config = {
  adminIds: ["12345"],
  siteUrl: "https://bakeu.uz",
  telegramUrl: "https://t.me/example",
  instagramUrl: "https://instagram.com/example",
  supportEmail: "support@example.com",
  useWebApp: false,
  sessionHours: 24,
  botUsername: "BakeU_Test_Bot",
  origins: ["http://localhost:5173"],
  trustProxy: false,
};
export const fields = (role = "client") => ({
  firstName: "Алия",
  lastName: "Каримова",
  email: `${role}@example.com`,
  phone: role === "seller" ? "+998 90 123 45 68" : "+998 90 123 45 67",
  password: "strong-test-password",
  role,
  ...(role === "seller" ? { company: "Сладкий дом", location: "Ташкент" } : {}),
});
export function setup() {
  const db = openDatabase(":memory:");
  const repo = createRepository(db);
  const notifications = createNotifications(repo, config);
  const auth = createAuth(repo, config, notifications);
  return { db, repo, auth, config, notifications };
}
export function seedLegacyApplication(db, repo, user) {
  const id = randomUUID();
  db.prepare(
    "INSERT INTO applications(id,user_id,shop,address,created_at) VALUES(?,?,?,?,?)",
  ).run(id, user.id, "Сладкий дом", "Ташкент", new Date().toISOString());
  return repo.application(id);
}
export function mockTelegram() {
  const messages = [];
  const edits = [];
  return {
    messages,
    edits,
    send: async (id, payload) => {
      messages.push({ id, ...payload });
      return { message_id: messages.length };
    },
    answer: async () => {},
    edit: async (id, messageId, payload) => {
      edits.push({ id, messageId, ...payload });
      return { message_id: messageId };
    },
    editCaption: async (id, messageId, payload) => {
      edits.push({ id, messageId, ...payload });
      return { message_id: messageId };
    },
    photo: async (id, bytes, payload) => {
      messages.push({ id, type: "photo", ...payload });
      return { message_id: messages.length };
    },
  };
}
export const message = (id, text) => ({
  update_id: 1,
  message: {
    chat: { id, type: "private" },
    from: { id, first_name: "Тест" },
    text,
  },
});
export const callback = (id, data) => ({
  update_id: 2,
  callback_query: {
    id: "callback-id",
    data,
    from: { id, first_name: "Тест" },
    message: { chat: { id, type: "private" }, message_id: 1 },
  },
});
