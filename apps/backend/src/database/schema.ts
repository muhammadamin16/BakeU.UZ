import {
  index,
  pgEnum,
  pgTable,
  timestamp,
  uuid,
  varchar,
  text,
} from "drizzle-orm/pg-core";

export const userRole = pgEnum("user_role", ["CUSTOMER", "SELLER", "ADMIN"]);
export const accountStatus = pgEnum("account_status", ["ACTIVE", "SUSPENDED"]);
export const shopStatus = pgEnum("shop_status", [
  "DRAFT",
  "PENDING",
  "ACTIVE",
  "SUSPENDED",
]);

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  firstName: varchar("first_name", { length: 100 }).notNull(),
  lastName: varchar("last_name", { length: 100 }).notNull(),
  email: varchar("email", { length: 254 }).notNull().unique(),
  phone: varchar("phone", { length: 16 }).notNull().unique(),
  passwordHash: text("password_hash"),
  role: userRole("role").notNull().default("CUSTOMER"),
  status: accountStatus("status").notNull().default("ACTIVE"),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});

export const shops = pgTable(
  "shops",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    ownerId: uuid("owner_id")
      .notNull()
      .references(() => users.id, {
        onDelete: "restrict",
        onUpdate: "cascade",
      }),
    name: varchar("name", { length: 150 }).notNull(),
    address: varchar("address", { length: 300 }).notNull(),
    status: shopStatus("status").notNull().default("PENDING"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("shops_owner_id_idx").on(table.ownerId),
    index("shops_status_idx").on(table.status),
  ],
);
