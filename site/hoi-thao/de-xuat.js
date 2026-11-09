// Bộ đề xuất dự phòng (không cần AI): dùng khi chưa có API key hoặc AI lỗi.
// Dùng chung cho trang khách (chạy trên trình duyệt) và hàm máy chủ.
const VIEC = {
  "tra-loi-khach": { ten: "Trả lời khách Zalo/Facebook", qt: "Trợ lý AI trả lời khách theo dữ liệu công ty", truoc: "Nhân viên trả lời từng tin, khách chờ lâu, ngoài giờ không ai trực", sau: "AI soạn sẵn câu trả lời đúng giá, đúng chính sách trong vài giây, người duyệt bấm gửi", gio: 6, cong_cu: "Tiện ích Zalo #FBA + kho kiến thức công ty" },
  "noi-dung": { ten: "Soạn nội dung, bài đăng", qt: "Dây chuyền nội dung tự động", truoc: "Mỗi bài đăng mất 1–2 giờ nghĩ ý, viết, tìm ảnh", sau: "AI lên lịch tháng, viết bài theo giọng thương hiệu, gợi ý ảnh và clip ngắn", gio: 5, cong_cu: "Claude Project + Skill giọng văn riêng" },
  "bao-gia": { ten: "Báo giá, hợp đồng", qt: "Báo giá và hợp đồng 1 chạm", truoc: "Copy file cũ, sửa tay từng con số, dễ sai tên và giá", sau: "Nhập nhu cầu khách, AI ra báo giá và hợp đồng đúng mẫu, đúng bảng giá", gio: 4, cong_cu: "Webtool báo giá + Skill hợp đồng" },
  "bao-cao": { ten: "Báo cáo Excel", qt: "Báo cáo tự tổng hợp", truoc: "Cuối tuần gom số liệu nhiều file, làm báo cáo thủ công", sau: "AI đọc file Excel/Google Sheets, tự ra báo cáo và nhận xét điểm bất thường", gio: 4, cong_cu: "Connector Drive/Excel + mẫu báo cáo" },
  "tai-lieu": { ten: "Tổng hợp tài liệu, biên bản họp", qt: "Thư ký AI", truoc: "Ghi chép họp, tóm tắt tài liệu dài mất nhiều giờ", sau: "AI tóm tắt, lập biên bản, giao việc kèm hạn chót ngay sau buổi họp", gio: 3, cong_cu: "Claude + connector Gmail, Drive" },
  "cham-soc": { ten: "Chăm sóc khách, nhắc lịch", qt: "Chăm sóc khách tự động", truoc: "Quên gọi lại khách, quên nhắc lịch hẹn, mất đơn", sau: "AI phân loại khách, nhắc việc theo lịch, soạn tin chăm sóc cá nhân hoá", gio: 3, cong_cu: "Webtool CRM nhỏ + nhắc việc Zalo" },
  "ho-so": { ten: "Quản lý hồ sơ, văn bản", qt: "Kho hồ sơ thông minh", truoc: "Tìm một văn bản phải lục nhiều thư mục, nhiều người hỏi lại", sau: "Hỏi bằng tiếng Việt, AI tìm đúng hồ sơ và trích đúng đoạn cần", gio: 3, cong_cu: "Kho tài liệu + trợ lý tra cứu" },
  "nhan-su": { ten: "Tuyển dụng, đào tạo", qt: "Trợ lý nhân sự", truoc: "Viết tin tuyển, lọc hồ sơ, đào tạo người mới lặp đi lặp lại", sau: "AI viết tin tuyển, lọc CV theo tiêu chí, trả lời câu hỏi người mới theo quy trình", gio: 2, cong_cu: "Skill nhân sự + sổ tay quy trình" },
  "ban-online": { ten: "Website, bán hàng online", qt: "Website bán hàng có AI", truoc: "Chưa có website hoặc website cũ, khách không tìm thấy", sau: "Website nhanh, chuẩn điện thoại, nút Zalo, AI viết mô tả sản phẩm và bài SEO", gio: 2, cong_cu: "Website + nội dung SEO bằng AI" }
};
const GOI = {
  "AI Khởi động": { gia: "4.900.000đ", pham_vi: "1 bài toán, Project + Skill riêng, hướng dẫn dùng", thoi_gian: "3–5 ngày" },
  "AI Đội nhóm": { gia: "từ 14.900.000đ", pham_vi: "Tối ưu 2–3 công việc lặp lại, connector Gmail/Drive/Excel, đào tạo đội 3–5 người", thoi_gian: "2 tuần" },
  "AI Công ty": { gia: "từ 24.900.000đ", pham_vi: "Khảo sát các phòng ban, bộ công cụ AI từng phòng, webtool và tiện ích Zalo riêng, đào tạo toàn công ty", thoi_gian: "3–4 tuần" }
};
function goiTheo(quy_mo, soViec) {
  if (quy_mo === "30+" || quy_mo === "10-30") return soViec >= 2 ? "AI Công ty" : "AI Đội nhóm";
  if (quy_mo === "3-9") return soViec >= 2 ? "AI Đội nhóm" : "AI Khởi động";
  return soViec >= 3 ? "AI Đội nhóm" : "AI Khởi động";
}
function xung(f) {
  const ten = (f.ho_ten || "").trim().split(/\s+/).pop() || "anh/chị";
  return ten;
}
function mauThu(f, viec) {
  const ct = f.cong_ty || "doanh nghiệp của anh/chị";
  const lv = (f.linh_vuc || "").toLowerCase();
  switch (viec) {
    case "tra-loi-khach": return { tieu_de: "Tin trả lời khách AI soạn thử", noi_dung: `Dạ chào anh/chị, em là trợ lý của ${ct} ạ. Cảm ơn anh/chị đã quan tâm! Để em báo đúng giá và thời gian giao, anh/chị cho em xin số lượng cần và khu vực nhận hàng nhé. Trong hôm nay bên em có ưu đãi cho khách đặt sớm, em giữ suất cho anh/chị luôn ạ.` };
    case "bao-gia": return { tieu_de: "Email báo giá AI soạn thử", noi_dung: `Kính gửi Quý khách,\n${ct} trân trọng gửi báo giá theo nhu cầu đã trao đổi. Báo giá gồm: hạng mục, đơn giá, thời gian thực hiện và điều khoản thanh toán 50/50. Báo giá có hiệu lực 15 ngày. Quý khách cần điều chỉnh hạng mục nào, vui lòng phản hồi để chúng tôi cập nhật trong ngày.\nTrân trọng.` };
    case "bao-cao": return { tieu_de: "Nhận xét báo cáo AI viết thử", noi_dung: `Tuần này doanh thu tăng 12% so với tuần trước, chủ yếu nhờ nhóm khách cũ quay lại. Cần lưu ý: 3 đơn quá hạn giao trên 2 ngày, chi phí vận chuyển tăng 8%. Đề xuất: gọi lại 3 khách trễ đơn trong hôm nay và rà lại giá vận chuyển với đối tác.` };
    case "cham-soc": return { tieu_de: "Tin chăm sóc khách AI soạn thử", noi_dung: `Chào anh/chị, ${ct} xin hỏi thăm sản phẩm anh/chị dùng tháng trước có ổn không ạ? Nếu cần hỗ trợ gì, anh/chị nhắn em ngay nhé. Tuần này bên em có quà tri ân cho khách quen, em gửi anh/chị chi tiết nha.` };
    default: return { tieu_de: "Bài đăng Facebook AI viết thử", noi_dung: `🌱 ${ct}${lv ? " – " + f.linh_vuc : ""}: làm thật, nói thật, phục vụ tận tâm.\nMỗi sản phẩm, mỗi dịch vụ đến tay khách hàng đều qua quy trình kiểm tra kỹ lưỡng. Chúng tôi tin rằng uy tín được xây từ những việc nhỏ làm đúng mỗi ngày.\n📞 Nhắn Zalo để được tư vấn miễn phí trong 5 phút!` };
  }
}
function deXuatDuPhong(f) {
  let viec = (f.cong_viec_lap_lai || []).filter(k => VIEC[k]);
  const mt = (f.mo_ta_nhu_cau || "").toLowerCase();
  const tuKhoa = [["zalo","tra-loi-khach"],["khách hỏi","tra-loi-khach"],["inbox","tra-loi-khach"],["bài đăng","noi-dung"],["nội dung","noi-dung"],["facebook","noi-dung"],["báo giá","bao-gia"],["hợp đồng","bao-gia"],["báo cáo","bao-cao"],["excel","bao-cao"],["họp","tai-lieu"],["tài liệu","tai-lieu"],["hồ sơ","ho-so"],["tuyển","nhan-su"],["website","ban-online"]];
  for (const [k, v] of tuKhoa) if (mt.includes(k) && !viec.includes(v)) viec.push(v);
  if (!viec.length) viec = ["noi-dung", "tra-loi-khach"];
  for (const k of ["noi-dung", "cham-soc", "tai-lieu", "bao-cao"]) if (viec.length < 3 && !viec.includes(k)) viec.push(k);
  const chon = viec.slice(0, 3);
  const nguoi = { "1-2": 1, "3-9": 3, "10-30": 6, "30+": 10 }[f.quy_mo] || 1;
  const quy_trinh = chon.map(k => { const v = VIEC[k]; return { ten: v.qt, viec: v.ten, truoc: v.truoc, sau: v.sau, gio_tiet_kiem_tuan: Math.round(v.gio * Math.min(nguoi, 4) * (nguoi > 1 ? 0.6 : 1)) || v.gio, cong_cu: v.cong_cu }; });
  const tongTuan = quy_trinh.reduce((s, q) => s + q.gio_tiet_kiem_tuan, 0);
  const goi = goiTheo(f.quy_mo, (f.cong_viec_lap_lai || []).length || 1);
  let diem = 40 + Math.min(viec.length, 4) * 8 + ({ "ngay": 25, "1-3-thang": 12 }[f.thoi_diem] || 0) + ({ "10-30": 10, "30+": 12, "3-9": 6 }[f.quy_mo] || 0) + (f.email ? 3 : 0);
  diem = Math.min(diem, 98);
  return {
    chao: `Chào ${xung(f)}, đây là bản đề xuất AI dành riêng cho ${f.cong_ty || "anh/chị"}.`,
    chan_doan: `Với ${f.linh_vuc ? "lĩnh vực " + f.linh_vuc : "công việc hiện tại"} và quy mô ${f.quy_mo === "1-2" ? "cá nhân, nhóm nhỏ" : (f.quy_mo || "?") + " người"}, phần thời gian bị lặp lại nhiều nhất nằm ở: ${chon.map(k => VIEC[k].ten.charAt(0).toLowerCase() + VIEC[k].ten.slice(1)).join("; ")}. Đây là những việc AI làm tốt nhất: có mẫu, có dữ liệu, lặp lại hằng ngày.`,
    quy_trinh,
    gio_tiet_kiem_thang: tongTuan * 4,
    goi_de_xuat: goi,
    ly_do_goi: `${GOI[goi].pham_vi}. Phù hợp với ${chon.length} việc anh/chị đã chọn và quy mô hiện tại.`,
    gia: GOI[goi].gia,
    thoi_gian: GOI[goi].thoi_gian,
    lo_trinh: ["Khảo sát 30 phút qua Zalo hoặc tại văn phòng, lấy mẫu dữ liệu thật", "Dựng bản chạy thử trên chính dữ liệu của anh/chị, duyệt từng bước", "Bàn giao, đào tạo đội ngũ, theo dõi và tinh chỉnh tháng đầu"],
    mau_thu: mauThu(f, chon[0]),
    diem_tiem_nang: diem
  };
}
export { deXuatDuPhong, VIEC, GOI };
