import { ExerciseItem, ExerciseType } from '../types';

const OPENAI_API_URL = 'https://api.openai.com/v1/responses';
const DEFAULT_MODEL = 'gpt-4o-mini';

const getOpenAIConfig = () => {
  const apiKey = import.meta.env.VITE_OPENAI_API_KEY as string | undefined;
  const model = (import.meta.env.VITE_OPENAI_MODEL as string | undefined) || DEFAULT_MODEL;
  if (!apiKey) throw new Error('Chưa cấu hình VITE_OPENAI_API_KEY.');
  return { apiKey, model };
};

const cleanJson = (text: string) => {
  const trimmed = text.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  return fenced ? fenced[1].trim() : trimmed;
};

const ALLOWED_TYPES: ExerciseType[] = ['VOCAB','MATCHING','FILL_BLANK','REWRITE','MULTIPLE_CHOICE','TRUE_FALSE','ORDERING','SHORT_ANSWER'];
const normalizeType = (type: string): ExerciseType => ALLOWED_TYPES.includes(type as ExerciseType) ? type as ExerciseType : 'VOCAB';

export const extractExercisesFromImage = async (base64Image: string): Promise<ExerciseItem[]> => {
  const { apiKey, model } = getOpenAIConfig();

  const response = await fetch(OPENAI_API_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      temperature: 0.1,
      max_output_tokens: 3000,
      input: [{
        role: 'user',
        content: [
          {
            type: 'input_text',
            text: `Phân tích ảnh bài tập tiếng Anh. Trả về DUY NHẤT một JSON array hợp lệ, không thêm text ngoài JSON.

Mỗi bài tập là một object với schema:
{
  "type": "VOCAB" | "MATCHING" | "FILL_BLANK" | "REWRITE" | "MULTIPLE_CHOICE" | "TRUE_FALSE" | "ORDERING" | "SHORT_ANSWER",
  "instruction": "hướng dẫn ngắn gọn bằng tiếng Việt",
  "question": "câu hỏi/từ/câu tiếng Anh giữ nguyên như trong ảnh",
  "answer": "đáp án đúng",
  "options": ["các lựa chọn nếu có, nếu không thì []"]
}

Quy tắc phân loại type:
- VOCAB: từ vựng, cặp từ-nghĩa, vocabulary list
- MATCHING: nối từ với nghĩa, nối cặp (A-B), nối ảnh mô tả
- FILL_BLANK: điền từ vào chỗ trống (___), chọn từ đúng điền vào
- REWRITE: viết lại câu, sắp xếp câu, đổi dạng câu
- MULTIPLE_CHOICE: trắc nghiệm A/B/C/D có đáp án chọn
- TRUE_FALSE: đúng/sai, True/False, Yes/No
- ORDERING: sắp xếp các từ thành câu, sắp xếp thứ tự đoạn văn
- SHORT_ANSWER: câu trả lời ngắn tự do

Lưu ý:
- Phân tích TOÀN BỘ ảnh, trích xuất TẤT CẢ câu hỏi/bài tập
- Mỗi câu hỏi là một object riêng
- Nếu bài ORDERING, để "question" là các từ cần sắp xếp, ngăn cách bằng " | "
- Nếu bài MATCHING, để "options" là danh sách VẾ PHẢI, "question" là VẾ TRÁI
- Giữ nguyên tiếng Anh trong "question", chỉ dịch trong "instruction"
- "options" phải bao gồm cả đáp án đúng với MULTIPLE_CHOICE
- Không có options thì để []`
          },
          { type: 'input_image', image_url: base64Image, detail: 'high' },
        ],
      }],
    }),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`OpenAI API error: ${message}`);
  }

  const payload = await response.json();
  const outputText =
    payload.output_text ||
    payload.output?.flatMap((item: any) => item.content || []).map((content: any) => content.text || '').join('') ||
    '[]';

  const data = JSON.parse(cleanJson(outputText));
  if (!Array.isArray(data)) return [];

  return data.map((item: any) => ({
    id: crypto.randomUUID(),
    listId: '',
    type: normalizeType(String(item.type || 'VOCAB')),
    instruction: String(item.instruction || 'Làm bài tập'),
    question: String(item.question || ''),
    answer: String(item.answer || ''),
    options: Array.isArray(item.options) ? item.options.map(String) : [],
    imageB64: '',
    dateLearned: new Date().toLocaleDateString('vi-VN'),
  })).filter(item => item.question || item.answer);
};

const readFileAsDataUrl = (file: File): Promise<string> => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onerror = () => reject(new Error('Không thể đọc file PDF.'));
  reader.onload = () => resolve(String(reader.result || ''));
  reader.readAsDataURL(file);
});

export const extractExercisesFromPdf = async (file: File): Promise<ExerciseItem[]> => {
  if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
    throw new Error('File đã chọn không phải PDF.');
  }

  const { apiKey, model } = getOpenAIConfig();
  const fileData = await readFileAsDataUrl(file);
  const response = await fetch(OPENAI_API_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      temperature: 0.1,
      max_output_tokens: 6000,
      input: [{
        role: 'user',
        content: [
          {
            type: 'input_text',
            text: `Đọc TOÀN BỘ file PDF bài tập tiếng Anh và trả về DUY NHẤT một JSON array hợp lệ, không thêm text ngoài JSON.

Mỗi bài tập là một object:
{
  "type": "VOCAB" | "MATCHING" | "FILL_BLANK" | "REWRITE" | "MULTIPLE_CHOICE" | "TRUE_FALSE" | "ORDERING" | "SHORT_ANSWER",
  "instruction": "hướng dẫn ngắn gọn bằng tiếng Việt",
  "question": "câu hỏi/từ/câu tiếng Anh giữ nguyên như trong PDF",
  "answer": "đáp án đúng",
  "options": ["các lựa chọn nếu có, nếu không thì []"]
}

Quy tắc: VOCAB cho từ vựng; MATCHING cho nối cặp; FILL_BLANK cho điền từ; REWRITE cho viết/sắp xếp lại câu; MULTIPLE_CHOICE cho trắc nghiệm; TRUE_FALSE cho đúng/sai; ORDERING cho sắp xếp; SHORT_ANSWER cho câu trả lời ngắn.
- Trích xuất tất cả bài tập và mỗi câu hỏi là một object riêng.
- Với ORDERING, ngăn cách các từ trong question bằng " | ".
- Với MATCHING, question là vế trái và options là các vế phải.
- Giữ nguyên tiếng Anh trong question, chỉ dịch instruction.
- options phải gồm đáp án đúng của MULTIPLE_CHOICE; không có lựa chọn thì dùng [].`,
          },
          { type: 'input_file', filename: file.name, file_data: fileData },
        ],
      }],
    }),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`OpenAI API error: ${message}`);
  }

  const payload = await response.json();
  const outputText =
    payload.output_text ||
    payload.output?.flatMap((item: any) => item.content || []).map((content: any) => content.text || '').join('') ||
    '[]';
  const data = JSON.parse(cleanJson(outputText));
  if (!Array.isArray(data)) return [];

  return data.map((item: any) => ({
    id: crypto.randomUUID(),
    listId: '',
    type: normalizeType(String(item.type || 'VOCAB')),
    instruction: String(item.instruction || 'Làm bài tập'),
    question: String(item.question || ''),
    answer: String(item.answer || ''),
    options: Array.isArray(item.options) ? item.options.map(String) : [],
    imageB64: '',
    dateLearned: new Date().toLocaleDateString('vi-VN'),
  })).filter(item => item.question || item.answer);
};

export const enrichVocabularyWord = async (word: string): Promise<{ meaning: string; ipa: string; example: string }> => {
  const { apiKey, model } = getOpenAIConfig();
  const cleanWord = word.trim();
  if (!cleanWord) throw new Error('Bạn cần nhập từ vựng trước.');

  const response = await fetch(OPENAI_API_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      temperature: 0.1,
      max_output_tokens: 500,
      input: [{
        role: 'user',
        content: [{
          type: 'input_text',
          text: `Bạn là trợ lý từ điển Anh-Việt. Trả về DUY NHẤT JSON object hợp lệ cho từ/cụm từ: "${cleanWord}".

Schema:
{
  "meaning": "nghĩa tiếng Việt ngắn gọn, ưu tiên nghĩa thông dụng",
  "ipa": "phiên âm IPA chuẩn, nếu có US/UK thì ghi dạng /.../ hoặc UK /.../ US /.../",
  "example": "1 câu ví dụ tiếng Anh ngắn + nghĩa tiếng Việt trong ngoặc"
}

Không thêm markdown, không giải thích ngoài JSON.`
        }],
      }],
    }),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`OpenAI API error: ${message}`);
  }

  const payload = await response.json();
  const outputText =
    payload.output_text ||
    payload.output?.flatMap((item: any) => item.content || []).map((content: any) => content.text || '').join('') ||
    '{}';
  const data = JSON.parse(cleanJson(outputText));

  return {
    meaning: String(data.meaning || ''),
    ipa: String(data.ipa || ''),
    example: String(data.example || ''),
  };
};
