// Đọc nội dung công khai của website (trang tĩnh site/index.html, bài viết, đối tác) thành dữ liệu chữ cho AI dùng.
// Chỉ đọc phần khách truy cập đã xem được: bài đã đăng công khai, không hết hạn; không đọc khách liên hệ, tài khoản, thống kê.
import { db, cachedContent, PUBLIC_SQL, POST_CATS } from "./_lib.js";

export const LANGS = ["vi", "en", "zh"];
export const lang3 = (l) => (LANGS.includes(l) ? l : "vi");

// ---------- HTML sang chữ ----------
const ENT = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", ndash: "–", mdash: "—", hellip: "…", rarr: "→", larr: "←", middot: "·", copy: "©", laquo: "«", raquo: "»" };
export const decode = (s) => s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e) =>
  e[0] === "#" ? String.fromCodePoint(e[1] === "x" || e[1] === "X" ? parseInt(e.slice(2), 16) : +e.slice(1)) : ENT[e.toLowerCase()] ?? m);

const DROP = /<(script|style|svg|template|noscript|iframe|video|audio|select)\b[\s\S]*?<\/\1>|<!--[\s\S]*?-->/gi;
const BLOCK = /^(p|div|section|article|header|footer|main|nav|aside|ul|ol|li|tr|table|form|fieldset|figure|figcaption|blockquote|details|summary|label|dl|dt|dd|h[1-6]|br|hr)$/i;

// tr(s): dịch một đoạn chữ (theo khóa câu tiếng Việt gốc), mặc định giữ nguyên
export function htmlToText(html, tr = (s) => s) {
  const out = [];
  let line = "";
  const flush = () => { const t = line.replace(/[ \t]+/g, " ").trim(); if (t) out.push(t); line = ""; };
  for (const part of String(html || "").replace(DROP, " ").split(/(<[^>]*>)/)) {
    if (part[0] === "<") {
      const m = part.match(/^<\/?\s*([a-z0-9]+)/i);
      if (!m || !BLOCK.test(m[1])) { line += " "; continue; }
      flush();
      if (part[1] !== "/") {
        const t = m[1].toLowerCase();
        if (/^h[1-6]$/.test(t)) line = "#".repeat(+t[1]) + " ";
        else if (t === "li") line = "- ";
      }
      continue;
    }
    const raw = decode(part).replace(/\s+/g, " ");
    const key = raw.trim();
    if (!key) { line += raw; continue; }
    line += (raw[0] === " " ? " " : "") + tr(key) + (raw.endsWith(" ") ? " " : "");
  }
  flush();
  return out.filter((t) => !/^#+ $|^- $/.test(t)).join("\n").normalize("NFC");
}

// ---------- Chuẩn hóa để tìm kiếm (bỏ dấu tiếng Việt) ----------
// Giữ nguyên độ dài chuỗi (mỗi ký tự thành đúng một ký tự) để vị trí tìm thấy khớp với chữ gốc khi cắt đoạn trích
const fold1 = (c) => (c === "đ" || c === "Đ" ? "d" : c.normalize("NFD")[0].toLowerCase());
export const fold = (s) => String(s || "").normalize("NFC").split("").map(fold1).join("");

// ---------- Đọc site/index.html ----------
// Chuyển một mảng/đối tượng viết kiểu JS (khóa không ngoặc, chuỗi nháy đơn) sang JSON
export function jsLiteralToJson(src) {
  let o = "";
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (c === "'" || c === '"') {
      let s = "";
      for (i++; i < src.length && src[i] !== c; i++) {
        if (src[i] === "\\") { i++; s += src[i] === "n" ? "\n" : src[i]; } else s += src[i];
      }
      o += JSON.stringify(s);
    } else if (/[A-Za-z_$]/.test(c)) {
      let w = c;
      while (/[\w$]/.test(src[i + 1] || "")) w += src[++i];
      let j = i + 1;
      while (/\s/.test(src[j] || "")) j++;
      o += src[j] === ":" ? JSON.stringify(w) : w;
    } else o += c;
  }
  return o.replace(/,(\s*[\]}])/g, "$1");
}

function parseSite(html) {
  let I18N = {};
  const im = html.match(/\/\*I18N_START\*\/([\s\S]*?)\/\*I18N_END\*\//);
  if (im) { try { I18N = JSON.parse(im[1]); } catch (e) { I18N = {}; } }

  let SOLS = [];
  const sm = html.match(/const SOLS=(\[[\s\S]*?\n\]);/);
  if (sm) { try { SOLS = JSON.parse(jsLiteralToJson(sm[1])); } catch (e) { SOLS = []; } }

  const title = decode((html.match(/<title>([^<]*)<\/title>/) || [])[1] || "FarmBase");
  const description = decode((html.match(/<meta name="description" content="([^"]*)"/) || [])[1] || "");

  // Bỏ script trước để không bắt nhầm khuôn mẫu trang giải pháp trong mã JS
  const body = html.replace(/<script\b[\s\S]*?<\/script>/gi, " ");
  const views = {};
  const re = /<div class="view" data-view="([\w-]+)"[^>]*>/g;
  const marks = [];
  let m;
  while ((m = re.exec(body))) marks.push([m[1], m.index]);
  const mainEnd = body.indexOf("</main>");
  marks.forEach(([id, at], i) => { views[id] = body.slice(at, i + 1 < marks.length ? marks[i + 1][1] : mainEnd > at ? mainEnd : body.length); });
  const fs = body.indexOf("<footer"), fe = body.indexOf("</footer>", fs);
  const footer = fs >= 0 && fe > fs ? body.slice(fs, fe) : "";
  return { I18N, SOLS, title, description, views, footer };
}

let SITE = { at: 0, v: null };
export async function siteData(env, origin) {
  if (SITE.v && Date.now() - SITE.at < 300000) return SITE.v;
  let html = "";
  try { html = env.ASSETS ? await (await env.ASSETS.fetch(new Request(origin + "/"))).text() : ""; } catch (e) { html = ""; }
  SITE = { at: Date.now(), v: parseSite(html) };
  return SITE.v;
}

// Hàm dịch: ưu tiên chữ đã sửa trong trang quản lý, rồi bản dịch có sẵn của website
export async function translator(env, site, lang) {
  let t = {};
  try { t = (await cachedContent(env)).t || {}; } catch (e) { t = {}; }
  const li = LANGS.indexOf(lang);
  return (s) => {
    const o = t[s];
    if (o && o[li]) return o[li];
    if (li > 0 && site.I18N[s] && site.I18N[s][li - 1]) return site.I18N[s][li - 1];
    return s;
  };
}

// ---------- Danh sách trang ----------
// Trang không có nội dung riêng (khung hiển thị bài viết, chi tiết đối tác)
const SKIP_VIEWS = new Set(["bai-viet", "doi-tac-ct"]);
export const pageUrl = (origin, id) => (id === "chien-dich-10000ha" ? `${origin}/chien-dich-10000ha/` : id === "trang-chu" ? `${origin}/` : `${origin}/#${id}`);

const FOR = { vi: "Phù hợp với", en: "Suitable for", zh: "适用对象" };
export function solutionText(s, tr, lang = "vi") {
  const L = [`# ${tr(s.name)}`, tr(s.desc || ""), "", tr(s.lead || "")];
  if (s.for?.length) L.push("", "## " + FOR[lang3(lang)], ...s.for.map((x) => "- " + tr(x)));
  if (s.inc?.length) L.push("", "## " + tr("Bao gồm"), ...s.inc.map((x) => "- " + tr(x)));
  if (s.steps?.length) L.push("", "## " + tr("Quy trình triển khai"), ...s.steps.map((x, i) => `${i + 1}. ${tr(x[0])}: ${tr(x[1])}`));
  if (s.warn) L.push("", tr(s.warn));
  return L.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

// Kết quả chuyển chữ được giữ 60 giây cho mỗi ngôn ngữ (trang chủ khá lớn)
const PCACHE = new Map();
export function pages(site, tr, origin, lang = "vi") {
  const ck = origin + "|" + lang, hit = PCACHE.get(ck);
  if (hit && hit.site === site && Date.now() - hit.at < 60000) return hit.list;
  const list = [];
  for (const [id, html] of Object.entries(site.views)) {
    if (SKIP_VIEWS.has(id)) continue;
    const text = htmlToText(html, tr);
    const h1 = (text.match(/^# (.+)$/m) || [])[1] || id;
    list.push({ id, type: "page", title: h1, url: pageUrl(origin, id), text });
  }
  for (const s of site.SOLS) {
    if (!s || !s.id || site.views[s.id]) continue;
    list.push({ id: s.id, type: "solution", title: tr(s.name), summary: tr(s.desc || ""), url: `${origin}/#${s.id}`, text: solutionText(s, tr, lang) });
  }
  PCACHE.set(ck, { at: Date.now(), site, list });
  return list;
}

// ---------- Bài viết công khai ----------
const POST_WHERE = `status='published' AND published_at<=? AND ${PUBLIC_SQL} AND (expires_at IS NULL OR expires_at>?)`;

export async function publicPosts(env, full = false) {
  const now = Date.now();
  const cols = "slug,cat,title,excerpt,cover,og_image,meta_desc,meta_kw,published_at,updated,tr" + (full ? ",body" : "");
  try {
    const { results } = await (await db(env)).prepare(`SELECT ${cols} FROM posts WHERE ${POST_WHERE} ORDER BY published_at DESC LIMIT 200`).bind(now, now).all();
    return results;
  } catch (e) { return []; }
}

export async function publicPost(env, slug) {
  const now = Date.now();
  try {
    return await (await db(env)).prepare(`SELECT * FROM posts WHERE slug=? AND ${POST_WHERE}`).bind(String(slug).slice(0, 90), now, now).first();
  } catch (e) { return null; }
}

export function postView(r, lang, origin, withBody = false) {
  let tr = {};
  try { tr = JSON.parse(r.tr || "{}") || {}; } catch (e) { tr = {}; }
  const t = (lang !== "vi" && tr[lang]) || {};
  const abs = (p) => (!p ? null : /^https?:\/\//.test(p) ? p : origin + "/" + String(p).replace(/^\/+/, ""));
  const o = {
    slug: r.slug, category: r.cat, category_name: POST_CATS[r.cat] || r.cat,
    title: t.title || r.title, excerpt: t.excerpt || r.excerpt || r.meta_desc || "",
    keywords: r.meta_kw || "", url: `${origin}/bai-viet/${r.slug}`, image: abs(r.og_image || r.cover),
    published: r.published_at ? new Date(r.published_at).toISOString().slice(0, 10) : null,
    lang: t.title ? lang : "vi",
  };
  if (withBody) o.text = htmlToText(t.body || r.body || "");
  return o;
}

// ---------- Đối tác (dữ liệu đã hiện công khai ở trang Khách hàng, đối tác) ----------
export const PARTNER_GROUPS = { "dong-hanh": "Đơn vị đồng hành", "khach-hang": "Khách hàng", "cong-nghe": "Đối tác công nghệ" };

export async function partnerList(env, origin) {
  let list = [];
  try { list = (await (await db(env)).prepare("SELECT data FROM partners ORDER BY sort, slug").all()).results.map((r) => JSON.parse(r.data)); } catch (e) { list = []; }
  if (!list.length && env.ASSETS) {
    try { list = await (await env.ASSETS.fetch(new Request(origin + "/data/partners.json"))).json(); } catch (e) { list = []; }
  }
  return Array.isArray(list) ? list.filter((p) => p && p.slug) : [];
}

export function partnerView(p, lang, origin, full = false) {
  const g = (o) => (o && (o[lang] || o.vi)) || "";
  const abs = (x) => (!x ? null : /^https?:\/\//.test(x) ? x : origin + "/" + String(x).replace(/^\/+/, ""));
  const o = { slug: p.slug, group: p.group, group_name: PARTNER_GROUPS[p.group] || p.group, name: g(p.name), short: g(p.short), url: `${origin}/#doi-tac/${p.slug}`, logo: abs(p.logo) };
  if (full) {
    o.about = g(p.about);
    o.role = g(p.role);
    o.products = (p.products || []).map((x) => ({ name: g(x.name), desc: g(x.desc) }));
    const c = p.contact || {};
    o.contact = Object.fromEntries(Object.entries({ address: c.address, phone: c.phone, email: c.email, web: c.web }).filter(([, v]) => v));
  }
  return o;
}

// ---------- Tìm kiếm ----------
// phrase: cả cụm từ khóa (đã bỏ dấu), khớp nguyên cụm được cộng điểm cao
export function score(terms, title, text, phrase = "") {
  const T = fold(title), X = fold(text);
  let s = 0;
  if (phrase && phrase.includes(" ")) s += (T.split(phrase).length - 1) * 40 + Math.min(X.split(phrase).length - 1, 10) * 10;
  for (const w of terms) {
    if (!X.includes(w) && !T.includes(w)) return 0;
    s += (T.split(w).length - 1) * 5 + Math.min(X.split(w).length - 1, 20);
  }
  return s;
}

export function snippet(text, terms, n = 260, phrase = "") {
  text = String(text || "").normalize("NFC");
  const F = fold(text);
  let at = phrase ? F.indexOf(phrase) : -1;
  if (at < 0) for (const w of terms) { const i = F.indexOf(w); if (i >= 0 && (at < 0 || i < at)) at = i; }
  const start = Math.max(0, at - 80);
  const s = text.slice(start, start + n).replace(/\s+/g, " ").trim();
  return (start > 0 ? "…" : "") + s + (start + n < text.length ? "…" : "");
}
