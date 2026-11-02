// Nhận form liên hệ: lưu vào D1 và gửi email báo khách mới.
import { db, json, clip } from "../_lib.js";

const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

export async function onRequestPost({ request, env }) {
  let b;
  try { b = await request.json(); } catch { return json({ ok: false, error: "bad_json" }, 400); }
  if (b.website) return json({ ok: true }); // ô bẫy chống spam, người thật không điền
  const name = clip((b.name || "").trim(), 120);
  const phone = clip((b.phone || "").replace(/[^\d+ ]/g, "").trim(), 20);
  const email0 = String(b.email || "").trim();
  const okEmail = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email0);
  const digits = phone.replace(/\D/g, "").length;
  // Người mua quốc tế có thể chỉ để lại email; khách trong nước cần số điện thoại.
  if (!name || !(digits >= 9 || (okEmail && (digits === 0 || digits >= 8))))
    return json({ ok: false, error: "missing" }, 422);

  const lead = {
    name, phone,
    email: clip(b.email, 120), org_type: clip(b.org_type, 60), need: clip(b.need, 80),
    crop: clip(b.crop, 40), area: clip(b.area, 20), location: clip(b.location, 120),
    note: clip(b.note, 1000), source: clip(b.source, 40), page: clip(b.page, 120), lang: clip(b.lang, 5),
    vid: clip(b.vid, 40), sid: clip(b.sid, 40), // chỉ có khi khách đồng ý cookie thống kê
  };
  const D = await db(env);
  const r = await D.prepare(
    `INSERT INTO leads (ts,name,phone,email,org_type,need,crop,area,location,note,source,page,lang,vid,sid)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`
  ).bind(Date.now(), lead.name, lead.phone, lead.email, lead.org_type, lead.need, lead.crop,
         lead.area, lead.location, lead.note, lead.source, lead.page, lead.lang, lead.vid, lead.sid).run();
  const id = r.meta?.last_row_id;

  // Gửi email qua Resend nếu đã cài RESEND_API_KEY.
  let emailed = false;
  if (env.RESEND_API_KEY) {
    const rows = [["Họ tên", lead.name], ["Điện thoại / Zalo", lead.phone], ["Email", lead.email],
      ["Loại đơn vị", lead.org_type], ["Nhu cầu", lead.need], ["Cây trồng", lead.crop],
      ["Diện tích (ha)", lead.area], ["Địa phương", lead.location], ["Ghi chú", lead.note],
      ["Nguồn form", lead.source], ["Trang", lead.page], ["Ngôn ngữ", lead.lang]]
      .filter((x) => x[1]).map((x) => `<tr><td style="padding:4px 12px 4px 0;color:#5A6B63">${x[0]}</td><td style="padding:4px 0"><b>${esc(x[1])}</b></td></tr>`).join("");
    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { authorization: `Bearer ${env.RESEND_API_KEY}`, "content-type": "application/json" },
        body: JSON.stringify({
          from: env.LEAD_EMAIL_FROM || "FarmBase <onboarding@resend.dev>",
          to: (env.LEAD_EMAIL_TO || "info@salefronts.com").split(",").map((s) => s.trim()),
          subject: `${/đối tác/i.test(lead.source || "") ? "Đăng ký đối tác đồng hành" : /nguồn hàng/i.test(lead.source || "") ? "Người mua quốc tế" : "Khách mới"} từ website FarmBase: ${lead.name} · ${lead.crop || lead.need || "tư vấn"}`,
          html: `<h2 style="font-family:sans-serif">Khách để lại liên hệ trên website</h2><table style="font-family:sans-serif;font-size:14px">${rows}</table><p style="font-family:sans-serif;font-size:13px;color:#5A6B63">Xem và cập nhật trạng thái trong trang quản lý FarmBase.</p>`,
        }),
      });
      emailed = res.ok;
    } catch { emailed = false; }
    if (emailed && id) await D.prepare("UPDATE leads SET emailed=1 WHERE id=?").bind(id).run();
  }
  return json({ ok: true, id, emailed });
}
