import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const exercisePrompt = `Phân tích TOÀN BỘ tài liệu bài tập tiếng Anh. Trả về DUY NHẤT một JSON array hợp lệ, không thêm text ngoài JSON.

Mỗi bài tập là một object:
{
  "type": "VOCAB" | "MATCHING" | "FILL_BLANK" | "REWRITE" | "MULTIPLE_CHOICE" | "TRUE_FALSE" | "ORDERING" | "SHORT_ANSWER",
  "instruction": "hướng dẫn ngắn gọn bằng tiếng Việt",
  "question": "câu hỏi/từ/câu tiếng Anh giữ nguyên như trong tài liệu",
  "answer": "đáp án đúng",
  "options": ["các lựa chọn nếu có, nếu không thì []"]
}

Trích xuất tất cả bài tập, mỗi câu hỏi là một object riêng. Với ORDERING, ngăn cách các từ trong question bằng " | ". Với MATCHING, question là vế trái và options là các vế phải. Giữ nguyên tiếng Anh trong question, chỉ dịch instruction. options phải gồm đáp án đúng của MULTIPLE_CHOICE; không có lựa chọn thì dùng [].`;

const vocabularyPrompt = (word: string) => `Bạn là trợ lý từ điển Anh-Việt. Trả về DUY NHẤT JSON object hợp lệ cho từ/cụm từ: "${word}".
{"meaning":"nghĩa tiếng Việt ngắn gọn","ipa":"phiên âm IPA","example":"1 câu ví dụ tiếng Anh ngắn + nghĩa tiếng Việt trong ngoặc"}`;

const outputText = (payload: any) => payload.output_text || payload.output?.flatMap((item: any) => item.content || []).map((content: any) => content.text || '').join('') || '';
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return json({ ok: false, error: 'Method not allowed.' }, 405);

  const authorization = request.headers.get('Authorization');
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseAnonKey, { global: { headers: { Authorization: authorization || '' } } });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return json({ ok: false, error: 'Bạn cần đăng nhập để dùng AI.' }, 401);

  try {
    const body = await request.json();
    const apiKey = Deno.env.get('OPENAI_API_KEY');
    if (!apiKey) return json({ ok: false, error: 'Chưa cấu hình OPENAI_API_KEY trên Supabase.' }, 500);
    const model = Deno.env.get('OPENAI_MODEL') || 'gpt-4o-mini';
    let input: any;

    if (body.action === 'extract_exercises') {
      if (!['image', 'pdf'].includes(body.sourceType) || typeof body.content !== 'string') return json({ ok: false, error: 'Dữ liệu tài liệu không hợp lệ.' }, 400);
      input = [{ role: 'user', content: [
        { type: 'input_text', text: exercisePrompt },
        body.sourceType === 'pdf'
          ? { type: 'input_file', filename: String(body.filename || 'worksheet.pdf'), file_data: body.content }
          : { type: 'input_image', image_url: body.content, detail: 'high' },
      ] }];
    } else if (body.action === 'enrich_vocabulary' && typeof body.word === 'string') {
      input = [{ role: 'user', content: [{ type: 'input_text', text: vocabularyPrompt(body.word.trim()) }] }];
    } else {
      return json({ ok: false, error: 'Yêu cầu không hợp lệ.' }, 400);
    }

    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, temperature: 0.1, max_output_tokens: body.action === 'extract_exercises' ? 6000 : 500, input }),
    });
    if (!response.ok) return json({ ok: false, error: `OpenAI API error: ${await response.text()}` }, response.status);
    return json({ ok: true, outputText: outputText(await response.json()) });
  } catch (error) {
    return json({ ok: false, error: error instanceof Error ? error.message : 'Backend AI gặp lỗi.' }, 500);
  }
});
