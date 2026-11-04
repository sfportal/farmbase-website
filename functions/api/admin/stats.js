// Số liệu truy cập cho trang quản lý. Cần đăng nhập với vai trò phù hợp.
import { db, json, requireRole, CAN } from "../../_lib.js";

export async function onRequestGet({ request, env }) {
  const u = await requireRole(request, env, CAN.stats);
  if (u instanceof Response) return u;
  const url = new URL(request.url);
  const days = Math.max(1, Math.min(Number(url.searchParams.get("days")) || 7, 365));
  const since = Date.now() - days * 86400000;
  const D = await db(env);
  const q = (sql, ...a) => D.prepare(sql).bind(...a).all().then((r) => r.results);
  const hdays = Math.max(1, Math.min(Number(url.searchParams.get("hdays")) || 45, 365));
  const hsince = Date.now() - hdays * 86400000;
  const VN = "ts/1000,'unixepoch','+7 hours'"; // giờ Việt Nam
  const [tot, pages, ctas, daily, devices, langs, prev, hours, heat] = await Promise.all([
    q(`SELECT SUM(type='view') views, COUNT(DISTINCT CASE WHEN type='view' THEN vid END) visitors,
              COUNT(DISTINCT CASE WHEN type='view' THEN sid END) sessions,
              AVG(CASE WHEN type='time' THEN ms END) avg_ms, SUM(type='cta') ctas
       FROM events WHERE ts>=?`, since),
    q(`SELECT path, SUM(type='view') views, COUNT(DISTINCT CASE WHEN type='view' THEN vid END) visitors,
              AVG(CASE WHEN type='time' THEN ms END) avg_ms, SUM(type='cta') ctas
       FROM events WHERE ts>=? GROUP BY path ORDER BY views DESC LIMIT 50`, since),
    q(`SELECT label, COUNT(*) clicks, COUNT(DISTINCT vid) visitors FROM events
       WHERE ts>=? AND type='cta' GROUP BY label ORDER BY clicks DESC LIMIT 30`, since),
    q(`SELECT date(ts/1000,'unixepoch','+7 hours') day, SUM(type='view') views,
              COUNT(DISTINCT CASE WHEN type='view' THEN vid END) visitors, SUM(type='cta') ctas
       FROM events WHERE ts>=? GROUP BY day ORDER BY day`, since),
    q(`SELECT device, COUNT(DISTINCT vid) visitors FROM events WHERE ts>=? AND type='view' GROUP BY device`, since),
    q(`SELECT lang, COUNT(*) views FROM events WHERE ts>=? AND type='view' GROUP BY lang`, since),
    // Cùng độ dài ngay trước đó, để so sánh tăng giảm
    q(`SELECT SUM(type='view') views, COUNT(DISTINCT CASE WHEN type='view' THEN vid END) visitors, SUM(type='cta') ctas
       FROM events WHERE ts>=? AND ts<?`, since - days * 86400000, since),
    // Khung giờ trong ngày (giờ Việt Nam)
    q(`SELECT CAST(strftime('%H',${VN}) AS INTEGER) h, SUM(type='view') views,
              COUNT(DISTINCT CASE WHEN type='view' THEN sid END) sessions, SUM(type='cta') ctas
       FROM events WHERE ts>=? GROUP BY h ORDER BY h`, hsince),
    // Thứ trong tuần × giờ (0 = Chủ nhật)
    q(`SELECT CAST(strftime('%w',${VN}) AS INTEGER) w, CAST(strftime('%H',${VN}) AS INTEGER) h, SUM(type='view') views
       FROM events WHERE ts>=? AND type='view' GROUP BY w, h`, hsince),
  ]);
  return json({ days, total: tot[0], prev: prev[0], pages, ctas, daily, devices, langs, hdays, hours, heat });
}
