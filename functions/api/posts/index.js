// Danh sách bài viết đã đăng (trang Blog đọc).
import { db, json, publicPost } from "../../_lib.js";

export async function onRequestGet({ env }) {
  try {
    const { results } = await (await db(env)).prepare(
      "SELECT slug,cat,title,excerpt,cover,published_at,updated,meta_title,meta_desc,og_image,tr FROM posts WHERE status='published' AND published_at<=? ORDER BY published_at DESC LIMIT 200"
    ).bind(Date.now()).all();
    return json({ items: results.map((r) => publicPost(r)) }, 200, { "cache-control": "public, max-age=60" });
  } catch (e) {
    return json({ items: [] });
  }
}
