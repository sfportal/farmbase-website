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
- **Cách đăng**:
  - *Nhắc tôi đăng tay* (mặc định): đến giờ Chrome hiện thông báo; bấm vào để mở màn hình đăng: sao chép nội dung, tải tư liệu về máy, mở Facebook, rồi *Đánh dấu đã đăng*. Chrome cần đang mở.
  - *Facebook tự hẹn giờ*: website gửi bài lên Fanpage qua Graph API với giờ hẹn; Facebook tự đăng kể cả khi tắt máy. Giờ hẹn từ 10 phút đến 29 ngày tới. Cần cài biến bên dưới.

## Biến môi trường trên Cloudflare (Worker `farmbase-website` → Settings → Variables and Secrets)
| Biến | Bắt buộc | Tác dụng |
|---|---|---|
| `GOOGLE_API_KEY` | Nên có | Khóa Google Cloud có bật *Google Drive API*. Có thì đọc được kích thước, thời lượng video, thư mục con được kiểm tra, tải tệp gốc qua `/api/social/file/:id` (Facebook tải ảnh, video ổn định hơn). Không có thì website đọc trang xem thư mục công khai của Drive. |
| `FB_PAGE_ID` | Cho chế độ tự hẹn giờ | Mã số Fanpage. |
| `FB_PAGE_TOKEN` | Cho chế độ tự hẹn giờ | Page access token dài hạn có quyền `pages_manage_posts`, `pages_read_engagement`. Lưu dạng Secret. |
| `FB_GRAPH_VERSION` | Không | Mặc định `v23.0`. |

## API dành cho extension
Gửi kèm header `Authorization: Bearer fbk_…`. Trả CORS cho trang `chrome-extension://`.
- `GET /api/social/status`: kiểm tra khóa, thư mục Drive, Facebook.
- `GET /api/social/feed`: bài viết đã đăng và sắp đăng, đối tác, các trang chính (link tuyệt đối, ảnh bìa).
- `GET /api/social/drive[?folder=<mã thư mục con>]`: ảnh, video trong thư mục Drive.
- `GET /api/social/file/:id`: tệp gốc trong thư mục Drive (công khai, chỉ tệp nằm trong thư mục đã gắn).
- `GET|POST|PUT|DELETE /api/social/plans`: lịch đăng.
- `POST /api/social/publish` `{id}` hẹn giờ trên Facebook · `{id, now:true}` đăng ngay · `{id, action:"cancel"}` hủy hẹn.
