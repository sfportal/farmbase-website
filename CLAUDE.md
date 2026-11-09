# CLAUDE.md: hướng dẫn làm tiếp website FarmBase

Đọc file này trước khi sửa bất cứ thứ gì. Trạng thái và việc còn treo nằm trong `docs/BAN-GIAO.md`.

## Người dùng
- Salefronts (admin@salefronts.com) không viết code, nhắn bằng tiếng Việt. Trả lời bằng tiếng Việt, giọng doanh nghiệp: gọi khách là "Quý khách" hoặc "Quý đối tác", gọi nông dân là "bà con".
- Mọi thay đổi trên `main` tự triển khai lên farmbase.vn. Vì vậy, kiểm tra kỹ trước khi push.
- Hai việc phải xin phép người dùng trước: đăng bài (đổi `status` sang `published`) và xóa dữ liệu.

## Kiến trúc
- Cloudflare Worker `farmbase-website`, kết nối GitHub `sfportal/farmbase-website`, nhánh `main`. Cấu hình nằm trong `wrangler.jsonc`.
- Trang web là một file HTML một trang (SPA, định tuyến bằng `#hash`): `site/index.html`. Trang quản lý: `site/quan-tri/index.html`.
- API nằm trong `functions/api/**` và được gọi qua `worker/index.js`. Chi tiết từng endpoint xem `README.md`.
- Cơ sở dữ liệu: D1 `farmbase`, id `708142ad-4dfe-46b7-ae7d-b3a0c35f15f5`, biến `DB`. Workers AI dùng biến `AI`.
- Biến bí mật đặt trên Cloudflare, không có trong repo: `ADMIN_TOKEN`, `RESEND_API_KEY`, `LEAD_EMAIL_TO`, `LEAD_EMAIL_FROM`, `OWNER_EMAIL`, `TRANSLATE_MODEL`.
  - Không bao giờ xin người dùng dán token hoặc khóa vào chat.

## Quy trình sửa giao diện (QUAN TRỌNG)
1. **Sửa bản nguồn**, không sửa trực tiếp file đã dựng:
   - `src/farmbase-trangchu.html` cho trang web;
   - `src/quan-tri.html` cho trang quản lý.
2. Dựng lại: `python3 tools/build.py`. Lệnh này ghi đè `site/index.html` và `site/quan-tri/index.html`.
   - Ảnh, video, `site/data/partners.json` và `site/chien-dich-10000ha/` thì sửa thẳng trong `site/`.
   - Trong `src/quan-tri.html`, ảnh viết dạng `IP='im'+'g/'`, vì build đổi mọi chuỗi `"img/` thành `../img/`.
3. Chạy thử trên máy:
   ```
   npx wrangler@4 dev -c wrangler.test.jsonc --port 8789
   ```
   Playwright và Chromium đã có sẵn trong môi trường Claude Code trên web.
4. Kiểm tra bằng các script trong `tools/`:
   - `node tools/full.js nguon-hang,doi-tac`: chụp toàn trang (máy tính 1366 và điện thoại 390), báo tràn ngang và lỗi JS.
   - `node tools/en2.js trang-chu,blog`: liệt kê chữ tiếng Việt còn sót khi chuyển sang EN hoặc ZH.
   - `node tools/err.js`: lỗi JS và trang nào đang hiện.
   - `python3 tools/cols.py out.png 390 1500 a.png b.png`: ghép ảnh chụp để xem nhanh.
5. Commit bằng tiếng Việt, mô tả việc đã làm, rồi push lên `main`. Chép bản dựng vào thư mục dự án nếu có.

## Quy ước trong file HTML
- **Dịch:** JSON nằm giữa `/*I18N_START*/` và `/*I18N_END*/`, dạng `{"câu tiếng Việt chính xác": ["English", "中文"]}`.
  - Hàm dịch duyệt các nút chữ trong DOM, nên chữ mới thêm (kể cả chữ sinh từ JS) phải có khóa dịch.
  - Chữ bị tách bởi thẻ con (ví dụ `Xem giới thiệu <i>→</i>`) cần khóa riêng cho phần chữ.
- **Cách vá file:** viết script Python, tìm chuỗi cũ, assert số lần khớp, rồi thay.
  - Chèn CSS trước `</style>` đầu tiên, chèn JS trước `const I18N=`.
  - Xem mẫu trong lịch sử commit.
- **Chuyển động:** chỉ chạy khi `<html>` có class `.mo`; tự tắt khi người xem bật giảm chuyển động.
  - Keyframes có sẵn: fbUp, fbFloat, fbFloat2, fbMesh, fbDash, fbNode, fbMote, fbGlint, fbShine, fbBar, fbKen, fbRun, fbMq, fbPop.
  - Hiện dần khi cuộn: thêm selector vào hằng `SEL` trong IIFE reveal; phần tử sẽ được gắn class `.rv` rồi `.in`.
  - `window.fbMark(root)` đánh dấu nội dung sinh động.
- **Định tuyến:** các view `data-view` gồm trang-chu, ve-chung-toi, giai-phap (cùng các giải pháp con trong `SOLS`), nguon-hang, doi-tac, doi-tac-ct (`#doi-tac/<slug>`), chien-dich-10000ha, su-kien, blog, bai-viet (`#bai-viet/<slug>`), lien-he, chinh-sach-bao-mat, dieu-khoan-su-dung.
  - Hash `cd-*`, `nguon-hang-form` và `dt-dang-ky` mở view cha rồi cuộn tới khối tương ứng.
  - `[data-goto="id"]` cuộn tới phần tử mà không đổi hash.
- **Menu 2 cấp:** Giới thiệu ▾ (Về chúng tôi, Khách hàng và đối tác, Đăng ký đối tác, Liên hệ) · Giải pháp ▾ · Nguồn hàng · 10.000 ha · Tin tức ▾ (Sự kiện, Blog).
- Bài viết lấy từ `/api/posts` (D1). Khi D1 chưa có bài đã đăng, Blog hiện mục báo chí (`PRESS`) có sẵn trong HTML.

## Quy tắc nội dung (bắt buộc)
- **Tên gọi**
  - Chỉ dùng tên FarmBase, không dùng "DurianBase".
  - Luôn ghi "Giải pháp FarmBase do BVI và Salefronts đồng phát triển".
- **Cấp mã**
  - Không bao giờ viết FarmBase hay BVI "cấp mã".
  - Dùng câu: "Việc cấp mã số vùng trồng thuộc thẩm quyền cơ quan quản lý nhà nước; BVI hỗ trợ kỹ thuật, hồ sơ và vận hành hệ thống truy xuất."
- **Số liệu**
  - Khớp video giới thiệu: 1.500+ nông hộ, ~1.600 ha, 66 vùng trồng, số liệu ngày 28/10/2026. Không dùng ~2.000.
  - Không viết "100% nông hộ vùng 07".
- **Lộ trình**
  - Đồng bộ hệ thống truy xuất quốc gia chỉ áp dụng cho vùng đã có mã.
  - GS1 và module cơ sở đóng gói ghi "dự kiến 11/2026".
- **Chiến dịch 10.000 ha**
  - Đây là đề xuất; mọi con số là mục tiêu, không phải kết quả.
  - Trang web không hiện chi phí tài trợ.
- **Dữ liệu cá nhân:** không công khai dữ liệu nông hộ (tên, CCCD, số điện thoại, ảnh sổ đỏ).
- **Báo chí và nguồn**
  - Báo chí dùng nhãn "Báo chí ghi nhận".
  - Không bịa dữ liệu đối tác, không chép câu chữ của đối thủ.
  - Bài lấy từ nguồn ngoài phải có dòng "Nguồn:" kèm liên kết.
- **Liên hệ**
  - BVI: Mrs Ngọc · 0911 423 839 (Zalo) · info@bvi.vn.
  - DaLa: 0917 202 527 · htxdala.vn · htxdala@gmail.com.
- **SEO:** title dưới 60 ký tự, meta description 140 đến 160 ký tự, slug không dấu.
