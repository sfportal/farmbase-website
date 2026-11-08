// Sơ đồ trang cho Google: các trang chính (kèm bản EN, 中文), trang từng đối tác và các bài viết đã đăng.
import { db, PUBLIC_SQL } from "./_lib.js";
import { PAGES, pagePath, PRIORITY, HREFLANG } from "./_pages.js";
import { partnerList } from "./trang.js";

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;");

export async function onRequestGet({ env, request }) {
  const o = new URL(request.url).origin;
  // [đường link, ngày sửa, ưu tiên, có bản ngôn ngữ khác]
  const urls = Object.keys(PAGES).filter((id) => !/^(chinh-sach-bao-mat|dieu-khoan-su-dung)$/.test(id))
    .map((id) => [`${o}${pagePath(id)}`, null, PRIORITY[id] || "0.7", true]);
  for (const p of await partnerList(env, o)) if (p && p.slug) urls.push([`${o}/doi-tac/${p.slug}`, null, "0.6", true]);
  try {
    const { results } = await (await db(env)).prepare(`SELECT slug, COALESCE(updated,published_at) t FROM posts WHERE status='published' AND published_at<=? AND ${PUBLIC_SQL} AND (expires_at IS NULL OR expires_at>?) ORDER BY published_at DESC LIMIT 5000`).bind(Date.now(), Date.now()).all();
    for (const r of results) urls.push([`${o}/bai-viet/${r.slug}`, r.t, "0.7", false]);
  } catch (e) { /* chưa có D1 */ }
  const alt = (u) => Object.entries(HREFLANG).map(([l, h]) => `<xhtml:link rel="alternate" hreflang="${h}" href="${esc(l === "vi" ? u : `${u}?lang=${l}`)}"/>`).join("") + `<xhtml:link rel="alternate" hreflang="x-default" href="${esc(u)}"/>`;
  const x = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${urls.map(([u, t, pr, langs]) =>
    `<url><loc>${esc(u)}</loc>${t ? `<lastmod>${new Date(t).toISOString().slice(0, 10)}</lastmod>` : ""}<priority>${pr}</priority>${langs ? alt(u) : ""}</url>`).join("\n")}\n</urlset>`;
  return new Response(x, { headers: { "content-type": "application/xml; charset=utf-8", "cache-control": "public, max-age=600" } });
}
