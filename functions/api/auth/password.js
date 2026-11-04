// Người dùng tự đổi mật khẩu của mình.
import { db, json, currentUser, checkPassword, hashPassword, validPassword, sameOrigin } from "../../_lib.js";

export async function onRequestPost({ request, env }) {
  if (!sameOrigin(request)) return json({ error: "forbidden" }, 403);
  const u = await currentUser(request, env);
  if (!u || !u.id) return json({ error: "unauthorized" }, 401);
  const b = await request.json().catch(() => ({}));
  if (!validPassword(b.new_password)) return json({ error: "weak_password" }, 400);
  const D = await db(env);
  const row = await D.prepare("SELECT pass FROM users WHERE id=?").bind(u.id).first();
  if (!(await checkPassword(String(b.old_password || ""), row.pass))) return json({ error: "wrong" }, 401);
  if (b.new_password === String(b.old_password || "")) return json({ error: "same_password" }, 400);
  await D.prepare("UPDATE users SET pass=?, must_change=0 WHERE id=?").bind(await hashPassword(b.new_password), u.id).run();
  return json({ ok: true });
}
