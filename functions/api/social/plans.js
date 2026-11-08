// Lịch đăng Facebook dùng chung cho cả nhóm (lưu D1). GET ?from=&to= (mili giây), POST tạo, PUT sửa {id,...}, DELETE ?id=.
import { db, json, clip } from "../../_lib.js";
import { socialAuth, FILE_ID, fbReady, fbDelete } from "../../_social.js";

const STATUS = ["draft", "scheduled", "published"]; // fb_scheduled, failed do máy chủ đặt khi gọi Facebook
const HTTPS = /^https:\/\/[^\s<>"]{3,500}$/;

function cleanMedia(list) {
  return (Array.isArray(list) ? list : []).slice(0, 10).map((m) => {
    if (!m || typeof m !== "object") return null;
    const kind = ["image", "video"].includes(m.kind) ? m.kind : "image";
    if (m.type === "drive" && FILE_ID.test(m.id || "")) return { type: "drive", id: m.id, name: clip(m.name, 200) || "", mime: clip(m.mime, 80) || "", kind };
    if (m.type === "url" && HTTPS.test(m.url || "")) return { type: "url", url: m.url, name: clip(m.name, 200) || "", kind };
    return null;
  }).filter(Boolean);
}
function cleanSource(s) {
  if (!s || typeof s !== "object") return null;
  return { type: clip(s.type, 20), id: clip(s.id, 120), title: clip(s.title, 300), url: HTTPS.test(s.url || "") ? s.url : null };
}
const row = (r) => ({ ...r, media: JSON.parse(r.media || "[]"), source: r.source ? JSON.parse(r.source) : null });

export async function onRequestGet({ request, env }) {
  const u = await socialAuth(request, env);
  if (u instanceof Response) return u;
  const q = new URL(request.url).searchParams;
  const now = Date.now();
  const from = +q.get("from") || now - 31 * 86400000, to = +q.get("to") || now + 120 * 86400000;
  const { results } = await (await db(env)).prepare(
    `SELECT * FROM social_plans WHERE (scheduled_at BETWEEN ? AND ?) OR scheduled_at IS NULL ORDER BY scheduled_at IS NULL, scheduled_at LIMIT 500`
  ).bind(from, to).all();
  return json({ items: results.map(row), facebook: fbReady(env) });
}

function read(b, old = {}) {
  const v = {
    title: b.title !== undefined ? clip(b.title, 200) || "" : old.title || "",
    message: b.message !== undefined ? clip(b.message, 8000) || "" : old.message || "",
    link: b.link !== undefined ? (HTTPS.test(b.link || "") ? b.link : "") : old.link || "",
    media: b.media !== undefined ? cleanMedia(b.media) : JSON.parse(old.media || "[]"),
    source: b.source !== undefined ? cleanSource(b.source) : old.source ? JSON.parse(old.source) : null,
    scheduled_at: b.scheduled_at !== undefined ? (Number.isFinite(+b.scheduled_at) && +b.scheduled_at > 0 ? Math.round(+b.scheduled_at) : null) : old.scheduled_at ?? null,
    status: b.status !== undefined ? b.status : old.status || "draft",
    mode: b.mode !== undefined ? (b.mode === "facebook" ? "facebook" : "manual") : old.mode || "manual",
  };
  if (!STATUS.includes(v.status) && v.status !== old.status) return "bad_status";
  if (v.status === "scheduled" && !v.scheduled_at) return "no_time";
  if (!v.message && !v.media.length && !v.link) return "empty";
  return v;
}

export async function onRequestPost({ request, env }) {
  const u = await socialAuth(request, env);
  if (u instanceof Response) return u;
  const v = read(await request.json().catch(() => ({})));
  if (typeof v === "string") return json({ error: v }, 400);
  const now = Date.now();
  const r = await (await db(env)).prepare(
    `INSERT INTO social_plans (title,message,link,media,source,scheduled_at,status,mode,created,updated,author) VALUES (?,?,?,?,?,?,?,?,?,?,?) RETURNING *`
  ).bind(v.title, v.message, v.link, JSON.stringify(v.media), v.source ? JSON.stringify(v.source) : null, v.scheduled_at, v.status, v.mode, now, now, u.email).first();
  return json({ item: row(r) }, 201);
}

export async function onRequestPut({ request, env }) {
  const u = await socialAuth(request, env);
  if (u instanceof Response) return u;
  const b = await request.json().catch(() => ({}));
  const D = await db(env);
  const old = await D.prepare("SELECT * FROM social_plans WHERE id=?").bind(+b.id || 0).first();
  if (!old) return json({ error: "not_found" }, 404);
  // Bài đã hẹn giờ trên Facebook: phải hủy hẹn trước khi sửa
  if (old.status === "fb_scheduled") return json({ error: "fb_locked" }, 409);
  const v = read(b, old);
  if (typeof v === "string") return json({ error: v }, 400);
  const r = await D.prepare(
    `UPDATE social_plans SET title=?,message=?,link=?,media=?,source=?,scheduled_at=?,status=?,mode=?,error=NULL,updated=?,author=? WHERE id=? RETURNING *`
  ).bind(v.title, v.message, v.link, JSON.stringify(v.media), v.source ? JSON.stringify(v.source) : null, v.scheduled_at, v.status, v.mode, Date.now(), u.email, old.id).first();
  return json({ item: row(r) });
}

export async function onRequestDelete({ request, env }) {
  const u = await socialAuth(request, env);
  if (u instanceof Response) return u;
  const id = +new URL(request.url).searchParams.get("id") || 0;
  const D = await db(env);
  const old = await D.prepare("SELECT * FROM social_plans WHERE id=?").bind(id).first();
  if (!old) return json({ error: "not_found" }, 404);
  if (old.status === "fb_scheduled" && old.fb_id && fbReady(env)) {
    try { await fbDelete(env, old.fb_id); } catch (e) { return json({ error: "fb_error", detail: e.message }, 502); }
  }
  await D.prepare("DELETE FROM social_plans WHERE id=?").bind(id).run();
  return json({ ok: true });
}
