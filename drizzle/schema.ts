import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, json } from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

export const calculationSessions = mysqlTable("calculation_sessions", {
  id: int("id").autoincrement().primaryKey(),
  sessionKey: varchar("sessionKey", { length: 64 }).notNull().unique(),
  projectName: varchar("projectName", { length: 255 }),
  engineerName: varchar("engineerName", { length: 255 }),
  projectRef: varchar("projectRef", { length: 128 }),
  calcDate: varchar("calcDate", { length: 32 }),
  moduleType: varchar("moduleType", { length: 64 }).notNull(),
  inputData: json("inputData").notNull(),
  resultData: json("resultData").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type CalculationSession = typeof calculationSessions.$inferSelect;
export type InsertCalculationSession = typeof calculationSessions.$inferInsert;
