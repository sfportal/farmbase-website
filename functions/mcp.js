// Máy chủ MCP (Model Context Protocol) của farmbase.vn: cho Claude và các công cụ AI khác đọc nội dung công khai của website.
// Kiểu "Streamable HTTP" không giữ phiên: mỗi yêu cầu POST /mcp là một thông điệp JSON-RPC, trả về JSON.
// Chỉ đọc: trang, giải pháp, bài viết đã đăng công khai, đối tác. Không có công cụ ghi, không đọc dữ liệu nông hộ, khách liên hệ, tài khoản.
import {
  LANGS, lang3, siteData, translator, pages, htmlToText, publicPosts, publicPost, postView,
  partnerList, partnerView, PARTNER_GROUPS, fold, score, snippet,
} from "./_site.js";
import { POST_CATS } from "./_lib.js";

const SERVER = { name: "farmbase-website", title: "FarmBase (farmbase.vn)", version: "1.0.0" };
const VERSIONS = ["2025-11-25", "2025-06-18", "2025-03-26", "2024-11-05"];
const INSTRUCTIONS = `Nội dung công khai của website FarmBase (farmbase.vn): nền tảng số hóa vùng trồng, nhật ký canh tác, truy xuất nguồn gốc nông sản (sầu riêng, cà phê...) tại Đắk Lắk, do Công ty CP BVI và Salefronts đồng phát triển.
Bắt đầu bằng get_site_overview để biết các trang, giải pháp, chuyên mục; dùng search_site để tìm theo từ khóa (không cần dấu); đọc chi tiết bằng get_page, get_post, get_partner.
Mọi công cụ chỉ đọc. Tham số lang: vi (mặc định), en, zh. Khi trích dẫn, ghi kèm đường link url trả về.
Không tự suy ra giá, sản lượng, cam kết bao tiêu hay việc cấp mã số vùng trồng nếu website không ghi rõ.`;

const LANG_ARG = { type: "string", enum: LANGS, description: "Ngôn ngữ: vi (mặc định), en, zh" };
const RO = { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false };

const TOOLS = [
  {
    name: "get_site_overview",
    title: "Tổng quan website FarmBase",
    description: "Giới thiệu FarmBase, danh sách trang và giải pháp (mã, tiêu đề, link), chuyên mục bài viết, nhóm đối tác, thông tin liên hệ công khai. Nên gọi đầu tiên.",
    inputSchema: { type: "object", properties: { lang: LANG_ARG } },
  },
  {
    name: "get_page",
    title: "Đọc một trang hoặc giải pháp",
    description: "Toàn bộ chữ của một trang (vd: trang-chu, ve-chung-toi, giai-phap, nguon-hang, chien-dich-10000ha, lien-he, chinh-sach-bao-mat) hoặc một trang giải pháp (vd: truy-xuat, ma-vung-trong). Lấy mã trang từ get_site_overview.",
    inputSchema: { type: "object", properties: { page: { type: "string", description: "Mã trang" }, lang: LANG_ARG }, required: ["page"] },
  },
  {
    name: "list_posts",
    title: "Danh sách bài viết",
    description: "Bài viết đã đăng công khai, mới nhất trước: tiêu đề, tóm tắt, chuyên mục, ngày đăng, link.",
    inputSchema: {
      type: "object",
      properties: {
        category: { type: "string", enum: Object.keys(POST_CATS), description: "Chuyên mục: " + Object.entries(POST_CATS).map(([k, v]) => `${k} (${v})`).join(", ") },
        query: { type: "string", description: "Lọc theo từ khóa trong tiêu đề, tóm tắt (không cần dấu)" },
        limit: { type: "integer", minimum: 1, maximum: 100, description: "Số bài, mặc định 20" },
        lang: LANG_ARG,
      },
    },
  },
  {
    name: "get_post",
    title: "Đọc một bài viết",
    description: "Toàn văn một bài viết đã đăng công khai, theo slug (lấy từ list_posts hoặc search_site).",
    inputSchema: { type: "object", properties: { slug: { type: "string" }, lang: LANG_ARG }, required: ["slug"] },
  },
  {
    name: "list_partners",
    title: "Danh sách khách hàng, đối tác",
    description: "Khách hàng, đơn vị đồng hành, đối tác công nghệ hiện trên trang Khách hàng, đối tác.",
    inputSchema: { type: "object", properties: { group: { type: "string", enum: Object.keys(PARTNER_GROUPS), description: "Nhóm: " + Object.entries(PARTNER_GROUPS).map(([k, v]) => `${k} (${v})`).join(", ") }, lang: LANG_ARG } },
  },
  {
    name: "get_partner",
    title: "Thông tin một đối tác",
    description: "Giới thiệu, vai trò cùng FarmBase, sản phẩm và liên hệ công khai của một đối tác, theo slug.",
    inputSchema: { type: "object", properties: { slug: { type: "string" }, lang: LANG_ARG }, required: ["slug"] },
  },
  {
    name: "search_site",
    title: "Tìm trong website",
    description: "Tìm theo từ khóa (có hoặc không dấu) trong các trang, giải pháp, bài viết, đối tác. Trả về kết quả liên quan nhất kèm đoạn trích và link.",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Từ khóa, vd: mã số vùng trồng, truy xuất QR, sầu riêng" },
        types: { type: "array", items: { type: "string", enum: ["page", "solution", "post", "partner"] }, description: "Chỉ tìm trong các loại này" },
        limit: { type: "integer", minimum: 1, maximum: 30, description: "Số kết quả, mặc định 10" },
        lang: LANG_ARG,
      },
      required: ["query"],
    },
  },
].map((t) => ({ ...t, annotations: { title: t.title, ...RO } }));

class ToolError extends Error {}
const words = (q) => [...new Set(fold(q).split(/[^\p{L}\p{N}]+/u).filter((w) => w.length > 1))].slice(0, 12);
const clampInt = (v, d, max) => Math.max(1, Math.min(max, Number.isFinite(+v) ? Math.floor(+v) : d));

async function callTool(name, a, env, origin) {
  const lang = lang3(a.lang);
  const site = await siteData(env, origin);
  const tr = await translator(env, site, lang);

  switch (name) {
    case "get_site_overview": {
      const P = pages(site, tr, origin, lang);
      return {
        name: "FarmBase", url: origin + "/", title: site.title, description: site.description,
        developed_by: "Công ty Cổ phần BVI và Salefronts",
        languages: LANGS,
        pages: P.filter((p) => p.type === "page").map(({ id, title, url }) => ({ id, title, url })),
        solutions: P.filter((p) => p.type === "solution").map(({ id, title, summary, url }) => ({ id, title, summary, url })),
        post_categories: POST_CATS, partner_groups: PARTNER_GROUPS,
        contact: htmlToText(site.footer, tr),
        mcp_tools: TOOLS.map((t) => t.name),
      };
    }
    case "get_page": {
      const id = String(a.page || "").replace(/^#/, "").trim();
      const p = pages(site, tr, origin, lang).find((x) => x.id === id);
      if (!p) throw new ToolError(`Không có trang "${id}". Các mã hợp lệ: ` + pages(site, tr, origin, lang).map((x) => x.id).join(", "));
      return { ...p, lang };
    }
    case "list_posts": {
      const terms = a.query ? words(a.query) : [];
      let rows = (await publicPosts(env)).map((r) => postView(r, lang, origin));
      if (a.category) rows = rows.filter((r) => r.category === a.category);
      if (terms.length) rows = rows.filter((r) => score(terms, r.title, `${r.excerpt} ${r.keywords}`) > 0);
      const limit = clampInt(a.limit, 20, 100);
      return { total: rows.length, items: rows.slice(0, limit) };
    }
    case "get_post": {
      const r = await publicPost(env, a.slug || "");
      if (!r) throw new ToolError(`Không tìm thấy bài viết công khai "${a.slug}". Dùng list_posts để xem slug.`);
      return postView(r, lang, origin, true);
    }
    case "list_partners": {
      let list = await partnerList(env, origin);
      if (a.group) list = list.filter((p) => p.group === a.group);
      return { total: list.length, items: list.map((p) => partnerView(p, lang, origin)) };
    }
    case "get_partner": {
      const p = (await partnerList(env, origin)).find((x) => x.slug === String(a.slug || "").trim());
      if (!p) throw new ToolError(`Không có đối tác "${a.slug}". Dùng list_partners để xem slug.`);
      return partnerView(p, lang, origin, true);
    }
    case "search_site": {
      const terms = words(a.query || "");
      if (!terms.length) throw new ToolError("Cần nhập từ khóa.");
      const phrase = terms.join(" ");
      const want = new Set(Array.isArray(a.types) && a.types.length ? a.types : ["page", "solution", "post", "partner"]);
      const docs = [];
      if (want.has("page") || want.has("solution")) for (const p of pages(site, tr, origin, lang)) if (want.has(p.type)) docs.push({ type: p.type, id: p.id, title: p.title, url: p.url, text: p.text });
      if (want.has("post")) for (const r of await publicPosts(env, true)) {
        const v = postView(r, lang, origin, true);
        docs.push({ type: "post", id: v.slug, title: v.title, url: v.url, published: v.published, text: `${v.excerpt}\n${v.keywords}\n${v.text}` });
      }
      if (want.has("partner")) for (const p of await partnerList(env, origin)) {
        const v = partnerView(p, lang, origin, true);
        docs.push({ type: "partner", id: v.slug, title: v.name, url: v.url, text: [v.short, v.about, v.role, ...v.products.map((x) => `${x.name}: ${x.desc}`)].join("\n") });
      }
      const hits = docs.map((d) => ({ d, s: score(terms, d.title, d.text, phrase) })).filter((x) => x.s > 0).sort((x, y) => y.s - x.s);
      const limit = clampInt(a.limit, 10, 30);
      return {
        query: a.query, total: hits.length,
        items: hits.slice(0, limit).map(({ d }) => {
          const o = { type: d.type, id: d.id, title: d.title, url: d.url, snippet: snippet(d.text, terms, 260, phrase) };
          if (d.published) o.published = d.published;
          return o;
        }),
      };
    }
  }
  return undefined;
}

// ---------- JSON-RPC ----------
const rpcErr = (id, code, message) => ({ jsonrpc: "2.0", id: id ?? null, error: { code, message } });

async function handle(msg, env, origin) {
  if (!msg || typeof msg !== "object" || msg.jsonrpc !== "2.0" || typeof msg.method !== "string") return rpcErr(msg && msg.id, -32600, "Invalid Request");
  const { id, method, params = {} } = msg;
  const isNote = id === undefined;
  const ok = (result) => (isNote ? null : { jsonrpc: "2.0", id, result });
  switch (method) {
    case "initialize": {
      const v = VERSIONS.includes(params.protocolVersion) ? params.protocolVersion : VERSIONS[0];
      return ok({ protocolVersion: v, capabilities: { tools: { listChanged: false } }, serverInfo: SERVER, instructions: INSTRUCTIONS });
    }
    case "ping": return ok({});
    case "tools/list": return ok({ tools: TOOLS });
    case "tools/call": {
      const name = params.name;
      if (!TOOLS.some((t) => t.name === name)) return rpcErr(id, -32602, `Unknown tool: ${name}`);
      try {
        const data = await callTool(name, params.arguments && typeof params.arguments === "object" ? params.arguments : {}, env, origin);
        return ok({ content: [{ type: "text", text: JSON.stringify(data, null, 1) }] });
      } catch (e) {
        if (!(e instanceof ToolError)) console.error("mcp", name, e && e.stack || e);
        return ok({ content: [{ type: "text", text: e instanceof ToolError ? e.message : "Lỗi máy chủ, thử lại sau." }], isError: true });
      }
    }
    case "resources/list": return ok({ resources: [] });
    case "resources/templates/list": return ok({ resourceTemplates: [] });
    case "prompts/list": return ok({ prompts: [] });
    default:
      if (method.startsWith("notifications/")) return null;
      return isNote ? null : rpcErr(id, -32601, `Method not found: ${method}`);
  }
}

// Dữ liệu công khai, không dùng cookie: cho phép gọi từ trình duyệt (vd: MCP Inspector)
export const CORS = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "POST, GET, OPTIONS",
  "access-control-allow-headers": "content-type, accept, mcp-protocol-version, mcp-session-id, last-event-id, authorization",
  "access-control-expose-headers": "mcp-session-id, mcp-protocol-version",
  "access-control-max-age": "86400",
};
const out = (body, status = 200, extra = {}) => new Response(body == null ? null : JSON.stringify(body), {
  status, headers: { ...CORS, "cache-control": "no-store", "x-robots-tag": "noindex", ...(body == null ? {} : { "content-type": "application/json; charset=utf-8" }), ...extra },
});

export async function onRequest({ request, env }) {
  const origin = new URL(request.url).origin;
  if (request.method === "OPTIONS") return out(null, 204);
  if (request.method === "GET") {
    // Không mở luồng SSE; người mở bằng trình duyệt thấy hướng dẫn ngắn
    if (!(request.headers.get("accept") || "").includes("text/event-stream"))
      return out({ name: SERVER.title, mcp_endpoint: origin + "/mcp", transport: "streamable-http", tools: TOOLS.map((t) => t.name), how: "Thêm đường link này làm connector (MCP server) trong Claude hoặc công cụ AI hỗ trợ MCP." });
    return out(null, 405, { allow: "POST, OPTIONS" });
  }
  if (request.method !== "POST") return out(rpcErr(null, -32000, "Method not allowed"), 405, { allow: "POST, GET, OPTIONS" });

  const raw = await request.text();
  if (raw.length > 100000) return out(rpcErr(null, -32600, "Request too large"), 413);
  let msg;
  try { msg = JSON.parse(raw); } catch (e) { return out(rpcErr(null, -32700, "Parse error"), 400); }

  if (Array.isArray(msg)) {
    if (!msg.length || msg.length > 20) return out(rpcErr(null, -32600, "Invalid Request"), 400);
    const res = (await Promise.all(msg.map((m) => handle(m, env, origin)))).filter(Boolean);
    return res.length ? out(res) : out(null, 202);
  }
  const res = await handle(msg, env, origin);
  return res ? out(res) : out(null, 202);
}
