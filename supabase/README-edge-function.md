# OpenAI backend an toàn

Frontend chỉ gọi Supabase Edge Function `openai-proxy`; không đặt `VITE_OPENAI_API_KEY` trong web nữa.

Từ thư mục project, cài Supabase CLI nếu máy chưa có, sau đó đăng nhập và liên kết project:

```bash
npm install -g supabase
supabase login
supabase link --project-ref <PROJECT_REF>
```

Đặt OpenAI key chỉ trong Supabase Secrets và deploy function:

```bash
supabase secrets set OPENAI_API_KEY=<OPENAI_API_KEY> OPENAI_MODEL=gpt-4o-mini
supabase functions deploy openai-proxy
```

Chạy `supabase/ensure_exercise_items.sql` trong Supabase SQL Editor để bảo đảm bảng lưu bài tập có đủ cột và RLS policy đúng.
