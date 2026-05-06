import type { Session } from "express-session";

declare module "express-session" {
  interface SessionData {
    userId?: number;
    isAdmin?: boolean;
    adminUsername?: string;
  }
}

export type AppSession = Session & {
  userId?: number;
  isAdmin?: boolean;
  adminUsername?: string;
};
