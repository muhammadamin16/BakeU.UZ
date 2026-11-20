import { randomUUID } from "node:crypto";
import { transaction } from "./index.js";
export function createRepository(db) {
  const profile = (row) =>
    row
      ? {
          ...JSON.parse(row.profile),
          id: row.id,
          role: row.role,
          email: row.email.endsWith('@accounts.bakeu.invalid') ? '' : row.email,
          phone: row.phone,
          createdAt: row.created_at,
        }
      : null;
  const application = (row) =>
    row
      ? {
          id: row.id,
          userId: row.user_id,
          owner:
            profile(
              db.prepare("SELECT * FROM users WHERE id=?").get(row.user_id),
            )?.firstName +
            " " +
            profile(
              db.prepare("SELECT * FROM users WHERE id=?").get(row.user_id),
            )?.lastName,
          shop: row.shop,
          address: row.address,
          status: row.status,
          reason: row.reason,
          createdAt: row.created_at,
        }
      : null;
  const ticket = (row) =>
    row
      ? {
          id: row.id,
          chatId: row.chat_id,
          name: row.name,
          body: row.body,
          status: row.status,
          createdAt: row.created_at,
        }
      : null;
  const queue = (chatId, payload, dedupe) =>
    db
      .prepare(
        "INSERT OR IGNORE INTO outbox(id,chat_id,payload,dedupe) VALUES(?,?,?,?)",
      )
      .run(
        randomUUID(),
        String(chatId),
        JSON.stringify(payload),
        dedupe || null,
      );
  const api = {
    db,
    queue,
    profile,
    findUserByPhone: (phone) =>
      db.prepare("SELECT * FROM users WHERE phone=?").get(phone),
    findUserByEmail: (email) =>
      db.prepare("SELECT * FROM users WHERE email=?").get(email),
    user: (id) => profile(db.prepare("SELECT * FROM users WHERE id=?").get(id)),
    register: (fields, hash, salt, notify) =>
      transaction(db, () => {
        const now = new Date().toISOString(),
          id = randomUUID();
        const user = {
          ...fields,
          id,
          createdAt: now,
          demo: false,
          server: true,
        };
        db.prepare("INSERT INTO users VALUES(?,?,?,?,?,?,?,?)").run(
          id,
          fields.email || `${fields.phone}@accounts.bakeu.invalid`,
          fields.phone,
          fields.role,
          JSON.stringify(user),
          hash,
          salt,
          now,
        );
        let app = null;
        // Seller accounts are ready immediately after Telegram phone verification.
        notify?.(user, app);
        return user;
      }),
    savePendingRegistration: (hash, fields, passwordHash, salt, expiresAt) => {
      db.prepare("DELETE FROM pending_registration WHERE expires_at<?").run(Date.now());
      db.prepare("INSERT INTO pending_registration(token_hash,fields,password_hash,salt,expires_at) VALUES(?,?,?,?,?)")
        .run(hash, JSON.stringify(fields), passwordHash, salt, expiresAt);
    },
    pendingRegistration: (hash) =>
      db.prepare("SELECT * FROM pending_registration WHERE token_hash=? AND expires_at>?")
        .get(hash, Date.now()),
    setPendingTelegram: (hash, telegramId) =>
      db.prepare("UPDATE pending_registration SET telegram_id=? WHERE token_hash=? AND (telegram_id='' OR telegram_id=?) AND expires_at>?")
        .run(String(telegramId), hash, String(telegramId), Date.now()).changes,
    setPendingCode: (hash, telegramId, codeHash) =>
      db.prepare("UPDATE pending_registration SET code_hash=? WHERE token_hash=? AND telegram_id=? AND code_hash='' AND expires_at>?")
        .run(codeHash, hash, String(telegramId), Date.now()).changes,
    pendingAttempt: (hash) =>
      db.prepare("UPDATE pending_registration SET attempts=attempts+1 WHERE token_hash=? AND attempts<5 AND expires_at>?")
        .run(hash, Date.now()).changes,
    deletePending: (hash) =>
      db.prepare("DELETE FROM pending_registration WHERE token_hash=?").run(hash).changes,
    updateProfile: (id, fields) => {
      const previous = api.user(id);
      if (!previous) return null;
      const user = {
        ...previous,
        ...fields,
        id,
        role: previous.role,
        server: true,
        demo: false,
      };
      db.prepare("UPDATE users SET email=?,phone=?,profile=? WHERE id=?").run(
        user.email || `${user.phone}@accounts.bakeu.invalid`,
        user.phone,
        JSON.stringify(user),
        id,
      );
      return user;
    },
    createSession: (hash, userId, expiry) => {
      db.prepare("DELETE FROM sessions WHERE expires_at<?").run(Date.now());
      db.prepare("INSERT INTO sessions VALUES(?,?,?)").run(
        hash,
        userId,
        expiry,
      );
    },
    session: (hash) =>
      db
        .prepare(
          "SELECT user_id FROM sessions WHERE token_hash=? AND expires_at>?",
        )
        .get(hash, Date.now()),
    revokeSession: (hash) =>
      db.prepare("DELETE FROM sessions WHERE token_hash=?").run(hash),
    application: (id) =>
      application(db.prepare("SELECT * FROM applications WHERE id=?").get(id)),
    applicationForUser: (id) =>
      application(
        db.prepare("SELECT * FROM applications WHERE user_id=?").get(id),
      ),
    openShop: (userId, shop, address, lat, lng) =>
      transaction(db, () => {
        const owner = api.user(userId);
        if (!owner) return { missing: true };
        if (owner.role === "seller") return { user: owner, existing: true };
        const user = {
          ...owner, role: "seller", company: shop, location: address,
          ...(lat !== null && lng !== null ? { lat, lng } : {}),
        };
        db.prepare("UPDATE users SET role=?,profile=? WHERE id=?")
          .run("seller", JSON.stringify(user), userId);
        // Older pending applications must not appear as requests for approval.
        db.prepare("DELETE FROM applications WHERE user_id=?").run(userId);
        return { user: api.user(userId), existing: false };
      }),
    decide: (id, status, adminId, reason = "") =>
      transaction(db, () => {
        const a = api.application(id);
        if (!a) return { missing: true };
        if (a.status !== "На проверке")
          return { application: a, changed: false };
        db.prepare(
          "UPDATE applications SET status=?,reason=?,decided_by=?,decided_at=? WHERE id=?",
        ).run(status, reason, String(adminId), new Date().toISOString(), id);
        if (status === "Одобрено") {
          const owner = api.user(a.userId);
          if (owner && owner.role === "client") {
            const promoted = { ...owner, role: "seller", company: a.shop, location: a.address };
            db.prepare("UPDATE users SET role=?,profile=? WHERE id=?")
              .run("seller", JSON.stringify(promoted), a.userId);
          }
        }
        return { application: api.application(id), changed: true };
      }),
    listUsers: (role, page = 0) =>
      db
        .prepare(
          "SELECT * FROM users WHERE role=? ORDER BY created_at DESC,id DESC LIMIT 6 OFFSET ?",
        )
        .all(role, page * 5)
        .map(profile),
    listApplications: (page = 0) =>
      db
        .prepare(
          "SELECT * FROM applications ORDER BY CASE WHEN status='На проверке' THEN 0 ELSE 1 END,created_at DESC,id DESC LIMIT 6 OFFSET ?",
        )
        .all(page * 5)
        .map(application),
    rememberTelegram: (user) =>
      db
        .prepare(
          "INSERT INTO telegram_users(chat_id,name,username,created_at) VALUES(?,?,?,?) ON CONFLICT(chat_id) DO UPDATE SET name=excluded.name,username=excluded.username",
        )
        .run(
          String(user.id),
          [user.first_name, user.last_name].filter(Boolean).join(" ") ||
            "Пользователь",
          user.username || "",
          new Date().toISOString(),
        ),
    setState: (id, payload) =>
      db
        .prepare(
          "INSERT INTO bot_state VALUES(?,?,?) ON CONFLICT(chat_id) DO UPDATE SET payload=excluded.payload,updated_at=excluded.updated_at",
        )
        .run(String(id), JSON.stringify(payload), Date.now()),
    getState: (id) => {
      const row = db
        .prepare("SELECT * FROM bot_state WHERE chat_id=?")
        .get(String(id));
      return row && Date.now() - row.updated_at < 30 * 60000
        ? JSON.parse(row.payload)
        : null;
    },
    clearState: (id) =>
      db.prepare("DELETE FROM bot_state WHERE chat_id=?").run(String(id)),
    newTicket: (chatId, name, body, notify) =>
      transaction(db, () => {
        const t = {
          id: randomUUID(),
          chatId: String(chatId),
          name,
          body,
          status: "Открыт",
          createdAt: new Date().toISOString(),
        };
        db.prepare(
          "INSERT INTO tickets(id,chat_id,name,body,created_at) VALUES(?,?,?,?,?)",
        ).run(t.id, t.chatId, t.name, t.body, t.createdAt);
        notify?.(t);
        return t;
      }),
    ticket: (id) =>
      ticket(db.prepare("SELECT * FROM tickets WHERE id=?").get(id)),
    listTickets: (page = 0) =>
      db
        .prepare(
          "SELECT * FROM tickets ORDER BY CASE WHEN status='Открыт' THEN 0 ELSE 1 END,created_at DESC,id DESC LIMIT 6 OFFSET ?",
        )
        .all(page * 5)
        .map(ticket),
    reply: (id, adminId, body) =>
      transaction(db, () => {
        const t = api.ticket(id);
        if (!t) return null;
        const rid = randomUUID();
        db.prepare("INSERT INTO replies VALUES(?,?,?,?,?)").run(
          rid,
          id,
          String(adminId),
          body,
          new Date().toISOString(),
        );
        queue(
          t.chatId,
          {
            text: `💬 Ответ поддержки BakeU\nОбращение #${id.slice(0, 8)}\n\n${body}`,
          },
          `reply:${rid}`,
        );
        db.prepare(
          "UPDATE tickets SET status='Ответ отправлен' WHERE id=?",
        ).run(id);
        return t;
      }),
    stats: () => {
      const count = (sql) => Number(db.prepare(sql).get().n);
      return {
        customers: count("SELECT COUNT(*) n FROM users WHERE role='client'"),
        sellers: count("SELECT COUNT(*) n FROM users WHERE role='seller'"),
        pending: count(
          "SELECT COUNT(*) n FROM applications WHERE status='На проверке'",
        ),
        approved: count(
          "SELECT COUNT(*) n FROM applications WHERE status='Одобрено'",
        ),
        telegram: count("SELECT COUNT(*) n FROM telegram_users"),
        tickets: count("SELECT COUNT(*) n FROM tickets WHERE status='Открыт'"),
        failed: count("SELECT COUNT(*) n FROM outbox WHERE status='failed'"),
      };
    },
    pendingOutbox: () =>
      db
        .prepare(
          "SELECT * FROM outbox WHERE status='pending' AND next_at<=? ORDER BY next_at,rowid LIMIT 10",
        )
        .all(Date.now()),
    outboxDone: (id) =>
      db.prepare("UPDATE outbox SET status='sent' WHERE id=?").run(id),
    outboxFailed: (id, attempts, delay) =>
      db
        .prepare("UPDATE outbox SET attempts=?,next_at=?,status=? WHERE id=?")
        .run(
          attempts,
          Date.now() + delay,
          attempts >= 8 ? "failed" : "pending",
          id,
        ),
    retryOutbox: () =>
      db
        .prepare(
          "UPDATE outbox SET status='pending',attempts=0,next_at=0 WHERE status='failed'",
        )
        .run(),
    getOffset: () =>
      Number(
        db.prepare("SELECT value FROM metadata WHERE key='offset'").get()
          ?.value || 0,
      ),
    setOffset: (value) =>
      db
        .prepare(
          "INSERT INTO metadata VALUES('offset',?) ON CONFLICT(key) DO UPDATE SET value=excluded.value",
        )
        .run(String(value)),
  };
  return api;
}
