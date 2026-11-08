# Website FarmBase

Website giới thiệu FarmBase (VI · EN · 中文) và trang quản lý. Giải pháp FarmBase do BVI và Salefronts đồng phát triển.

## Cấu trúc
- `site/`: trang web tĩnh (trang chủ, các trang con, `quan-tri/` là trang quản lý).
- `functions/api/`: máy chủ nhỏ chạy trên Cloudflare Pages Functions.
  - `POST /api/track`: ghi lượt xem trang, thời gian xem, lượt bấm nút liên hệ.
  - `POST /api/consent`: lưu lựa chọn cookie của khách (đồng ý tất cả, chỉ cần thiết, tùy chọn). Mã khách `fb_vid`, phiên `fb_sid` và nguồn utm chỉ được tạo khi khách đồng ý cookie thống kê; GA4 và Facebook Pixel chỉ tải sau khi khách đồng ý. Dữ liệu sự kiện, phiên, lựa chọn cookie quá 400 ngày tự xóa.
  - `POST /api/lead`: lưu form liên hệ và gửi email (Resend) tới `LEAD_EMAIL_TO`.
  - `POST /api/auth/login|logout|setup|password`, `GET /api/auth/me`: đăng nhập email + mật khẩu (cookie HttpOnly, 7 ngày).
    Chủ sở hữu mặc định `minhducuy@gmail.com` (đổi bằng biến `OWNER_EMAIL`), tạo hoặc đặt lại mật khẩu bằng mã `ADMIN_TOKEN`.
  - `GET|POST|PATCH|DELETE /api/admin/users`: chủ sở hữu cấp, đổi vai trò, khóa, đặt lại mật khẩu tài khoản khác.
  - `GET|PUT /api/admin/settings`: mã Google Analytics 4 và Facebook Pixel; `functions/_middleware.js` tự gắn vào trang công khai.
  - `GET /api/content`, `GET|PUT /api/admin/content`: chữ VI/EN/中文 và ảnh thay thế sửa trong trang quản lý (khóa là câu tiếng Việt gốc, ảnh dùng khóa `img:<đường dẫn>`). Trang quản lý xuất, nhập Excel.
  - `GET /api/partners`, `GET|PUT /api/admin/partners`: trang Khách hàng, đối tác (`#doi-tac`, `#doi-tac/<mã>`). Khi máy chủ chưa có dữ liệu, website dùng bản mẫu `site/data/partners.json`.
  - `/chien-dich-10000ha/`: đường link riêng để gửi khách, có ảnh xem trước `img/og-10000ha.jpg` khi chia sẻ Zalo, Facebook, rồi tự mở trang chiến dịch.
  - `POST /api/admin/media`, `GET /api/media/:id`: ảnh (JPG, PNG, WebP, GIF) và video (MP4, WebM) tải lên, lưu trong D1, tối đa 2 MB mỗi tệp. Trang quản lý tự nén ảnh lớn; video phát được tua nhờ hỗ trợ Range.
  - `GET /api/posts`, `GET /api/posts/:slug`: bài viết đã đăng (hỗ trợ hẹn giờ theo ngày đăng). `GET|POST|PUT|DELETE /api/admin/posts`: soạn, lưu nháp, đăng, xóa bài và xem lượt xem, khách, thời gian đọc từng bài. Biên tập viên chỉ lưu nháp; người duyệt, quản trị, chủ sở hữu được đăng.
  - Bài "chỉ người có link" (`visibility=link`): không hiện ở trang chủ, Blog, `/api/posts`, sitemap; gắn noindex. Đường link tự thêm đuôi ngẫu nhiên `-kxxxxx`. Có thể đặt mật khẩu (lưu dạng băm PBKDF2, người xem gửi qua header `X-Post-Pass`, tối đa 10 lần sai mỗi 15 phút) và ngày hết hiệu lực. Tắt hiệu lực (`PATCH /api/admin/posts`) hoặc quá hạn thì trả 410 "hết hiệu lực". Lượt xem, cookie đo như bài thường.
  - `/bai-viet/:slug`: link chia sẻ của từng bài, máy chủ gắn sẵn title, description, keywords, canonical, Open Graph, Twitter, JSON-LD để Google, Zalo, Facebook đọc được.
  - Trang có đường link riêng cho Google (`functions/trang.js`, danh sách trong `functions/_pages.js`): `/`, `/ve-chung-toi/`, `/giai-phap/`, `/truy-xuat/`, `/ma-vung-trong/`, `/ma-dong-goi/`, `/thu-mua-ky-thuat/`, `/giai-phap-rieng/`, `/nguon-hang/`, `/chien-dich-10000ha/`, `/doi-tac/`, `/doi-tac/<mã>`, `/su-kien/`, `/blog/`, `/lien-he/`. Máy chủ gắn title, description, canonical, hreflang (thêm `?lang=en`, `?lang=zh`), Open Graph, JSON-LD (Organization, WebSite, BreadcrumbList) riêng từng trang; trình duyệt tự chuyển sang `/#mã` như cũ. Link trong trang dùng dạng `/mã/` để Google đọc được, bấm vẫn chuyển trang không tải lại.
  - `/sitemap.xml`: các trang trên (kèm bản EN, 中文), trang từng đối tác và mọi bài đã đăng.
  - Trình soạn bài dùng Quill 2.0.3 (giấy phép BSD, để trong `site/quan-tri/vendor/`).
  - `GET /api/admin/stats`, `GET|PATCH /api/admin/leads`: thống kê và khách liên hệ, theo vai trò.
  - `GET /api/admin/cookies?days=30`: tỉ lệ đồng ý cookie, nguồn khách và chiến dịch utm (kèm số khách để lại liên hệ), khách quay lại, trang vào đầu tiên, hành trình các trang khách đã xem trước khi gửi form.
- Vai trò: Chủ sở hữu (mọi thứ), Quản trị (trừ tài khoản), Duyệt bài (thống kê, nội dung), Biên tập (nội dung, hình ảnh), Kinh doanh (khách liên hệ).
- Cơ sở dữ liệu: Cloudflare D1, tên biến `DB`. Bảng tự tạo ở lần gọi đầu.

## Cài đặt trên Cloudflare (không cần lệnh)
Chạy dưới dạng Cloudflare Worker `farmbase-website` (kết nối GitHub, nhánh `main`). `wrangler.jsonc` khai báo trang tĩnh `site/`, điểm vào `worker/index.js` (định tuyến tới các hàm trong `functions/`) và D1 `farmbase` với tên `DB`. Thêm biến bí mật `ADMIN_TOKEN`, `RESEND_API_KEY`; tùy chọn `LEAD_EMAIL_TO` (mặc định info@salefronts.com) và `LEAD_EMAIL_FROM`.
Hướng dẫn từng bước: `docs/HUONG-DAN-CLOUDFLARE.md`.

## Chạy thử trên máy
```
echo "ADMIN_TOKEN=thu-nghiem" > .dev.vars
npx wrangler pages dev site --d1 DB=farmbase
```
