# Bàn giao website FarmBase (cập nhật 09/11/2026)

## Bắt đầu với một tài khoản Claude khác
1. Mở Claude Code trên web, kết nối GitHub và chọn repo `uyducminh/farmbase-website`.
   - Tài khoản GitHub cần có quyền ghi vào repo. Nếu repo thuộc tài khoản khác, chủ repo thêm Quý khách làm cộng tác viên.
2. Nếu cần đọc hoặc sửa bài trong cơ sở dữ liệu, kết nối connector Cloudflare của tài khoản Cloudflare đang chạy website.
   - Không dán token vào chat.
3. Câu nhắn đầu tiên gợi ý:
   > Đọc CLAUDE.md và docs/BAN-GIAO.md rồi làm tiếp: [việc cần làm].

Claude sẽ tự biết cách sửa, dựng, kiểm tra và đưa lên website theo hướng dẫn trong `CLAUDE.md`.

## Trạng thái hiện tại
- farmbase.vn đang chạy bản trên `main` (commit "Menu 2 cấp", 07/11/2026).
- Giao diện đã làm mới trên tất cả các trang:
  - hero chuyển động;
  - menu 2 cấp;
  - Sự kiện dạng dòng thời gian;
  - Blog có bài nổi bật;
  - Nguồn hàng có hành trình lô hàng;
  - Đối tác có băng logo chạy;
  - trang chi tiết đối tác.
- Ba ngôn ngữ VI, EN và 中文 đã đủ cho phần giao diện.
  - Bản dịch chữ Trung cần người bản ngữ rà lại.

## Bài viết trong D1 (bảng `posts`), tất cả đang là bản nháp
| id | Mục | Tiêu đề |
|---|---|---|
| 1 | Hướng dẫn | Hướng dẫn ghi nhật ký canh tác trên Zalo Mini App FarmBase |
| 2 | Tin tức | Vùng trồng 07 Ea Kly… (**phải sửa trước khi đăng:** còn câu "100% nông hộ", trái quy tắc) |
| 3 | Tin tức | FarmBase kết nối Hệ thống truy xuất nguồn gốc Bộ NN&MT |
| 4 | Kiến thức | 6 lỗi hay gặp trong hồ sơ mã số vùng trồng sầu riêng |
| 5 | Kiến thức | Chuẩn bị điều kiện tại vườn cho mã số vùng trồng |
| 6 | Sự kiện | Chiến dịch 10.000 ha niên vụ 2026–2027 |
| 7 | Tin tức | Hiệp hội Sầu riêng Đắk Lắk dự diễn đàn về mã số vùng trồng (nguồn: fanpage Hiệp hội, 22/10/2026) |
| 8 | Kiến thức | Hồ sơ mã số vùng trồng được xử lý nhanh nhờ chuẩn bị trước: bài học từ Krông Pắc (nguồn: Báo NN&MT) |

- Bảng `content` (chữ sửa trong trang quản lý) và bảng `partners` đang trống. Vì vậy website dùng chữ gốc trong HTML và danh sách đối tác trong `site/data/partners.json`.

## Việc còn treo (chờ người dùng)
- Link truy xuất mẫu cho nút "Quét thử QR".
- Logo HTX: chỉ dùng khi đơn vị đã đồng ý.
- Mã Facebook Pixel (nhập trong trang quản lý › Cài đặt).
- Quyết định dùng Facebook Graph API hay không.
- Duyệt và đăng 8 bài nháp ở trên.

## Các luồng việc khác đang chạy song song
- Lên lịch đăng bài Facebook bằng extension, gồm API đọc nội dung website và liên kết Drive (PR riêng trên GitHub).
- MCP cho website, dùng lại API của luồng trên.
- Các nhánh `claude/*` trên GitHub là của những luồng đó. Trước khi sửa cùng file, kiểm tra PR đang mở để tránh đè nhau.

## Lưu ý khi làm trên Claude Code web
- Môi trường chặn truy cập facebook.com và một số báo. Khi cần đọc, dùng Chrome của người dùng (Claude in Chrome), sau khi người dùng đồng ý.
- Máy chủ thử `wrangler dev` thỉnh thoảng tự tắt. Chạy lại lệnh trong `CLAUDE.md` là được.
