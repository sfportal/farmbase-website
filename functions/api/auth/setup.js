// Tạo (hoặc đặt lại) mật khẩu cho tài khoản chủ sở hữu.
// Cần "mã cài đặt" = biến bí mật ADMIN_TOKEN trên Cloudflare, nên chỉ người quản lý Cloudflare làm được.
import { db, json, hashPassword, validPassword, createSession, sameOrigin, OWNER_EMAIL, ROLES } from "../../_lib.js";

export async function onRequestPost({ request, env }) {
  if (!sameOrigin(request)) return json({ error: "forbidden" }, 403);
  if (!env.ADMIN_TOKEN) return json({ error: "no_admin_token" }, 400);
  const b = await request.json().catch(() => ({}));
  if (String(b.code || "") !== env.ADMIN_TOKEN) return json({ error: "wrong_code" }, 401);
  if (!validPassword(b.password)) return json({ error: "weak_password" }, 400);
  const D = await db(env);
  const email = OWNER_EMAIL(env);
  const pass = await hashPassword(b.password);
  await D.prepare(
    `INSERT INTO users (email,name,role,pass,active,created,created_by,last_login) VALUES (?,?,?,?,1,?,'setup',?)
     ON CONFLICT(email) DO UPDATE SET pass=excluded.pass, role='owner', active=1, fails=0, locked_until=0, last_login=excluded.last_login`
  ).bind(email, String(b.name || "Chủ sở hữu").slice(0, 80), "owner", pass, Date.now(), Date.now()).run();
  const u = await D.prepare("SELECT id,name FROM users WHERE email=?").bind(email).first();
  await D.prepare("DELETE FROM sessions WHERE user_id=?").bind(u.id).run();
  const cookie = await createSession(D, u.id, request);
  return json({ ok: true, user: { email, name: u.name, role: "owner", role_name: ROLES.owner } }, 200, { "set-cookie": cookie });
}
