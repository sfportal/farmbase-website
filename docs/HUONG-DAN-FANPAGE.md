# Chatbot Claude cho Fanpage FarmBase

Tin nhắn Messenger và bình luận trên Fanpage được Facebook đẩy về `farmbase.vn/api/fanpage/webhook`. Claude đọc kiến thức FarmBase (`functions/_fanpage-kb.js` và mục "Kiến thức bổ sung" trong trang quản lý) rồi soạn trả lời. Câu khó (giá, hợp đồng, khiếu nại, để lại số điện thoại, ngoài kiến thức) được chuyển cho nhân viên, báo qua email (Resend) và lưu vào mục "Khách để lại liên hệ" nếu khách để lại số.

Trang quản lý › **Hộp thư Fanpage**: xem tin, duyệt nháp, trả lời tay, bật tắt chatbot, hỏi thử. Trang **Bài Facebook** có thêm khung "Đăng thẳng lên Fanpage" (đăng ngay hoặc hẹn giờ).

## Ba chế độ
- **Tắt:** chỉ lưu tin.
- **Soạn nháp (mặc định):** Claude soạn, nhân viên đọc rồi bấm Gửi.
- **Tự động:** Claude gửi ngay. Chỉ bật sau khi đã chạy chế độ nháp vài ngày và thấy câu trả lời ổn.

Mỗi cuộc trò chuyện có ô "Nhân viên đang xử lý": khi bật, Claude im lặng ở cuộc đó. Claude tự bật ô này khi chuyển cho nhân viên.

## Biến bí mật trên Cloudflare (Workers › farmbase-website › Settings › Variables and Secrets)
| Biến | Lấy ở đâu |
|---|---|
| `FB_APP_SECRET` | Meta for Developers › App › App settings › Basic › App secret |
| `FB_VERIFY_TOKEN` | Tự đặt một chuỗi ngẫu nhiên, nhập giống hệt khi đăng ký webhook |
| `FB_PAGE_ID` | ID Fanpage (Fanpage › Giới thiệu › Minh bạch trang) |
| `FB_PAGE_TOKEN` | Page access token dài hạn (xem bên dưới) |
| `ANTHROPIC_API_KEY` | console.anthropic.com › API keys (nên đặt hạn mức chi tiêu tháng) |
| `CLAUDE_MODEL` | Tùy chọn, mặc định `claude-opus-5-5` |
| `FB_GRAPH_VERSION` | Tùy chọn, mặc định `v24.0` |

Không dán các khóa này vào chat.

## Tạo và nối Facebook App
1. developers.facebook.com › Tạo ứng dụng › loại **Business**, gắn với Business Portfolio sở hữu Fanpage.
2. Thêm sản phẩm **Messenger** (và **Webhooks**).
3. Webhooks › Page › Callback URL `https://farmbase.vn/api/fanpage/webhook`, Verify token = `FB_VERIFY_TOKEN`. Đăng ký trường `messages` và `feed`.
4. Messenger › Cài đặt API › thêm Fanpage FarmBase, tạo token, rồi bấm "Đăng ký" (subscribe) Fanpage vào app.
5. Token dài hạn: dùng System User trong Business Settings (khuyên dùng, không hết hạn) với quyền `pages_messaging`, `pages_manage_metadata`, `pages_read_engagement`, `pages_manage_engagement`, `pages_manage_posts`, `pages_show_list`.
6. App Review: xin quyền ở bước 5 với Advanced Access để trả lời người ngoài (khi app ở chế độ Development chỉ người có vai trò trong app nhắn thử được). Cần chính sách quyền riêng tư: `https://farmbase.vn/#chinh-sach-bao-mat`.
7. Chuyển app sang **Live**.

## Lưu ý
- Messenger chỉ cho trả lời trong 24 giờ từ tin cuối của khách.
- Bảng D1 mới: `fb_convs`, `fb_msgs` (tự tạo ở lần gọi đầu).
