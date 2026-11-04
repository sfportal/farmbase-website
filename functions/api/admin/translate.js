// Dịch bài viết từ tiếng Việt sang tiếng Anh hoặc tiếng Trung bằng Cloudflare Workers AI (binding AI).
// Giữ nguyên thẻ HTML, ảnh, số điện thoại, email; dùng bảng thuật ngữ của FarmBase. Kết quả là bản nháp để người duyệt đọc lại.
import { json, requireRole, CAN, sameOrigin } from "../../_lib.js";

const LANGS = { en: "English", zh: "Simplified Chinese (简体中文)" };
const GLOSSARY = {
  en: `mã số vùng trồng = planting area code; mã số cơ sở đóng gói = packing facility code; truy xuất nguồn gốc = traceability; nhật ký canh tác = farming diary; vùng trồng = growing area; nông hộ = farming households; bà con = farmers; HTX / hợp tác xã = cooperative; doanh nghiệp = enterprise; Bộ NN&MT / Bộ Nông nghiệp và Môi trường = Ministry of Agriculture and Environment; sầu riêng = durian; cà phê = coffee; tập huấn = training session; thời gian cách ly = pre-harvest interval; phân thuốc = fertilisers and pesticides; trang quản lý = management portal`,
  zh: `mã số vùng trồng = 种植基地注册号; mã số cơ sở đóng gói = 包装厂注册号; truy xuất nguồn gốc = 溯源; nhật ký canh tác = 种植日志; vùng trồng = 种植区; nông hộ = 农户; bà con = 农户; HTX / hợp tác xã = 合作社; doanh nghiệp = 企业; Bộ NN&MT / Bộ Nông nghiệp và Môi trường = 越南农业与环境部; sầu riêng = 榴莲; cà phê = 咖啡; tập huấn = 培训; thời gian cách ly = 安全间隔期; phân thuốc = 化肥农药; trang quản lý = 管理后台; Đắk Lắk = 多乐省`,
};
const MODEL = (env) => env.TRANSLATE_MODEL || "@cf/meta/llama-3.3-70b-instruct-fp8-fast";

function system(to, html) {
  return `You are a professional translator for FarmBase, an agricultural traceability platform in Vietnam. Translate the user's Vietnamese text into ${LANGS[to]}.
Rules:
- Output ONLY the translation. No explanations, no quotes, no code fences.
- Keep these names unchanged: FarmBase, BVI, Salefronts, Zalo, Zalo Mini App, Zalo OA, DaLa, GS1, QR, VietGAP, GACC. Keep Vietnamese place and cooperative names, adding no explanation.
- Keep phone numbers, emails, URLs, dates and figures exactly as written.
- Use this glossary: ${GLOSSARY[to]}.
- Business tone, clear and concise.${html ? `
- The text is HTML. Keep every tag and attribute exactly as in the source (same order, same src/href/class). Translate only the visible text and the alt attribute values. Do not add or remove tags.` : ""}`;
}

const clean = (s) => String(s || "").trim().replace(/^```(?:html)?\s*/i, "").replace(/\s*```$/, "").trim();

async function ask(env, to, text, html) {
  if (!text || !String(text).trim()) return "";
  const r = await env.AI.run(MODEL(env), {
    messages: [{ role: "system", content: system(to, html) }, { role: "user", content: text }],
    max_tokens: 4096, temperature: 0.2,
  });
  return clean(r && (r.response ?? r.result?.response));
}

// Tách HTML theo khối cấp cao nhất, mỗi phần tối đa ~2.500 ký tự để dịch ổn định
export function chunks(html, max = 2500) {
  const parts = String(html || "").split(/(?<=<\/(?:p|h[1-6]|ul|ol|blockquote|figure|table|pre|div)>)/i).filter((x) => x.trim());
  const out = []; let cur = "";
  for (const p of parts) {
    if (cur && (cur + p).length > max) { out.push(cur); cur = ""; }
    cur += p;
  }
  if (cur) out.push(cur);
  return out;
}
const tagCount = (s) => (String(s).match(/<(img|iframe|video|a)\b/gi) || []).length;

async function pool(items, n, fn) {
  const res = new Array(items.length); let i = 0;
  await Promise.all(Array.from({ length: Math.min(n, items.length) }, async () => { while (i < items.length) { const k = i++; res[k] = await fn(items[k], k); } }));
  return res;
}

export async function onRequestPost({ request, env }) {
  if (!sameOrigin(request)) return json({ error: "forbidden" }, 403);
  const me = await requireRole(request, env, CAN.content);
  if (me instanceof Response) return me;
  if (!env.AI) return json({ error: "no_ai" }, 503);
  const b = await request.json().catch(() => ({}));
  const to = b.to;
  if (!LANGS[to]) return json({ error: "bad_lang" }, 400);
  const body = String(b.body || "");
  if (body.length > 200000) return json({ error: "too_large" }, 413);
  try {
    let kept = 0;
    const parts = await pool(chunks(body), 3, async (c) => {
      const t = await ask(env, to, c, true);
      // Nếu bản dịch làm mất ảnh, video hoặc link thì giữ nguyên đoạn gốc để không hỏng bài
      if (!t || tagCount(t) !== tagCount(c)) { kept++; return c; }
      return t;
    });
    const [title, excerpt, meta_title, meta_desc] = await pool(
      [b.title, b.excerpt, b.meta_title, b.meta_desc], 4, (x) => ask(env, to, String(x || "").slice(0, 2000), false));
    return json({ ok: true, to, title, excerpt, meta_title, meta_desc, body: parts.join(""), kept });
  } catch (e) {
    console.error("translate", e && e.stack || e);
    return json({ error: "ai_failed" }, 502);
  }
}
