// Webhook Facebook cho Fanpage FarmBase: farmbase.vn/api/fanpage/webhook
// GET: Meta gọi một lần để xác minh (so FB_VERIFY_TOKEN). POST: tin nhắn Messenger và bình luận mới.
import { json } from "../../_lib.js";
import { validSignature, saveIncoming, handleIncoming } from "../../_fanpage.js";

export async function onRequestGet({ request, env }) {
  const u = new URL(request.url);
  const ok = env.FB_VERIFY_TOKEN && u.searchParams.get("hub.mode") === "subscribe" && u.searchParams.get("hub.verify_token") === env.FB_VERIFY_TOKEN;
  if (!ok) return new Response("forbidden", { status: 403 });
  return new Response(u.searchParams.get("hub.challenge") || "", { headers: { "content-type": "text/plain" } });
}

export async function onRequestPost({ request, env, waitUntil }) {
  const raw = await request.text();
  if (!(await validSignature(env, raw, request.headers.get("x-hub-signature-256")))) return json({ error: "bad_signature" }, 401);
  let body;
  try { body = JSON.parse(raw); } catch (e) { return json({ error: "bad_json" }, 400); }
  if (body.object !== "page") return json({ ok: true });
  const page = env.FB_PAGE_ID;
  const todo = new Set();
  for (const entry of body.entry || []) {
    // Tin nhắn Messenger
    for (const ev of entry.messaging || []) {
      const m = ev.message;
      if (!m || m.is_echo || !ev.sender || ev.sender.id === page || ev.sender.id === entry.id) continue;
      let text = m.text || "";
      if (!text && m.attachments) text = "[Khách gửi " + m.attachments.map((a) => a.type).join(", ") + "]";
      if (!text) continue;
      const conv = "m:" + ev.sender.id;
      if (await saveIncoming(env, { conv, kind: "dm", psid: ev.sender.id, mid: m.mid, text, ts: ev.timestamp || Date.now() })) todo.add(conv);
    }
    // Bình luận mới trên bài của Fanpage
    for (const ch of entry.changes || []) {
      const v = ch.value || {};
      if (ch.field !== "feed" || v.item !== "comment" || v.verb !== "add" || !v.comment_id || !v.message) continue;
      if (v.from && (v.from.id === page || v.from.id === entry.id)) continue;
      // Trả lời trong cùng luồng: bình luận con gắn vào bình luận gốc
      const root = v.parent_id && v.parent_id !== v.post_id ? v.parent_id : v.comment_id;
      const conv = "c:" + root;
      const ts = v.created_time ? v.created_time * 1000 : Date.now();
      if (await saveIncoming(env, { conv, kind: "comment", name: v.from && v.from.name, post_id: v.post_id, mid: v.comment_id, text: v.message, ts })) todo.add(conv);
    }
  }
  // Trả 200 ngay cho Facebook, soạn câu trả lời ở nền
  for (const conv of todo) waitUntil(handleIncoming(env, conv).catch((e) => console.error("fb handle", e && e.stack || e)));
  return json({ ok: true });
}
