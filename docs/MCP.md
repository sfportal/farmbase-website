# Máy chủ MCP của farmbase.vn

Đường link: **https://farmbase.vn/mcp**

MCP (Model Context Protocol) là chuẩn để Claude, ChatGPT và các công cụ AI khác đọc dữ liệu từ một nguồn. Khi gắn đường link trên, AI đọc được đúng nội dung đang có trên website (kể cả chữ đã sửa trong trang quản lý và bài viết mới đăng) thay vì đoán hoặc dùng thông tin cũ.

## Chỉ đọc nội dung công khai
- Đọc: các trang, trang giải pháp, bài viết đã đăng công khai, khách hàng và đối tác, thông tin liên hệ ở chân trang.
- Không đọc: bài nháp, bài hẹn giờ chưa tới ngày, bài "chỉ người có link", bài hết hiệu lực, khách liên hệ, tài khoản, thống kê, dữ liệu nông hộ.
- Không có công cụ ghi, sửa, xóa. Không cần đăng nhập, không cần khóa API.

## Các công cụ
| Công cụ | Dùng để |
|---|---|
| `get_site_overview` | Tổng quan: danh sách trang, giải pháp, chuyên mục, nhóm đối tác, liên hệ |
| `get_page` | Toàn bộ chữ một trang (`trang-chu`, `giai-phap`, `nguon-hang`, `chien-dich-10000ha`, ...) hoặc một giải pháp (`truy-xuat`, `ma-vung-trong`, ...) |
| `list_posts` | Bài viết đã đăng, lọc theo chuyên mục, từ khóa |
| `get_post` | Toàn văn một bài viết |
| `list_partners`, `get_partner` | Khách hàng, đơn vị đồng hành, đối tác công nghệ |
| `search_site` | Tìm theo từ khóa (có dấu hoặc không dấu) trên toàn website |

Mọi công cụ nhận `lang`: `vi` (mặc định), `en`, `zh`.

## Gắn vào Claude
1. claude.ai: **Cài đặt → Connectors → Add custom connector**.
2. Tên: `FarmBase`, URL: `https://farmbase.vn/mcp`, bấm **Add** (không cần OAuth).
3. Trong cuộc trò chuyện, bật connector FarmBase rồi hỏi, ví dụ: "Theo website FarmBase, giải pháp mã vùng trồng gồm những gì?".

Claude Code: `claude mcp add --transport http farmbase https://farmbase.vn/mcp`

## Thử nhanh
```
curl -s https://farmbase.vn/mcp -H 'content-type: application/json' \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"search_site","arguments":{"query":"ma vung trong"}}}'
```

## Kỹ thuật
- Code: `functions/mcp.js` (giao thức, công cụ), `functions/_site.js` (đọc trang `site/index.html`, bài viết, đối tác).
- Kiểu Streamable HTTP không giữ phiên, trả JSON. Chữ trang tĩnh được đọc lại sau 5 phút, chữ đã sửa trong trang quản lý sau 1 phút.
- Website cũng có `/llms.txt` giới thiệu ngắn cho AI.
