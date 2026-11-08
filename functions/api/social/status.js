// Extension kiểm tra kết nối: khóa hợp lệ chưa, đã gắn thư mục Drive, đã cấu hình Facebook Graph API chưa.
import { db, json, getSettings } from "../../_lib.js";
import { socialAuth, fbReady } from "../../_social.js";

export async function onRequestGet({ request, env }) {
  const u = await socialAuth(request, env);
  if (u instanceof Response) return u;
  const s = await getSettings(await db(env));
  return json({
    ok: true, site: new URL(request.url).origin, user: u.name || u.email,
    drive: s.drive_folder ? { folder: s.drive_folder, link: `https://drive.google.com/drive/folders/${s.drive_folder}`, mode: env.GOOGLE_API_KEY ? "api" : "public" } : null,
    facebook: fbReady(env) ? { page_id: env.FB_PAGE_ID } : null,
  });
}
