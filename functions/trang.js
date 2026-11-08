// Trang có đường link riêng cho Google, Zalo, Facebook: /, /giai-phap/, /ma-vung-trong/, /doi-tac/<mã>...
// Máy chủ trả trang web chung (index.html) kèm title, description, canonical, hreflang, Open Graph và JSON-LD riêng từng trang.
// Khi mở trên trình duyệt, trang tự chuyển sang dạng /#mã như cũ nên mọi tính năng bên trong không đổi.
import { db } from "./_lib.js";
import { PAGES, pagePath, HREFLANG, OG_LOCALE, ORG, SITE } from "./_pages.js";

const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const L = (v, lang) => (v && typeof v === "object" ? v[lang] || v.vi || "" : String(v || ""));
const cut = (s, n) => { s = String(s || "").replace(/\s+/g, " ").trim(); return s.length <= n ? s : s.slice(0, s.lastIndexOf(" ", n - 1) > n * 0.6 ? s.lastIndexOf(" ", n - 1) : n - 1) + "…"; };

// Danh sách đối tác: trong D1 (trang quản lý) hoặc bản mẫu data/partners.json
export async function partnerList(env, origin) {
  try {
    const { results } = await (await db(env)).prepare("SELECT data FROM partners ORDER BY sort, slug").all();
    if (results.length) return results.map((r) => JSON.parse(r.data));
  } catch (e) { /* chưa có D1 */ }
  try { const r = await env.ASSETS.fetch(new URL("/data/partners.json", origin)); if (r.ok) return await r.json(); } catch (e) { /* không có tệp */ }
  return [];
}

// Trả null nếu đường dẫn không phải trang SEO (để router xử lý tiếp)
export async function seoPage(request, env) {
  if (request.method !== "GET" && request.method !== "HEAD") return null;
  const url = new URL(request.url), o = url.origin, path = url.pathname;
  let id, partner = null;
  if (path === "/") id = "trang-chu";
  else {
    const m = path.match(/^\/([a-z0-9-]+)(?:\/([a-z0-9][a-z0-9-]*))?(\/?)$/);
    if (!m) return null;
    if (m[2]) {
      if (m[1] !== "doi-tac") return null;
      partner = (await partnerList(env, o)).find((p) => p && p.slug === m[2]);
      if (!partner) return null;
      id = "doi-tac";
    } else {
      if (!PAGES[m[1]] || m[1] === "trang-chu") return null;
      id = m[1];
      if (!m[3]) return Response.redirect(`${o}/${id}/${url.search}`, 301);
    }
  }
  const lang = ["en", "zh"].includes(url.searchParams.get("lang")) ? url.searchParams.get("lang") : "vi";
  const pg = PAGES[id];
  const rel = partner ? `/doi-tac/${partner.slug}` : pagePath(id);
  const withLang = (l) => `${o}${rel}${l === "vi" ? "" : `?lang=${l}`}`;
  const canon = withLang(lang);
  let [title, desc] = pg.t[lang] || pg.t.vi;
  let img = `${o}/${pg.img}`, view = id;
  if (partner) {
    title = `${L(partner.name, lang)}`;
    desc = cut([L(partner.short, lang), L(partner.about, lang)].filter(Boolean).join(". "), 160);
    if (partner.cover) img = /^https:/.test(partner.cover) ? partner.cover : `${o}/${partner.cover.replace(/^\//, "")}`;
    view = `doi-tac/${partner.slug}`;
  }
  const fullTitle = id === "trang-chu" ? title : `${title} | ${SITE}`;

  // Breadcrumb: Trang chủ > (trang cha) > trang
  const crumbs = [["Trang chủ", `${o}/`]];
  if (id !== "trang-chu") {
    if (pg.parent) crumbs.push([PAGES[pg.parent].crumb, `${o}${pagePath(pg.parent)}`]);
    crumbs.push([pg.crumb, `${o}${pagePath(id)}`]);
    if (partner) crumbs.push([L(partner.name, "vi"), `${o}${rel}`]);
  }
  const graph = [
    ORG(o),
    { "@type": "WebSite", "@id": `${o}/#web`, url: `${o}/`, name: SITE, inLanguage: ["vi", "en", "zh-Hans"], publisher: { "@id": `${o}/#org` } },
    { "@type": "WebPage", "@id": `${canon}#page`, url: canon, name: fullTitle, description: desc, inLanguage: HREFLANG[lang], isPartOf: { "@id": `${o}/#web` }, primaryImageOfPage: img, about: { "@id": `${o}/#org` } },
  ];
  if (crumbs.length > 1) graph.push({ "@type": "BreadcrumbList", itemListElement: crumbs.map(([n, u], i) => ({ "@type": "ListItem", position: i + 1, name: n, item: u })) });
  if (partner) {
    const web = partner.contact && partner.contact.web;
    graph.push({ "@type": "Organization", name: L(partner.name, "vi"), alternateName: L(partner.name, "en"), description: cut(L(partner.about, "vi"), 300),
      ...(partner.logo ? { logo: `${o}/${partner.logo.replace(/^\//, "")}` } : {}), ...(web ? { url: web } : {}) });
  }

  const head = `${id === "trang-chu" ? "" : '<base href="/">\n'}<meta name="description" content="${esc(desc)}">
<meta name="robots" content="index, follow, max-image-preview:large">
<link rel="canonical" href="${esc(canon)}">
${Object.keys(HREFLANG).map((l) => `<link rel="alternate" hreflang="${HREFLANG[l]}" href="${esc(withLang(l))}">`).join("\n")}
<link rel="alternate" hreflang="x-default" href="${esc(withLang("vi"))}">
<meta property="og:type" content="website"><meta property="og:site_name" content="${SITE}"><meta property="og:locale" content="${OG_LOCALE[lang]}">
<meta property="og:url" content="${esc(canon)}"><meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(desc)}">
<meta property="og:image" content="${esc(img)}"><meta property="og:image:alt" content="${esc(title)}">
<meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${esc(title)}"><meta name="twitter:description" content="${esc(desc)}"><meta name="twitter:image" content="${esc(img)}">
<script type="application/ld+json">${JSON.stringify({ "@context": "https://schema.org", "@graph": graph }).replace(/</g, "\\u003c")}</script>${id === "trang-chu" ? "" : `
<script>window.FB_VIEW=${JSON.stringify(view)};history.replaceState(null,'','/'+location.search+(location.hash||'#'+window.FB_VIEW));</script>`}`;

  const page = await env.ASSETS.fetch(new URL("/", o));
  if (!page.ok) return null;
  let titled = false;
  const out = new HTMLRewriter()
    .on("html", { element(el) { el.setAttribute("lang", HREFLANG[lang]); } })
    .on("title", { element(el) { if (!titled) { el.setInnerContent(fullTitle); el.after(head, { html: true }); titled = true; } } })
    .on('meta[name="description"]', { element(el) { el.remove(); } })
    .transform(new Response(page.body, { headers: page.headers }));
  const h = new Headers(out.headers);
  h.set("cache-control", "public, max-age=300");
  h.delete("etag");
  return new Response(request.method === "HEAD" ? null : out.body, { status: 200, headers: h });
}
