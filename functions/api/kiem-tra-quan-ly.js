// Quản lý bài kiểm tra quy trình mã số vùng trồng: xem bài nộp, đáp án, chấm tình huống. Vào bằng mã PIN (header X-Pin).
// PIN lấy từ biến KIEMTRA_PIN trên Cloudflare, chưa đặt thì dùng mã mặc định công ty đã chốt.
import { db, json, clip } from "../_lib.js";
import { bang, phienHienTai, DAP_AN, GIAI_THICH, Y_CHAM, TU_CHAM, TINH_HUONG, DIEM_TN, THOI_GIAN } from "../_kiemtra.js";

const H = { "cache-control": "no-store", "x-robots-tag": "noindex, nofollow" };
const SLUG = "kiemtra-msvt";

// Chặn dò PIN: tối đa 10 lần sai mỗi 15 phút cho một địa chỉ
async function kiemPin(D, request, env) {
  const ip = request.headers.get("cf-connecting-ip") || "local", now = Date.now();
  const t = await D.prepare("SELECT COUNT(*) n FROM pass_tries WHERE slug=? AND ip=? AND ts>?").bind(SLUG, ip, now - 15 * 60000).first();
  if (t && t.n >= 10) return json({ error: "too_many" }, 429, H);
  const want = String(env.KIEMTRA_PIN || "123321"), got = String(request.headers.get("x-pin") || "");
  let d = got.length ^ want.length;
  for (let i = 0; i < want.length; i++) d |= (got.charCodeAt(i) || 0) ^ want.charCodeAt(i);
  if (d !== 0) {
    await D.batch([D.prepare("INSERT INTO pass_tries (ip,slug,ts) VALUES (?,?,?)").bind(ip, SLUG, now), D.prepare("DELETE FROM pass_tries WHERE ts<?").bind(now - 86400000)]);
    return json({ error: "wrong_pin" }, 401, H);
  }
  return null;
}

const P = (s) => { try { return JSON.parse(s || "null"); } catch { return null; } };

export async function onRequestPost({ request, env }) {
  const D = await db(env);
  await bang(D);
  const bad = await kiemPin(D, request, env);
  if (bad) return bad;
  let b = {};
  try { b = await request.json(); } catch { /* không có thân */ }
  const hienTai = await phienHienTai(D);
  const { results: phiens } = await D.prepare("SELECT p.*, (SELECT COUNT(*) FROM kiemtra_bai k WHERE k.phien_id=p.id AND k.nop_luc IS NOT NULL) so_bai FROM kiemtra_phien p ORDER BY p.id DESC").all();
  const phienId = Number(b.phien) || (hienTai && hienTai.id) || (phiens[0] && phiens[0].id) || 0;
  const { results } = await D.prepare("SELECT * FROM kiemtra_bai WHERE phien_id=? OR (phien_id IS NULL AND ?=(SELECT MIN(id) FROM kiemtra_phien)) ORDER BY COALESCE(nop_luc, bat_dau) DESC LIMIT 500").bind(phienId, phienId).all();
  const bai = results.map((r) => ({
    id: r.id, hoTen: r.ho_ten, batDau: r.bat_dau, nopLuc: r.nop_luc, giay: r.giay, hetGio: !!r.het_gio,
    tn: P(r.tn), tl: P(r.tl), diemTN: r.diem_tn, diemTungCau: P(r.diem_tung_cau), diemTL: r.diem_tl, tong: r.tong,
    nhanXet: r.nhan_xet, chamLuc: r.cham_luc, tuCham: P(r.tu_cham),
  }));
  const tuCham = Object.fromEntries(Object.entries(TU_CHAM).map(([k, ys]) => [k, ys.map((y) => ({ y: y.y, d: y.d }))]));
  return json({ bai, phienId, phienMo: hienTai ? hienTai.id : null, phiens: phiens.map((p) => ({ id: p.id, ten: p.ten, taoLuc: p.tao_luc, dangMo: !!p.dang_mo, soBai: p.so_bai })), tuCham, dapAn: DAP_AN, giaiThich: GIAI_THICH, yCham: Y_CHAM, tinhHuong: TINH_HUONG, diemTN: DIEM_TN, thoiGian: THOI_GIAN, now: Date.now() }, 200, H);
}

export async function onRequestPatch({ request, env }) {
  const D = await db(env);
  await bang(D);
  const bad = await kiemPin(D, request, env);
  if (bad) return bad;
  let b;
  try { b = await request.json(); } catch { return json({ error: "bad_json" }, 400, H); }
  const r = await D.prepare("SELECT * FROM kiemtra_bai WHERE id=?").bind(Number(b.id) || 0).first();
  if (!r || !r.nop_luc) return json({ error: "not_found" }, 404, H);
  const per = {};
  let tl = 0;
  for (const [k, max] of Object.entries(TINH_HUONG)) {
    const v = Number(b.diemTungCau && b.diemTungCau[k]);
    if (!Number.isFinite(v) || v < 0 || v > max) return json({ error: "bad_score", cau: k }, 422, H);
    per[k] = Math.round(v * 2) / 2;
    tl += per[k];
  }
  const tong = (r.diem_tn || 0) + tl;
  await D.prepare("UPDATE kiemtra_bai SET diem_tung_cau=?, diem_tl=?, tong=?, nhan_xet=?, cham_luc=? WHERE id=?")
    .bind(JSON.stringify(per), tl, tong, clip(String(b.nhanXet || "").trim(), 1000), Date.now(), r.id).run();
  return json({ ok: true, diemTL: tl, tong }, 200, H);
}

// Xóa một bài (ví dụ bài làm thử): DELETE ?id=
export async function onRequestDelete({ request, env }) {
  const D = await db(env);
  await bang(D);
  const bad = await kiemPin(D, request, env);
  if (bad) return bad;
  const id = Number(new URL(request.url).searchParams.get("id")) || 0;
  await D.prepare("DELETE FROM kiemtra_bai WHERE id=?").bind(id).run();
  return json({ ok: true }, 200, H);
}

// Phiên làm bài: PUT {action:"phien-moi", ten} mở phiên mới (đóng phiên cũ), {action:"dong"} đóng phiên đang mở, {action:"mo", id} mở lại một phiên
export async function onRequestPut({ request, env }) {
  const D = await db(env);
  await bang(D);
  const bad = await kiemPin(D, request, env);
  if (bad) return bad;
  let b;
  try { b = await request.json(); } catch { return json({ error: "bad_json" }, 400, H); }
  if (b.action === "phien-moi") {
    const n = await D.prepare("SELECT COUNT(*) n FROM kiemtra_phien").first();
    const ten = clip(String(b.ten || "").trim(), 80) || `Phiên ${(n?.n || 0) + 1}`;
    await D.prepare("UPDATE kiemtra_phien SET dang_mo=0").run();
    const r = await D.prepare("INSERT INTO kiemtra_phien (ten,tao_luc,dang_mo) VALUES (?,?,1)").bind(ten, Date.now()).run();
    return json({ ok: true, id: r.meta?.last_row_id, ten }, 200, H);
  }
  if (b.action === "dong") { await D.prepare("UPDATE kiemtra_phien SET dang_mo=0").run(); return json({ ok: true }, 200, H); }
  if (b.action === "mo") {
    await D.batch([D.prepare("UPDATE kiemtra_phien SET dang_mo=0"), D.prepare("UPDATE kiemtra_phien SET dang_mo=1 WHERE id=?").bind(Number(b.id) || 0)]);
    return json({ ok: true }, 200, H);
  }
  return json({ error: "bad_action" }, 400, H);
}
