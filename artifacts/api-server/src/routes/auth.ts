import { Router } from "express";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { z } from "zod";

const router = Router();

const registerSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(6),
  role: z.enum(["ds_engineer", "manager", "admin"]),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

function formatUser(user: typeof usersTable.$inferSelect) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    createdAt: user.createdAt.toISOString(),
  };
}

router.post("/auth/register", async (req, res) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input", message: parsed.error.message });
    return;
  }
  const { name, email, password, role } = parsed.data;
  const existing = await db.select().from(usersTable).where(eq(usersTable.email, email)).limit(1);
  if (existing.length > 0) {
    res.status(400).json({ error: "User already exists", message: "Email already registered" });
    return;
  }
  const [user] = await db.insert(usersTable).values({ name, email, password, role }).returning();
  (req.session as Record<string, unknown>).userId = user.id;
  res.status(201).json({ user: formatUser(user), message: "Registration successful" });
});

router.post("/auth/login", async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input", message: parsed.error.message });
    return;
  }
  const { email, password } = parsed.data;
  const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email)).limit(1);
  if (!user || user.password !== password) {
    res.status(401).json({ error: "Unauthorized", message: "Invalid email or password" });
    return;
  }
  (req.session as Record<string, unknown>).userId = user.id;
  res.json({ user: formatUser(user), message: "Login successful" });
});

router.post("/auth/logout", (req, res) => {
  req.session.destroy(() => {
    res.json({ message: "Logged out successfully" });
  });
});

router.get("/auth/me", async (req, res) => {
  const session = req.session as Record<string, unknown>;
  if (!session.userId) {
    res.status(401).json({ error: "Unauthorized", message: "Not logged in" });
    return;
  }
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, session.userId as number)).limit(1);
  if (!user) {
    res.status(401).json({ error: "Unauthorized", message: "User not found" });
    return;
  }
  res.json(formatUser(user));
});

export default router;
