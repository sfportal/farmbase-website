// Gắn cấu hình Google Analytics 4 và Facebook Pixel (cài trong trang quản lý) vào các trang công khai.
import { cachedSettings } from "./_lib.js";

// Chỉ chèn mã cấu hình. Trang web tự tải GA4 và Pixel sau khi khách đồng ý cookie thống kê, marketing.
function snippet(s) {
  const c = {};
  if (/^G-[A-Z0-9]{4,15}$/.test(s.ga_id || "")) c.ga = s.ga_id;
  if (/^\d{8,20}$/.test(s.fb_pixel_id || "")) c.px = s.fb_pixel_id;
  return Object.keys(c).length ? `<script>window.FB_TAGS=${JSON.stringify(c)}</script>` : "";
}

export async function onRequest(ctx) {
  const res = await ctx.next();
  const path = new URL(ctx.request.url).pathname;
  const type = res.headers.get("content-type") || "";
  if (ctx.request.method !== "GET" || !type.includes("text/html") || path.startsWith("/quan-tri") || path.startsWith("/api/") || !ctx.env.DB)
    return res;
  const h = snippet(await cachedSettings(ctx.env));
  if (!h) return res;
  // Trang không có thẻ <head> rõ ràng nên chèn ngay sau <title> (luôn nằm trong phần head)
  let done = false;
  return new HTMLRewriter().on("title", { element(el) { if (!done) { el.after(h, { html: true }); done = true; } } }).transform(res);
}
