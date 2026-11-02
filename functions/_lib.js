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

// Trang quản lý gửi kèm khóa: Authorization: Bearer <ADMIN_TOKEN>
export function isAdmin(request, env) {
  const h = request.headers.get("authorization") || "";
  return !!env.ADMIN_TOKEN && h === `Bearer ${env.ADMIN_TOKEN}`;
}
