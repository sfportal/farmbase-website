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
  if (!p || (p.expires_at && p.expires_at <= Date.now())) {
    // Không có hoặc đã hết hiệu lực: trang web tự báo cho người xem
    const h404 = new Headers(page.headers); h404.set("x-robots-tag", "noindex"); h404.set("cache-control", "no-store");
    const slugOut = new HTMLRewriter().on("title", { element(el) { el.after(`<base href="/"><meta name="robots" content="noindex"><script>window.FB_POST=${JSON.stringify(slug)}</script>`, { html: true }); } })
      .transform(new Response(page.body, { headers: page.headers }));
    return new Response(slugOut.body, { status: 404, headers: h404 });
  }
  const priv = p.visibility === "link", locked = priv && !!p.pass_hash;
  const canon = `${url.origin}/bai-viet/${p.slug}`;
  const title = (p.meta_title || p.title) + " | FarmBase";
  // Bài có mật khẩu: không lấy nội dung làm mô tả
  const desc = (p.meta_desc || p.excerpt || (locked ? "Bài viết dành cho người tham gia chương trình. Nhập mật khẩu để xem." : strip(p.body).slice(0, 158))).slice(0, 300);
  const abs = (u) => (!u ? "" : /^https:/.test(u) ? u : `${url.origin}/${u.replace(/^\//, "")}`);
  const img = abs(p.og_image || p.cover) || `${url.origin}/img/og-10000ha.jpg`;
  const ld = { "@context": "https://schema.org", "@type": "Article", headline: p.title, description: desc, image: [img],
    datePublished: new Date(p.published_at).toISOString(), dateModified: new Date(p.updated || p.published_at).toISOString(),
    author: { "@type": "Organization", name: "FarmBase · Công ty Cổ phần BVI" }, publisher: { "@type": "Organization", name: "FarmBase", logo: { "@type": "ImageObject", url: `${url.origin}/img/logos/bvi.png` } },
    mainEntityOfPage: canon, inLanguage: "vi" };
  const crumbs = { "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: [["Trang chủ", `${url.origin}/`], ["Blog", `${url.origin}/blog/`], [p.title, canon]].map(([n, u], i) => ({ "@type": "ListItem", position: i + 1, name: n, item: u })) };
  const head = `<base href="/">
<meta name="description" content="${esc(desc)}">${p.meta_kw ? `\n<meta name="keywords" content="${esc(p.meta_kw)}">` : ""}
<link rel="canonical" href="${esc(canon)}">
<meta property="og:type" content="article"><meta property="og:site_name" content="FarmBase"><meta property="og:url" content="${esc(canon)}">
<meta property="og:title" content="${esc(p.meta_title || p.title)}"><meta property="og:description" content="${esc(desc)}"><meta property="og:image" content="${esc(img)}">
<meta property="og:locale" content="vi_VN"><meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${esc(p.meta_title || p.title)}"><meta name="twitter:description" content="${esc(desc)}"><meta name="twitter:image" content="${esc(img)}">
<meta property="article:published_time" content="${new Date(p.published_at).toISOString()}">
${priv ? '<meta name="robots" content="noindex, nofollow">' : `<script type="application/ld+json">${JSON.stringify([ld, crumbs]).replace(/</g, "\\u003c")}</script>`}
<script>window.FB_POST=${JSON.stringify(p.slug)}</script>`;
  let titled = false;
  const out = new HTMLRewriter()
    .on("title", { element(el) { if (!titled) { el.setInnerContent(title); el.after(head, { html: true }); titled = true; } } })
    .on('meta[name="description"]', { element(el) { el.remove(); } })
    .transform(new Response(page.body, { headers: page.headers }));
  const h = new Headers(out.headers); h.set("cache-control", priv ? "private, no-store" : "public, max-age=120");
  if (priv) h.set("x-robots-tag", "noindex, nofollow");
  return new Response(out.body, { status: 200, headers: h });
}
