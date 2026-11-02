// Ghi lại lựa chọn cookie của khách (đồng ý tất cả, chỉ cần thiết, tùy chọn) để thống kê tỉ lệ đồng ý.
import { db, device, clip } from "../_lib.js";

const ACTIONS = new Set(["accept_all", "necessary", "custom", "update"]);

export async function onRequestPost({ request, env }) {
  let b;
  try { b = await request.json(); } catch { return new Response(null, { status: 400 }); }
  if (!b || !ACTIONS.has(b.action)) return new Response(null, { status: 400 });
  const a = b.analytics ? 1 : 0, m = b.marketing ? 1 : 0;
  await (await db(env)).prepare(
    "INSERT INTO consents (ts,cid,vid,action,analytics,marketing,lang,path,device,country) VALUES (?,?,?,?,?,?,?,?,?,?)"
  ).bind(Date.now(), clip(b.cid, 40), a ? clip(b.vid, 40) : null, b.action, a, m, clip(b.lang, 5), clip(b.path, 120),
    device(request.headers.get("user-agent") || ""), request.cf?.country || null).run();
  return new Response(null, { status: 204 });
}
