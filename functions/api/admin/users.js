// Quản lý tài khoản trang quản trị. Chỉ chủ sở hữu được dùng.
import { db, json, requireRole, CAN, ROLES, hashPassword, validPassword, validEmail, sameOrigin, clip } from "../../_lib.js";

const ASSIGNABLE = Object.keys(ROLES).filter((r) => r !== "owner");

export async function onRequestGet({ request, env }) {
  const me = await requireRole(request, env, CAN.users);
  if (me instanceof Response) return me;
  const D = await db(env);
  const { results } = await D.prepare(
    "SELECT id,email,name,role,active,created,created_by,last_login FROM users ORDER BY role='owner' DESC, created"
  ).all();
  return json({ users: results, roles: ROLES });
}

// Thêm tài khoản: { email, name, role, password }
export async function onRequestPost({ request, env }) {
  if (!sameOrigin(request)) return json({ error: "forbidden" }, 403);
  const me = await requireRole(request, env, CAN.users);
  if (me instanceof Response) return me;
  const b = await request.json().catch(() => ({}));
  const email = String(b.email || "").trim().toLowerCase();
  if (!validEmail(email)) return json({ error: "bad_email" }, 400);
  if (!ASSIGNABLE.includes(b.role)) return json({ error: "bad_role" }, 400);
  if (!validPassword(b.password)) return json({ error: "weak_password" }, 400);
  const D = await db(env);
  const exists = await D.prepare("SELECT id FROM users WHERE email=?").bind(email).first();
  if (exists) return json({ error: "exists" }, 409);
  await D.prepare("INSERT INTO users (email,name,role,pass,active,created,created_by) VALUES (?,?,?,?,1,?,?)")
    .bind(email, clip(b.name, 80), b.role, await hashPassword(b.password), Date.now(), me.email).run();
  return json({ ok: true });
}

// Sửa tài khoản: { id, role?, active?, name?, password? }
export async function onRequestPatch({ request, env }) {
  if (!sameOrigin(request)) return json({ error: "forbidden" }, 403);
  const me = await requireRole(request, env, CAN.users);
  if (me instanceof Response) return me;
  const b = await request.json().catch(() => ({}));
  const D = await db(env);
  const u = await D.prepare("SELECT * FROM users WHERE id=?").bind(Number(b.id)).first();
  if (!u) return json({ error: "not_found" }, 404);
  if (u.role === "owner") return json({ error: "owner_locked" }, 400);
  const sets = [], args = [];
  if (b.role !== undefined) { if (!ASSIGNABLE.includes(b.role)) return json({ error: "bad_role" }, 400); sets.push("role=?"); args.push(b.role); }
  if (b.active !== undefined) { sets.push("active=?"); args.push(b.active ? 1 : 0); }
  if (b.name !== undefined) { sets.push("name=?"); args.push(clip(b.name, 80)); }
  if (b.password !== undefined) {
    if (!validPassword(b.password)) return json({ error: "weak_password" }, 400);
    sets.push("pass=?", "fails=0", "locked_until=0"); args.push(await hashPassword(b.password));
  }
  if (!sets.length) return json({ error: "bad_request" }, 400);
  await D.prepare(`UPDATE users SET ${sets.join(",")} WHERE id=?`).bind(...args, u.id).run();
  // Đổi quyền, khóa hoặc đặt lại mật khẩu thì đăng xuất mọi phiên của người đó
  if (b.role !== undefined || b.active !== undefined || b.password !== undefined)
    await D.prepare("DELETE FROM sessions WHERE user_id=?").bind(u.id).run();
  return json({ ok: true });
}

export async function onRequestDelete({ request, env }) {
  if (!sameOrigin(request)) return json({ error: "forbidden" }, 403);
  const me = await requireRole(request, env, CAN.users);
  if (me instanceof Response) return me;
  const id = Number(new URL(request.url).searchParams.get("id"));
  const D = await db(env);
  const u = await D.prepare("SELECT role FROM users WHERE id=?").bind(id).first();
  if (!u) return json({ error: "not_found" }, 404);
  if (u.role === "owner") return json({ error: "owner_locked" }, 400);
  await D.batch([D.prepare("DELETE FROM sessions WHERE user_id=?").bind(id), D.prepare("DELETE FROM users WHERE id=?").bind(id)]);
  return json({ ok: true });
}
