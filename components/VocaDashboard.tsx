import React, { useEffect, useMemo, useState } from 'react';
import { VocaWord } from '../types';
import { enrichVocabularyWord } from '../services/openaiService';
import { deleteVocaWord, fetchVocaWords, isSupabaseConfigured, saveVocaWord } from '../services/supabaseService';
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
  const [draft, setDraft] = useState(emptyDraft);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [practicing, setPracticing] = useState(false);

  const dueWords = useMemo(() => words.filter(item => item.nextReviewAt && new Date(item.nextReviewAt).getTime() <= Date.now()).length, [words]);
  const reviewedWords = useMemo(() => words.filter(item => item.reviewCount > 0).length, [words]);

  const filteredWords = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    if (!keyword) return words;
    return words.filter(item =>
      item.word.toLowerCase().includes(keyword) ||
      item.meaning.toLowerCase().includes(keyword) ||
      item.note.toLowerCase().includes(keyword)
    );
  }, [words, query]);

  const loadWords = async () => {
    if (!isSupabaseConfigured) return;
    setLoading(true);
    try {
      setWords(await fetchVocaWords());
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
      const saved = await saveVocaWord(draft);
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

  return (
    <div className="space-y-5">
      <section className="overflow-hidden border border-slate-200 bg-white shadow-[0_18px_60px_rgba(15,23,42,0.08)]">
        <div className="grid gap-0 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="bg-slate-950 p-5 text-white sm:p-7 lg:p-8">
            <p className="text-xs font-black uppercase tracking-[0.28em] text-cyan-300">Personal Voca</p>
            <h2 className="mt-3 text-2xl font-black tracking-tight sm:text-3xl">{text.heroTitle}</h2>
            <p className="mt-3 max-w-2xl text-sm font-semibold leading-6 text-slate-300">{text.heroDesc}</p>
            <button onClick={() => setPracticing(true)} disabled={words.length === 0} className="mt-5 inline-flex items-center gap-2 bg-cyan-300 px-4 py-3 text-sm font-black text-slate-950 transition hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-50"><i className="fa-solid fa-graduation-cap" />{text.practiceToday}</button>
          </div>
          <div className="grid grid-cols-3 divide-x divide-slate-200 bg-slate-50 text-center">
            <div className="p-5"><div className="text-2xl font-black">{words.length}</div><div className="text-xs font-bold text-slate-500">{text.savedWords}</div></div>
            <div className="p-5"><div className="text-2xl font-black">{dueWords}</div><div className="text-xs font-bold text-slate-500">{text.dueToday}</div></div>
            <div className="p-5"><div className="text-2xl font-black">{reviewedWords}</div><div className="text-xs font-bold text-slate-500">{text.reviewed}</div></div>
          </div>
        </div>
      </section>

      {practicing ? (
        <VocaPractice words={words} onClose={() => setPracticing(false)} onReviewed={saved => setWords(prev => prev.map(item => item.id === saved.id ? saved : item))} />
      ) : (
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

          {loading ? (
            <div className="border border-slate-200 bg-white p-8 text-center font-black text-slate-400 shadow-[0_12px_40px_rgba(15,23,42,0.06)]">{text.loading}</div>
          ) : filteredWords.length === 0 ? (
            <div className="border border-dashed border-slate-300 bg-white/80 p-8 text-center font-bold text-slate-400">{text.emptyList}</div>
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">
              {filteredWords.map(item => (
                <article key={item.id} className="border border-slate-200 bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.05)] transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-[0_18px_45px_rgba(37,99,235,0.12)]">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h4 className="text-xl font-black text-slate-950">{item.word}</h4>
                      {item.ipa && <p className="mt-1 font-mono text-sm font-bold text-blue-600">{item.ipa}</p>}
                    </div>
                    <div className="flex flex-wrap justify-end gap-2">
                      <button onClick={() => speakWord(item.word, 'US', setMessage)} title={text.usTitle} className="grid h-9 min-w-9 place-items-center bg-blue-50 px-2 text-xs font-black text-blue-600"><span><i className="fa-solid fa-volume-high mr-1" />US</span></button>
                      <button onClick={() => speakWord(item.word, 'UK', setMessage)} title={text.ukTitle} className="grid h-9 min-w-9 place-items-center bg-violet-50 px-2 text-xs font-black text-violet-600"><span><i className="fa-solid fa-volume-high mr-1" />UK</span></button>
                      <button onClick={() => editWord(item)} className="grid h-9 w-9 place-items-center bg-slate-100 text-slate-600"><i className="fa-solid fa-pen" /></button>
                      <button onClick={() => removeWord(item.id)} className="grid h-9 w-9 place-items-center bg-rose-50 text-rose-600"><i className="fa-solid fa-trash" /></button>
                    </div>
                  </div>
                  <p className="mt-4 whitespace-pre-line border-t border-slate-100 pt-4 text-sm font-bold leading-6 text-slate-700">{item.meaning || text.noMeaning}</p>
                  {item.example && <p className="mt-3 bg-slate-50 p-3 text-sm font-semibold leading-6 text-slate-500">{item.example}</p>}
                  {item.note && <p className="mt-3 text-xs font-bold text-amber-600"><i className="fa-solid fa-note-sticky mr-2" />{item.note}</p>}
                </article>
              ))}
            </div>
          )}
        </div>
      </section>
      )}
    </div>
  );
};

export default VocaDashboard;
