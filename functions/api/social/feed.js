// Nội dung website cho extension lên kế hoạch đăng Facebook: bài viết (gồm bài hẹn giờ sắp đăng), đối tác, các trang chính.
import { db, json, PUBLIC_SQL, POST_CATS } from "../../_lib.js";
import { socialAuth } from "../../_social.js";

const PAGES = [
  ["trang-chu", "Trang chủ FarmBase", "Nền tảng số hóa vùng trồng, truy xuất nguồn gốc nông sản"],
  ["giai-phap", "Giải pháp", "Mã số vùng trồng, nhật ký canh tác, truy xuất QR, cơ sở đóng gói"],
  ["truy-xuat", "Truy xuất nguồn gốc", "Tem QR, nhật ký điện tử cho từng lô hàng"],
  ["nguon-hang", "Nguồn hàng", "Vùng trồng đạt chuẩn, sản lượng sẵn sàng cho doanh nghiệp thu mua"],
  ["chien-dich-10000ha", "Chiến dịch 10.000 ha", "Chiến dịch 10.000 ha cây trồng chủ lực của DaLa và BVI"],
  ["doi-tac", "Khách hàng, đối tác", "Đơn vị đồng hành cùng FarmBase"],
  ["su-kien", "Sự kiện", "Hội thảo, tập huấn, báo chí"],
  ["blog", "Tin tức", "Tin tức, hướng dẫn, kiến thức"],
  ["ve-chung-toi", "Về chúng tôi", "BVI và Salefronts"],
  ["lien-he", "Liên hệ", "Đăng ký tư vấn"],
];

export async function onRequestGet({ request, env }) {
  const u = await socialAuth(request, env);
  if (u instanceof Response) return u;
  const origin = new URL(request.url).origin;
  const abs = (p) => (!p ? null : /^https?:\/\//.test(p) ? p : origin + "/" + String(p).replace(/^\/+/, ""));
  const D = await db(env);
  const now = Date.now();
  const { results } = await D.prepare(
    `SELECT slug,cat,title,excerpt,cover,og_image,meta_desc,meta_kw,published_at,updated FROM posts
     WHERE status='published' AND ${PUBLIC_SQL} AND (expires_at IS NULL OR expires_at>?) ORDER BY published_at DESC LIMIT 200`
  ).bind(now).all();
  const posts = results.map((r) => ({
    type: "post", id: "post:" + r.slug, slug: r.slug, cat: r.cat, cat_name: POST_CATS[r.cat] || r.cat,
    title: r.title, excerpt: r.excerpt || r.meta_desc || "", keywords: r.meta_kw || "",
    image: abs(r.og_image || r.cover), url: `${origin}/bai-viet/${r.slug}`,
    published_at: r.published_at, updated: r.updated, upcoming: !!(r.published_at && r.published_at > now),
  }));

  let list = [];
  try { list = (await D.prepare("SELECT data FROM partners ORDER BY sort, slug").all()).results.map((r) => JSON.parse(r.data)); } catch (e) {}
  if (!list.length && env.ASSETS) {
    try { list = await (await env.ASSETS.fetch(new Request(origin + "/data/partners.json"))).json(); } catch (e) { list = []; }
  }
  const partners = (Array.isArray(list) ? list : []).map((p) => ({
    type: "partner", id: "partner:" + p.slug, slug: p.slug, group: p.group,
    title: p.name?.vi || p.slug, excerpt: p.short?.vi || "", about: (p.about?.vi || "").slice(0, 1500),
    image: abs(p.cover || p.logo), logo: abs(p.logo), url: `${origin}/#doi-tac/${p.slug}`,
  }));

  const pages = PAGES.map(([k, t, d]) => ({
    type: "page", id: "page:" + k, title: t, excerpt: d,
    url: k === "chien-dich-10000ha" ? `${origin}/chien-dich-10000ha/` : `${origin}/#${k}`,
    image: k === "chien-dich-10000ha" ? `${origin}/img/og-10000ha.jpg` : null,
  }));
  return json({ site: origin, generated: now, posts, partners, pages });
}
