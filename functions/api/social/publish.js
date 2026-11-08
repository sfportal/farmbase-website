// Đẩy một bài trong lịch lên Trang Facebook qua Graph API (cần biến FB_PAGE_ID, FB_PAGE_TOKEN trên Cloudflare).
// {id}: hẹn giờ theo scheduled_at (Facebook tự đăng, kể cả khi tắt máy) hoặc đăng ngay nếu chưa đặt giờ / {id, now:true}.
// {id, action:"cancel"}: hủy hẹn giờ trên Facebook, bài quay về nháp.
import { db, json } from "../../_lib.js";
import { socialAuth, fbReady, fbPublish, fbDelete } from "../../_social.js";

const MIN = 10 * 60000, MAX = 29 * 86400000;

export async function onRequestPost({ request, env }) {
  const u = await socialAuth(request, env);
  if (u instanceof Response) return u;
  if (!fbReady(env)) return json({ error: "fb_not_configured" }, 400);
  const b = await request.json().catch(() => ({}));
  const D = await db(env);
  const p = await D.prepare("SELECT * FROM social_plans WHERE id=?").bind(+b.id || 0).first();
  if (!p) return json({ error: "not_found" }, 404);
  const now = Date.now();

  if (b.action === "cancel") {
    if (p.status !== "fb_scheduled" || !p.fb_id) return json({ error: "not_scheduled" }, 400);
    try { await fbDelete(env, p.fb_id); } catch (e) { return json({ error: "fb_error", detail: e.message }, 502); }
    const r = await D.prepare("UPDATE social_plans SET status='draft',fb_id=NULL,updated=? WHERE id=? RETURNING *").bind(now, p.id).first();
    return json({ item: { ...r, media: JSON.parse(r.media || "[]"), source: r.source ? JSON.parse(r.source) : null } });
  }

  if (p.status === "fb_scheduled" || p.status === "published") return json({ error: "already" }, 409);
  let when = b.now ? null : p.scheduled_at;
  if (when && when < now + MIN) {
    if (when > now - 5 * 60000) when = null; // sát giờ: đăng ngay
    else return json({ error: "time_past" }, 400);
  }
  if (when && when > now + MAX) return json({ error: "time_far" }, 400);

  const origin = new URL(request.url).origin;
  const media = JSON.parse(p.media || "[]").map((m) => ({
    kind: m.kind,
    url: m.type === "url" ? m.url : env.GOOGLE_API_KEY ? `${origin}/api/social/file/${m.id}` : `https://drive.google.com/uc?export=download&id=${m.id}`,
  }));
  try {
    const fbId = await fbPublish(env, { message: p.message, link: p.link, media, when });
    const r = await D.prepare("UPDATE social_plans SET status=?,mode='facebook',fb_id=?,error=NULL,scheduled_at=COALESCE(?,scheduled_at),updated=? WHERE id=? RETURNING *")
      .bind(when ? "fb_scheduled" : "published", fbId, when || (b.now || !p.scheduled_at ? now : null), now, p.id).first();
    return json({ item: { ...r, media: JSON.parse(r.media || "[]"), source: r.source ? JSON.parse(r.source) : null } });
  } catch (e) {
    await D.prepare("UPDATE social_plans SET status='failed',error=?,updated=? WHERE id=?").bind(String(e.message).slice(0, 500), now, p.id).run();
    return json({ error: "fb_error", detail: e.message }, 502);
  }
}
