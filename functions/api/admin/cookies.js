// Thống kê cookie và hành vi khách cho marketing, chăm sóc khách hàng. Chỉ tính khách đã đồng ý cookie.
import { db, json, requireRole, CAN } from "../../_lib.js";

export async function onRequestGet({ request, env }) {
  const u = await requireRole(request, env, CAN.stats);
  if (u instanceof Response) return u;
  const url = new URL(request.url);
  const days = Math.max(1, Math.min(Number(url.searchParams.get("days")) || 30, 365));
  const since = Date.now() - days * 86400000;
  const D = await db(env);
  const q = (sql, ...a) => D.prepare(sql).bind(...a).all().then((r) => r.results);
  const srcExpr = `COALESCE(NULLIF(src,''), CASE WHEN ref IS NULL OR ref='' THEN '(trực tiếp)' ELSE ref END)`;
  const [consent, cdaily, vis, sources, campaigns, landing, devices, anon] = await Promise.all([
    q(`SELECT action, COUNT(*) n, SUM(analytics) a, SUM(marketing) m FROM consents WHERE ts>=? GROUP BY action`, since),
    q(`SELECT date(ts/1000,'unixepoch','+7 hours') day, COUNT(*) n, SUM(analytics) a, SUM(marketing) m FROM consents WHERE ts>=? GROUP BY day ORDER BY day`, since),
    q(`SELECT COUNT(*) sessions, COUNT(DISTINCT vid) visitors, AVG(pages) pages,
        COUNT(DISTINCT CASE WHEN vid IN (SELECT vid FROM visits WHERE ts_first<?) THEN vid END) AS ret
       FROM visits WHERE ts_first>=?`, since, since),
    q(`SELECT ${srcExpr} source, COALESCE(NULLIF(medium,''),'') medium, COUNT(*) sessions, COUNT(DISTINCT vid) visitors, AVG(pages) pages
       FROM visits WHERE ts_first>=? GROUP BY source, medium ORDER BY sessions DESC LIMIT 20`, since),
    q(`SELECT campaign, COALESCE(src,'') source, COUNT(*) sessions, COUNT(DISTINCT vid) visitors
       FROM visits WHERE ts_first>=? AND campaign IS NOT NULL AND campaign<>'' GROUP BY campaign, source ORDER BY sessions DESC LIMIT 20`, since),
    q(`SELECT landing, COUNT(*) sessions, AVG(pages) pages FROM visits WHERE ts_first>=? GROUP BY landing ORDER BY sessions DESC LIMIT 15`, since),
    q(`SELECT device, COUNT(DISTINCT vid) visitors FROM visits WHERE ts_first>=? GROUP BY device`, since),
    q(`SELECT COUNT(*) views FROM events WHERE ts>=? AND type='view' AND vid IS NULL`, since),
  ]);
  // Khách để lại liên hệ theo nguồn, chiến dịch của lần truy cập đầu tiên
  const lv = await q(`SELECT l.vid, (SELECT ${srcExpr} FROM visits v WHERE v.vid=l.vid ORDER BY ts_first LIMIT 1) source,
      (SELECT campaign FROM visits v WHERE v.vid=l.vid ORDER BY ts_first LIMIT 1) campaign
     FROM leads l WHERE l.ts>=? AND l.vid IS NOT NULL`, since);
  const bySrc = {}, byCamp = {};
  lv.forEach((x) => { if (x.source) bySrc[x.source] = (bySrc[x.source] || 0) + 1; if (x.campaign) byCamp[x.campaign] = (byCamp[x.campaign] || 0) + 1; });
  sources.forEach((r) => (r.leads = bySrc[r.source] || 0));
  campaigns.forEach((r) => (r.leads = byCamp[r.campaign] || 0));
  // Hành trình của khách để lại liên hệ (khách đã đồng ý cookie): các trang đã xem trước khi gửi form
  const leads = await q(`SELECT id, ts, name, source, crop, need, vid FROM leads WHERE ts>=? AND vid IS NOT NULL ORDER BY ts DESC LIMIT 20`, since);
  for (const l of leads) {
    const [path, first, n] = await Promise.all([
      q(`SELECT path, ts FROM events WHERE vid=? AND type='view' AND ts<=? ORDER BY ts DESC, rowid DESC LIMIT 12`, l.vid, l.ts + 5000),
      q(`SELECT ${srcExpr} source, campaign, landing, ts_first FROM visits WHERE vid=? ORDER BY ts_first LIMIT 1`, l.vid),
      q(`SELECT COUNT(*) n FROM visits WHERE vid=? AND ts_first<=?`, l.vid, l.ts),
    ]);
    l.path = path.reverse().map((x) => x.path);
    l.first = first[0] || null;
    l.visits = n[0]?.n || 0;
    delete l.vid;
  }
  return json({ days, consent, cdaily, visitors: { ...vis[0], returning: vis[0]?.ret || 0 }, sources, campaigns, landing, devices, anon_views: anon[0]?.views || 0, leads });
}
