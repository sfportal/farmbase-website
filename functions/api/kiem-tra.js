// Bài kiểm tra quy trình mã số vùng trồng cho nhân sự (trang /kiem-tra-msvt/). Không cần đăng nhập.
// POST {action:"bat-dau", hoTen}            -> mở bài, máy chủ ghi giờ bắt đầu, trả id + token
// POST {action:"nop", id, token, tn, tl}    -> nộp bài, máy chủ tính thời gian và tự chấm trắc nghiệm
// GET  ?id=&token=                          -> trạng thái và điểm (khi quản lý đã chấm) của bài mình
// GET  (không tham số)                      -> phiên đang mở
import { db, json, clip } from "../_lib.js";
import { bang, chamTN, chamTL, phienHienTai, DAP_AN, TINH_HUONG, THOI_GIAN } from "../_kiemtra.js";

const H = { "cache-control": "no-store", "x-robots-tag": "noindex, nofollow" };
const tokenMoi = () => [...crypto.getRandomValues(new Uint8Array(18))].map((b) => b.toString(16).padStart(2, "0")).join("");

async function lay(D, id, token) {
  const r = await D.prepare("SELECT * FROM kiemtra_bai WHERE id=?").bind(Number(id) || 0).first();
  if (!r || typeof token !== "string" || token.length !== r.token.length) return null;
  let d = 0;
  for (let i = 0; i < token.length; i++) d |= token.charCodeAt(i) ^ r.token.charCodeAt(i);
  return d === 0 ? r : null;
}

function trangThai(r, phien) {
  const o = { id: r.id, phienId: r.phien_id, phienMo: phien ? phien.id : null, hoTen: r.ho_ten, batDau: r.bat_dau, nopLuc: r.nop_luc, giay: r.giay, hetGio: !!r.het_gio, now: Date.now(), thoiGian: THOI_GIAN };
  if (r.cham_luc) Object.assign(o, { diemTN: r.diem_tn, diemTL: r.diem_tl, tong: r.tong, nhanXet: r.nhan_xet });
  return o;
}

export async function onRequestPost({ request, env }) {
  let b;
  try { b = await request.json(); } catch { return json({ error: "bad_json" }, 400, H); }
  const D = await db(env);
  await bang(D);
  const now = Date.now();

  if (b.action === "bat-dau") {
    const hoTen = clip(String(b.hoTen || "").replace(/\s+/g, " ").trim(), 80);
    if (!hoTen || hoTen.length < 2) return json({ error: "missing_name" }, 422, H);
    const ip = request.headers.get("cf-connecting-ip") || "local";
    const t = await D.prepare("SELECT COUNT(*) n FROM kiemtra_bai WHERE ip=? AND bat_dau>?").bind(ip, now - 3600000).first();
    if (t && t.n >= 40) return json({ error: "too_many" }, 429, H);
    const phien = await phienHienTai(D);
    if (!phien) return json({ error: "closed" }, 423, H);
    const token = tokenMoi();
    const r = await D.prepare("INSERT INTO kiemtra_bai (token,ho_ten,bat_dau,ip,phien_id) VALUES (?,?,?,?,?)").bind(token, hoTen, now, ip, phien.id).run();
    return json({ id: r.meta?.last_row_id, token, batDau: now, now, thoiGian: THOI_GIAN, phienId: phien.id }, 200, H);
  }

  if (b.action === "nop") {
    const r = await lay(D, b.id, b.token);
    if (!r) return json({ error: "not_found" }, 404, H);
    if (r.nop_luc) return json(trangThai(r, await phienHienTai(D)), 200, H);
    const tn = {}, tl = {};
    for (const k of Object.keys(DAP_AN)) { const v = b.tn && b.tn[k]; tn[k] = /^[a-d]$/.test(v || "") ? v : null; }
    for (const k of Object.keys(TINH_HUONG)) tl[k] = clip(String((b.tl && b.tl[k]) || "").trim(), 2000);
    const giay = Math.round((now - r.bat_dau) / 1000);
    const hetGio = giay > THOI_GIAN + 20 ? 1 : 0; // quá 5 phút (cho phép 20 giây trễ mạng)
    // Tự chấm trắc nghiệm và chấm sơ bộ tình huống; quản lý chấm lại thì thay điểm sơ bộ
    const dTN = chamTN(tn), tc = chamTL(tl);
    await D.prepare("UPDATE kiemtra_bai SET nop_luc=?, giay=?, het_gio=?, tn=?, tl=?, diem_tn=?, tu_cham=?, diem_tung_cau=?, diem_tl=?, tong=? WHERE id=? AND nop_luc IS NULL")
      .bind(now, giay, hetGio, JSON.stringify(tn), JSON.stringify(tl), dTN, JSON.stringify(tc), JSON.stringify(tc.per), tc.tong, dTN + tc.tong, r.id).run();
    const r2 = await D.prepare("SELECT * FROM kiemtra_bai WHERE id=?").bind(r.id).first();
    return json(trangThai(r2, await phienHienTai(D)), 200, H);
  }
  return json({ error: "bad_action" }, 400, H);
}

export async function onRequestGet({ request, env }) {
  const u = new URL(request.url);
  const D = await db(env);
  await bang(D);
  const phien = await phienHienTai(D);
  if (!u.searchParams.get("id")) return json({ phien: phien ? { id: phien.id, ten: phien.ten } : null, thoiGian: THOI_GIAN, now: Date.now() }, 200, H);
  const r = await lay(D, u.searchParams.get("id"), u.searchParams.get("token"));
  if (!r) return json({ error: "not_found" }, 404, H);
  return json(trangThai(r, phien), 200, H);
}
