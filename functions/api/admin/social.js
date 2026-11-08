// Cài đặt cho extension lên lịch đăng Facebook: thư mục Google Drive, khóa API cho extension.
// GET: trạng thái · PUT {drive_folder}: gắn thư mục (dán link) · POST: tạo khóa mới (chỉ hiện một lần) · DELETE: thu hồi khóa.
import { db, json, requireRole, CAN, sameOrigin, getSettings } from "../../_lib.js";
import { folderId, newKey, sha, fbReady } from "../../_social.js";

const put = (D, k, v) => D.prepare("INSERT INTO settings (k,v) VALUES (?,?) ON CONFLICT(k) DO UPDATE SET v=excluded.v").bind(k, v).run();

async function guard(request, env, write) {
  if (write && !sameOrigin(request)) return json({ error: "forbidden" }, 403);
  return requireRole(request, env, CAN.settings);
}

export async function onRequestGet({ request, env }) {
  const me = await guard(request, env, false);
  if (me instanceof Response) return me;
  const s = await getSettings(await db(env));
  return json({
    drive_folder: s.drive_folder || "", drive_link: s.drive_folder ? `https://drive.google.com/drive/folders/${s.drive_folder}` : "",
    has_key: !!s.social_key_hash, key_created: s.social_key_created ? +s.social_key_created : null, key_by: s.social_key_by || "",
    google_api: !!env.GOOGLE_API_KEY, facebook: fbReady(env), page_id: env.FB_PAGE_ID || "",
  });
}

export async function onRequestPut({ request, env }) {
  const me = await guard(request, env, true);
  if (me instanceof Response) return me;
  const b = await request.json().catch(() => ({}));
  const raw = String(b.drive_folder || "").trim();
  const id = raw ? folderId(raw) : "";
  if (raw && !id) return json({ error: "bad_drive" }, 400);
  await put(await db(env), "drive_folder", id);
  return json({ ok: true, drive_folder: id });
}

export async function onRequestPost({ request, env }) {
  const me = await guard(request, env, true);
  if (me instanceof Response) return me;
  const D = await db(env);
  const key = newKey();
  await put(D, "social_key_hash", await sha(key));
  await put(D, "social_key_created", String(Date.now()));
  await put(D, "social_key_by", me.email);
  return json({ key });
}

export async function onRequestDelete({ request, env }) {
  const me = await guard(request, env, true);
  if (me instanceof Response) return me;
  const D = await db(env);
  await D.prepare("DELETE FROM settings WHERE k IN ('social_key_hash','social_key_created','social_key_by')").run();
  return json({ ok: true });
}
