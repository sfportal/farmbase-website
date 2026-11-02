// Nội dung đã chỉnh sửa trong trang quản lý, trang công khai đọc để hiển thị.
import { json, cachedContent } from "../_lib.js";

export async function onRequestGet({ env }) {
  try {
    return json(await cachedContent(env), 200, { "cache-control": "public, max-age=60" });
  } catch (e) {
    return json({ t: {}, img: {} });
  }
}
