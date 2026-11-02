// Số liệu truy cập cho trang quản lý. Cần khóa ADMIN_TOKEN.
import { db, json, isAdmin } from "../../_lib.js";

export async function onRequestGet({ request, env }) {
  if (!isAdmin(request, env)) return json({ error: "unauthorized" }, 401);
  const url = new URL(request.url);
  const days = Math.max(1, Math.min(Number(url.searchParams.get("days")) || 7, 365));
  const since = Date.now() - days * 86400000;
  const D = await db(env);
  const q = (sql, ...a) => D.prepare(sql).bind(...a).all().then((r) => r.results);
  const [tot, pages, ctas, daily, devices, langs] = await Promise.all([
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
  ]);
  return json({ days, total: tot[0], pages, ctas, daily, devices, langs });
}
