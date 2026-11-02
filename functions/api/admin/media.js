// Tải ảnh, video lên (trang quản lý đã thu nhỏ ảnh trước khi gửi). Lưu trong D1, tối đa 2 MB mỗi tệp (giới hạn một dòng của D1).
import { db, json, requireRole, CAN, sameOrigin } from "../../_lib.js";

const TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif", "video/mp4", "video/webm"];
const MAX = 1990000;

export async function onRequestPost({ request, env }) {
  if (!sameOrigin(request)) return json({ error: "forbidden" }, 403);
  const me = await requireRole(request, env, CAN.content);
  if (me instanceof Response) return me;
  const mime = (request.headers.get("content-type") || "").split(";")[0].trim();
  if (!TYPES.includes(mime)) return json({ error: "bad_type" }, 400);
  const buf = await request.arrayBuffer();
  if (!buf.byteLength || buf.byteLength > MAX) return json({ error: "too_large" }, 413);
  const name = (new URL(request.url).searchParams.get("name") || "").slice(0, 120);
  const r = await (await db(env)).prepare("INSERT INTO media (name,mime,data,size,created,created_by) VALUES (?,?,?,?,?,?)")
    .bind(name, mime, buf, buf.byteLength, Date.now(), me.email).run();
  return json({ ok: true, url: `/api/media/${r.meta.last_row_id}` });
}
