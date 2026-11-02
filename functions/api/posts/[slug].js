// Một bài viết đã đăng. Bài "chỉ người có link" có thể đặt mật khẩu (gửi trong header X-Post-Pass) và ngày hết hiệu lực.
import { db, json, publicPost, checkPass } from "../../_lib.js";

const NOSTORE = { "cache-control": "private, no-store", "x-robots-tag": "noindex, nofollow" };

export async function onRequestGet({ params, env, request }) {
  const slug = String(params.slug || "").slice(0, 90);
  const D = await db(env), now = Date.now();
  const r = await D.prepare("SELECT * FROM posts WHERE slug=?").bind(slug).first();
  // Bài chỉ người có link đã từng mở rồi bị tắt hiệu lực: báo "hết hiệu lực" thay vì "không tồn tại"
  if (r && r.visibility === "link" && r.published_at && (r.status !== "published" || (r.expires_at && r.expires_at <= now))) return json({ error: "expired" }, 410, NOSTORE);
  if (!r || r.status !== "published" || !(r.published_at <= now)) return json({ error: "not_found" }, 404, NOSTORE);
  if (r.expires_at && r.expires_at <= now) return json({ error: "expired" }, 410, NOSTORE);
  if (r.visibility !== "link") return json(publicPost(r, true), 200, { "cache-control": "public, max-age=60" });
  if (r.pass_hash) {
    const pw = request.headers.get("x-post-pass");
    if (!pw) return json({ error: "need_pass", title: r.title, cat: r.cat }, 401, NOSTORE);
    // Chặn dò mật khẩu: tối đa 10 lần sai mỗi 15 phút cho một địa chỉ
    const ip = request.headers.get("cf-connecting-ip") || "local", since = now - 15 * 60000;
    const t = await D.prepare("SELECT COUNT(*) n FROM pass_tries WHERE slug=? AND ip=? AND ts>?").bind(slug, ip, since).first();
    if (t && t.n >= 10) return json({ error: "too_many", title: r.title, cat: r.cat }, 429, NOSTORE);
    if (!(await checkPass(pw, r.pass_hash))) {
      await D.batch([D.prepare("INSERT INTO pass_tries (ip,slug,ts) VALUES (?,?,?)").bind(ip, slug, now), D.prepare("DELETE FROM pass_tries WHERE ts<?").bind(now - 86400000)]);
      return json({ error: "wrong_pass", title: r.title, cat: r.cat }, 401, NOSTORE);
    }
  }
  return json(publicPost(r, true), 200, NOSTORE);
}
