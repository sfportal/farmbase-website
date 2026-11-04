// Bài kiểm tra quy trình mã số vùng trồng (trang /kiem-tra-msvt/): đáp án, ý chấm tình huống, bảng lưu bài.
// Đáp án chỉ nằm ở máy chủ, trang làm bài không tải được.

export const THOI_GIAN = 300; // 5 phút
export const DIEM_TN = 6; // mỗi câu trắc nghiệm
export const TINH_HUONG = { e1: 15, e2: 10, e3: 15 }; // điểm tối đa từng câu

export const DAP_AN = { q1: "c", q2: "b", q3: "a", q4: "d", q5: "a", q6: "a", q7: "b", q8: "d", q9: "b", q10: "d" };

export const GIAI_THICH = {
  q1: "Cổng 1 (A2, Bước 1): hình thức đứng mã quyết định ai ký, ai trả tiền, ai duy trì, trái bán cho ai. Chốt bằng biên bản có chữ ký các hộ, không thỏa thuận miệng (D2).",
  q2: "A4: T+30 nộp hồ sơ online trên Cổng Dịch vụ công, KPI không quá 30 ngày từ T.",
  q3: "Bước 6: nộp UBND xã nơi có vùng trồng qua Cổng Dịch vụ công quốc gia.",
  q4: "Bước 4: chỉ thu khi THT nông dân đứng mã (15 triệu, có phiếu thu). HT1 đã thu 50% từ đơn vị đứng mã trước khi triển khai; HT3 theo thỏa thuận riêng.",
  q5: "Phần D nguyên tắc 1: chốt sổ lần 1 trước sự kiện ký 5 ngày, lần 2 trước xã kiểm tra 3 ngày.",
  q6: "D3 và A6 bản 2.0: hộ vắng không còn là lý do xuống thêm buổi. Người thân ký thay phải có giấy ủy quyền.",
  q7: "Phần C và HT7: hệ thống là nguồn dữ liệu duy nhất, không sửa tay trên giấy. Hồ sơ tách 2 phần nên chỉ in lại phần bị ảnh hưởng.",
  q8: "HT9: Thư viện vùng hiện công khai khi quét QR. Tuyệt đối không tải CCCD, sổ đỏ, danh sách có SĐT.",
  q9: "A6: mã mới 3 buổi (B2, B4, B5). Buổi phát sinh không lý do chính đáng thì tự chịu chi phí, trừ 5 điểm % KPI (mức trừ đang là đề xuất).",
  q10: "HT4: vườn bà con tự tạo là điểm sản xuất cá nhân; vườn trong mã do nhóm thu thập tạo trong vùng đã tạo sẵn.",
};

export const Y_CHAM = {
  e1: [
    "Không hoãn cả vùng: mặc định cổng 2 là đủ 100% giấy tờ, nhưng cả 3 hộ đều rơi vào 2 ngoại lệ (3 điểm)",
    "Hộ thế chấp = Ngoại lệ 1 (kẹt thật): đại diện mã ký cam kết hộ mang đủ giấy tờ đến buổi, nộp ở bàn 3, đối chiếu trên app rồi mới ký (3 điểm)",
    "2 hộ sợ mất đất = Ngoại lệ 2: dành mục giải thích tại buổi (không ảnh hưởng quyền sử dụng đất, ảnh sổ chỉ dùng cho hồ sơ, không công khai) rồi ký luôn (3 điểm)",
    "Đại diện mã phải ký cam kết theo mẫu tối thiểu; hộ nào không đáp ứng trong buổi thì loại khỏi đợt, chuyển đợt bổ sung, đợt chính vẫn nộp (4 điểm)",
    "Nếu đại diện mã không chịu ký cam kết hoặc thiếu nhiều đến mất quy mô thì mới chưa tổ chức Bước 4 (2 điểm)",
  ],
  e2: [
    "Không hứa ngày: cấp mã do cơ quan nhà nước và phía Trung Quốc quyết định; công ty hỗ trợ hồ sơ, kỹ thuật (4 điểm)",
    "Nói được tiến độ đang ở bước nào, việc tiếp theo; mã nội địa thường 10–15 ngày sau khi nộp nhưng chỉ là kinh nghiệm, không cam kết; mã GACC không ấn định được (3 điểm)",
    "Hướng bà con vào việc của mình trong lúc chờ: ghi nhật ký đều trên FarmBase, dùng thuốc đúng quy định (2 điểm)",
    "Ngắn gọn, lịch sự, đúng kiểu tin nhắn nhóm; không đăng chi phí đại diện mã hay thông tin cá nhân (1 điểm). Trừ nặng nếu hứa ngày hoặc hứa bồi thường.",
  ],
  e3: [
    "Gom TẤT CẢ yêu cầu của xã vào một biên bản, sửa một lần, ký lại một lần, không sửa nhỏ giọt (3 điểm)",
    "Người đi cùng đoàn chụp biên bản gửi người phụ trách vùng (chị Mẫn) sửa trên hệ thống và xuất lại trong ngày; in tại xã hoặc mang đến trong 24 giờ (3 điểm)",
    "Hộ tranh chấp: gỡ khỏi vùng, chỉ xuất lại phần tổng, các hộ khác không ký lại nhờ hồ sơ tách 2 phần. 2 hộ sửa diện tích ký lại tại chỗ hoặc tổ trưởng mang đi ký trong 2 ngày, không xuống thêm buổi (4 điểm)",
    "Hộ mới: đã qua chốt sổ lần 2 nên ghi phiếu đăng ký, vào danh sách chờ, làm đợt bổ sung; không làm chậm đợt chính (3 điểm)",
    "Đơn vị đứng mã (HT1) ký phần tổng một lần sau cùng; Cổng 3: chỉ nộp khi xã xác nhận và rà chéo không lệch số liệu (2 điểm)",
  ],
};

export function chamTN(tn) {
  let d = 0;
  for (const [k, v] of Object.entries(DAP_AN)) if (tn && tn[k] === v) d += DIEM_TN;
  return d;
}


// Tự chấm sơ bộ câu tình huống: mỗi ý có danh sách cụm từ (viết không dấu), câu trả lời có một cụm là được điểm ý đó.
// Chỉ là điểm gợi ý để quản lý xem nhanh; quản lý chấm lại thì điểm quản lý thay thế.
export const TU_CHAM = {
  e1: [
    { y: "Không hoãn cả vùng", d: 3, k: ["khong hoan", "khong nen hoan", "khong dong y hoan", "van to chuc", "van tap huan", "dung lich", "giu lich", "khong doi"] },
    { y: "Đại diện mã ký cam kết", d: 4, k: ["cam ket"] },
    { y: "Giải thích cho hộ lo về sổ đỏ", d: 3, k: ["giai thich", "khong anh huong", "quyen su dung", "khong cong khai", "bao mat", "yen tam", "khong mat dat"] },
    { y: "Hộ không đáp ứng thì loại, chuyển đợt sau", d: 3, k: ["loai", "dot sau", "dot bo sung", "tach", "chuyen dot", "dot 2"] },
    { y: "Ngoại lệ, nộp bổ sung tại buổi", d: 2, k: ["ngoai le", "ban 3", "mang theo", "tai buoi", "trong buoi", "nop bo sung", "bo sung tai"] },
  ],
  e2: [
    { y: "Không hứa, không cam kết ngày", d: 4, k: ["khong hua", "chua hua", "khong cam ket", "chua cam ket", "khong the cam ket", "khong hen", "khong dam bao", "chua the noi chinh xac", "khong biet chinh xac"] },
    { y: "Do nhà nước và phía Trung Quốc quyết định", d: 3, k: ["nha nuoc", "trung quoc", "gacc", "co quan", "phia tq", "hai quan"] },
    { y: "Nêu tiến độ, mốc tham khảo", d: 1, k: ["10", "15 ngay", "tien do", "buoc", "ma noi dia", "nop ho so", "dang lam"] },
    { y: "Hướng bà con ghi nhật ký, làm đúng quy định", d: 2, k: ["nhat ky", "farmbase", "ghi chep", "dung thuoc", "quy dinh"] },
  ],
  e3: [
    { y: "Gom một biên bản, sửa một lần", d: 3, k: ["mot lan", "1 lan", "gom", "mot bien ban", "1 bien ban", "cung luc"] },
    { y: "Sửa trên hệ thống, xuất lại trong ngày", d: 3, k: ["he thong", "farmbase", "xuat lai", "trong ngay", "24 gio", "24h", "app"] },
    { y: "Hộ bị loại: chỉ in lại phần tổng, hộ khác không ký lại", d: 4, k: ["phan tong", "khong ky lai", "khong phai ky lai", "go ", "go khoi", "bo ho", "loai ho", "2 phan", "hai phan"] },
    { y: "Hộ mới vào danh sách chờ, đợt bổ sung", d: 3, k: ["danh sach cho", "dot bo sung", "dot sau", "dot 2", "bo sung sau", "lan sau"] },
    { y: "Tổ trưởng, đại diện mã đưa ký; đơn vị đứng mã ký phần tổng cuối", d: 2, k: ["to truong", "dai dien ma", "sau cung", "don vi dung ma", "doanh nghiep ky", "ky mot lan"] },
  ],
};
const khongDau = (t) => String(t || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d").replace(/\s+/g, " ");
export function chamTL(tl) {
  const per = {}, khop = {};
  for (const [cau, ys] of Object.entries(TU_CHAM)) {
    const t = " " + khongDau(tl && tl[cau]) + " ";
    per[cau] = 0; khop[cau] = [];
    if (t.trim().length < 15) continue; // trả lời quá ngắn
    ys.forEach((y, i) => { if (y.k.some((k) => t.includes(k))) { per[cau] += y.d; khop[cau].push(i); } });
  }
  return { per, khop, tong: Object.values(per).reduce((a, b) => a + b, 0) };
}

// Phiên làm bài: quản lý tạo phiên mới để mọi người làm lại từ đầu; bài mở mới luôn vào phiên đang mở.
export async function phienHienTai(D) {
  let p = await D.prepare("SELECT * FROM kiemtra_phien WHERE dang_mo=1 ORDER BY id DESC LIMIT 1").first();
  if (!p) {
    const any = await D.prepare("SELECT COUNT(*) n FROM kiemtra_phien").first();
    if (!any || !any.n) {
      const r = await D.prepare("INSERT INTO kiemtra_phien (ten,tao_luc,dang_mo) VALUES (?,?,1)").bind("Phiên 1", Date.now()).run();
      p = { id: r.meta?.last_row_id, ten: "Phiên 1", dang_mo: 1 };
    }
  }
  return p || null;
}

let ready = false;
export async function bang(D) {
  if (ready) return;
  await D.batch([
    D.prepare(`CREATE TABLE IF NOT EXISTS kiemtra_bai (
      id INTEGER PRIMARY KEY AUTOINCREMENT, token TEXT NOT NULL, ho_ten TEXT NOT NULL,
      bat_dau INTEGER NOT NULL, nop_luc INTEGER, giay INTEGER, het_gio INTEGER DEFAULT 0,
      tn TEXT, tl TEXT, diem_tn INTEGER, diem_tung_cau TEXT, diem_tl INTEGER, tong INTEGER,
      nhan_xet TEXT, cham_luc INTEGER, ip TEXT)`),
    D.prepare(`CREATE INDEX IF NOT EXISTS idx_kiemtra_bd ON kiemtra_bai(bat_dau)`),
    D.prepare(`CREATE TABLE IF NOT EXISTS kiemtra_phien (id INTEGER PRIMARY KEY AUTOINCREMENT, ten TEXT, tao_luc INTEGER, dang_mo INTEGER DEFAULT 1)`),
  ]);
  for (const m of ["ALTER TABLE kiemtra_bai ADD COLUMN phien_id INTEGER", "ALTER TABLE kiemtra_bai ADD COLUMN tu_cham TEXT"]) {
    try { await D.prepare(m).run(); } catch (e) { /* đã có cột */ }
  }
  ready = true;
}
