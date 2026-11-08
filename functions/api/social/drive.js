// Ảnh, video trong thư mục Google Drive đã gắn ở trang quản lý. ?folder=<mã thư mục con> để xem thư mục con.
import { db, json, getSettings } from "../../_lib.js";
import { socialAuth, listDrive, FILE_ID } from "../../_social.js";

export async function onRequestGet({ request, env }) {
  const u = await socialAuth(request, env);
  if (u instanceof Response) return u;
  const s = await getSettings(await db(env));
  const root = s.drive_folder;
  if (!root) return json({ error: "no_drive" }, 400);
  const url = new URL(request.url);
  let folder = url.searchParams.get("folder") || root;
  if (!FILE_ID.test(folder)) return json({ error: "bad_folder" }, 400);
  try {
    const d = await listDrive(folder);
    return json({ root, folder, link: `https://drive.google.com/drive/folders/${folder}`, ...d });
  } catch (e) {
    console.error("drive", e.message);
    return json({ error: e.message === "drive_private" || /drive_40[34]/.test(e.message) ? "drive_private" : "drive_error" }, 502);
  }
}
