// Hộp thư Fanpage trong trang quản lý: xem tin, duyệt nháp Claude soạn, trả lời tay, bật tắt chatbot, đăng bài lên Fanpage.
import { json, requireRole, CAN, sameOrigin, clip } from "../../_lib.js";
import { fbdb, botSettings, MODES, fbConfigured, sendReply, publishPost, askClaude } from "../../_fanpage.js";

const INBOX = ["owner", "admin", "approver", "sales"]; // xem và trả lời tin
const PUBLISH = ["owner", "admin", "approver"];         // đăng bài lên Fanpage

export async function onRequestGet({ request, env }) {
  const me = await requireRole(request, env, INBOX);
  if (me instanceof Response) return me;
  const D = await fbdb(env);
  const conv = new URL(request.url).searchParams.get("conv");
  if (conv) {
    const c = await D.prepare("SELECT * FROM fb_convs WHERE conv=?").bind(conv).first();
    if (!c) return json({ error: "not_found" }, 404);
    const { results } = await D.prepare("SELECT id,dir,text,ts,by,status,note FROM fb_msgs WHERE conv=? ORDER BY ts, id LIMIT 300").bind(conv).all();
    await D.prepare("UPDATE fb_convs SET unread=0 WHERE conv=?").bind(conv).run();
    return json({ conv: c, msgs: results });
  }
  const { results } = await D.prepare(`SELECT c.*, (SELECT COUNT(*) FROM fb_msgs m WHERE m.conv=c.conv AND m.dir='draft' AND m.status IN ('draft','error')) AS drafts
    FROM fb_convs c ORDER BY last_ts DESC LIMIT 200`).all();
  return json({ convs: results, settings: await botSettings(D), configured: fbConfigured(env), can_publish: PUBLISH.includes(me.role), can_settings: CAN.settings.includes(me.role) });
}

export async function onRequestPut({ request, env }) {
  if (!sameOrigin(request)) return json({ error: "forbidden" }, 403);
  const me = await requireRole(request, env, CAN.settings);
  if (me instanceof Response) return me;
  const b = await request.json().catch(() => ({}));
  const D = await fbdb(env);
  const set = (k, v) => D.prepare("INSERT INTO settings (k,v) VALUES (?,?) ON CONFLICT(k) DO UPDATE SET v=excluded.v").bind(k, v).run();
  if (b.mode !== undefined) { if (!MODES.includes(b.mode)) return json({ error: "bad_mode" }, 400); await set("fb_bot_mode", b.mode); }
  if (b.comments !== undefined) await set("fb_bot_comments", b.comments ? "on" : "off");
  if (b.kb_extra !== undefined) await set("fb_bot_kb", String(b.kb_extra).slice(0, 20000));
  return json({ ok: true, settings: await botSettings(D) });
}

export async function onRequestPost({ request, env }) {
  if (!sameOrigin(request)) return json({ error: "forbidden" }, 403);
  const me = await requireRole(request, env, INBOX);
  if (me instanceof Response) return me;
  const b = await request.json().catch(() => ({}));
  const D = await fbdb(env);
  const who = me.name || me.email;
  try {
    // Gửi trả lời (tự viết, hoặc duyệt một bản nháp: draft_id)
    if (b.action === "send") {
      const text = String(b.text || "").trim();
      if (!text) return json({ error: "empty" }, 400);
      const c = await D.prepare("SELECT conv FROM fb_convs WHERE conv=?").bind(String(b.conv || "")).first();
      if (!c) return json({ error: "not_found" }, 404);
      const mid = await sendReply(env, c.conv, text);
      const now = Date.now();
      if (b.draft_id) await D.prepare("UPDATE fb_msgs SET status='used' WHERE id=? AND conv=? AND dir='draft'").bind(+b.draft_id, c.conv).run();
      await D.prepare("INSERT INTO fb_msgs (conv,mid,dir,text,ts,by,status) VALUES (?,?,?,?,?,?,?)").bind(c.conv, mid, "out", text.slice(0, 8000), now, who, "sent").run();
      await D.prepare("UPDATE fb_convs SET last_ts=?, last_text=? WHERE conv=?").bind(now, text.slice(0, 200), c.conv).run();
      return json({ ok: true });
    }
    if (b.action === "discard") {
      await D.prepare("UPDATE fb_msgs SET status='discarded' WHERE id=? AND dir='draft'").bind(+b.draft_id).run();
      return json({ ok: true });
    }
    // Bật lại hoặc tắt chatbot cho một cuộc trò chuyện (handoff = nhân viên đang xử lý)
    if (b.action === "handoff") {
      await D.prepare("UPDATE fb_convs SET handoff=? WHERE conv=?").bind(b.on ? 1 : 0, String(b.conv || "")).run();
      return json({ ok: true });
    }
    // Hỏi thử chatbot, không lưu, không gửi
    if (b.action === "test") {
      const q = String(b.text || "").trim().slice(0, 2000);
      if (!q) return json({ error: "empty" }, 400);
      const st = await botSettings(D);
      const r = await askClaude(env, [{ dir: "in", text: q }], b.kind === "comment" ? "comment" : "dm", st.kb_extra);
      return json({ ok: true, result: r });
    }
    // Đăng bài hoặc hẹn giờ đăng lên Fanpage
    if (b.action === "post") {
      if (!PUBLISH.includes(me.role)) return json({ error: "forbidden" }, 403);
      const message = String(b.message || "").trim();
      if (!message) return json({ error: "empty" }, 400);
      const link = clip(b.link, 500), image = clip(b.image, 500);
      if (link && !/^https:\/\//.test(link)) return json({ error: "bad_link" }, 400);
      if (image && !/^https:\/\//.test(image)) return json({ error: "bad_image" }, 400);
      let schedule = b.schedule ? Math.floor(+b.schedule) : 0;
      if (schedule) {
        const now = Date.now() / 1000;
        if (!(schedule > now + 600 && schedule < now + 30 * 86400)) return json({ error: "bad_schedule" }, 400);
      }
      const r = await publishPost(env, { message: message.slice(0, 60000), link, image, schedule });
      return json({ ok: true, id: r.post_id || r.id, scheduled: !!schedule });
    }
    return json({ error: "bad_action" }, 400);
  } catch (e) {
    console.error("admin fanpage", e && e.message);
    return json({ error: "fb_failed", detail: String(e && e.message || e).slice(0, 300) }, 502);
  }
}
