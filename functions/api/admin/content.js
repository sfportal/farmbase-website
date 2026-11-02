// Sửa chữ (VI, EN, 中文) và ảnh của website. Khóa k là câu tiếng Việt gốc, hoặc "img:<đường dẫn ảnh>".
import { db, json, requireRole, CAN, sameOrigin, clearContentCache } from "../../_lib.js";

const clean = (v, n = 4000) => (v == null || String(v).trim() === "" ? null : String(v).slice(0, n));

export async function onRequestGet({ request, env }) {
  const me = await requireRole(request, env, CAN.content);
  if (me instanceof Response) return me;
  const { results } = await (await db(env)).prepare("SELECT * FROM content ORDER BY updated DESC").all();
  return json({ items: results });
}

// { items: [{ k, vi, en, zh }] }: trường để trống nghĩa là dùng nội dung gốc; cả ba trống thì xóa bản chỉnh sửa
export async function onRequestPut({ request, env }) {
  if (!sameOrigin(request)) return json({ error: "forbidden" }, 403);
  const me = await requireRole(request, env, CAN.content);
  if (me instanceof Response) return me;
  const b = await request.json().catch(() => ({}));
  const items = Array.isArray(b.items) ? b.items.slice(0, 2000) : [];
  if (!items.length) return json({ error: "bad_request" }, 400);
  const D = await db(env);
  const now = Date.now();
  const st = [];
  for (const it of items) {
    const k = clean(it.k, 2000);
    if (!k) continue;
    const vi = clean(it.vi), en = clean(it.en), zh = clean(it.zh);
    if (k.startsWith("img:") && vi && !/^(\/api\/media\/\d+|img\/[\w./-]+|https:\/\/[\w.-]+\/[\w./%-]+)$/.test(vi))
      return json({ error: "bad_image" }, 400);
    if (!vi && !en && !zh) st.push(D.prepare("DELETE FROM content WHERE k=?").bind(k));
    else st.push(D.prepare(
      `INSERT INTO content (k,vi,en,zh,updated,updated_by) VALUES (?,?,?,?,?,?)
       ON CONFLICT(k) DO UPDATE SET vi=excluded.vi, en=excluded.en, zh=excluded.zh, updated=excluded.updated, updated_by=excluded.updated_by`
    ).bind(k, vi, en, zh, now, me.email));
  }
  for (let i = 0; i < st.length; i += 50) await D.batch(st.slice(i, i + 50));
  clearContentCache();
  return json({ ok: true, saved: st.length });
}
