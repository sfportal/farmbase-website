// Ghi nhận lượt xem trang, thời gian xem và lượt bấm nút liên hệ.
// Không lưu IP, không dùng cookie; vid là mã ngẫu nhiên trên trình duyệt.
import { db, device, clip } from "../_lib.js";

const TYPES = new Set(["view", "time", "cta"]);

export async function onRequestPost({ request, env }) {
  let items;
  try {
    const body = await request.json();
    items = Array.isArray(body) ? body : [body];
  } catch {
    return new Response(null, { status: 400 });
  }
  const now = Date.now();
  const dev = device(request.headers.get("user-agent") || "");
  const country = request.cf?.country || null;
  const rows = items.slice(0, 20).filter((e) => e && TYPES.has(e.t));
  if (!rows.length) return new Response(null, { status: 204 });
  const D = await db(env);
  const stmt = D.prepare(
    "INSERT INTO events (ts,type,path,lang,sid,vid,ms,label,ref,device,country) VALUES (?,?,?,?,?,?,?,?,?,?,?)"
  );
  await D.batch(
    rows.map((e) =>
      stmt.bind(
        now, e.t, clip(e.path, 120), clip(e.lang, 5), clip(e.sid, 40), clip(e.vid, 40),
        e.t === "time" ? Math.max(0, Math.min(Number(e.ms) || 0, 30 * 60 * 1000)) : null,
        clip(e.label, 80), clip(e.ref, 200), dev, country
      )
    )
  );
  return new Response(null, { status: 204 });
}
