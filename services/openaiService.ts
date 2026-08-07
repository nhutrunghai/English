import { ExerciseItem, ExerciseType } from '../types';
import { supabase } from './supabaseService';

const ALLOWED_TYPES: ExerciseType[] = ['VOCAB', 'MATCHING', 'FILL_BLANK', 'REWRITE', 'MULTIPLE_CHOICE', 'TRUE_FALSE', 'ORDERING', 'SHORT_ANSWER'];

const cleanJson = (text: string) => {
  const trimmed = text.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  return fenced ? fenced[1].trim() : trimmed;
};

const normalizeType = (type: string): ExerciseType => ALLOWED_TYPES.includes(type as ExerciseType) ? type as ExerciseType : 'VOCAB';

const toExercises = (outputText: string): ExerciseItem[] => {
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
