// Tiện ích dùng chung cho các API của FarmBase (Cloudflare Pages Functions + D1).
export const json = (data, status = 200, extra = {}) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", ...extra },
  });

const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS events (
     id INTEGER PRIMARY KEY AUTOINCREMENT,
     ts INTEGER NOT NULL, type TEXT NOT NULL, path TEXT, lang TEXT,
     sid TEXT, vid TEXT, ms INTEGER, label TEXT, ref TEXT, device TEXT, country TEXT)`,
  `CREATE INDEX IF NOT EXISTS idx_events_ts ON events(ts)`,
  `CREATE INDEX IF NOT EXISTS idx_events_type_path ON events(type, path)`,
  `CREATE TABLE IF NOT EXISTS leads (
     id INTEGER PRIMARY KEY AUTOINCREMENT,
     ts INTEGER NOT NULL, name TEXT NOT NULL, phone TEXT NOT NULL, email TEXT,
     org_type TEXT, need TEXT, crop TEXT, area TEXT, location TEXT, note TEXT,
     source TEXT, page TEXT, lang TEXT, status TEXT NOT NULL DEFAULT 'Mới',
     emailed INTEGER NOT NULL DEFAULT 0)`,
  `CREATE INDEX IF NOT EXISTS idx_leads_ts ON leads(ts)`,
  `CREATE TABLE IF NOT EXISTS users (
     id INTEGER PRIMARY KEY AUTOINCREMENT,
     email TEXT NOT NULL UNIQUE, name TEXT, role TEXT NOT NULL,
     pass TEXT NOT NULL, active INTEGER NOT NULL DEFAULT 1,
     fails INTEGER NOT NULL DEFAULT 0, locked_until INTEGER NOT NULL DEFAULT 0,
     created INTEGER NOT NULL, created_by TEXT, last_login INTEGER)`,
  `CREATE TABLE IF NOT EXISTS sessions (
     token TEXT PRIMARY KEY, user_id INTEGER NOT NULL, expires INTEGER NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS settings (k TEXT PRIMARY KEY, v TEXT)`,
  `CREATE TABLE IF NOT EXISTS content (
     k TEXT PRIMARY KEY, vi TEXT, en TEXT, zh TEXT, updated INTEGER, updated_by TEXT)`,
  `CREATE TABLE IF NOT EXISTS media (
     id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, mime TEXT NOT NULL, data BLOB NOT NULL,
     size INTEGER, created INTEGER, created_by TEXT)`,
  `CREATE TABLE IF NOT EXISTS partners (
     slug TEXT PRIMARY KEY, data TEXT NOT NULL, sort INTEGER DEFAULT 0, updated INTEGER, updated_by TEXT)`,
  `CREATE TABLE IF NOT EXISTS consents (
     id INTEGER PRIMARY KEY AUTOINCREMENT, ts INTEGER NOT NULL, cid TEXT, vid TEXT,
     action TEXT, analytics INTEGER, marketing INTEGER, lang TEXT, path TEXT, device TEXT, country TEXT)`,
  `CREATE INDEX IF NOT EXISTS idx_consents_ts ON consents(ts)`,
  `CREATE TABLE IF NOT EXISTS visits (
     sid TEXT PRIMARY KEY, vid TEXT, ts_first INTEGER, ts_last INTEGER, landing TEXT, ref TEXT,
     src TEXT, medium TEXT, campaign TEXT, device TEXT, country TEXT, lang TEXT, pages INTEGER DEFAULT 0)`,
  `CREATE INDEX IF NOT EXISTS idx_visits_ts ON visits(ts_first)`,
  `CREATE INDEX IF NOT EXISTS idx_visits_vid ON visits(vid)`,
  `CREATE TABLE IF NOT EXISTS posts (
     id INTEGER PRIMARY KEY AUTOINCREMENT, slug TEXT NOT NULL UNIQUE, cat TEXT, status TEXT NOT NULL DEFAULT 'draft',
     title TEXT NOT NULL, excerpt TEXT, body TEXT, cover TEXT,
     meta_title TEXT, meta_desc TEXT, meta_kw TEXT, og_image TEXT, tr TEXT,
     published_at INTEGER, created INTEGER, updated INTEGER, author TEXT)`,
  `CREATE INDEX IF NOT EXISTS idx_posts_pub ON posts(status, published_at)`,
  `CREATE TABLE IF NOT EXISTS pass_tries (ip TEXT, slug TEXT, ts INTEGER)`,
  `CREATE INDEX IF NOT EXISTS idx_pass_tries ON pass_tries(slug, ip, ts)`,
];
// Cột thêm cho bảng đã có từ bản trước (bỏ qua nếu đã có)
const MIGRATE = ["ALTER TABLE leads ADD COLUMN vid TEXT", "ALTER TABLE leads ADD COLUMN sid TEXT",
  "ALTER TABLE posts ADD COLUMN visibility TEXT DEFAULT 'public'", "ALTER TABLE posts ADD COLUMN pass_hash TEXT", "ALTER TABLE posts ADD COLUMN expires_at INTEGER"];

let ready = false;
// Tự tạo bảng ở lần gọi đầu tiên, người dùng không cần chạy SQL bằng tay.
export async function db(env) {
  if (!env.DB) throw new Error("Chưa gắn cơ sở dữ liệu D1 với tên biến DB");
  if (!ready) {
    await env.DB.batch(SCHEMA.map((s) => env.DB.prepare(s)));
    for (const m of MIGRATE) { try { await env.DB.prepare(m).run(); } catch (e) { /* đã có cột */ } }
    ready = true;
  }
  return env.DB;
}

export function device(ua = "") {
  if (/ipad|tablet/i.test(ua)) return "tablet";
  if (/mobi|android|iphone/i.test(ua)) return "mobile";
  return "desktop";
}

export const clip = (v, n) => (v == null ? null : String(v).slice(0, n));

// ---------- Tài khoản, phiên đăng nhập, phân quyền ----------
export const OWNER_EMAIL = (env) => (env.OWNER_EMAIL || "minhducuy@gmail.com").toLowerCase();
export const ROLES = {
  owner: "Chủ sở hữu",
  admin: "Quản trị",
  approver: "Duyệt bài",
  editor: "Biên tập",
  sales: "Kinh doanh",
};
// Quyền theo từng nhóm chức năng
export const CAN = {
  users: ["owner"],
  settings: ["owner", "admin"],
  stats: ["owner", "admin", "approver"],
  leads: ["owner", "admin", "sales"],
  content: ["owner", "admin", "approver", "editor"],
};

const enc = new TextEncoder();
const b64 = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf)));
const unb64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
const ITER = 100000;

export async function hashPassword(pw, saltB64) {
  const salt = saltB64 ? unb64(saltB64) : crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey("raw", enc.encode(pw), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt, iterations: ITER }, key, 256);
  return `pbkdf2$${ITER}$${b64(salt)}$${b64(bits)}`;
}
export async function checkPassword(pw, stored) {
  const [, , salt, want] = String(stored || "").split("$");
  if (!salt) return false;
  const got = (await hashPassword(pw, salt)).split("$")[3];
  if (got.length !== want.length) return false;
  let d = 0;
  for (let i = 0; i < got.length; i++) d |= got.charCodeAt(i) ^ want.charCodeAt(i);
  return d === 0;
}
export const validPassword = (pw) => typeof pw === "string" && pw.length >= 8 && pw.length <= 128;
export const validEmail = (e) => typeof e === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e) && e.length <= 120;

async function sha(s) {
  return b64(await crypto.subtle.digest("SHA-256", enc.encode(s)));
}
const COOKIE = "fb_s";
const SESSION_DAYS = 7;

export async function createSession(D, userId, request) {
  const raw = b64(crypto.getRandomValues(new Uint8Array(32))).replace(/[+/=]/g, "");
  const exp = Date.now() + SESSION_DAYS * 86400000;
  await D.prepare("DELETE FROM sessions WHERE expires<?").bind(Date.now()).run();
  await D.prepare("INSERT INTO sessions (token,user_id,expires) VALUES (?,?,?)").bind(await sha(raw), userId, exp).run();
  const secure = new URL(request.url).protocol === "https:" ? "; Secure" : "";
  return `${COOKIE}=${raw}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${SESSION_DAYS * 86400}${secure}`;
}
export const clearCookie = () => `${COOKIE}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0`;

function readCookie(request) {
  const m = (request.headers.get("cookie") || "").match(new RegExp(`(?:^|;\\s*)${COOKIE}=([^;]+)`));
  return m ? m[1] : "";
}
export async function destroySession(D, request) {
  const raw = readCookie(request);
  if (raw) await D.prepare("DELETE FROM sessions WHERE token=?").bind(await sha(raw)).run();
}

// Trả về người dùng đang đăng nhập (hoặc null). Khóa ADMIN_TOKEN (Bearer) vẫn dùng được cho script, coi như chủ sở hữu.
export async function currentUser(request, env) {
  const h = request.headers.get("authorization") || "";
  if (env.ADMIN_TOKEN && h === `Bearer ${env.ADMIN_TOKEN}`) return { id: 0, email: OWNER_EMAIL(env), name: "Khóa quản trị", role: "owner" };
  const raw = readCookie(request);
  if (!raw || !env.DB) return null;
  const D = await db(env);
  const u = await D.prepare(
    "SELECT u.id,u.email,u.name,u.role FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token=? AND s.expires>? AND u.active=1"
  ).bind(await sha(raw), Date.now()).first();
  return u || null;
}

// Dùng trong API: const u = await requireRole(request, env, CAN.leads); if (u instanceof Response) return u;
export async function requireRole(request, env, roles) {
  const u = await currentUser(request, env);
  if (!u) return json({ error: "unauthorized" }, 401);
  if (roles && !roles.includes(u.role)) return json({ error: "forbidden" }, 403);
  return u;
}

// Chống gửi yêu cầu giả mạo từ trang khác: yêu cầu ghi phải cùng nguồn.
export function sameOrigin(request) {
  const o = request.headers.get("origin");
  return !o || o === new URL(request.url).origin;
}

// Bộ nhớ đệm 60 giây cho mã đo lường để trang công khai không phải đọc D1 mỗi lần
let SCACHE = { at: 0, s: null };
export const clearSettingsCache = () => { SCACHE = { at: 0, s: null }; };
export async function cachedSettings(env) {
  if (SCACHE.s && Date.now() - SCACHE.at < 60000) return SCACHE.s;
  let s = {};
  try { s = await getSettings(await db(env)); } catch (e) {}
  SCACHE = { at: Date.now(), s };
  return s;
}
export async function getSettings(D) {
  const { results } = await D.prepare("SELECT k,v FROM settings").all();
  return Object.fromEntries(results.map((r) => [r.k, r.v]));
}

// Nội dung chỉnh sửa trong trang quản lý (chữ 3 ngôn ngữ và ảnh thay thế), đệm 60 giây
let CCACHE = { at: 0, v: null };
export const clearContentCache = () => { CCACHE = { at: 0, v: null }; };
export async function cachedContent(env) {
  if (CCACHE.v && Date.now() - CCACHE.at < 60000) return CCACHE.v;
  const D = await db(env);
  const { results } = await D.prepare("SELECT k,vi,en,zh FROM content").all();
  const t = {}, img = {};
  for (const r of results) {
    if (r.k.startsWith("img:")) { if (r.vi) img[r.k.slice(4)] = r.vi; }
    else t[r.k] = [r.vi || null, r.en || null, r.zh || null];
  }
  CCACHE = { at: Date.now(), v: { t, img } };
  return CCACHE.v;
}

// Trang khách hàng, đối tác: làm sạch dữ liệu trước khi lưu
const IMG_RE = /^(\/api\/media\/\d+|img\/[\w./-]+|https:\/\/[\w.-]+\/[\w./%-]+)$/;
const txt = (v, n) => (v == null ? "" : String(v).replace(/[\u0000-\u001f]/g, " ").trim().slice(0, n));
const tri = (o, n) => {
  o = o && typeof o === "object" ? o : { vi: o };
  return { vi: txt(o.vi, n), en: txt(o.en, n), zh: txt(o.zh, n) };
};
const img = (v) => { const u = txt(v, 400); return IMG_RE.test(u) ? u : ""; };
export function cleanPartner(p, i) {
  if (!p || typeof p !== "object") return null;
  const slug = txt(p.slug, 60).toLowerCase();
  if (!/^[a-z0-9][a-z0-9-]{1,59}$/.test(slug)) return null;
  const name = tri(p.name, 200);
  if (!name.vi) return null;
  const c = p.contact || {};
  const web = txt(c.web, 200);
  return {
    slug, sort: Number.isFinite(+p.sort) ? +p.sort : i,
    group: ["dong-hanh", "khach-hang", "cong-nghe"].includes(p.group) ? p.group : "khach-hang",
    logo: img(p.logo), cover: img(p.cover), name,
    short: tri(p.short, 300), about: tri(p.about, 3000), role: tri(p.role, 1500),
    products: (Array.isArray(p.products) ? p.products : []).slice(0, 12)
      .map((x) => ({ img: img(x && x.img), name: tri(x && x.name, 200), desc: tri(x && x.desc, 600) }))
      .filter((x) => x.name.vi),
    contact: { address: txt(c.address, 300), phone: txt(c.phone, 60), email: /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(txt(c.email, 120)) ? txt(c.email, 120) : "", web: /^https:\/\/[\w.-]+(\/[\w./%?=&-]*)?$/.test(web) ? web : "" },
  };
}

// ---------- Bài viết ----------
export const POST_CATS = { "tin-tuc": "Tin tức", "huong-dan": "Hướng dẫn", "kien-thuc": "Kiến thức", "bao-chi": "Báo chí", "su-kien": "Sự kiện" };
export const slugify = (t) => String(t || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d").replace(/Đ/g, "D")
  .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80);
// Bài công khai: bỏ thông tin nội bộ
export function publicPost(r, full = false) {
  let tr = {};
  try { tr = JSON.parse(r.tr || "{}") || {}; } catch (e) { tr = {}; }
  const o = { slug: r.slug, cat: r.cat, title: r.title, excerpt: r.excerpt, cover: r.cover, published_at: r.published_at, updated: r.updated,
    meta_title: r.meta_title, meta_desc: r.meta_desc, og_image: r.og_image, tr: {} };
  for (const l of ["en", "zh"]) { const t = tr[l] || {}; o.tr[l] = { title: t.title || null, excerpt: t.excerpt || null }; if (full) o.tr[l].body = t.body || null; }
  if (full) { o.body = r.body; o.meta_kw = r.meta_kw; }
  if (r.visibility === "link") o.private = true;
  return o;
}
// Bài "chỉ người có link": không hiện ở trang chủ, Blog, sitemap
export const PUBLIC_SQL = "COALESCE(visibility,'public')='public'";
// Mật khẩu xem bài: PBKDF2-SHA256, lưu dạng pbkdf2$vòng$muối$băm
async function pbkdf2(pw, salt, n) {
  const k = await crypto.subtle.importKey("raw", new TextEncoder().encode(pw), "PBKDF2", false, ["deriveBits"]);
  return b64(await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt, iterations: n }, k, 256));
}
export async function hashPass(pw) {
  const salt = crypto.getRandomValues(new Uint8Array(16)), n = 50000;
  return `pbkdf2$${n}$${b64(salt)}$${await pbkdf2(pw, salt, n)}`;
}
export async function checkPass(pw, stored) {
  const [k, n, salt, h] = String(stored || "").split("$");
  if (k !== "pbkdf2" || !pw) return false;
  const got = await pbkdf2(String(pw).slice(0, 100), Uint8Array.from(atob(salt), (c) => c.charCodeAt(0)), +n);
  let d = got.length ^ h.length;
  for (let i = 0; i < got.length && i < h.length; i++) d |= got.charCodeAt(i) ^ h.charCodeAt(i);
  return d === 0;
}
