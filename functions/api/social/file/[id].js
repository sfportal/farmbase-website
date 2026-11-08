// Trả tệp gốc từ thư mục Drive đã gắn (để tải về máy hoặc để Facebook tự tải khi hẹn giờ). Cần GOOGLE_API_KEY.
import { db, getSettings } from "../../../_lib.js";
import { insideRoot, FILE_ID } from "../../../_social.js";

export async function onRequestGet({ params, env, request }) {
  const id = params.id;
  if (!FILE_ID.test(id || "")) return new Response("Not found", { status: 404 });
  if (!env.GOOGLE_API_KEY) return Response.redirect(`https://drive.google.com/uc?export=download&id=${id}`, 302);
  const root = (await getSettings(await db(env))).drive_folder;
  if (!root) return new Response("Not found", { status: 404 });
  let meta;
  try { meta = await insideRoot(env, root, id); } catch (e) { meta = null; }
  if (!meta || meta.mimeType === "application/vnd.google-apps.folder" || meta.mimeType.startsWith("application/vnd.google-apps")) return new Response("Not found", { status: 404 });
  const h = {};
  const range = request.headers.get("range");
  if (range) h.range = range;
  const r = await fetch(`https://www.googleapis.com/drive/v3/files/${id}?alt=media&supportsAllDrives=true&key=${encodeURIComponent(env.GOOGLE_API_KEY)}`, { headers: h });
  if (!r.ok && r.status !== 206) return new Response("Not found", { status: 404 });
  const out = new Headers({
    "content-type": meta.mimeType || "application/octet-stream",
    "content-disposition": `inline; filename*=UTF-8''${encodeURIComponent(meta.name || id)}`,
    "cache-control": "public, max-age=3600", "x-content-type-options": "nosniff", "accept-ranges": "bytes",
  });
  for (const k of ["content-length", "content-range"]) if (r.headers.get(k)) out.set(k, r.headers.get(k));
  return new Response(r.body, { status: r.status, headers: out });
}
