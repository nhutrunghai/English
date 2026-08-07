<div align="center">

# 📸 LingoSnap

### Web học từ vựng cá nhân từ ảnh bài tập

![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)
![OpenAI](https://img.shields.io/badge/OpenAI-111827?style=for-the-badge&logo=openai&logoColor=white)

</div>

---

## 💡 Ý tưởng

**LingoSnap** giúp người học tiếng Anh lưu từ vựng nhanh hơn bằng cách upload ảnh bài tập. Ứng dụng dùng AI để trích xuất nội dung, lưu dữ liệu học tập vào Supabase và hỗ trợ ôn tập qua quiz/phát âm/Pomodoro.

> Chụp ảnh bài tập → AI đọc nội dung → lưu từ vựng → ôn tập lại khi cần.

---

## ✨ Tính năng chính

| Nhóm | Mô tả |
|---|---|
| 📷 Nhận diện từ ảnh | Upload ảnh bài tập để AI trích xuất nội dung |
| 🧠 AI hỗ trợ học | Dùng OpenAI để xử lý từ/câu trong ảnh |
| 🗂️ Lưu từ vựng | Lưu bài học và vocabulary theo tài khoản Supabase |
| 🧪 Quiz ôn tập | Luyện lại từ vựng đã lưu |
| 🔊 Phát âm | Hỗ trợ học phát âm/từ vựng |
| 🍅 Pomodoro | Ghi nhận phiên học và streak |

---

## 🏗️ Cấu trúc project

```text
English/
├── App.tsx          # Giao diện và luồng chính
├── components/      # Component UI
├── services/        # Logic gọi API/service
├── supabase/        # Schema SQL Supabase
├── config.ts        # Cấu hình runtime
├── types.ts         # TypeScript types
├── index.tsx        # Entry React
└── vite.config.ts   # Cấu hình Vite
```

---

## ⚙️ Cấu hình môi trường

Tạo file `.env.local`:

```env
VITE_SUPABASE_URL=your-project-url
VITE_SUPABASE_ANON_KEY=your-publishable-or-anon-key
```

> Lưu ý: nếu deploy web tĩnh, API key phía client có thể bị lộ. Chỉ nên dùng cho project cá nhân và đặt usage limit.

---

## 🚀 Chạy local

```bash
npm install
npm run dev
```

---

## 🧱 Cấu hình Supabase

1. Tạo project Supabase.
2. Mở SQL Editor.
3. Chạy nội dung trong `supabase/schema.sql`.
4. Lấy `Project URL` và `Anon/Public key` đưa vào `.env.local`.

---

## 🧭 Roadmap

- [ ] Tách API OpenAI sang backend/serverless để bảo mật key
- [ ] Thêm thống kê tiến độ học từ vựng
- [ ] Thêm bộ lọc theo chủ đề/ngày học
- [ ] Tối ưu UI mobile
- [ ] Thêm export/import dữ liệu học tập

---

<div align="center">

Made with 📚 + 🤖 by [Nhữ Trung Hải](https://github.com/nhutrunghai)

</div>
