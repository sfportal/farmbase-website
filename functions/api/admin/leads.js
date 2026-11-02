// Danh sách khách để lại liên hệ và cập nhật trạng thái. Cần khóa ADMIN_TOKEN.
import { db, json, isAdmin, clip } from "../../_lib.js";

const STATUSES = ["Mới", "Đã gọi", "Hẹn gặp", "Đã gửi báo giá", "Đã ký", "Không phù hợp"];

export async function onRequestGet({ request, env }) {
  if (!isAdmin(request, env)) return json({ error: "unauthorized" }, 401);
  const D = await db(env);
  const { results } = await D.prepare("SELECT * FROM leads ORDER BY ts DESC LIMIT 500").all();
  return json({ leads: results, statuses: STATUSES });
}

export async function onRequestPatch({ request, env }) {
  if (!isAdmin(request, env)) return json({ error: "unauthorized" }, 401);
  const b = await request.json().catch(() => ({}));
  if (!b.id || !STATUSES.includes(b.status)) return json({ error: "bad_request" }, 400);
  const D = await db(env);
  await D.prepare("UPDATE leads SET status=? WHERE id=?").bind(clip(b.status, 30), Number(b.id)).run();
  return json({ ok: true });
}
