// Sửa trang khách hàng, đối tác (vai trò có quyền nội dung). PUT gửi toàn bộ danh sách, thay thế danh sách cũ.
import { db, json, requireRole, CAN, sameOrigin, cleanPartner } from "../../_lib.js";

export async function onRequestGet({ request, env }) {
  const me = await requireRole(request, env, CAN.content);
  if (me instanceof Response) return me;
  const { results } = await (await db(env)).prepare("SELECT data, updated, updated_by FROM partners ORDER BY sort, slug").all();
  return json({ items: results.map((r) => JSON.parse(r.data)), updated: Math.max(0, ...results.map((r) => r.updated || 0)) });
}

export async function onRequestPut({ request, env }) {
  if (!sameOrigin(request)) return json({ error: "forbidden" }, 403);
  const me = await requireRole(request, env, CAN.content);
  if (me instanceof Response) return me;
  const b = await request.json().catch(() => ({}));
  if (!Array.isArray(b.items) || b.items.length > 200) return json({ error: "bad_request" }, 400);
  const items = [], seen = new Set();
  b.items.forEach((p, i) => { const c = cleanPartner(p, i); if (c && !seen.has(c.slug)) { seen.add(c.slug); c.sort = i; items.push(c); } });
  if (items.length !== b.items.length) return json({ error: "invalid_item" }, 400);
  const D = await db(env), now = Date.now();
  const st = [D.prepare("DELETE FROM partners")].concat(items.map((c) =>
    D.prepare("INSERT INTO partners (slug,data,sort,updated,updated_by) VALUES (?,?,?,?,?)").bind(c.slug, JSON.stringify(c), c.sort, now, me.email)));
  await D.batch(st);
  return json({ ok: true, saved: items.length });
}
