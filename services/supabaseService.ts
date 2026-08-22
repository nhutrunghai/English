import { createClient } from '@supabase/supabase-js';
import { ExerciseFolder, ExerciseItem, ExerciseProgress, InterviewItem, NoteItem, PomodoroSession, VocaFolder, VocaWord } from '../types';
import { StreakDayNote, StreakTask } from './streakTypes';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseKey);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl!, supabaseKey!)
  : null;

export const getCurrentUserId = async () => {
  if (!supabase) return null;
  const { data } = await supabase.auth.getUser();
  return data.user?.id || null;
};

const ownerId = async () => {
  const id = await getCurrentUserId();
  if (!id) throw new Error('Báº¡n cáº§n Ä‘Äƒng nháº­p Supabase trÆ°á»›c.');
  return id;
};

const normalizeExercise = (item: any): ExerciseItem => ({
  id: String(item.id || crypto.randomUUID()),
  listId: String(item.list_id || item.listId || 'default'),
  listName: String(item.list_name || item.listName || ''),
  folderId: String(item.folder_id || item.folderId || ''),
  type: item.type || 'VOCAB',
  imageB64: item.image_b64 || item.imageB64 || '',
  instruction: item.instruction || '',
  question: item.question || '',
  answer: item.answer || '',
  options: Array.isArray(item.options) ? item.options : [],
  dateLearned: item.date_learned || item.dateLearned || new Date().toLocaleDateString('vi-VN'),
});

export const fetchVocabulary = async (): Promise<ExerciseItem[]> => {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('exercise_items')
    .select('*')
    .eq('owner_id', await ownerId())
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data || []).map(normalizeExercise);
};

export const saveVocabularyList = async (items: ExerciseItem[]): Promise<boolean> => {
  if (!supabase || items.length === 0) return false;

  const userId = await ownerId();
  const { error } = await supabase.from('exercise_items').upsert(
    items.map(item => ({
      id: item.id || crypto.randomUUID(),
      owner_id: userId,
      list_id: item.listId || 'default',
      list_name: item.listName || '',
      folder_id: item.folderId || null,
      type: item.type || 'VOCAB',
      image_b64: item.imageB64 || '',
      instruction: item.instruction || '',
      question: item.question || '',
      answer: item.answer || '',
      options: item.options || [],
      date_learned: item.dateLearned || new Date().toLocaleDateString('vi-VN'),
    })),
    { onConflict: 'id' }
  );

  if (error) throw error;
  return true;
};

export const deleteVocabularyList = async (listId: string): Promise<boolean> => {
  if (!supabase) return false;

  const { error } = await supabase
    .from('exercise_items')
    .delete()
    .eq('owner_id', await ownerId())
    .eq('list_id', listId);

  if (error) throw error;
  return true;
};

export const fetchPomodoroSessions = async (): Promise<PomodoroSession[]> => {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('pomodoro_sessions')
    .select('*')
    .eq('owner_id', await ownerId())
    .order('completed_at', { ascending: false });

  if (error) throw error;
  return (data || []).map((row: any) => ({
    id: row.id,
    completedAt: row.completed_at,
    studyDate: row.study_date,
    minutes: row.minutes,
  }));
};

export const savePomodoroSession = async (minutes: number, studyDate?: string): Promise<PomodoroSession> => {
  if (!supabase) throw new Error('Supabase is not configured');

  const completedAt = new Date();
  const userId = await ownerId();
  const session = {
    owner_id: userId,
    completed_at: completedAt.toISOString(),
    study_date: studyDate || completedAt.toLocaleDateString('sv-SE'),
    minutes,
  };

  const { data, error } = await supabase
    .from('pomodoro_sessions')
    .insert(session)
    .select('*')
    .single();

  if (error) throw error;
  return {
    id: data.id,
    completedAt: data.completed_at,
    studyDate: data.study_date,
    minutes: data.minutes,
  };
};






export const fetchStreakTasks = async (): Promise<StreakTask[]> => {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('streak_tasks')
    .select('*')
    .eq('owner_id', await ownerId())
    .order('study_date', { ascending: true })
    .order('time_slot', { ascending: true });

  if (error) throw error;
  return (data || []).map((row: any) => ({
    id: row.id,
    studyDate: row.study_date,
    timeSlot: row.time_slot,
    subject: row.subject,
    durationHours: Number(row.duration_hours || 0),
    status: row.status || 'todo',
    notes: row.notes || '',
  }));
};

export const saveStreakTask = async (task: Partial<StreakTask> & { id: string }): Promise<boolean> => {
  if (!supabase) return false;

  const userId = await ownerId();
  const { error } = await supabase.from('streak_tasks').upsert({
    id: task.id,
    owner_id: userId,
    study_date: task.studyDate,
    time_slot: task.timeSlot,
    subject: task.subject,
    duration_hours: task.durationHours,
    status: task.status,
    notes: task.notes || '',
  });

  if (error) throw error;
  return true;
};

export const deleteStreakTask = async (id: string): Promise<boolean> => {
  if (!supabase) return false;

  const { error } = await supabase
    .from('streak_tasks')
    .delete()
    .eq('owner_id', await ownerId())
    .eq('id', id);

  if (error) throw error;
  return true;
};


export const fetchStreakDayNotes = async (): Promise<StreakDayNote[]> => {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('streak_day_notes')
    .select('*')
    .eq('owner_id', await ownerId())
    .order('study_date', { ascending: true });

  if (error) throw error;
  return (data || []).map((row: any) => ({
    studyDate: row.study_date,
    weekday: row.weekday || '',
    totalHours: row.total_hours || '',
    notes: row.notes || '',
  }));
};

export const saveStreakDayNote = async (dayNote: StreakDayNote): Promise<boolean> => {
  if (!supabase) return false;

  const userId = await ownerId();
  const { error } = await supabase.from('streak_day_notes').upsert({
    owner_id: userId,
    study_date: dayNote.studyDate,
    weekday: dayNote.weekday,
    total_hours: dayNote.totalHours,
    notes: dayNote.notes,
  }, { onConflict: 'owner_id,study_date' });

  if (error) throw error;
  return true;
};

export const deleteStreakDay = async (studyDate: string): Promise<boolean> => {
  if (!supabase) return false;

  const userId = await ownerId();
  const { error: tasksError } = await supabase
    .from('streak_tasks')
    .delete()
    .eq('owner_id', userId)
    .eq('study_date', studyDate);

  if (tasksError) throw tasksError;

  const { error: noteError } = await supabase
    .from('streak_day_notes')
    .delete()
    .eq('owner_id', userId)
    .eq('study_date', studyDate);

  if (noteError) throw noteError;
  return true;
};

export const renameVocabularyList = async (listId: string, name: string): Promise<boolean> => {
  if (!supabase) return false;

  const { error } = await supabase
    .from('exercise_items')
    .update({ list_name: name.trim() })
    .eq('owner_id', await ownerId())
    .eq('list_id', listId);

  if (error) throw error;
  return true;
};

export const fetchExerciseProgress = async (): Promise<ExerciseProgress[]> => {
  if (!supabase) return [];
  const { data, error } = await supabase.from('exercise_progress').select('*').eq('owner_id', await ownerId());
  if (error) throw error;
  return (data || []).map((row: any) => ({ listId: String(row.list_id), completedAt: String(row.completed_at), score: Number(row.score || 0), total: Number(row.total || 0) }));
};

export const saveExerciseProgress = async (listId: string, score: number, total: number): Promise<ExerciseProgress> => {
  if (!supabase) throw new Error('Supabase is not configured');
  const { data, error } = await supabase.from('exercise_progress').upsert({ owner_id: await ownerId(), list_id: listId, completed_at: new Date().toISOString(), score, total }, { onConflict: 'owner_id,list_id' }).select('*').single();
  if (error) throw error;
  return { listId: String(data.list_id), completedAt: String(data.completed_at), score: Number(data.score || 0), total: Number(data.total || 0) };
};

export const fetchExerciseFolders = async (): Promise<ExerciseFolder[]> => {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('exercise_folders')
    .select('*')
    .eq('owner_id', await ownerId())
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []).map((row: any) => ({ id: String(row.id), name: String(row.name), createdAt: String(row.created_at || '') }));
};

export const createExerciseFolder = async (name: string): Promise<ExerciseFolder> => {
  if (!supabase) throw new Error('Supabase is not configured');
  const { data, error } = await supabase
    .from('exercise_folders')
    .insert({ id: crypto.randomUUID(), owner_id: await ownerId(), name: name.trim() })
    .select('*')
    .single();
  if (error) throw error;
  return { id: String(data.id), name: String(data.name), createdAt: String(data.created_at || '') };
};

export const deleteExerciseFolder = async (folderId: string): Promise<boolean> => {
  if (!supabase) return false;
  const { error } = await supabase
    .from('exercise_folders')
    .delete()
    .eq('id', folderId)
    .eq('owner_id', await ownerId());
  if (error) throw error;
  return true;
};

export const moveVocabularyListToFolder = async (listId: string, folderId: string | null): Promise<boolean> => {
  if (!supabase) return false;
  const { error } = await supabase
    .from('exercise_items')
    .update({ folder_id: folderId })
    .eq('list_id', listId)
    .eq('owner_id', await ownerId());
  if (error) throw error;
  return true;
};

const normalizeVocaWord = (row: any): VocaWord => ({
  id: String(row.id || crypto.randomUUID()),
  word: String(row.word || ''),
  meaning: String(row.meaning || ''),
  ipa: String(row.ipa || ''),
  example: String(row.example || ''),
  note: String(row.note || ''),
  createdAt: String(row.created_at || ''),
  updatedAt: String(row.updated_at || row.created_at || ''),
  reviewCount: Number(row.review_count || 0),
  lapseCount: Number(row.lapse_count || 0),
  lastReviewedAt: String(row.last_reviewed_at || ''),
  nextReviewAt: String(row.next_review_at || ''),
  intervalDays: Number(row.interval_days || 0),
  easeFactor: Number(row.ease_factor || 2.5),
  folderId: String(row.folder_id || ''),
});

export const fetchVocaWords = async (): Promise<VocaWord[]> => {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('voca_words')
    .select('*')
    .eq('owner_id', await ownerId())
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data || []).map(normalizeVocaWord);
};

export const saveVocaWord = async (word: Partial<VocaWord> & { word: string }): Promise<VocaWord> => {
  if (!supabase) throw new Error('Supabase is not configured');

  const userId = await ownerId();
  const payload = {
    id: word.id || crypto.randomUUID(),
    owner_id: userId,
    word: word.word.trim(),
    meaning: word.meaning || '',
    ipa: word.ipa || '',
    example: word.example || '',
    note: word.note || '',
    review_count: word.reviewCount || 0,
    lapse_count: word.lapseCount || 0,
    last_reviewed_at: word.lastReviewedAt || null,
    next_review_at: word.nextReviewAt || null,
    interval_days: word.intervalDays || 0,
    ease_factor: word.easeFactor || 2.5,
    folder_id: word.folderId || null,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from('voca_words')
    .upsert(payload, { onConflict: 'id' })
    .select('*')
    .single();

  if (error) throw error;
  return normalizeVocaWord(data);
};

export const deleteVocaWord = async (id: string): Promise<boolean> => {
  if (!supabase) return false;

  const { error } = await supabase
    .from('voca_words')
    .delete()
    .eq('owner_id', await ownerId())
    .eq('id', id);

  if (error) throw error;
  return true;
};

export const fetchVocaFolders = async (): Promise<VocaFolder[]> => {
  if (!supabase) return [];
  const { data, error } = await supabase.from('voca_folders').select('*').eq('owner_id', await ownerId()).order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []).map((row: any) => ({ id: String(row.id), name: String(row.name), createdAt: String(row.created_at || '') }));
};

export const createVocaFolder = async (name: string): Promise<VocaFolder> => {
  if (!supabase) throw new Error('Supabase is not configured');
  const { data, error } = await supabase.from('voca_folders').insert({ owner_id: await ownerId(), name: name.trim() }).select('*').single();
  if (error) throw error;
  return { id: String(data.id), name: String(data.name), createdAt: String(data.created_at || '') };
};

export const deleteVocaFolder = async (id: string): Promise<boolean> => {
  if (!supabase) return false;
  const { error } = await supabase.from('voca_folders').delete().eq('id', id).eq('owner_id', await ownerId());
  if (error) throw error;
  return true;
};

export const moveVocaWordsToFolder = async (ids: string[], folderId: string | null): Promise<boolean> => {
  if (!supabase || !ids.length) return false;
  const { error } = await supabase.from('voca_words').update({ folder_id: folderId }).eq('owner_id', await ownerId()).in('id', ids);
  if (error) throw error;
  return true;
};

export const saveVocaReview = async (word: VocaWord): Promise<VocaWord> => {
  if (!supabase) throw new Error('Supabase is not configured');

  const userId = await ownerId();
  const { data, error } = await supabase
    .from('voca_words')
    .update({
      review_count: word.reviewCount,
      lapse_count: word.lapseCount,
      last_reviewed_at: word.lastReviewedAt || null,
      next_review_at: word.nextReviewAt || null,
      interval_days: word.intervalDays,
      ease_factor: word.easeFactor,
      updated_at: new Date().toISOString(),
    })
    .eq('id', word.id)
    .eq('owner_id', userId)
    .select('*')
    .single();

  if (error) throw error;
  return normalizeVocaWord(data);
};


const normalizeNoteItem = (row: any): NoteItem => ({
  id: String(row.id || crypto.randomUUID()),
  title: String(row.title || ''),
  content: String(row.content || ''),
  mode: row.mode === 'plain' ? 'plain' : 'markdown',
  tags: Array.isArray(row.tags) ? row.tags.map(String) : [],
  createdAt: String(row.created_at || ''),
  updatedAt: String(row.updated_at || row.created_at || ''),
});

export const fetchNotes = async (): Promise<NoteItem[]> => {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('notes')
    .select('*')
    .eq('owner_id', await ownerId())
    .order('updated_at', { ascending: false });

  if (error) throw error;
  return (data || []).map(normalizeNoteItem);
};

export const saveNote = async (note: Partial<NoteItem> & { title: string; content: string }): Promise<NoteItem> => {
  if (!supabase) throw new Error('Supabase is not configured');

  const userId = await ownerId();
  const payload = {
    id: note.id || crypto.randomUUID(),
    owner_id: userId,
    title: note.title.trim() || 'Untitled note',
    content: note.content || '',
    mode: note.mode === 'plain' ? 'plain' : 'markdown',
    tags: note.tags || [],
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from('notes')
    .upsert(payload, { onConflict: 'id' })
    .select('*')
    .single();

  if (error) throw error;
  return normalizeNoteItem(data);
};

export const deleteNote = async (id: string): Promise<boolean> => {
  if (!supabase) return false;

  const { error } = await supabase
    .from('notes')
    .delete()
    .eq('owner_id', await ownerId())
    .eq('id', id);

  if (error) throw error;
  return true;
};

const normalizeInterviewItem = (row: any): InterviewItem => ({
  id: String(row.id || crypto.randomUUID()),
  question: String(row.question || ''),
  answer: String(row.answer || ''),
  note: String(row.note || ''),
  tags: Array.isArray(row.tags) ? row.tags.map(String) : [],
  reviewed: Boolean(row.reviewed),
  createdAt: String(row.created_at || ''),
  updatedAt: String(row.updated_at || row.created_at || ''),
});

export const fetchInterviewItems = async (): Promise<InterviewItem[]> => {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('interview_items')
    .select('*')
    .eq('owner_id', await ownerId())
    .order('updated_at', { ascending: false });
  if (error) throw error;
  return (data || []).map(normalizeInterviewItem);
};

export const saveInterviewItem = async (item: Partial<InterviewItem> & { question: string; answer: string }): Promise<InterviewItem> => {
  if (!supabase) throw new Error('Supabase is not configured');
  const payload = {
    id: item.id || crypto.randomUUID(), owner_id: await ownerId(),
    question: item.question.trim(), answer: item.answer.trim(), note: item.note || '',
    tags: item.tags || [], reviewed: Boolean(item.reviewed), updated_at: new Date().toISOString(),
  };
  const { data, error } = await supabase.from('interview_items').upsert(payload, { onConflict: 'id' }).select('*').single();
  if (error) throw error;
  return normalizeInterviewItem(data);
};

export const deleteInterviewItem = async (id: string): Promise<boolean> => {
  if (!supabase) return false;
  const { error } = await supabase.from('interview_items').delete().eq('owner_id', await ownerId()).eq('id', id);
  if (error) throw error;
  return true;
};

