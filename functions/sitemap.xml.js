// Sơ đồ trang cho Google: trang chính và các bài viết đã đăng.
import { db } from "./_lib.js";

export async function onRequestGet({ env, request }) {
  const o = new URL(request.url).origin;
  const urls = [[`${o}/`, null], [`${o}/chien-dich-10000ha/`, null]];
  try {
    const { results } = await (await db(env)).prepare("SELECT slug, COALESCE(updated,published_at) t FROM posts WHERE status='published' AND published_at<=? ORDER BY published_at DESC LIMIT 5000").bind(Date.now()).all();
    for (const r of results) urls.push([`${o}/bai-viet/${r.slug}`, r.t]);
  } catch (e) { /* chưa có D1 */ }
  const x = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map(([u, t]) => `<url><loc>${u}</loc>${t ? `<lastmod>${new Date(t).toISOString().slice(0, 10)}</lastmod>` : ""}</url>`).join("\n")}\n</urlset>`;
  return new Response(x, { headers: { "content-type": "application/xml; charset=utf-8", "cache-control": "public, max-age=600" } });
}
