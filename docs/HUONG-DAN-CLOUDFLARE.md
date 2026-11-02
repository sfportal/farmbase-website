# Đưa website FarmBase lên Cloudflare

Làm một lần, khoảng 20 phút. Sau đó mỗi lần cập nhật code lên nhánh `main`, Cloudflare tự đăng bản mới.

1. **Đăng nhập** dash.cloudflare.com (tài khoản miễn phí là đủ).
2. **Cơ sở dữ liệu**: ĐÃ TẠO SẴN (D1 tên `farmbase`, vùng châu Á, đã có bảng). Bỏ qua bước này.
3. **Kết nối GitHub**: Workers & Pages → Create → thẻ Pages → Connect to Git → cho phép GitHub → chọn `uyducminh/farmbase-website` → Begin setup.
   - Production branch: `main`
   - Framework preset: None
   - Build command: để trống
   - Build output directory: `site`
   - Bấm Save and Deploy. Sau 1–2 phút có địa chỉ dạng `farmbase-xxx.pages.dev`.
4. **Gắn cơ sở dữ liệu**: dự án vừa tạo → Settings → Bindings → Add → D1 database → Variable name `DB` → chọn `farmbase` → Save.
5. **Tạo khóa gửi email**: đăng ký resend.com bằng email **info@salefronts.com** → API Keys → Create API Key → sao chép khóa.
6. **Thêm biến bí mật**: Settings → Variables and Secrets → Add:
   - `ADMIN_TOKEN` (Secret): một chuỗi dài tự đặt, khoảng 24 ký tự. Đây là khóa để trang quản lý đọc số liệu.
   - `RESEND_API_KEY` (Secret): khóa ở bước 5.
   - `LEAD_EMAIL_TO` (Text, tùy chọn): mặc định `info@salefronts.com`; nhiều email cách nhau dấu phẩy.
7. **Đăng lại**: Deployments → bản mới nhất → Retry deployment để nhận biến mới.
8. **Kiểm tra**: mở `…pages.dev`, gửi thử form ở trang chủ, kiểm tra hộp thư info@salefronts.com.
   - **Tạo tài khoản chủ sở hữu**: mở `…pages.dev/quan-tri/` → bấm "Chủ sở hữu: cài đặt lần đầu hoặc quên mật khẩu" → Mã cài đặt là giá trị `ADMIN_TOKEN` ở bước 6 → đặt mật khẩu cho minhducuy@gmail.com. Quên mật khẩu chủ sở hữu thì làm lại bước này.
   - **Cấp tài khoản cho người khác**: trong trang quản trị → Tài khoản và phân quyền → nhập email, vai trò, mật khẩu tạm → gửi riêng cho người dùng.
   - **Gắn Google Analytics, Facebook Pixel**: Kết nối và cài đặt → Mã đo lường trên website → dán mã → Lưu.
9. **Gắn tên miền farmbase.vn** (khi nội dung đã duyệt): Custom domains → Set up a custom domain → `farmbase.vn`. Nếu tên miền chưa ở Cloudflare, làm theo hướng dẫn đổi nameserver tại nơi mua tên miền.
10. **Lớp bảo vệ thêm (tùy chọn)**: trang quản lý đã có đăng nhập. Muốn chặn thêm, dùng Zero Trust → Access cho đường dẫn `farmbase.vn/quan-tri/*`.

Lưu ý email: khi chưa xác minh tên miền trong Resend, email chỉ gửi được tới chính email đăng ký Resend (info@salefronts.com). Muốn gửi từ `noreply@farmbase.vn` hoặc tới nhiều người, xác minh tên miền trong Resend → Domains, rồi thêm biến `LEAD_EMAIL_FROM` = `FarmBase <noreply@farmbase.vn>`.
