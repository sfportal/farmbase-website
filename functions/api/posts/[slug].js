// Một bài viết đã đăng.
import { db, json, publicPost } from "../../_lib.js";

export async function onRequestGet({ params, env }) {
  const slug = String(params.slug || "").slice(0, 90);
  const r = await (await db(env)).prepare("SELECT * FROM posts WHERE slug=? AND status='published' AND published_at<=?").bind(slug, Date.now()).first();
  if (!r) return json({ error: "not_found" }, 404);
  return json(publicPost(r, true), 200, { "cache-control": "public, max-age=60" });
}
