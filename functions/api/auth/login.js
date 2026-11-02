// Đăng nhập bằng email và mật khẩu. Khóa tài khoản 15 phút sau 8 lần sai liên tiếp.
import { db, json, checkPassword, hashPassword, createSession, sameOrigin, ROLES, clip } from "../../_lib.js";

const MAX_FAILS = 8;
const LOCK_MS = 15 * 60000;

export async function onRequestPost({ request, env }) {
  if (!sameOrigin(request)) return json({ error: "forbidden" }, 403);
  const b = await request.json().catch(() => ({}));
  const email = String(b.email || "").trim().toLowerCase();
  const pw = String(b.password || "");
  const D = await db(env);
  const u = await D.prepare("SELECT * FROM users WHERE email=?").bind(clip(email, 120)).first();
  if (!u) {
    await hashPassword(pw); // giữ thời gian phản hồi tương đương
    const any = await D.prepare("SELECT COUNT(*) n FROM users").first();
    return json({ error: any.n ? "wrong" : "no_users" }, 401);
  }
  if (!u.active) return json({ error: "disabled" }, 403);
  if (u.locked_until > Date.now()) return json({ error: "locked", until: u.locked_until }, 429);
  if (!(await checkPassword(pw, u.pass))) {
    const fails = u.fails + 1;
    await D.prepare("UPDATE users SET fails=?, locked_until=? WHERE id=?")
      .bind(fails >= MAX_FAILS ? 0 : fails, fails >= MAX_FAILS ? Date.now() + LOCK_MS : 0, u.id).run();
    return json({ error: fails >= MAX_FAILS ? "locked" : "wrong" }, 401);
  }
  await D.prepare("UPDATE users SET fails=0, locked_until=0, last_login=? WHERE id=?").bind(Date.now(), u.id).run();
  const cookie = await createSession(D, u.id, request);
  return json({ ok: true, user: { email: u.email, name: u.name, role: u.role, role_name: ROLES[u.role] } }, 200, { "set-cookie": cookie });
}
