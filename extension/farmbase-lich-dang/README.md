# Extension Chrome: FarmBase · Lịch đăng Facebook

Lên kế hoạch và lên lịch đăng bài Fanpage từ nội dung website FarmBase (bài viết, đối tác, các trang chính) và tư liệu ảnh, video trong một thư mục Google Drive. Lịch lưu trên website (D1) nên cả nhóm dùng chung.

## Cài đặt (5 phút)
1. **Trên website** (trang quản lý → Kết nối và cài đặt → *Lên lịch đăng Facebook · Extension*):
   - Dán link thư mục Google Drive chứa tư liệu → **Lưu thư mục**. Thư mục phải chia sẻ "Bất kỳ ai có đường liên kết đều xem được".
   - Bấm **Tạo khóa mới**, chép khóa `fbk_…` (chỉ hiện một lần).
2. **Trên Chrome**: mở `chrome://extensions` → bật *Chế độ dành cho nhà phát triển* → **Tải tiện ích đã giải nén** → chọn thư mục `extension/farmbase-lich-dang`.
3. Bấm biểu tượng extension → tab **Cài đặt** → nhập địa chỉ website (`https://farmbase.vn` hoặc địa chỉ `…workers.dev`) và khóa API → **Lưu và kiểm tra kết nối**.

## Dùng hằng ngày
- **Nội dung website**: tìm bài viết, đối tác, trang → *Soạn bài từ đây* (tự điền tiêu đề, tóm tắt, link, hashtag, ảnh bìa).
- **Kho Drive**: bấm ảnh, video để thêm vào bài (tối đa 10 ảnh hoặc 1 video). *Mở thư mục để tải tư liệu lên* để thêm tư liệu mới.
- **Lịch đăng**: lịch tháng, bấm vào ngày để soạn bài cho ngày đó, bấm vào bài để sửa.
- **Đăng bài**: đến giờ Chrome hiện thông báo; bấm vào để mở màn hình đăng: sao chép nội dung, tải tư liệu về máy, mở Facebook, rồi *Đánh dấu đã đăng*. Chrome cần đang mở lúc đến giờ (nếu tắt, bài quá giờ hiện ở mục *Cần làm* và số đỏ trên biểu tượng).

Không cần mã Facebook (Graph API) hay khóa Google: website đọc thư mục Drive qua chế độ chia sẻ công khai.

## API dành cho extension
Gửi kèm header `Authorization: Bearer fbk_…`. Trả CORS cho trang `chrome-extension://`.
- `GET /api/social/status`: kiểm tra khóa, thư mục Drive.
- `GET /api/social/feed`: bài viết đã đăng và sắp đăng, đối tác, các trang chính (link tuyệt đối, ảnh bìa).
- `GET /api/social/drive[?folder=<mã thư mục con>]`: ảnh, video trong thư mục Drive.
- `GET|POST|PUT|DELETE /api/social/plans`: lịch đăng.
