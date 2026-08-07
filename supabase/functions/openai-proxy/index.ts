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

const evaluationPrompt = (data: { word: string; meaning: string; example: string; answer: string; direction: string; responseSeconds: number; reviewCount: number; lapseCount: number; intervalDays: number }) => `You assess a Vietnamese learner's active-recall answer for one English vocabulary item. Return ONLY valid JSON, no markdown.

Item: English "${data.word}"; Vietnamese meaning "${data.meaning}"; example "${data.example}".
Question direction: ${data.direction === 'en_to_vi' ? 'English to Vietnamese meaning' : 'Vietnamese meaning to English word'}.
Learner answer: "${data.answer}".
Observed signals: response time ${data.responseSeconds}s; previous reviews ${data.reviewCount}; previous lapses ${data.lapseCount}; current interval ${data.intervalDays} days.

Judge semantic equivalence, not exact spelling alone. Accept reasonable Vietnamese synonyms, concise answers, and minor typos that do not change meaning. Treat blank or materially wrong answers as incorrect. Use the learner history and response time only to distinguish recall strength after correctness; do not mark a semantically correct answer wrong merely for being slow.

Choose one rating: "again" for blank/materially wrong; "hard" for partially correct, uncertain, or correct but notably slow/repeatedly forgotten; "good" for a correct normal recall; "easy" only for a clearly correct, prompt answer with a stable successful history.
Return exactly: {"rating":"again|hard|good|easy","isCorrect":true,"confidence":0.0,"reason":"short Vietnamese explanation"}.`;

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
        { type: 'input_text', text: `${exercisePrompt}\n\nFor MATCHING, question MUST contain the left-side entries separated by " | ", options MUST contain the right-side entries, and answer MUST be a JSON array of exact pairs, for example [{"left":"a","right":"apple"},{"left":"an","right":"orange"}]. Never leave MATCHING answer blank.` },
        body.sourceType === 'pdf'
          ? { type: 'input_file', filename: String(body.filename || 'worksheet.pdf'), file_data: body.content }
          : { type: 'input_image', image_url: body.content, detail: 'high' },
      ] }];
    } else if (body.action === 'enrich_vocabulary' && typeof body.word === 'string') {
      input = [{ role: 'user', content: [{ type: 'input_text', text: vocabularyPrompt(body.word.trim()) }] }];
    } else if (body.action === 'evaluate_vocabulary_answer'
      && ['en_to_vi', 'vi_to_en'].includes(body.direction)
      && typeof body.word === 'string'
      && typeof body.meaning === 'string'
      && typeof body.answer === 'string') {
      input = [{ role: 'user', content: [{ type: 'input_text', text: evaluationPrompt({
        word: body.word.slice(0, 200),
        meaning: body.meaning.slice(0, 500),
        example: typeof body.example === 'string' ? body.example.slice(0, 800) : '',
        answer: body.answer.slice(0, 1000),
        direction: body.direction,
        responseSeconds: Number(body.responseSeconds) || 0,
        reviewCount: Number(body.reviewCount) || 0,
        lapseCount: Number(body.lapseCount) || 0,
        intervalDays: Number(body.intervalDays) || 0,
      }) }] }];
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
