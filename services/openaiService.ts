import { ExerciseItem, ExerciseType, VocaWord } from '../types';
import { supabase } from './supabaseService';
import { GlobalWorkerOptions, getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';

GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/legacy/build/pdf.worker.mjs', import.meta.url).toString();

const ALLOWED_TYPES: ExerciseType[] = ['VOCAB', 'MATCHING', 'FILL_BLANK', 'REWRITE', 'MULTIPLE_CHOICE', 'TRUE_FALSE', 'ORDERING', 'SHORT_ANSWER'];

const cleanJson = (text: string) => {
  const trimmed = text.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  return fenced ? fenced[1].trim() : trimmed;
};

const normalizeType = (type: string): ExerciseType => ALLOWED_TYPES.includes(type as ExerciseType) ? type as ExerciseType : 'VOCAB';

const normalizeImageRegion = (value: any): ExerciseItem['imageRegion'] => {
  const toNormalizedNumber = (raw: unknown) => {
    const text = String(raw ?? '').trim();
    const parsed = Number.parseFloat(text);
    if (!Number.isFinite(parsed)) return NaN;
    return text.endsWith('%') || parsed > 1 ? parsed / 100 : parsed;
  };
  const x = toNormalizedNumber(value?.x ?? value?.left ?? value?.[0]);
  const y = toNormalizedNumber(value?.y ?? value?.top ?? value?.[1]);
  const right = toNormalizedNumber(value?.right);
  const bottom = toNormalizedNumber(value?.bottom);
  const width = toNormalizedNumber(value?.width ?? (Number.isFinite(right) ? right - x : value?.[2]));
  const height = toNormalizedNumber(value?.height ?? (Number.isFinite(bottom) ? bottom - y : value?.[3]));
  if (![x, y, width, height].every(Number.isFinite) || x < 0 || y < 0 || width <= 0 || height <= 0) return undefined;
  return {
    x: Math.min(1, x),
    y: Math.min(1, y),
    width: Math.min(1 - Math.min(1, x), width),
    height: Math.min(1 - Math.min(1, y), height),
  };
};

const toExercises = (outputText: string): ExerciseItem[] => {
  const data = JSON.parse(cleanJson(outputText));
  if (!Array.isArray(data)) return [];
  const preparedData = data.map((item: any) => {
    const type = normalizeType(String(item.type || 'VOCAB'));
    const pairs = Array.isArray(item.answer) ? item.answer
      .filter((pair: any) => pair && typeof pair.left === 'string' && typeof pair.right === 'string')
      .map((pair: any) => ({ left: pair.left.trim(), right: pair.right.trim() })) : [];
    if (type !== 'MATCHING' || !pairs.length) return item;
    return {
      ...item,
      question: Array.from(new Set(pairs.map(pair => pair.left))).join(' | '),
      options: Array.from(new Set(pairs.map(pair => pair.right))),
      answer: JSON.stringify(pairs),
    };
  });

  return preparedData.map((item: any) => ({
    id: crypto.randomUUID(),
    listId: '',
    type: normalizeType(String(item.type || 'VOCAB')),
    instruction: String(item.instruction || 'Làm bài tập'),
    question: String(item.question || ''),
    answer: String(item.answer || ''),
    options: Array.isArray(item.options) ? item.options.map(String) : [],
    imageB64: '',
    imageRegion: normalizeImageRegion(item.imageRegion ?? item.image_region ?? item.region ?? item.boundingBox),
    dateLearned: new Date().toLocaleDateString('vi-VN'),
  })).filter(item => item.question || item.answer);
};

const invokeOpenAI = async (body: Record<string, unknown>) => {
  if (!supabase) throw new Error('Chưa cấu hình Supabase.');

  const { data, error } = await supabase.functions.invoke('openai-proxy', { body });
  if (error) throw new Error(error.message);
  if (!data?.ok) throw new Error(data?.error || 'OpenAI backend không phản hồi.');
  return data;
};

export const extractExercisesFromImage = async (base64Image: string): Promise<ExerciseItem[]> => {
  const data = await invokeOpenAI({ action: 'extract_exercises', sourceType: 'image', content: base64Image });
  return toExercises(String(data.outputText || '[]'));
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

  const content = await readFileAsDataUrl(file);
  const data = await invokeOpenAI({ action: 'extract_exercises', sourceType: 'pdf', content, filename: file.name });
  return toExercises(String(data.outputText || '[]'));
};

export const renderPdfToImages = async (file: File): Promise<string[]> => {
  if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
    throw new Error('File Ä‘Ã£ chá»n khÃ´ng pháº£i PDF.');
  }
  const pdfDocument = await getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise;
  const maxPages = Math.min(pdfDocument.numPages, 12);
  const pages: string[] = [];
  for (let pageNumber = 1; pageNumber <= maxPages; pageNumber += 1) {
    const page = await pdfDocument.getPage(pageNumber);
    const viewport = page.getViewport({ scale: 1.8 });
    const canvas = document.createElement('canvas');
    canvas.width = Math.ceil(viewport.width);
    canvas.height = Math.ceil(viewport.height);
    const context = canvas.getContext('2d');
    if (!context) throw new Error('KhÃ´ng thá»ƒ render trang PDF.');
    await page.render({ canvasContext: context, viewport }).promise;
    pages.push(canvas.toDataURL('image/jpeg', 0.88));
  }
  return pages;
};

export const extractVocabularyFromImage = async (file: File): Promise<Array<Pick<VocaWord, 'word' | 'meaning' | 'ipa' | 'example'>>> => {
  if (!file.type.startsWith('image/')) throw new Error('Vui lòng chọn một file ảnh.');
  const content = await readFileAsDataUrl(file);
  const data = await invokeOpenAI({ action: 'extract_vocabulary', content, filename: file.name });
  let parsed: unknown;
  try {
    parsed = JSON.parse(cleanJson(String(data.outputText || '[]')));
  } catch {
    throw new Error('AI trả về danh sách từ chưa hoàn chỉnh. Hãy thử lại ảnh này hoặc cắt ảnh thành phần nhỏ hơn.');
  }
  if (!Array.isArray(parsed)) return [];
  return parsed.map((item: any) => ({
    word: String(item.word || '').trim(),
    meaning: String(item.meaning || '').trim(),
    ipa: String(item.ipa || '').trim(),
    example: String(item.example || '').trim(),
  })).filter(item => item.word);
};

export const enrichVocabularyWord = async (word: string): Promise<{ meaning: string; ipa: string; example: string }> => {
  const cleanWord = word.trim();
  if (!cleanWord) throw new Error('Bạn cần nhập từ vựng trước.');

  const data = await invokeOpenAI({ action: 'enrich_vocabulary', word: cleanWord });
  const result = JSON.parse(cleanJson(String(data.outputText || '{}')));
  return {
    meaning: String(result.meaning || ''),
    ipa: String(result.ipa || ''),
    example: String(result.example || ''),
  };
};

export type VocabularyAiRating = 'again' | 'hard' | 'good' | 'easy';

export interface VocabularyEvaluation {
  rating: VocabularyAiRating;
  isCorrect: boolean;
  confidence: number;
  reason: string;
}

export interface OpenAiUsageSummary {
  todayCostUsd: number;
  monthCostUsd: number;
  todayRequests: number;
  creditBalanceUsd: number;
  topAction: { action: string; estimatedTokenWeight: number } | null;
}

export const fetchOpenAiUsageSummary = async (): Promise<OpenAiUsageSummary> => {
  const data = await invokeOpenAI({ action: 'usage_summary' });
  return {
    todayCostUsd: Number(data.todayCostUsd || 0),
    monthCostUsd: Number(data.monthCostUsd || 0),
    todayRequests: Number(data.todayRequests || 0),
    creditBalanceUsd: Number(data.creditBalanceUsd || 0),
    topAction: data.topAction?.action ? { action: String(data.topAction.action), estimatedTokenWeight: Number(data.topAction.estimatedTokenWeight || 0) } : null,
  };
};

export const evaluateVocabularyAnswer = async (word: VocaWord, answer: string, direction: 'en_to_vi' | 'vi_to_en', responseSeconds: number): Promise<VocabularyEvaluation> => {
  const data = await invokeOpenAI({
    action: 'evaluate_vocabulary_answer',
    word: word.word,
    meaning: word.meaning,
    example: word.example,
    answer,
    direction,
    responseSeconds: Math.max(0, Math.round(responseSeconds)),
    reviewCount: word.reviewCount || 0,
    lapseCount: word.lapseCount || 0,
    intervalDays: word.intervalDays || 0,
  });
  const result = JSON.parse(cleanJson(String(data.outputText || '{}')));
  const ratings: VocabularyAiRating[] = ['again', 'hard', 'good', 'easy'];
  return {
    rating: ratings.includes(result.rating) ? result.rating : 'hard',
    isCorrect: Boolean(result.isCorrect),
    confidence: Math.max(0, Math.min(1, Number(result.confidence) || 0)),
    reason: String(result.reason || 'AI đã đánh giá câu trả lời.'),
  };
};

export const resolveMatchingPairs = async (item: ExerciseItem): Promise<Record<string, string>> => {
  const data = await invokeOpenAI({ action: 'resolve_matching_pairs', question: item.question, options: item.options || [], instruction: item.instruction });
  const parsed = JSON.parse(cleanJson(String(data.outputText || '[]')));
  if (!Array.isArray(parsed)) return {};
  return parsed.reduce<Record<string, string>>((pairs, pair) => ({ ...pairs, [String(pair.right || '')]: String(pair.left || '') }), {});
};
