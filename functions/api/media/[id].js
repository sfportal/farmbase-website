// Trả ảnh, video đã tải lên trong trang quản lý (hỗ trợ Range để video phát được trên Safari).
import { db } from "../../_lib.js";

export async function onRequestGet({ params, env, request }) {
  const id = Number(params.id);
  if (!Number.isInteger(id) || id < 1) return new Response("Not found", { status: 404 });
  const row = await (await db(env)).prepare("SELECT mime,data FROM media WHERE id=?").bind(id).first();
  if (!row) return new Response("Not found", { status: 404 });
  const buf = new Uint8Array(row.data), n = buf.byteLength;
  const h = { "content-type": row.mime, "cache-control": "public, max-age=31536000, immutable", "x-content-type-options": "nosniff", "accept-ranges": "bytes" };
  const m = /^bytes=(\d*)-(\d*)$/.exec(request.headers.get("range") || "");
  if (m && (m[1] || m[2])) {
    let a = m[1] ? +m[1] : Math.max(0, n - +m[2]), b = m[1] && m[2] ? Math.min(+m[2], n - 1) : n - 1;
    if (a >= n || a > b) return new Response(null, { status: 416, headers: { "content-range": `bytes */${n}` } });
    return new Response(buf.slice(a, b + 1), { status: 206, headers: { ...h, "content-range": `bytes ${a}-${b}/${n}`, "content-length": String(b - a + 1) } });
  }
  return new Response(buf, { headers: { ...h, "content-length": String(n) } });
}
