// Điểm vào Cloudflare Worker: phục vụ trang tĩnh trong thư mục site/ và chạy các API trong functions/.
// Giữ nguyên code functions/ (kiểu Pages Functions); tệp này chỉ định tuyến yêu cầu tới đúng hàm.
import * as mw from "../functions/_middleware.js";
import * as sitemap from "../functions/sitemap.xml.js";
import * as baiViet from "../functions/bai-viet/[slug].js";
import * as aUsers from "../functions/api/admin/users.js";
import * as aContent from "../functions/api/admin/content.js";
import * as aSettings from "../functions/api/admin/settings.js";
import * as aPartners from "../functions/api/admin/partners.js";
import * as aCookies from "../functions/api/admin/cookies.js";
import * as aMedia from "../functions/api/admin/media.js";
import * as aLeads from "../functions/api/admin/leads.js";
import * as aPosts from "../functions/api/admin/posts.js";
import * as aStats from "../functions/api/admin/stats.js";
import * as aTranslate from "../functions/api/admin/translate.js";
import * as me from "../functions/api/auth/me.js";
import * as logout from "../functions/api/auth/logout.js";
import * as setup from "../functions/api/auth/setup.js";
import * as login from "../functions/api/auth/login.js";
import * as password from "../functions/api/auth/password.js";
import * as lead from "../functions/api/lead.js";
import * as content from "../functions/api/content.js";
import * as postOne from "../functions/api/posts/[slug].js";
import * as postList from "../functions/api/posts/index.js";
import * as media from "../functions/api/media/[id].js";
import * as partners from "../functions/api/partners.js";
import * as consent from "../functions/api/consent.js";
import * as track from "../functions/api/track.js";
import * as kiemTra from "../functions/api/kiem-tra.js";
import * as kiemTraQL from "../functions/api/kiem-tra-quan-ly.js";

// [mẫu đường dẫn, module]; :ten là tham số
const ROUTES = [
  ["/sitemap.xml", sitemap], ["/bai-viet/:slug", baiViet],
  ["/api/admin/users", aUsers], ["/api/admin/content", aContent], ["/api/admin/settings", aSettings], ["/api/admin/partners", aPartners],
  ["/api/admin/cookies", aCookies], ["/api/admin/media", aMedia], ["/api/admin/leads", aLeads], ["/api/admin/posts", aPosts], ["/api/admin/stats", aStats], ["/api/admin/translate", aTranslate],
  ["/api/auth/me", me], ["/api/auth/logout", logout], ["/api/auth/setup", setup], ["/api/auth/login", login], ["/api/auth/password", password],
  ["/api/lead", lead], ["/api/content", content], ["/api/posts", postList], ["/api/posts/:slug", postOne], ["/api/media/:id", media],
  ["/api/partners", partners], ["/api/consent", consent], ["/api/track", track],
  ["/api/kiem-tra", kiemTra], ["/api/kiem-tra-quan-ly", kiemTraQL],
].map(([p, m]) => [new RegExp("^" + p.replace(/:(\w+)/g, "(?<$1>[^/]+)") + "/?$"), m]);

const METHOD = { GET: "onRequestGet", POST: "onRequestPost", PUT: "onRequestPut", PATCH: "onRequestPatch", DELETE: "onRequestDelete", HEAD: "onRequestGet" };
const json = (o, s) => new Response(JSON.stringify(o), { status: s, headers: { "content-type": "application/json; charset=utf-8" } });

async function route(request, env, ctx) {
  const path = new URL(request.url).pathname;
  for (const [re, mod] of ROUTES) {
    const m = path.match(re);
    if (!m) continue;
    const fn = mod[METHOD[request.method]] || mod.onRequest;
    if (!fn) return json({ error: "method_not_allowed" }, 405);
    const params = {};
    for (const [k, v] of Object.entries(m.groups || {})) params[k] = decodeURIComponent(v);
    try {
      return await fn({ request, env, params, waitUntil: (p) => ctx.waitUntil(p), next: () => env.ASSETS.fetch(request), data: {} });
    } catch (e) {
      console.error(path, e && e.stack || e);
      return json({ error: "server_error" }, 500);
    }
  }
  if (path.startsWith("/api/")) return json({ error: "not_found" }, 404);
  return env.ASSETS.fetch(request);
}

export default {
  async fetch(request, env, ctx) {
    // Chạy lớp chèn mã đo lường (GA4, Pixel) như _middleware của Pages
    return mw.onRequest({ request, env, params: {}, waitUntil: (p) => ctx.waitUntil(p), next: () => route(request, env, ctx), data: {} });
  },
};
