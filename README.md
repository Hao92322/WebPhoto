# Em có yêu anh không? 💗

Website hai lựa chọn “Có” / “Không”. Sau khi người dùng chọn, website **thông báo rõ việc chụp và chia sẻ ảnh**. Nếu người dùng tự mở camera, chụp ảnh và nhấn **Gửi ảnh**, backend sẽ gửi ảnh + lựa chọn đến Telegram của người tạo trang. **Không tự chụp hoặc tự gửi khi bấm Có/Không.**

## Chạy ở máy tính

1. Cài Node.js 20.12+.
2. Mở terminal ở thư mục này, chạy `npm install`.
3. Sao chép `.env.example` thành `.env`, điền `TELEGRAM_BOT_TOKEN` và `TELEGRAM_CHAT_ID`. Server tự nạp `.env` khi chạy; biến môi trường đã cấu hình trên máy chủ được ưu tiên.
4. Chạy `npm start`, truy cập `http://localhost:3000`.

> Nếu chưa thiết lập Telegram, website vẫn hiện được giao diện nhưng chức năng **Gửi ảnh** trả về lỗi cấu hình. `getUserMedia` hoạt động trên `localhost` hoặc website có HTTPS.

## Tạo bot Telegram để nhận ảnh

1. Vào Telegram, chat với [@BotFather](https://t.me/BotFather), tạo bot bằng `/newbot` rồi giữ **bot token** bí mật.
2. Mở bot mới tạo, nhấn **Start** hoặc gửi tin nhắn cho bot.
3. Trong trình duyệt, mở URL `https://api.telegram.org/bot<TOKEN_CUA_BAN>/getUpdates` (thay token). Trong phản hồi JSON, tìm `message.chat.id` để lấy Chat ID. Không gửi token cho người khác và không lưu URL này trong mã nguồn.
4. Cấu hình `TELEGRAM_BOT_TOKEN` và `TELEGRAM_CHAT_ID` ở môi trường máy chủ.

## Deploy lên Render

1. Đẩy thư mục này lên một repository GitHub (đừng đẩy file `.env`).
2. Mở [Render](https://dashboard.render.com/) → **New** → **Web Service** → chọn repo GitHub.
3. **Language**: Node; **Build Command**: `npm install`; **Start Command**: `npm start`. Chọn gói phù hợp (có tùy chọn Free nếu tài khoản đủ điều kiện).
4. Trong phần **Environment**, tạo hai biến `TELEGRAM_BOT_TOKEN` và `TELEGRAM_CHAT_ID`.
5. Hoàn tất deploy. Render cung cấp URL HTTPS dạng `https://ten-website.onrender.com` (tên thực tế do Render cấp).
6. Mở URL bằng điện thoại để kiểm tra camera trước và gửi thử ảnh của chính bạn.

### Quyền riêng tư và lưu trữ

- Trình duyệt luôn yêu cầu cấp quyền camera, trừ khi trang đã có quyền từ trước.
- Video xem trước nằm trong trình duyệt, không được upload. Chỉ ảnh JPEG mà người dùng **chủ động xác nhận gửi** mới được chuyển đến bot Telegram.
- Server không lưu ảnh ra ổ đĩa; Telegram sẽ lưu thông điệp/ảnh theo chính sách của dịch vụ.
- Người dùng có thể chọn bỏ qua, thoát, chụp lại.
- Giới hạn gửi ảnh: tối đa 3 MB mỗi ảnh và 6 lần gửi/giờ/IP (giới hạn trong bộ nhớ của từng tiến trình).

## Cấu trúc

```text
yeu-khong-camera/
├── public/
│   ├── index.html
│   ├── style.css
│   └── app.js
├── server.js
├── package.json
├── .env.example
├── .gitignore
└── README.md
```

