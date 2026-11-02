// Ghi nhận lượt xem trang, thời gian xem và lượt bấm nút liên hệ.
// Không lưu IP. Khi khách chưa đồng ý cookie thống kê, trình duyệt không gửi mã khách (vid, sid): chỉ đếm lượt xem ẩn danh.
// Khi khách đồng ý, lưu thêm phiên truy cập (nguồn, chiến dịch, trang vào) để chăm sóc và hiểu khách hàng.
import { db, device, clip } from "../_lib.js";

const TYPES = new Set(["view", "time", "cta"]);
const RETAIN = 400 * 86400000; // khoảng 13 tháng, theo Chính sách bảo mật

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
  const st = rows.map((e) =>
    stmt.bind(
      now, e.t, clip(e.path, 120), clip(e.lang, 5), clip(e.sid, 40), clip(e.vid, 40),
      e.t === "time" ? Math.max(0, Math.min(Number(e.ms) || 0, 30 * 60 * 1000)) : null,
      clip(e.label, 80), clip(e.ref, 200), dev, country
    )
  );
  // Phiên truy cập: chỉ khi có mã phiên (khách đã đồng ý cookie thống kê)
  const up = D.prepare(
    `INSERT INTO visits (sid,vid,ts_first,ts_last,landing,ref,src,medium,campaign,device,country,lang,pages)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)
     ON CONFLICT(sid) DO UPDATE SET ts_last=excluded.ts_last, pages=visits.pages+excluded.pages`
  );
  for (const e of rows) {
    if (e.t !== "view" || !e.sid || !e.vid) continue;
    const s = e.src || {};
    st.push(up.bind(clip(e.sid, 40), clip(e.vid, 40), now, now, clip(e.path, 120), clip(s.ref || e.ref, 200),
      clip(s.src, 60), clip(s.medium, 60), clip(s.campaign, 100), dev, country, clip(e.lang, 5), 1));
  }
  await D.batch(st);
  // Thỉnh thoảng xóa dữ liệu thống kê quá thời hạn lưu
  if (Math.random() < 0.01) {
    const old = now - RETAIN;
    await D.batch([D.prepare("DELETE FROM events WHERE ts<?").bind(old), D.prepare("DELETE FROM visits WHERE ts_last<?").bind(old),
      D.prepare("DELETE FROM consents WHERE ts<?").bind(old)]);
  }
  return new Response(null, { status: 204 });
}
