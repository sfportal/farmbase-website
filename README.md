# Website FarmBase

Website giới thiệu FarmBase (VI · EN · 中文), kèm trang quản lý nội dung, bài viết, đối tác, khách liên hệ và thống kê. Giải pháp FarmBase do BVI và Salefronts đồng phát triển.

- Website: https://farmbase.vn · Trang quản lý: https://farmbase.vn/quan-tri/
- Repo: `sfportal/farmbase-website`, nhánh `main`. Mỗi lần đẩy code lên `main`, Cloudflare tự đăng bản mới sau khoảng 1–2 phút.

> **Làm tiếp bằng Claude:** đọc `CLAUDE.md` trước (gồm quy trình sửa, dựng, kiểm tra và quy tắc nội dung bắt buộc), rồi đến `docs/BAN-GIAO.md` (trạng thái hiện tại, việc còn treo).
> Câu nhắn gợi ý: *"Đọc CLAUDE.md và docs/BAN-GIAO.md rồi làm tiếp: …"*

---

## 1. Tổng quan kiến trúc

```
Trình duyệt ──► Cloudflare Worker "farmbase-website" (worker/index.js)
                 ├─ /api/*, /bai-viet/*, /sitemap.xml, /, /chien-dich-10000ha/*  → các hàm trong functions/
                 └─ còn lại                                                       → trang tĩnh trong site/
                         │
                         ├─ D1 "farmbase" (biến DB): bài viết, nội dung, đối tác, ảnh, tài khoản, khách liên hệ, thống kê
                         ├─ Workers AI (biến AI): dịch bài viết sang EN/中文 trong trang quản lý
                         └─ Resend (RESEND_API_KEY): gửi email báo khách điền form
```

- **Không có** Supabase, máy chủ riêng hay bước build npm. Website là HTML/CSS/JS thuần, còn API viết theo kiểu Cloudflare Pages Functions và được `worker/index.js` định tuyến.
- Trang web là **một file HTML một trang** (SPA). Mỗi trang con là một `<div class="view" data-view="…">`, mở bằng `#hash` (ví dụ `farmbase.vn/#nguon-hang`).

## 2. Cấu trúc thư mục

| Đường dẫn | Nội dung |
|---|---|
| `src/farmbase-trangchu.html` | **Bản nguồn** của trang web (HTML, CSS, JS và bảng dịch ba thứ tiếng). Sửa ở đây. |
| `src/quan-tri.html` | **Bản nguồn** của trang quản lý. |
| `tools/build.py` | Dựng `site/index.html` và `site/quan-tri/index.html` từ `src/`. |
| `tools/*.js`, `tools/cols.py` | Script kiểm tra bằng Playwright: chụp trang, tìm lỗi, soát bản dịch, ghép ảnh. |
| `site/` | Thư mục được đăng lên web. `index.html` và `quan-tri/index.html` là file đã dựng, **không sửa tay**. |
| `site/img/` | Ảnh. `img/logos/` chứa logo đối tác, `img/crops/` chứa ảnh cây trồng. |
| `site/video/` | Video giới thiệu FarmBase, TVC 10.000 ha và ảnh bìa video. |
| `site/data/partners.json` | Danh sách đối tác mẫu, dùng khi bảng `partners` trong D1 còn trống. |
| `site/chien-dich-10000ha/` | Link chia sẻ riêng của chiến dịch, có ảnh xem trước `img/og-10000ha.jpg`. |
| `site/quan-tri/vendor/` | Trình soạn bài Quill 2.0.3 (giấy phép BSD). |
| `site/_headers`, `site/robots.txt` | Header bảo mật, chặn index `/quan-tri/` và `/api/`. |
| `functions/` | API và xử lý phía máy chủ (xem mục 5). `_lib.js` chứa hàm dùng chung, vai trò, tạo bảng. |
| `worker/index.js` | Điểm vào Worker, định tuyến đường dẫn tới hàm trong `functions/`. |
| `wrangler.jsonc` | Cấu hình bản chạy thật: tên Worker, thư mục `site/`, D1, AI, `keep_vars`. |
| `wrangler.test.jsonc` | Cấu hình chạy thử trên máy, không có binding AI. |
| `docs/HUONG-DAN-CLOUDFLARE.md` | Hướng dẫn cài đặt Cloudflare từng bước (đã làm xong, giữ để tham khảo). |
| `docs/BAN-GIAO.md` | Trạng thái, danh sách bài nháp, việc còn treo. |
| `CLAUDE.md` | Hướng dẫn cho Claude: quy trình, quy ước code, quy tắc nội dung. |

## 3. Các trang trên website

Menu 2 cấp: **Giới thiệu ▾** (Về chúng tôi · Khách hàng, đối tác · Đăng ký đối tác đồng hành · Liên hệ) · **Giải pháp ▾** (tổng quan và 5 giải pháp) · **Nguồn hàng** · **10.000 ha** · **Tin tức ▾** (Sự kiện · Blog). Bên phải là nút "Nhận tư vấn" và nút chọn VI/EN/中文.

| Hash | Trang |
|---|---|
| `#trang-chu` | Trang chủ: hero, video giới thiệu, số liệu, hình ảnh thực tế, đối tác chạy ngang |
| `#ve-chung-toi` | Về chúng tôi: dòng thời gian, đơn vị đồng phát triển |
| `#giai-phap` và các giải pháp con | Truy xuất nguồn gốc, mã vùng trồng, mã cơ sở đóng gói, liên kết thu mua và kỹ thuật, giải pháp riêng |
| `#nguon-hang` | Nguồn hàng cho người mua: hành trình lô hàng, lọc cây trồng, form yêu cầu (`#nguon-hang-form`) |
| `#doi-tac`, `#doi-tac/<slug>` | Danh sách và trang chi tiết đối tác, form đăng ký đồng hành (`#dt-dang-ky`) |
| `#chien-dich-10000ha` | Chiến dịch 10.000 ha (đề xuất); các mục con `#cd-*`, chương trình mẫu |
| `#su-kien` | Sự kiện dạng dòng thời gian, báo chí ghi nhận (`#ev-press`) |
| `#blog`, `#bai-viet/<slug>` | Blog có tab Tin tức, Hướng dẫn, Kiến thức, Báo chí; trang đọc bài |
| `#lien-he` | Liên hệ và form |
| `#chinh-sach-bao-mat`, `#dieu-khoan-su-dung` | Chính sách, điều khoản |

Khi chia sẻ bài viết, dùng link `/bai-viet/<slug>`. Máy chủ gắn sẵn thẻ SEO và Open Graph cho link này.

## 4. Cách sửa giao diện

```bash
# 1. Sửa src/farmbase-trangchu.html (hoặc src/quan-tri.html)
# 2. Dựng lại
python3 tools/build.py
# 3. Chạy thử (http://localhost:8789)
npx wrangler@4 dev -c wrangler.test.jsonc --port 8789
# 4. Kiểm tra
node tools/full.js nguon-hang,doi-tac      # chụp toàn trang máy tính và điện thoại, báo tràn ngang, lỗi JS
node tools/en2.js trang-chu,blog           # chữ tiếng Việt còn sót khi chuyển EN/中文
node tools/err.js                          # lỗi JS, view đang hiện
# 5. Commit và push lên main: website tự cập nhật
```

- Chạy thử trên máy dùng D1 cục bộ (trống, bảng tự tạo). Muốn có tài khoản quản trị, tạo `.dev.vars` với `ADMIN_TOKEN=thu-nghiem`.
- **Bản dịch:** mỗi câu tiếng Việt hiển thị cần một khóa trong JSON giữa `/*I18N_START*/` và `/*I18N_END*/`, dạng `"câu tiếng Việt": ["English", "中文"]`.
- Quy ước chi tiết (chuyển động, định tuyến, cách vá file) xem `CLAUDE.md`.

## 5. API

Mọi API nằm dưới `/api/`. Bảng trong D1 tự tạo ở lần gọi đầu (`functions/_lib.js`).

**Công khai**

| Phương thức, đường dẫn | Chức năng |
|---|---|
| `GET /api/content` | Chữ VI/EN/中文 và ảnh thay thế đã sửa trong trang quản lý. Khóa là câu tiếng Việt gốc; ảnh dùng khóa `img:<đường dẫn>`. |
| `GET /api/partners` | Danh sách đối tác (khi trống, website dùng `site/data/partners.json`). |
| `GET /api/posts`, `GET /api/posts/:slug` | Bài đã đăng (có hẹn giờ theo ngày đăng). Bài "chỉ người có link" có thể cần header `X-Post-Pass`. |
| `GET /api/media/:id` | Ảnh hoặc video đã tải lên (hỗ trợ Range để tua video). |
| `POST /api/lead` | Lưu form liên hệ và gửi email qua Resend tới `LEAD_EMAIL_TO`. |
| `POST /api/consent` | Lưu lựa chọn cookie. GA4 và Pixel chỉ tải sau khi khách đồng ý. |
| `POST /api/track` | Ghi lượt xem, thời gian xem, lượt bấm liên hệ (chỉ khi khách đồng ý cookie thống kê). Dữ liệu quá 400 ngày tự xóa. |
| `GET /bai-viet/:slug` | Trang chia sẻ bài viết có title, description, canonical, Open Graph, JSON-LD. |
| `GET /sitemap.xml` | Trang chủ, trang 10.000 ha, mọi bài đã đăng. |

**Đăng nhập** (cookie HttpOnly, 7 ngày)

| | |
|---|---|
| `POST /api/auth/login`, `/logout`, `/password` | Đăng nhập, đăng xuất, đổi mật khẩu. |
| `POST /api/auth/setup` | Tạo hoặc đặt lại mật khẩu chủ sở hữu bằng mã `ADMIN_TOKEN`. |
| `GET /api/auth/me` | Người đang đăng nhập và vai trò. |

**Quản trị** (cần đăng nhập, phân quyền theo vai trò; cũng chấp nhận header `Authorization: Bearer <ADMIN_TOKEN>`)

| | |
|---|---|
| `GET·POST·PUT·PATCH·DELETE /api/admin/posts` | Soạn, lưu nháp, đăng, tắt hiệu lực, xóa bài; xem lượt xem và thời gian đọc từng bài. |
| `POST /api/admin/translate` | Dịch bài sang EN/中文 bằng Workers AI, có bảng thuật ngữ FarmBase. Kết quả là bản nháp. |
| `GET·PUT /api/admin/content` | Sửa chữ, ảnh trên website; xuất, nhập Excel. |
| `GET·PUT /api/admin/partners` | Sửa danh sách và trang chi tiết đối tác. |
| `POST /api/admin/media` | Tải ảnh (JPG, PNG, WebP, GIF) và video (MP4, WebM) tối đa 2 MB; trang quản lý tự nén ảnh lớn. |
| `GET·PATCH /api/admin/leads` | Khách để lại liên hệ, đổi trạng thái chăm sóc. |
| `GET /api/admin/stats`, `GET /api/admin/cookies?days=30` | Thống kê truy cập, nguồn khách, utm, tỉ lệ đồng ý cookie, hành trình trước khi gửi form. |
| `GET·PUT /api/admin/settings` | Mã GA4 và Facebook Pixel. `functions/_middleware.js` tự gắn vào trang công khai. |
| `GET·POST·PATCH·DELETE /api/admin/users` | Cấp tài khoản, đổi vai trò, khóa, đặt lại mật khẩu (chỉ chủ sở hữu). |

**Bài viết**
- Mục bài (`cat`): `tin-tuc` Tin tức · `huong-dan` Hướng dẫn · `kien-thuc` Kiến thức · `bao-chi` Báo chí · `su-kien` Sự kiện.
- Trạng thái: `draft` hoặc `published`.
- Bài `visibility=link` không hiện ở danh sách và sitemap, được gắn noindex, link có đuôi ngẫu nhiên `-kxxxxx`. Bài này có thể đặt mật khẩu (băm PBKDF2, tối đa 10 lần sai mỗi 15 phút) và ngày hết hiệu lực. Bài hết hiệu lực trả mã 410.

## 6. Vai trò trong trang quản lý

| Vai trò | Quyền |
|---|---|
| Chủ sở hữu (`owner`) | Mọi thứ, gồm cấp tài khoản. Mặc định là `minhducuy@gmail.com` (đổi bằng `OWNER_EMAIL`). |
| Quản trị (`admin`) | Mọi thứ trừ tài khoản |
| Duyệt bài (`approver`) | Đăng bài, thống kê, nội dung |
| Biên tập (`editor`) | Nội dung, hình ảnh, lưu nháp bài |
| Kinh doanh (`sales`) | Khách liên hệ |

## 7. Cơ sở dữ liệu D1

- Tên `farmbase`, id `708142ad-4dfe-46b7-ae7d-b3a0c35f15f5`, biến `DB`.
- Các bảng:

| Bảng | Nội dung |
|---|---|
| `posts` | Bài viết (slug, mục, trạng thái, tiêu đề, tóm tắt, nội dung HTML, ảnh bìa, SEO, bản dịch `tr`, hẹn giờ, chế độ hiển thị) |
| `content` | Chữ và ảnh sửa từ trang quản lý |
| `partners` | Đối tác |
| `media` | Ảnh, video tải lên |
| `leads` | Khách để lại liên hệ |
| `users`, `sessions` | Tài khoản quản trị, phiên đăng nhập |
| `settings` | Cấu hình (GA4, Pixel...) |
| `events`, `visits`, `consents` | Thống kê truy cập, lựa chọn cookie |
| `pass_tries` | Đếm số lần nhập sai mật khẩu bài viết |

- Xem hoặc sửa dữ liệu trực tiếp trên Cloudflare: Storage & Databases › D1 › `farmbase` › Console.

## 8. Biến môi trường (đặt trên Cloudflare)

Vào Workers & Pages › `farmbase-website` › Settings › Variables and Secrets. Các biến được giữ khi đăng bản mới (`keep_vars`). **Không lưu giá trị bí mật vào repo hay dán vào chat.**

| Biến | Loại | Bắt buộc | Dùng để |
|---|---|---|---|
| `ADMIN_TOKEN` | Secret | Có | Mã cài đặt, đặt lại mật khẩu chủ sở hữu; khóa quản trị dự phòng |
| `RESEND_API_KEY` | Secret | Nên có | Gửi email khi có khách điền form. Thiếu biến này, form vẫn lưu dữ liệu. |
| `LEAD_EMAIL_TO` | Text | Không | Nơi nhận email báo khách (mặc định `info@salefronts.com`, nhiều địa chỉ cách nhau dấu phẩy) |
| `LEAD_EMAIL_FROM` | Text | Không | Địa chỉ gửi email (mặc định `FarmBase <onboarding@resend.dev>`) |
| `OWNER_EMAIL` | Text | Không | Email chủ sở hữu (mặc định `minhducuy@gmail.com`) |
| `TRANSLATE_MODEL` | Text | Không | Mô hình Workers AI để dịch (mặc định `@cf/meta/llama-3.3-70b-instruct-fp8-fast`) |

Binding có sẵn trong `wrangler.jsonc` (không phải bí mật): `DB` (D1), `ASSETS` (trang tĩnh), `AI` (Workers AI).

## 9. Đăng bài và cập nhật nội dung (không cần code)

Đăng nhập tại `/quan-tri/`. Các mục chính trong menu bên trái:
- **Bài viết website:** soạn bài hoặc mở bản nháp, bấm "Dịch tự động từ tiếng Việt" để tạo bản EN/中文, đọc lại, rồi đăng.
- **Nội dung và bản dịch / Sửa nội dung từng trang:** sửa chữ trên website theo câu tiếng Việt gốc, có xuất, nhập Excel.
- **Hình ảnh website / Thư viện ảnh:** thay ảnh, tải ảnh và video lên.
- **Khách hàng, đối tác:** sửa danh sách và trang chi tiết đối tác. Logo chỉ dùng khi đơn vị đã đồng ý.
- **Khách để lại liên hệ, Thống kê truy cập, Cookie và hành vi khách, Báo cáo tuần:** theo dõi khách và hiệu quả.
- **Lịch nội dung, Bài Facebook, Tạo bài nhanh:** lên kế hoạch và soạn nội dung.
- **Kết nối và cài đặt:** mã GA4, Facebook Pixel.
- **Tài khoản và phân quyền:** cấp tài khoản (chỉ chủ sở hữu).

## 10. Quy tắc nội dung (tóm tắt)

- **Tên gọi:** chỉ dùng tên FarmBase. Luôn ghi "Giải pháp FarmBase do BVI và Salefronts đồng phát triển".
- **Cấp mã:** không viết FarmBase hay BVI "cấp mã". Dùng câu: "Việc cấp mã số vùng trồng thuộc thẩm quyền cơ quan quản lý nhà nước; BVI hỗ trợ kỹ thuật, hồ sơ và vận hành hệ thống truy xuất."
- **Số liệu:** 1.500+ nông hộ, ~1.600 ha, 66 vùng trồng (số liệu ngày 28/10/2026).
- **Lộ trình:** đồng bộ hệ thống quốc gia chỉ áp dụng cho vùng đã có mã. GS1 và module cơ sở đóng gói ghi "dự kiến 11/2026".
- **Chiến dịch 10.000 ha:** là đề xuất, con số là mục tiêu, không hiện chi phí tài trợ.
- **Dữ liệu và nguồn:** không công khai dữ liệu nông hộ. Báo chí dùng nhãn "Báo chí ghi nhận". Bài lấy từ nguồn ngoài phải ghi "Nguồn:" kèm liên kết.
- **Liên hệ:** Mrs Ngọc · 0911 423 839 (Zalo) · info@bvi.vn.

Danh sách đầy đủ xem `CLAUDE.md`.
