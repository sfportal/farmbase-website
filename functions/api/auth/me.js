// Người đang đăng nhập. needs_setup=true khi chưa có tài khoản chủ sở hữu.
import { db, json, currentUser, ROLES, OWNER_EMAIL } from "../../_lib.js";

export async function onRequestGet({ request, env }) {
  const D = await db(env);
  const owner = await D.prepare("SELECT id FROM users WHERE role='owner' LIMIT 1").first();
  const u = await currentUser(request, env);
  return json({
    user: u ? { email: u.email, name: u.name, role: u.role, role_name: ROLES[u.role] } : null,
    needs_setup: !owner,
    owner_email: owner ? undefined : OWNER_EMAIL(env),
  });
}
