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
];

let ready = false;
// Tự tạo bảng ở lần gọi đầu tiên, người dùng không cần chạy SQL bằng tay.
export async function db(env) {
  if (!env.DB) throw new Error("Chưa gắn cơ sở dữ liệu D1 với tên biến DB");
  if (!ready) {
    await env.DB.batch(SCHEMA.map((s) => env.DB.prepare(s)));
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
