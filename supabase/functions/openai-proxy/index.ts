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

const pdfExerciseContext = `

PDF CONTEXT RULES:
First identify the PDF type from its content and headings.
1. If it is a homework, worksheet, test, or exam PDF, extract every actual exercise in the document. Do not omit questions.
2. If it is a lesson, lecture, textbook, handout, or teaching-slides PDF, do NOT turn all explanatory lesson text into questions. Instead, identify core vocabulary explicitly taught or emphasized and create concise vocabulary-retrieval questions only for that vocabulary. Extract every actual in-class exercise, practice, task, worksheet, review, or quiz, especially sections near the lower/end part of the document. Ignore long explanations, grammar theory, teaching-only examples, headers, and decorative text unless they are explicitly an exercise.
3. Preserve real exercises accurately enough for a learner to answer. Do not create a question from every sentence in a lesson.
4. For MATCHING, question contains the left entries separated by " | ", options contains every right entry, and answer is a JSON array of every pair: [{"left":"a","right":"apple"}].`;

const imageExerciseRegionSchema = `
IMAGE REGION OUTPUT REQUIREMENT: Every exercise object MUST include the key "imageRegion". For a text-only exercise, set "imageRegion": null. For an exercise which needs an illustration, picture, diagram, or image to answer, set it to exactly {"x":number,"y":number,"width":number,"height":number}. Coordinates must be normalized from 0 to 1 relative to the complete uploaded image. The rectangle must tightly contain only the illustration(s) needed for that one exercise. Never omit this key for a visual exercise.`;

const cleanJson = (text: string) => {
  const trimmed = text.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  return fenced ? fenced[1].trim() : trimmed;
};

const imageRegionPassPrompt = (exercises: string) => `You are an image-region detector. Inspect the uploaded worksheet image and the exercise array below. Return ONLY one valid JSON object with this exact shape: {"visualExerciseIndexes":[number],"imageRegion":{"x":number,"y":number,"width":number,"height":number}|null}. visualExerciseIndexes contains only the exercises that actually require a picture, diagram, or illustration to answer. imageRegion is ONE shared, normalized 0-1 rectangle that contains all illustrations required by those exercises together. Make it a practical large crop: include the complete visual exercise block and its answer blanks, but exclude headers, unrelated text-only exercises, and page footer. If no exercise needs an image, return an empty index array and null. Do not return individual regions per question.

Exercises:
${exercises}`;

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

const matchingResolverPrompt = (data: { question: string; options: string[]; instruction: string }) => `Resolve this English matching exercise. Return ONLY a JSON array, with one object for every right-side option: [{"left":"one exact left item","right":"one exact option"}].
Left-side items: "${data.question}". Right-side options: ${JSON.stringify(data.options)}. Vietnamese instruction: "${data.instruction}".
Infer the intended relation from the items and instruction. Do not omit options.`;

const imageVocabularyPrompt = `Read this vocabulary image carefully. Return ONLY a valid JSON array, with no markdown. Extract up to 50 distinct English vocabulary words or phrases that are clearly intended for study. Keep the English exactly as shown where possible. Use Vietnamese meaning shown in the image; if it is missing, provide a concise accurate Vietnamese translation. Include IPA and a short example only when they are clearly visible or reliable. Do not include headings, page numbers, instructions, duplicates, or long explanatory sentences.
Format: [{"word":"English word or phrase","meaning":"nghĩa tiếng Việt","ipa":"/ipa/ or empty string","example":"short example or empty string"}].`;

const sumCosts = (payload: any) => (payload?.data || []).flatMap((bucket: any) => bucket.results || []).reduce((sum: number, item: any) => sum + Number(item?.amount?.value || 0), 0);
const sumRequests = (payload: any) => (payload?.data || []).flatMap((bucket: any) => bucket.results || []).reduce((sum: number, item: any) => sum + Number(item?.num_model_requests || 0), 0);

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
    if (body.action === 'usage_summary') {
      const adminKey = Deno.env.get('OPENAI_ADMIN_KEY');
      if (!adminKey) return json({ ok: false, error: 'Chưa cấu hình OPENAI_ADMIN_KEY trên Supabase.' }, 500);
      const now = new Date();
      const todayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
      const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
      const endTime = Math.floor(now.getTime() / 1000);
      const adminHeaders = { Authorization: `Bearer ${adminKey}` };
      const makeUrl = (path: string, start: Date) => `https://api.openai.com${path}?start_time=${Math.floor(start.getTime() / 1000)}&end_time=${endTime}&bucket_width=1d&limit=31`;
      const [todayCostsResponse, monthCostsResponse, todayUsageResponse] = await Promise.all([
        fetch(makeUrl('/v1/organization/costs', todayStart), { headers: adminHeaders }),
        fetch(makeUrl('/v1/organization/costs', monthStart), { headers: adminHeaders }),
        fetch(makeUrl('/v1/organization/usage/completions', todayStart), { headers: adminHeaders }),
      ]);
      if (!todayCostsResponse.ok || !monthCostsResponse.ok || !todayUsageResponse.ok) {
        return json({ ok: false, error: 'Không lấy được dữ liệu Usage/Costs từ OpenAI. Kiểm tra quyền Admin key.' }, 502);
      }
      const [todayCosts, monthCosts, todayUsage] = await Promise.all([todayCostsResponse.json(), monthCostsResponse.json(), todayUsageResponse.json()]);
      const { data: events } = await supabase.from('ai_usage_events').select('action,input_tokens,output_tokens').eq('owner_id', user.id).gte('created_at', monthStart.toISOString());
      const actionUsage = (events || []).reduce((groups: Record<string, number>, event: any) => ({ ...groups, [event.action]: (groups[event.action] || 0) + Number(event.input_tokens || 0) + Number(event.output_tokens || 0) * 4 }), {});
      const topAction = Object.entries(actionUsage).sort((a, b) => b[1] - a[1])[0];
      const creditBalanceUsd = Number(Deno.env.get('OPENAI_CREDIT_BALANCE_USD') || 0);
      return json({ ok: true, todayCostUsd: sumCosts(todayCosts), monthCostUsd: sumCosts(monthCosts), todayRequests: sumRequests(todayUsage), creditBalanceUsd, topAction: topAction ? { action: topAction[0], estimatedTokenWeight: topAction[1] } : null });
    }

    const apiKey = Deno.env.get('OPENAI_API_KEY');
    if (!apiKey) return json({ ok: false, error: 'Chưa cấu hình OPENAI_API_KEY trên Supabase.' }, 500);
    const model = Deno.env.get('OPENAI_MODEL') || 'gpt-4o-mini';
    let input: any;

    if (body.action === 'extract_exercises') {
      if (!['image', 'pdf'].includes(body.sourceType) || typeof body.content !== 'string') return json({ ok: false, error: 'Dữ liệu tài liệu không hợp lệ.' }, 400);
      input = [{ role: 'user', content: [
        { type: 'input_text', text: `${exercisePrompt}${body.sourceType === 'pdf' ? pdfExerciseContext : ''}\n\nFor MATCHING, question MUST contain the left-side entries separated by " | ", options MUST contain the right-side entries, and answer MUST be a JSON array of exact pairs, for example [{"left":"a","right":"apple"},{"left":"an","right":"orange"}]. Never leave MATCHING answer blank.${body.sourceType === 'image' ? imageExerciseRegionSchema : ''}` },
        body.sourceType === 'pdf'
          ? { type: 'input_file', filename: String(body.filename || 'worksheet.pdf'), file_data: body.content }
          : { type: 'input_image', image_url: body.content, detail: 'high' },
      ] }];
    } else if (body.action === 'extract_vocabulary' && typeof body.content === 'string') {
      input = [{ role: 'user', content: [
        { type: 'input_text', text: imageVocabularyPrompt },
        { type: 'input_image', image_url: body.content, detail: 'high' },
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
    } else if (body.action === 'resolve_matching_pairs'
      && typeof body.question === 'string'
      && Array.isArray(body.options)) {
      input = [{ role: 'user', content: [{ type: 'input_text', text: matchingResolverPrompt({
        question: body.question.slice(0, 1000),
        options: body.options.map(String).slice(0, 50),
        instruction: typeof body.instruction === 'string' ? body.instruction.slice(0, 1000) : '',
      }) }] }];
    } else {
      return json({ ok: false, error: 'Yêu cầu không hợp lệ.' }, 400);
    }

    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, temperature: 0.1, max_output_tokens: body.action === 'extract_exercises' ? 6000 : body.action === 'extract_vocabulary' ? 4000 : 500, input }),
    });
    if (!response.ok) return json({ ok: false, error: `OpenAI API error: ${await response.text()}` }, response.status);
    const responsePayload = await response.json();
    const usage = responsePayload.usage || {};
    let finalOutput = outputText(responsePayload);
    let regionUsage = { input_tokens: 0, output_tokens: 0 };

    // A dedicated visual pass is substantially more reliable than asking one response
    // to both transcribe every exercise and calculate image coordinates.
    if (body.action === 'extract_exercises' && body.sourceType === 'image' && typeof body.content === 'string') {
      try {
        const exercises = JSON.parse(cleanJson(finalOutput));
        if (Array.isArray(exercises) && exercises.length) {
          // Ignore any per-question region from the extraction pass. We save one shared
          // visual block per page, which is clearer for the learner and avoids bad matches.
          exercises.forEach((exercise: any) => delete exercise.imageRegion);
          const regionResponse = await fetch('https://api.openai.com/v1/responses', {
            method: 'POST',
            headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              model,
              temperature: 0,
              max_output_tokens: 1800,
              input: [{ role: 'user', content: [
                { type: 'input_text', text: imageRegionPassPrompt(JSON.stringify(exercises.map((item: any, index: number) => ({ index, instruction: item.instruction, question: item.question })))) },
                { type: 'input_image', image_url: body.content, detail: 'high' },
              ] }],
            }),
          });
          if (regionResponse.ok) {
            const regionPayload = await regionResponse.json();
            regionUsage = regionPayload.usage || regionUsage;
            const regionGroup = JSON.parse(cleanJson(outputText(regionPayload)));
            if (regionGroup && typeof regionGroup === 'object') {
              const indexes = Array.isArray(regionGroup.visualExerciseIndexes) ? regionGroup.visualExerciseIndexes : [];
              indexes.forEach((rawIndex: unknown) => {
                const index = Number(rawIndex);
                if (Number.isInteger(index) && exercises[index] && regionGroup.imageRegion) exercises[index].imageRegion = regionGroup.imageRegion;
              });
              finalOutput = JSON.stringify(exercises);
            }
          }
        }
      } catch (error) {
        console.error('Image region pass failed', error);
      }
    }

    await supabase.from('ai_usage_events').insert({
      owner_id: user.id,
      action: body.action,
      model,
      input_tokens: Number(usage.input_tokens || 0) + Number(regionUsage.input_tokens || 0),
      output_tokens: Number(usage.output_tokens || 0) + Number(regionUsage.output_tokens || 0),
    });
    return json({ ok: true, outputText: finalOutput });
  } catch (error) {
    return json({ ok: false, error: error instanceof Error ? error.message : 'Backend AI gặp lỗi.' }, 500);
  }
});
