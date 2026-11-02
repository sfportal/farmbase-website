// Gắn mã Google Analytics 4 và Facebook Pixel (cài trong trang quản lý) vào các trang công khai.
import { cachedSettings } from "./_lib.js";

function snippet(s) {
  let h = "";
  if (/^G-[A-Z0-9]{4,15}$/.test(s.ga_id || "")) {
    h += `<script async src="https://www.googletagmanager.com/gtag/js?id=${s.ga_id}"></script>` +
      `<script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}gtag('js',new Date());gtag('config','${s.ga_id}',{send_page_view:false});</script>`;
  }
  if (/^\d{8,20}$/.test(s.fb_pixel_id || "")) {
    h += `<script>!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${s.fb_pixel_id}');</script>`;
  }
  return h;
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
