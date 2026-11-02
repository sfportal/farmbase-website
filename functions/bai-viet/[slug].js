// Link riêng cho từng bài viết: trả trang web kèm thẻ SEO (title, description, Open Graph, dữ liệu có cấu trúc).
import { db } from "../_lib.js";

const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const strip = (h) => String(h || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

export async function onRequestGet({ params, env, request }) {
  const url = new URL(request.url);
  const slug = String(params.slug || "").slice(0, 90);
  const page = await env.ASSETS.fetch(new URL("/", url));
  let p = null;
  try { p = await (await db(env)).prepare("SELECT * FROM posts WHERE slug=? AND status='published' AND published_at<=?").bind(slug, Date.now()).first(); } catch (e) { p = null; }
  if (!p) return new Response(page.body, { status: 404, headers: page.headers });
  const canon = `${url.origin}/bai-viet/${p.slug}`;
  const title = (p.meta_title || p.title) + " | FarmBase";
  const desc = (p.meta_desc || p.excerpt || strip(p.body).slice(0, 158)).slice(0, 300);
  const abs = (u) => (!u ? "" : /^https:/.test(u) ? u : `${url.origin}/${u.replace(/^\//, "")}`);
  const img = abs(p.og_image || p.cover) || `${url.origin}/img/og-10000ha.jpg`;
  const ld = { "@context": "https://schema.org", "@type": "Article", headline: p.title, description: desc, image: [img],
    datePublished: new Date(p.published_at).toISOString(), dateModified: new Date(p.updated || p.published_at).toISOString(),
    author: { "@type": "Organization", name: "FarmBase · Công ty Cổ phần BVI" }, publisher: { "@type": "Organization", name: "FarmBase", logo: { "@type": "ImageObject", url: `${url.origin}/img/logos/bvi.png` } },
    mainEntityOfPage: canon };
  const head = `<base href="/">
<meta name="description" content="${esc(desc)}">${p.meta_kw ? `\n<meta name="keywords" content="${esc(p.meta_kw)}">` : ""}
<link rel="canonical" href="${esc(canon)}">
<meta property="og:type" content="article"><meta property="og:site_name" content="FarmBase"><meta property="og:url" content="${esc(canon)}">
<meta property="og:title" content="${esc(p.meta_title || p.title)}"><meta property="og:description" content="${esc(desc)}"><meta property="og:image" content="${esc(img)}">
<meta name="twitter:card" content="summary_large_image">
<meta property="article:published_time" content="${new Date(p.published_at).toISOString()}">
<script type="application/ld+json">${JSON.stringify(ld).replace(/</g, "\\u003c")}</script>
<script>window.FB_POST=${JSON.stringify(p.slug)}</script>`;
  let titled = false;
  const out = new HTMLRewriter()
    .on("title", { element(el) { if (!titled) { el.setInnerContent(title); el.after(head, { html: true }); titled = true; } } })
    .on('meta[name="description"]', { element(el) { el.remove(); } })
    .transform(new Response(page.body, { headers: page.headers }));
  const h = new Headers(out.headers); h.set("cache-control", "public, max-age=120");
  return new Response(out.body, { status: 200, headers: h });
}
