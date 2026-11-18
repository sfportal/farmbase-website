// Kiến thức nền cho chatbot Fanpage FarmBase. Chỉ ghi dữ kiện đã được phép công bố (theo CLAUDE.md).
// Muốn bổ sung mà không sửa code: vào trang quản lý › Hộp thư Fanpage › "Kiến thức bổ sung".
export const KB = `
# FarmBase là gì
- FarmBase là nền tảng số hóa vùng trồng và truy xuất nguồn gốc nông sản. Giải pháp FarmBase do BVI và Salefronts đồng phát triển; Công ty CP BVI vận hành và triển khai.
- Tagline: "Dữ liệu vườn trồng, minh bạch từ gốc".
- Bắt đầu từ sầu riêng, mở rộng sang cà phê và các cây ăn trái chủ lực khác.
- Một nền tảng, hai giao diện:
  - Trang quản lý web (app.farmbase.vn) cho doanh nghiệp, HTX, tổ hợp tác, địa phương. Tài khoản do quản trị FarmBase cấp.
  - Zalo Mini App "FarmBase" cho bà con nông dân: không cần cài, mở trong Zalo hoặc quét QR, đăng nhập bằng số điện thoại Zalo.

# Tính năng chính
- Bà con ghi nhật ký canh tác ngay trên Zalo: ngày, giai đoạn, sâu bệnh, phân thuốc chọn từ danh mục (có hoạt chất, liều lượng, thời gian cách ly), chụp ảnh bao bì phân thuốc. Người thân được ủy quyền ghi giúp.
- HTX, doanh nghiệp: quản lý vùng trồng, lô đất, nông hộ; nhập tọa độ là tự ra số tờ, số thửa; nhập và xuất hàng loạt bằng Excel; theo dõi thu hoạch; thư viện ảnh, tài liệu, video của vùng; bản đồ ranh lô trên ảnh vệ tinh.
- Mã QR vùng trồng và QR từng lô; người mua quét là xem được trang truy xuất, không cần tài khoản.
- Tài khoản địa phương để UBND xã theo dõi, hậu kiểm.
- Ảnh sổ đỏ, CCCD chỉ phục vụ hồ sơ, không hiển thị công khai.
- Dữ liệu thuộc quyền sở hữu chủ thể sản xuất, có thể xuất, sao lưu, chuyển đổi; không khóa dữ liệu.

# Kết nối quốc gia và lộ trình
- Đã kết nối Hệ thống truy xuất nguồn gốc nông sản của Bộ Nông nghiệp và Môi trường từ 01/07/2026. Việc đồng bộ nhật ký chỉ áp dụng cho vùng đã có mã số vùng trồng.
- GS1 Việt Nam và module cơ sở đóng gói (SKU, tem QR): dự kiến 11/2026, chưa phải tính năng đang vận hành.

# Mã số vùng trồng (MSVT)
- Việc cấp mã số vùng trồng thuộc thẩm quyền cơ quan quản lý nhà nước; BVI hỗ trợ kỹ thuật, hồ sơ và vận hành hệ thống truy xuất.
- Nhật ký canh tác ghi đúng, đủ, kịp thời là bằng chứng để giữ mã vùng trồng khi hậu kiểm. Một hộ ghi thiếu hoặc dùng sai thuốc có thể khiến cả vùng bị cảnh báo.
- Vườn bà con tự tạo trên Zalo Mini App là điểm sản xuất cá nhân, không tự động thuộc một mã vùng trồng.

# Số liệu được phép nói (số liệu ngày 28/10/2026)
- Trên 1.500 nông hộ, khoảng 1.600 ha, 66 vùng trồng trên FarmBase tại Đắk Lắk.
- Khoảng 3.000 lượt nông hộ đã được tập huấn, hướng dẫn.

# Chiến dịch 10.000 ha
- Chiến dịch 10.000 ha cây trồng chủ lực niên vụ 2026–2027 của HTX DaLa và BVI là một đề xuất; mọi con số là mục tiêu, không phải kết quả. Xem thêm: farmbase.vn/chien-dich-10000ha

# Liên hệ
- BVI: Mrs Ngọc · 0911 423 839 (Zalo) · info@bvi.vn
- HTX DaLa: 0917 202 527 · htxdala.vn · htxdala@gmail.com
- Website: farmbase.vn (có form để lại thông tin tư vấn ở trang Liên hệ)
`;
