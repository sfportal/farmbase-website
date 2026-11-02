// Trả ảnh đã tải lên trong trang quản lý.
import { db } from "../../_lib.js";

export async function onRequestGet({ params, env }) {
  const id = Number(params.id);
  if (!Number.isInteger(id) || id < 1) return new Response("Not found", { status: 404 });
  const row = await (await db(env)).prepare("SELECT mime,data FROM media WHERE id=?").bind(id).first();
  if (!row) return new Response("Not found", { status: 404 });
  return new Response(new Uint8Array(row.data), {
    headers: { "content-type": row.mime, "cache-control": "public, max-age=31536000, immutable", "x-content-type-options": "nosniff" },
  });
}
