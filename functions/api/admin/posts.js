// Quản lý bài viết: tạo, sửa, xóa; kèm lượt xem trên website.
import { db, json, requireRole, CAN, sameOrigin, slugify, POST_CATS } from "../../_lib.js";

const s = (v, n) => (v == null || String(v).trim() === "" ? null : String(v).slice(0, n));
const BODY_MAX = 400000;

function clean(b) {
  const tr = {};
  for (const l of ["en", "zh"]) {
    const t = (b.tr && b.tr[l]) || {};
    tr[l] = { title: s(t.title, 200), excerpt: s(t.excerpt, 600), body: s(t.body, BODY_MAX), meta_title: s(t.meta_title, 120), meta_desc: s(t.meta_desc, 300) };
  }
  return {
    slug: slugify(b.slug || b.title),
    cat: POST_CATS[b.cat] ? b.cat : "tin-tuc",
    status: b.status === "published" ? "published" : "draft",
    title: s(b.title, 200), excerpt: s(b.excerpt, 600), body: s(b.body, BODY_MAX),
    cover: s(b.cover, 300), meta_title: s(b.meta_title, 120), meta_desc: s(b.meta_desc, 300), meta_kw: s(b.meta_kw, 300), og_image: s(b.og_image, 300),
    tr: JSON.stringify(tr),
    published_at: Number.isFinite(+b.published_at) && +b.published_at > 0 ? Math.floor(+b.published_at) : null,
  };
}
const okUrl = (u) => !u || /^(\/api\/media\/\d+|img\/[\w./-]+|https:\/\/[\w.-]+\/[\w./%?=&-]*)$/.test(u);

export async function onRequestGet({ request, env }) {
  const me = await requireRole(request, env, CAN.content);
  if (me instanceof Response) return me;
  const D = await db(env);
  const id = Number(new URL(request.url).searchParams.get("id"));
  if (id) {
    const r = await D.prepare("SELECT * FROM posts WHERE id=?").bind(id).first();
    return r ? json({ item: r }) : json({ error: "not_found" }, 404);
  }
  const since = Date.now() - 30 * 86400000;
  const { results } = await D.prepare(
    `SELECT p.id,p.slug,p.cat,p.status,p.title,p.cover,p.published_at,p.updated,p.author,p.meta_title,p.meta_desc,
       (SELECT COUNT(*) FROM events e WHERE e.type='view' AND e.path='/bai-viet/'||p.slug) views,
       (SELECT COUNT(*) FROM events e WHERE e.type='view' AND e.path='/bai-viet/'||p.slug AND e.ts>=?) views30,
       (SELECT COUNT(DISTINCT COALESCE(e.vid,e.sid)) FROM events e WHERE e.type='view' AND e.path='/bai-viet/'||p.slug AND e.vid IS NOT NULL) visitors,
       (SELECT AVG(e.ms) FROM events e WHERE e.type='time' AND e.path='/bai-viet/'||p.slug) avg_ms
     FROM posts p ORDER BY COALESCE(p.published_at,p.updated) DESC LIMIT 500`
  ).bind(since).all();
  return json({ items: results, cats: POST_CATS });
}

async function save(request, env, isNew) {
  if (!sameOrigin(request)) return json({ error: "forbidden" }, 403);
  const me = await requireRole(request, env, CAN.content);
  if (me instanceof Response) return me;
  const b = await request.json().catch(() => null);
  if (!b) return json({ error: "bad_json" }, 400);
  const p = clean(b);
  if (!p.title) return json({ error: "missing_title" }, 422);
  if (!p.slug) return json({ error: "bad_slug" }, 422);
  if (!okUrl(p.cover) || !okUrl(p.og_image)) return json({ error: "bad_image" }, 400);
  // Biên tập viên chỉ lưu nháp; người duyệt trở lên mới được đăng
  if (p.status === "published" && me.role === "editor") return json({ error: "need_approver" }, 403);
  if (p.status === "published" && !p.published_at) p.published_at = Date.now();
  const D = await db(env), now = Date.now();
  const dup = await D.prepare("SELECT id FROM posts WHERE slug=?").bind(p.slug).first();
  try {
    if (isNew) {
      if (dup) return json({ error: "slug_taken" }, 409);
      const r = await D.prepare(`INSERT INTO posts (slug,cat,status,title,excerpt,body,cover,meta_title,meta_desc,meta_kw,og_image,tr,published_at,created,updated,author)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).bind(p.slug, p.cat, p.status, p.title, p.excerpt, p.body, p.cover, p.meta_title, p.meta_desc, p.meta_kw, p.og_image, p.tr, p.published_at, now, now, me.email).run();
      return json({ ok: true, id: r.meta.last_row_id, slug: p.slug });
    }
    const id = Number(b.id);
    if (!id) return json({ error: "bad_id" }, 400);
    if (dup && dup.id !== id) return json({ error: "slug_taken" }, 409);
    if (me.role === "editor") {
      const cur = await D.prepare("SELECT status FROM posts WHERE id=?").bind(id).first();
      if (cur && cur.status === "published") return json({ error: "need_approver" }, 403);
    }
    await D.prepare(`UPDATE posts SET slug=?,cat=?,status=?,title=?,excerpt=?,body=?,cover=?,meta_title=?,meta_desc=?,meta_kw=?,og_image=?,tr=?,published_at=?,updated=?,author=? WHERE id=?`)
      .bind(p.slug, p.cat, p.status, p.title, p.excerpt, p.body, p.cover, p.meta_title, p.meta_desc, p.meta_kw, p.og_image, p.tr, p.published_at, now, me.email, id).run();
    return json({ ok: true, id, slug: p.slug });
  } catch (e) {
    return json({ error: "too_large" }, 413);
  }
}
export const onRequestPost = ({ request, env }) => save(request, env, true);
export const onRequestPut = ({ request, env }) => save(request, env, false);

export async function onRequestDelete({ request, env }) {
  if (!sameOrigin(request)) return json({ error: "forbidden" }, 403);
  const me = await requireRole(request, env, ["owner", "admin", "approver"]);
  if (me instanceof Response) return me;
  const id = Number(new URL(request.url).searchParams.get("id"));
  if (!id) return json({ error: "bad_id" }, 400);
  await (await db(env)).prepare("DELETE FROM posts WHERE id=?").bind(id).run();
  return json({ ok: true });
}
