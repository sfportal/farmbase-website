# Website FarmBase

Website giới thiệu FarmBase (VI · EN · 中文) và trang quản lý. Giải pháp FarmBase do BVI và Salefronts đồng phát triển.

## Cấu trúc
- `site/`: trang web tĩnh (trang chủ, các trang con, `quan-tri/` là trang quản lý).
- `functions/api/`: máy chủ nhỏ chạy trên Cloudflare Pages Functions.
  - `POST /api/track`: ghi lượt xem trang, thời gian xem, lượt bấm nút liên hệ.
  - `POST /api/lead`: lưu form liên hệ và gửi email (Resend) tới `LEAD_EMAIL_TO`.
  - `POST /api/auth/login|logout|setup|password`, `GET /api/auth/me`: đăng nhập email + mật khẩu (cookie HttpOnly, 7 ngày).
    Chủ sở hữu mặc định `minhducuy@gmail.com` (đổi bằng biến `OWNER_EMAIL`), tạo hoặc đặt lại mật khẩu bằng mã `ADMIN_TOKEN`.
  - `GET|POST|PATCH|DELETE /api/admin/users`: chủ sở hữu cấp, đổi vai trò, khóa, đặt lại mật khẩu tài khoản khác.
  - `GET|PUT /api/admin/settings`: mã Google Analytics 4 và Facebook Pixel; `functions/_middleware.js` tự gắn vào trang công khai.
  - `GET /api/admin/stats`, `GET|PATCH /api/admin/leads`: thống kê và khách liên hệ, theo vai trò.
- Vai trò: Chủ sở hữu (mọi thứ), Quản trị (trừ tài khoản), Duyệt bài (thêm thống kê), Biên tập, Kinh doanh (khách liên hệ).
- Cơ sở dữ liệu: Cloudflare D1, tên biến `DB`. Bảng tự tạo ở lần gọi đầu.

## Cài đặt trên Cloudflare (không cần lệnh)
Kết nối repo này trong Cloudflare Pages: nhánh `main`, không có lệnh build, thư mục xuất bản `site`.
Gắn D1 với tên `DB`. Thêm biến bí mật `ADMIN_TOKEN`, `RESEND_API_KEY`; tùy chọn `LEAD_EMAIL_TO` (mặc định info@salefronts.com) và `LEAD_EMAIL_FROM`.
Hướng dẫn từng bước: `docs/HUONG-DAN-CLOUDFLARE.md`.

## Chạy thử trên máy
```
echo "ADMIN_TOKEN=thu-nghiem" > .dev.vars
npx wrangler pages dev site --d1 DB=farmbase
```
