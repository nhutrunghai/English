import React, { useEffect, useMemo, useRef, useState } from 'react';
import { VocaFolder, VocaWord } from '../types';
import { enrichVocabularyWord, extractVocabularyFromImage } from '../services/openaiService';
import { createVocaFolder, deleteVocaFolder, deleteVocaWord, fetchVocaFolders, fetchVocaWords, isSupabaseConfigured, moveVocaWordsToFolder, saveVocaWord } from '../services/supabaseService';
import VocaPractice from './VocaPractice';

const text = {
  emptySpeak: 'Nh\u1eadp t\u1eeb tr\u01b0\u1edbc r\u1ed3i m\u1edbi ph\u00e1t \u00e2m \u0111\u01b0\u1ee3c.',
  noSpeech: 'Tr\u00ecnh duy\u1ec7t n\u00e0y ch\u01b0a h\u1ed7 tr\u1ee3 ph\u00e1t \u00e2m.',
  loadError: 'Kh\u00f4ng t\u1ea3i \u0111\u01b0\u1ee3c kho Voca. Ki\u1ec3m tra b\u1ea3ng voca_words trong Supabase.',
  aiNeedsWord: 'Nh\u1eadp t\u1eeb v\u1ef1ng tr\u01b0\u1edbc r\u1ed3i h\u00e3y b\u1ea5m AI \u0111i\u1ec1n.',
  aiDone: 'AI \u0111\u00e3 \u0111i\u1ec1n ngh\u0129a, IPA v\u00e0 v\u00ed d\u1ee5. B\u1ea1n v\u1eabn c\u00f3 th\u1ec3 s\u1eeda tay tr\u01b0\u1edbc khi l\u01b0u.',
  aiFail: 'AI ch\u01b0a \u0111i\u1ec1n \u0111\u01b0\u1ee3c. B\u1ea1n c\u00f3 th\u1ec3 nh\u1eadp ngh\u0129a th\u1ee7 c\u00f4ng r\u1ed3i l\u01b0u.',
  emptyWord: 'T\u1eeb v\u1ef1ng kh\u00f4ng \u0111\u01b0\u1ee3c \u0111\u1ec3 tr\u1ed1ng.',
  saved: '\u0110\u00e3 l\u01b0u v\u00e0o Voca.',
  saveFail: 'Kh\u00f4ng l\u01b0u \u0111\u01b0\u1ee3c. N\u1ebfu m\u1edbi th\u00eam t\u00ednh n\u0103ng n\u00e0y, h\u00e3y ch\u1ea1y SQL t\u1ea1o b\u1ea3ng voca_words tr\u01b0\u1edbc.',
  confirmDelete: 'X\u00f3a t\u1eeb n\u00e0y kh\u1ecfi Voca?',
  deleteFail: 'Kh\u00f4ng x\u00f3a \u0111\u01b0\u1ee3c t\u1eeb n\u00e0y.',
  heroTitle: 'Kho t\u1eeb v\u1ef1ng ri\u00eang c\u1ee7a b\u1ea1n',
  heroDesc: 'Nh\u1eadp t\u1eeb ti\u1ebfng Anh, AI t\u1ef1 d\u1ecbch ngh\u0129a, th\u00eam IPA v\u00e0 v\u00ed d\u1ee5. B\u1ea1n v\u1eabn c\u00f3 th\u1ec3 s\u1eeda tay tr\u01b0\u1edbc khi l\u01b0u.',
  savedWords: 'T\u1eeb \u0111\u00e3 l\u01b0u',
  hasIpa: 'C\u00f3 IPA',
  hasExample: 'C\u00f3 v\u00ed d\u1ee5',
  editWord: 'S\u1eeda t\u1eeb v\u1ef1ng',
  addWord: 'Th\u00eam t\u1eeb m\u1edbi',
  formHint: 'Nh\u1eadp t\u1eeb l\u00e0 \u0111\u1ee7, c\u00e1c \u00f4 kh\u00e1c c\u00f3 th\u1ec3 \u0111\u1ec3 AI \u0111i\u1ec1n.',
  newButton: 'T\u1ea1o m\u1edbi',
  wordPlaceholder: 'T\u1eeb v\u1ef1ng, v\u00ed d\u1ee5: resilient',
  usTitle: 'Ph\u00e1t \u00e2m gi\u1ecdng M\u1ef9',
  ukTitle: 'Ph\u00e1t \u00e2m gi\u1ecdng Anh',
  ipaPlaceholder: 'IPA, v\u00ed d\u1ee5: /r\u026a\u02c8z\u026ali\u0259nt/',
  meaningPlaceholder: 'Ngh\u0129a ti\u1ebfng Vi\u1ec7t',
  examplePlaceholder: 'V\u00ed d\u1ee5',
  notePlaceholder: 'Ghi ch\u00fa c\u00e1 nh\u00e2n, m\u1eb9o nh\u1edb...',
  aiFill: 'AI \u0111i\u1ec1n',
  saving: '\u0110ang l\u01b0u...',
  saveVoca: 'L\u01b0u Voca',
  noSupabase: 'Ch\u01b0a c\u1ea5u h\u00ecnh Supabase n\u00ean Voca ch\u01b0a \u0111\u1ed3ng b\u1ed9 \u0111\u01b0\u1ee3c.',
  listTitle: 'Danh s\u00e1ch t\u1eeb',
  listDesc: 'D\u1eef li\u1ec7u \u0111\u1ed3ng b\u1ed9 \u0111\u1ec3 m\u1edf \u0111i\u1ec7n tho\u1ea1i v\u1eabn th\u1ea5y.',
  searchPlaceholder: 'T\u00ecm t\u1eeb ho\u1eb7c ngh\u0129a...',
  loading: '\u0110ang t\u1ea3i Voca...',
  emptyList: 'Ch\u01b0a c\u00f3 t\u1eeb n\u00e0o. Th\u00eam t\u1eeb \u0111\u1ea7u ti\u00ean \u1edf form b\u00ean tr\u00e1i nh\u00e9.',
  noMeaning: 'Ch\u01b0a c\u00f3 ngh\u0129a.',
  practiceToday: 'Luyện hôm nay',
  dueToday: 'Cần ôn hôm nay',
  reviewed: 'Đã ôn',
};

const emptyDraft: Partial<VocaWord> & { word: string } = {
  word: '',
  meaning: '',
  ipa: '',
  example: '',
  note: '',
};

type Accent = 'US' | 'UK';

const formatReviewDate = (value?: string) => {
  if (!value) return 'Chưa có';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Chưa có';
  return new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(date);
};

const speakWord = (word: string, accent: Accent, onError: (message: string) => void) => {
  const cleanWord = word.trim();
  if (!cleanWord) {
    onError(text.emptySpeak);
    return;
  }

  if (!('speechSynthesis' in window)) {
    onError(text.noSpeech);
    return;
  }

  const lang = accent === 'US' ? 'en-US' : 'en-GB';
  const utterance = new SpeechSynthesisUtterance(cleanWord);
  const voices = window.speechSynthesis.getVoices();
  utterance.lang = lang;
  utterance.rate = 0.86;
  utterance.pitch = 1;
  utterance.voice = voices.find(voice => voice.lang === lang) || voices.find(voice => voice.lang.toLowerCase().startsWith(lang.toLowerCase())) || null;

  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utterance);
};

const VocaDashboard: React.FC = () => {
  const [words, setWords] = useState<VocaWord[]>([]);
  const [folders, setFolders] = useState<VocaFolder[]>([]);
  const [activeFolderId, setActiveFolderId] = useState('');
  const [folderName, setFolderName] = useState('');
  const [draft, setDraft] = useState(emptyDraft);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [imageImporting, setImageImporting] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState('');
  const [practicing, setPracticing] = useState(false);
  const [practicePicker, setPracticePicker] = useState(false);
  const [practiceFolderId, setPracticeFolderId] = useState('');
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedWordIds, setSelectedWordIds] = useState<Set<string>>(new Set());
  const [moveTargetId, setMoveTargetId] = useState('');
  const [draggedWordId, setDraggedWordId] = useState<string | null>(null);

  const dueWords = useMemo(() => words.filter(item => item.nextReviewAt && new Date(item.nextReviewAt).getTime() <= Date.now()).length, [words]);
  const reviewedWords = useMemo(() => words.filter(item => item.reviewCount > 0).length, [words]);

  const filteredWords = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    const folderWords = activeFolderId === 'unfiled' ? words.filter(item => !item.folderId) : activeFolderId ? words.filter(item => item.folderId === activeFolderId) : words;
    if (!keyword) return folderWords;
    return folderWords.filter(item =>
      item.word.toLowerCase().includes(keyword) ||
      item.meaning.toLowerCase().includes(keyword) ||
      item.note.toLowerCase().includes(keyword)
    );
  }, [words, query, activeFolderId]);

  const loadWords = async () => {
    if (!isSupabaseConfigured) return;
    setLoading(true);
    try {
      const [loadedWords, loadedFolders] = await Promise.all([fetchVocaWords(), fetchVocaFolders()]);
      setWords(loadedWords);
      setFolders(loadedFolders);
    } catch (error) {
      console.error(error);
      setMessage(text.loadError);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWords();
    window.speechSynthesis?.getVoices();
  }, []);

  const updateDraft = (field: keyof VocaWord, value: string) => {
    setDraft(prev => ({ ...prev, [field]: value }));
  };

  const fillByAi = async () => {
    if (!draft.word.trim()) {
      setMessage(text.aiNeedsWord);
      return;
    }

    setAiLoading(true);
    setMessage('');
    try {
      const enriched = await enrichVocabularyWord(draft.word);
      setDraft(prev => ({
        ...prev,
        meaning: prev.meaning?.trim() ? prev.meaning : enriched.meaning,
        ipa: enriched.ipa,
        example: prev.example?.trim() ? prev.example : enriched.example,
      }));
      setMessage(text.aiDone);
    } catch (error) {
      console.error(error);
      setMessage(text.aiFail);
    } finally {
      setAiLoading(false);
    }
  };

  const saveDraft = async () => {
    if (!draft.word.trim()) {
      setMessage(text.emptyWord);
      return;
    }

    setSaving(true);
    setMessage('');
    try {
      const saved = await saveVocaWord({ ...draft, folderId: draft.folderId || (activeFolderId && activeFolderId !== 'unfiled' ? activeFolderId : '') });
      setWords(prev => [saved, ...prev.filter(item => item.id !== saved.id)]);
      setDraft(emptyDraft);
      setMessage(text.saved);
    } catch (error) {
      console.error(error);
      setMessage(text.saveFail);
    } finally {
      setSaving(false);
    }
  };

  const editWord = (item: VocaWord) => {
    setDraft(item);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const removeWord = async (id: string) => {
    if (!confirm(text.confirmDelete)) return;
    try {
      await deleteVocaWord(id);
      setWords(prev => prev.filter(item => item.id !== id));
      if (draft.id === id) setDraft(emptyDraft);
    } catch (error) {
      console.error(error);
      setMessage(text.deleteFail);
    }
  };

  const addFolder = async () => {
    if (!folderName.trim()) return;
    try {
      const folder = await createVocaFolder(folderName);
      setFolders(previous => [folder, ...previous]);
      setFolderName('');
      setActiveFolderId(folder.id);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Không thể tạo thư mục.');
    }
  };

  const removeFolder = async (folder: VocaFolder) => {
    if (!confirm(`Xóa thư mục "${folder.name}"? Các từ bên trong sẽ chuyển sang Chưa phân thư mục.`)) return;
    try {
      await deleteVocaFolder(folder.id);
      setFolders(previous => previous.filter(item => item.id !== folder.id));
      setWords(previous => previous.map(item => item.folderId === folder.id ? { ...item, folderId: '' } : item));
      if (activeFolderId === folder.id) setActiveFolderId('');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Không thể xóa thư mục.');
    }
  };

  const toggleWordSelection = (id: string) => setSelectedWordIds(previous => {
    const next = new Set(previous);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });

  const moveWords = async (ids: string[], targetId = moveTargetId) => {
    if (!ids.length || !targetId) return;
    const folderId = targetId === 'unfiled' ? null : targetId;
    try {
      await moveVocaWordsToFolder(ids, folderId);
      setWords(previous => previous.map(word => ids.includes(word.id) ? { ...word, folderId: folderId || '' } : word));
      setSelectedWordIds(new Set());
      setDraggedWordId(null);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Không thể chuyển từ vựng.');
    }
  };

  const deleteSelectedWords = async () => {
    const ids = Array.from(selectedWordIds);
    if (!ids.length || !confirm(`Xóa ${ids.length} từ đã chọn?`)) return;
    try {
      await Promise.all(ids.map(deleteVocaWord));
      setWords(previous => previous.filter(word => !selectedWordIds.has(word.id)));
      setSelectedWordIds(new Set());
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Không thể xóa các từ đã chọn.');
    }
  };

  const importVocabularyImage = async (file: File) => {
    setImageImporting(true);
    setMessage('');
    try {
      const extracted = await extractVocabularyFromImage(file);
      const existing = new Set(words.map(item => item.word.trim().toLowerCase()));
      const unique = extracted.filter(item => !existing.has(item.word.toLowerCase()));
      const saved = await Promise.all(unique.map(item => saveVocaWord({ ...item, folderId: activeFolderId && activeFolderId !== 'unfiled' ? activeFolderId : '' })));
      setWords(previous => [...saved, ...previous]);
      setMessage(unique.length ? `Đã thêm ${unique.length} từ từ ảnh.${extracted.length > unique.length ? ` Bỏ qua ${extracted.length - unique.length} từ trùng.` : ''}` : 'Không tìm thấy từ mới trong ảnh.');
    } catch (error) {
      console.error(error);
      setMessage(error instanceof Error ? error.message : 'Không thể đọc từ vựng từ ảnh.');
    } finally {
      setImageImporting(false);
      if (imageInputRef.current) imageInputRef.current.value = '';
    }
  };

  const importVocabularyClipboard = async () => {
    if (!navigator.clipboard?.read) {
      setMessage('Trình duyệt chưa hỗ trợ đọc ảnh từ clipboard. Hãy lưu ảnh hoặc dùng nút Nhập từ từ ảnh.');
      return;
    }
    try {
      const items = await navigator.clipboard.read();
      for (const item of items) {
        const imageType = item.types.find(type => type.startsWith('image/'));
        if (imageType) {
          const blob = await item.getType(imageType);
          await importVocabularyImage(new File([blob], 'clipboard-vocabulary.png', { type: imageType }));
          return;
        }
      }
      setMessage('Clipboard hiện không có ảnh. Hãy copy ảnh trước rồi thử lại.');
    } catch (error) {
      console.error(error);
      setMessage('Không thể đọc ảnh từ clipboard. Hãy cho phép quyền clipboard hoặc dùng nút chọn ảnh.');
    }
  };

  if (practicing) {
    const practiceWords = practiceFolderId ? words.filter(item => item.folderId === practiceFolderId) : words;
    return <VocaPractice words={practiceWords} onClose={() => setPracticing(false)} onReviewed={saved => setWords(prev => prev.map(item => item.id === saved.id ? saved : item))} />;
  }

  return (
    <div className="space-y-5">
      <section className="overflow-hidden border border-slate-200 bg-white shadow-[0_18px_60px_rgba(15,23,42,0.08)]">
        <div className="grid gap-0 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="bg-slate-950 p-5 text-white sm:p-7 lg:p-8">
            <p className="text-xs font-black uppercase tracking-[0.28em] text-cyan-300">Personal Voca</p>
            <h2 className="mt-3 text-2xl font-black tracking-tight sm:text-3xl">{text.heroTitle}</h2>
            <p className="mt-3 max-w-2xl text-sm font-semibold leading-6 text-slate-300">{text.heroDesc}</p>
            <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={event => { const file = event.target.files?.[0]; if (file) importVocabularyImage(file); }} />
            <div className="mt-5 flex flex-wrap gap-3">
              <button onClick={() => setPracticePicker(true)} disabled={words.length === 0} className="inline-flex items-center gap-2 bg-cyan-300 px-4 py-3 text-sm font-black text-slate-950 transition hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-50"><i className="fa-solid fa-graduation-cap" />{text.practiceToday}</button>
              <button onClick={() => imageInputRef.current?.click()} disabled={imageImporting} className="inline-flex items-center gap-2 border border-white/30 bg-white/10 px-4 py-3 text-sm font-black text-white transition hover:bg-white/20 disabled:opacity-50"><i className={`fa-solid ${imageImporting ? 'fa-spinner animate-spin' : 'fa-image'}`} />{imageImporting ? 'AI đang đọc ảnh...' : 'Nhập từ từ ảnh'}</button>
              <button onClick={importVocabularyClipboard} disabled={imageImporting} className="inline-flex items-center gap-2 border border-white/30 bg-white/10 px-4 py-3 text-sm font-black text-white transition hover:bg-white/20 disabled:opacity-50"><i className="fa-solid fa-paste" />Dán ảnh</button>
            </div>
          </div>
          <div className="grid grid-cols-3 divide-x divide-slate-200 bg-slate-50 text-center">
            <div className="p-5"><div className="text-2xl font-black">{words.length}</div><div className="text-xs font-bold text-slate-500">{text.savedWords}</div></div>
            <div className="p-5"><div className="text-2xl font-black">{dueWords}</div><div className="text-xs font-bold text-slate-500">{text.dueToday}</div></div>
            <div className="p-5"><div className="text-2xl font-black">{reviewedWords}</div><div className="text-xs font-bold text-slate-500">{text.reviewed}</div></div>
          </div>
        </div>
      </section>

      {practicePicker && <section className="border border-cyan-200 bg-cyan-50 p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-3"><span className="text-sm font-black text-slate-800">Chọn phạm vi luyện tập:</span>
          <button onClick={() => { setPracticeFolderId(''); setPracticePicker(false); setPracticing(true); }} className="bg-slate-950 px-4 py-2 text-xs font-black text-white">Tất cả từ</button>
          {folders.map(folder => <button key={folder.id} onClick={() => { setPracticeFolderId(folder.id); setPracticePicker(false); setPracticing(true); }} className="border border-cyan-300 bg-white px-4 py-2 text-xs font-black text-blue-700"><i className="fa-solid fa-folder mr-2" />{folder.name} ({words.filter(word => word.folderId === folder.id).length})</button>)}
          <button onClick={() => setPracticePicker(false)} className="ml-auto text-xs font-black text-slate-500">Hủy</button>
        </div>
      </section>}

      <section className="grid gap-5 xl:grid-cols-[420px_1fr]">
        <div className="border border-slate-200 bg-white p-5 shadow-[0_12px_40px_rgba(15,23,42,0.06)]">
          <div className="mb-4 flex items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-lg font-black">{draft.id ? text.editWord : text.addWord}</h3>
              <p className="text-sm font-semibold text-slate-500">{text.formHint}</p>
            </div>
            {draft.id && <button onClick={() => setDraft(emptyDraft)} className="border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-600 hover:bg-slate-50">{text.newButton}</button>}
          </div>

          <div className="space-y-3">
            <div className="grid grid-cols-[1fr_auto_auto] gap-2">
              <input value={draft.word} onChange={event => updateDraft('word', event.target.value)} placeholder={text.wordPlaceholder} className="min-w-0 border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold outline-none focus:border-blue-400" />
              <button type="button" onClick={() => speakWord(draft.word, 'US', setMessage)} title={text.usTitle} className="bg-blue-50 px-3 text-xs font-black text-blue-600 transition hover:bg-blue-100 disabled:opacity-50" disabled={!draft.word.trim()}><i className="fa-solid fa-volume-high mr-1" />US</button>
              <button type="button" onClick={() => speakWord(draft.word, 'UK', setMessage)} title={text.ukTitle} className="bg-violet-50 px-3 text-xs font-black text-violet-600 transition hover:bg-violet-100 disabled:opacity-50" disabled={!draft.word.trim()}><i className="fa-solid fa-volume-high mr-1" />UK</button>
            </div>
            <input value={draft.ipa || ''} onChange={event => updateDraft('ipa', event.target.value)} placeholder={text.ipaPlaceholder} className="w-full border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold outline-none focus:border-blue-400" />
            <textarea value={draft.meaning || ''} onChange={event => updateDraft('meaning', event.target.value)} placeholder={text.meaningPlaceholder} rows={3} className="w-full resize-none border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold outline-none focus:border-blue-400" />
            <textarea value={draft.example || ''} onChange={event => updateDraft('example', event.target.value)} placeholder={text.examplePlaceholder} rows={3} className="w-full resize-none border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold outline-none focus:border-blue-400" />
            <select value={draft.folderId || (activeFolderId !== 'unfiled' ? activeFolderId : '')} onChange={event => updateDraft('folderId', event.target.value)} className="w-full border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold outline-none focus:border-blue-400"><option value="">Chưa phân thư mục</option>{folders.map(folder => <option key={folder.id} value={folder.id}>{folder.name}</option>)}</select>
            <textarea value={draft.note || ''} onChange={event => updateDraft('note', event.target.value)} placeholder={text.notePlaceholder} rows={2} className="w-full resize-none border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold outline-none focus:border-blue-400" />
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <button onClick={fillByAi} disabled={aiLoading || !draft.word.trim()} className="bg-blue-50 px-4 py-3 text-sm font-black text-blue-600 transition hover:bg-blue-100 disabled:opacity-50"><i className={`fa-solid ${aiLoading ? 'fa-spinner animate-spin' : 'fa-wand-magic-sparkles'} mr-2`} />{text.aiFill}</button>
            <button onClick={saveDraft} disabled={saving || !draft.word.trim()} className="bg-slate-950 px-4 py-3 text-sm font-black text-white transition hover:bg-blue-600 disabled:opacity-50">{saving ? text.saving : text.saveVoca}</button>
          </div>

          {message && <div className="mt-4 border-l-4 border-amber-400 bg-amber-50 p-3 text-sm font-bold text-amber-700">{message}</div>}
          {!isSupabaseConfigured && <div className="mt-4 border-l-4 border-orange-400 bg-orange-50 p-3 text-sm font-bold text-orange-700">{text.noSupabase}</div>}
        </div>

        <div className="space-y-4">
          <div className="flex flex-col gap-3 border border-slate-200 bg-white p-4 shadow-[0_12px_40px_rgba(15,23,42,0.06)] sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-lg font-black">{text.listTitle}</h3>
              <p className="text-sm font-semibold text-slate-500">{text.listDesc}</p>
            </div>
            <input value={query} onChange={event => setQuery(event.target.value)} placeholder={text.searchPlaceholder} className="border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-bold outline-none focus:border-blue-400 sm:w-72" />
          </div>
          <div className="flex flex-wrap items-center gap-2 border border-slate-200 bg-white p-3">
            <select value={activeFolderId} onChange={event => setActiveFolderId(event.target.value)} className="border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-black outline-none"><option value="">Tất cả thư mục</option><option value="unfiled">Chưa phân thư mục</option>{folders.map(folder => <option key={folder.id} value={folder.id}>{folder.name}</option>)}</select>
            <input value={folderName} onChange={event => setFolderName(event.target.value)} onKeyDown={event => { if (event.key === 'Enter') addFolder(); }} placeholder="Tên thư mục mới" className="min-w-0 flex-1 border border-slate-200 px-3 py-2 text-xs font-bold outline-none focus:border-blue-400" />
            <button onClick={addFolder} disabled={!folderName.trim()} className="bg-slate-950 px-3 py-2 text-xs font-black text-white disabled:opacity-50"><i className="fa-solid fa-folder-plus mr-1" />Tạo</button>
            {activeFolderId && activeFolderId !== 'unfiled' && <button onClick={() => { const folder = folders.find(item => item.id === activeFolderId); if (folder) removeFolder(folder); }} className="px-2 py-2 text-xs text-rose-600"><i className="fa-solid fa-trash" /></button>}
          </div>
          <div className="flex flex-wrap items-center gap-2 border border-slate-200 bg-slate-50 p-3">
            <button onClick={() => { setSelectionMode(value => !value); setSelectedWordIds(new Set()); }} className={`px-3 py-2 text-xs font-black ${selectionMode ? 'bg-blue-600 text-white' : 'border border-slate-200 bg-white text-slate-700'}`}><i className="fa-solid fa-check-double mr-1" />{selectionMode ? 'Hủy chọn' : 'Chế độ chọn'}</button>
            <span className="text-xs font-bold text-slate-500">{selectionMode ? `Đã chọn ${selectedWordIds.size} từ` : 'Chọn thư mục nguồn ở ô phía trên, rồi chọn hoặc kéo từ sang thư mục đích.'}</span>
            <div onDragOver={event => event.preventDefault()} onDrop={() => { if (draggedWordId) moveWords([draggedWordId]); }} className="ml-auto flex flex-wrap items-center gap-2 border border-dashed border-blue-300 bg-white px-2 py-1">
              <select value={moveTargetId} onChange={event => setMoveTargetId(event.target.value)} className="bg-transparent px-2 py-1.5 text-xs font-black outline-none"><option value="">Chọn thư mục đích</option><option value="unfiled">Chưa phân thư mục</option>{folders.map(folder => <option key={folder.id} value={folder.id}>{folder.name}</option>)}</select>
              {selectionMode && <button onClick={() => moveWords(Array.from(selectedWordIds))} disabled={!selectedWordIds.size || !moveTargetId} className="bg-blue-600 px-3 py-1.5 text-xs font-black text-white disabled:opacity-50">Chuyển</button>}
              {selectionMode && <button onClick={deleteSelectedWords} disabled={!selectedWordIds.size} className="px-2 py-1.5 text-xs font-black text-rose-600 disabled:opacity-50"><i className="fa-solid fa-trash" /></button>}
            </div>
          </div>

          {loading ? (
            <div className="border border-slate-200 bg-white p-8 text-center font-black text-slate-400 shadow-[0_12px_40px_rgba(15,23,42,0.06)]">{text.loading}</div>
          ) : filteredWords.length === 0 ? (
            <div className="border border-dashed border-slate-300 bg-white/80 p-8 text-center font-bold text-slate-400">{text.emptyList}</div>
          ) : (
            <div className="grid gap-3 lg:grid-cols-2 xl:grid-cols-3">
              {filteredWords.map(item => (
                <article key={item.id} draggable={!selectionMode} onDragStart={() => setDraggedWordId(item.id)} onDragEnd={() => setDraggedWordId(null)} onClick={() => { if (selectionMode) toggleWordSelection(item.id); }} className={`border bg-white p-3 shadow-sm transition hover:border-blue-200 ${selectionMode ? 'cursor-pointer' : 'cursor-grab'} ${selectedWordIds.has(item.id) ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200' : 'border-slate-200'}`}>
                  <div onClick={event => event.stopPropagation()} className="flex items-start justify-between gap-3">
                    <div>
                      <h4 className="text-lg font-black text-slate-950">{item.word}</h4>
                      {item.ipa && <p className="font-mono text-xs font-bold text-blue-600">{item.ipa}</p>}
                    </div>
                    <div className="flex flex-wrap justify-end gap-2">
                      <button onClick={() => speakWord(item.word, 'US', setMessage)} title={text.usTitle} className="grid h-7 min-w-7 place-items-center bg-blue-50 px-1 text-[10px] font-black text-blue-600"><span><i className="fa-solid fa-volume-high mr-1" />US</span></button>
                      <button onClick={() => speakWord(item.word, 'UK', setMessage)} title={text.ukTitle} className="grid h-7 min-w-7 place-items-center bg-violet-50 px-1 text-[10px] font-black text-violet-600"><span><i className="fa-solid fa-volume-high mr-1" />UK</span></button>
                      <button onClick={() => editWord(item)} className="grid h-7 w-7 place-items-center bg-slate-100 text-xs text-slate-600"><i className="fa-solid fa-pen" /></button>
                      <button onClick={() => removeWord(item.id)} className="grid h-7 w-7 place-items-center bg-rose-50 text-xs text-rose-600"><i className="fa-solid fa-trash" /></button>
                    </div>
                  </div>
                  <p className="mt-3 whitespace-pre-line border-t border-slate-100 pt-3 text-sm font-bold leading-5 text-slate-700">{item.meaning || text.noMeaning}</p>
                  {item.example && <p className="mt-2 max-h-24 overflow-y-auto whitespace-pre-line bg-slate-50 p-2 text-xs font-semibold leading-5 text-slate-500">{item.example}</p>}
                  {item.note && item.note !== 'Nhập từ ảnh' && <p className="mt-2 text-xs font-bold text-amber-600"><i className="fa-solid fa-note-sticky mr-1" />{item.note}</p>}
                  <div className="mt-3 grid grid-cols-3 gap-1 border-t border-slate-100 pt-3 text-center">
                    <div className="rounded-lg bg-slate-50 px-2 py-2"><p className="text-[10px] font-black uppercase tracking-wide text-slate-400">Đã ôn</p><p className="mt-1 text-sm font-black text-slate-800">{item.reviewCount || 0} lần</p></div>
                    <div className="rounded-lg bg-slate-50 px-2 py-2"><p className="text-[10px] font-black uppercase tracking-wide text-slate-400">Ôn gần nhất</p><p className="mt-1 text-xs font-black text-slate-800">{formatReviewDate(item.lastReviewedAt)}</p></div>
                    <div className={`rounded-lg px-2 py-2 ${item.nextReviewAt && new Date(item.nextReviewAt).getTime() <= Date.now() ? 'bg-amber-100' : 'bg-cyan-50'}`}><p className="text-[10px] font-black uppercase tracking-wide text-slate-400">Ôn tiếp</p><p className="mt-1 text-xs font-black text-slate-800">{formatReviewDate(item.nextReviewAt)}</p></div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

export default VocaDashboard;
