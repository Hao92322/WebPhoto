import express from 'express';
import multer from 'multer';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadEnvFile } from 'node:process';

const app = express();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
try {
  loadEnvFile(path.join(__dirname, '.env'));
} catch (error) {
  if (error.code !== 'ENOENT') throw error;
}
const PORT = Number(process.env.PORT || 3000);

// Render đặt reverse proxy trước Node; chỉ tin cậy 1 proxy hop.
app.set('trust proxy', 1);
app.disable('x-powered-by');
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(self), microphone=()');
  res.setHeader('Content-Security-Policy', "default-src 'self'; img-src 'self' blob: data:; media-src 'self' blob:; style-src 'self'; script-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'");
  next();
});

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 3 * 1024 * 1024, files: 1, fields: 1 },
  fileFilter(_req, file, cb) {
    if (file.mimetype !== 'image/jpeg') {
      return cb(new Error('Chỉ hỗ trợ ảnh JPEG.'));
    }
    cb(null, true);
  },
});

const perIp = new Map();
function limited(req, res, next) {
  const now = Date.now();
  const key = req.ip || 'unknown';
  const current = perIp.get(key);
  if (!current || now - current.since >= 60 * 60 * 1000) {
    perIp.set(key, { since: now, count: 1 });
  } else if (current.count >= 6) {
    return res.status(429).json({ error: 'Đã vượt giới hạn gửi ảnh. Thử lại sau.' });
  } else {
    current.count += 1;
  }
  if (perIp.size > 5000) {
    for (const [ip, record] of perIp) {
      if (now - record.since >= 60 * 60 * 1000) perIp.delete(ip);
    }
  }
  next();
}

app.post('/api/send-photo', limited, upload.single('photo'), async (req, res) => {
  const choice = req.body?.choice;
  if (choice !== 'Có' && choice !== 'Không') {
    return res.status(400).json({ error: 'Lựa chọn không hợp lệ.' });
  }
  if (!req.file?.buffer?.length ||
      req.file.buffer[0] !== 0xff || req.file.buffer[1] !== 0xd8 ||
      req.file.buffer[req.file.buffer.length - 2] !== 0xff ||
      req.file.buffer[req.file.buffer.length - 1] !== 0xd9) {
    return res.status(400).json({ error: 'Ảnh JPEG không hợp lệ.' });
  }

  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) {
    return res.status(503).json({ error: 'Máy chủ chưa cấu hình Telegram.' });
  }

  const form = new FormData();
  form.append('chat_id', chatId);
  form.append('caption', `Lựa chọn: ${choice}\nẢnh được người gửi xác nhận chia sẻ qua website.`);
  form.append('photo', new Blob([req.file.buffer], { type: 'image/jpeg' }), 'selfie.jpg');

  try {
    const response = await fetch(`https://api.telegram.org/bot${token}/sendPhoto`, {
      method: 'POST',
      body: form,
      signal: AbortSignal.timeout(15000),
    });
    const payload = await response.json();
    if (!response.ok || !payload.ok) {
      const description = String(payload.description || 'Telegram từ chối ảnh.')
        .split(token).join('[redacted]').slice(0, 300);
      console.error('Telegram API returned', response.status, description);
      return res.status(502).json({ error: `Không thể gửi ảnh tới Telegram: ${description}` });
    }
    res.json({ ok: true });
  } catch (error) {
    console.error('Send photo failed:', error.name);
    res.status(502).json({ error: 'Không kết nối được Telegram. Vui lòng thử lại.' });
  }
});

app.use(express.static(path.join(__dirname, 'public')));
app.use((err, _req, res, _next) => {
  if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({ error: 'Ảnh quá lớn (tối đa 3 MB).' });
  }
  res.status(400).json({ error: err.message || 'Yêu cầu không hợp lệ.' });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server listening on ${PORT}`);
  if (!process.env.TELEGRAM_BOT_TOKEN || !process.env.TELEGRAM_CHAT_ID) {
    console.warn('Chưa cấu hình TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID trong .env hoặc môi trường máy chủ.');
  }
});
