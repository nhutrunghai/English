import React, { useMemo, useState } from 'react';
import { VocaWord } from '../types';
import { saveVocaReview } from '../services/supabaseService';

type Rating = 'again' | 'hard' | 'good' | 'easy';

const normalize = (value: string) => value.toLowerCase().trim().replace(/[^\p{L}\p{N}\s]/gu, '').replace(/\s+/g, ' ');

const scheduleReview = (word: VocaWord, rating: Rating): VocaWord => {
  const currentInterval = Math.max(0, word.intervalDays || 0);
  const currentEase = Math.max(1.3, word.easeFactor || 2.5);
  let intervalDays = 1;
  let easeFactor = currentEase;
  let lapseCount = word.lapseCount || 0;

  if (rating === 'again') {
    intervalDays = 1;
    easeFactor = Math.max(1.3, currentEase - 0.2);
    lapseCount += 1;
  } else if (rating === 'hard') {
    intervalDays = Math.max(1, Math.round((currentInterval || 1) * 1.2));
    easeFactor = Math.max(1.3, currentEase - 0.15);
  } else if (rating === 'good') {
    intervalDays = currentInterval === 0 ? 1 : currentInterval === 1 ? 3 : Math.max(4, Math.round(currentInterval * currentEase));
  } else {
    intervalDays = currentInterval === 0 ? 4 : Math.max(5, Math.round(currentInterval * currentEase * 1.3));
    easeFactor = Math.min(3.2, currentEase + 0.15);
  }

  const now = new Date();
  const nextReviewAt = new Date(now.getTime() + intervalDays * 24 * 60 * 60 * 1000).toISOString();
  return { ...word, reviewCount: (word.reviewCount || 0) + 1, lapseCount, intervalDays, easeFactor, lastReviewedAt: now.toISOString(), nextReviewAt };
};

const getQueue = (words: VocaWord[]) => {
  const now = Date.now();
  const due = words.filter(word => word.nextReviewAt && new Date(word.nextReviewAt).getTime() <= now)
    .sort((a, b) => new Date(a.nextReviewAt).getTime() - new Date(b.nextReviewAt).getTime());
  const fresh = words.filter(word => !word.nextReviewAt)
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  return [...due, ...fresh.slice(0, Math.max(0, 8 - due.length))].slice(0, 20);
};

interface VocaPracticeProps {
  words: VocaWord[];
  onClose: () => void;
  onReviewed: (word: VocaWord) => void;
}

const VocaPractice: React.FC<VocaPracticeProps> = ({ words, onClose, onReviewed }) => {
  const queue = useMemo(() => getQueue(words), [words]);
  const [index, setIndex] = useState(0);
  const [answer, setAnswer] = useState('');
  const [revealed, setRevealed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const current = queue[index];
  const promptMeaning = index % 2 === 1;
  const typedCorrect = current ? (promptMeaning ? normalize(answer).includes(normalize(current.word)) : normalize(answer).includes(normalize(current.meaning))) : false;

  const rate = async (rating: Rating) => {
    if (!current || saving) return;
    setSaving(true);
    setError('');
    try {
      const saved = await saveVocaReview(scheduleReview(current, rating));
      onReviewed(saved);
      setIndex(value => value + 1);
      setAnswer('');
      setRevealed(false);
    } catch (reviewError) {
      setError(reviewError instanceof Error ? reviewError.message : 'Không thể lưu kết quả ôn tập.');
    } finally {
      setSaving(false);
    }
  };

  if (!current) {
    return (
      <section className="border border-emerald-200 bg-emerald-50 p-8 text-center shadow-[0_12px_40px_rgba(15,23,42,0.06)]">
        <i className="fa-solid fa-circle-check text-3xl text-emerald-600" />
        <h3 className="mt-3 text-xl font-black text-emerald-950">Đã xong lượt ôn hôm nay</h3>
        <p className="mt-2 text-sm font-semibold text-emerald-800">Từ mới và từ đến hạn sẽ xuất hiện theo lịch ôn, không chọn ngẫu nhiên.</p>
        <button onClick={onClose} className="mt-5 bg-slate-950 px-5 py-3 text-sm font-black text-white">Về kho từ vựng</button>
      </section>
    );
  }

  return (
    <section className="border border-slate-200 bg-white p-5 shadow-[0_18px_60px_rgba(15,23,42,0.08)] sm:p-8">
      <div className="flex items-center justify-between gap-4">
        <div><p className="text-xs font-black uppercase tracking-[0.22em] text-blue-600">Spaced review</p><h3 className="mt-1 text-xl font-black">Luyện từ theo lịch ôn</h3></div>
        <button onClick={onClose} className="border border-slate-200 px-3 py-2 text-xs font-black text-slate-600">Đóng</button>
      </div>
      <div className="mt-6 h-2 overflow-hidden bg-slate-100"><div className="h-full bg-blue-600 transition-all" style={{ width: `${((index + 1) / queue.length) * 100}%` }} /></div>
      <p className="mt-3 text-xs font-bold text-slate-500">Từ {index + 1}/{queue.length} · {current.reviewCount ? `đã ôn ${current.reviewCount} lần` : 'từ mới'}</p>
      <div className="mt-6 rounded-2xl bg-slate-950 p-6 text-white sm:p-9">
        <p className="text-xs font-black uppercase tracking-[0.2em] text-cyan-300">{promptMeaning ? 'Viết từ tiếng Anh' : 'Viết nghĩa tiếng Việt'}</p>
        <p className="mt-4 text-3xl font-black leading-tight sm:text-4xl">{promptMeaning ? current.meaning || 'Chưa có nghĩa' : current.word}</p>
        {promptMeaning && current.ipa && <p className="mt-3 font-mono text-sm font-bold text-cyan-200">Gợi ý IPA: {current.ipa}</p>}
      </div>
      {!revealed ? (
        <div className="mt-5">
          <textarea value={answer} onChange={event => setAnswer(event.target.value)} placeholder="Tự nhớ rồi nhập câu trả lời..." rows={3} className="w-full resize-none border border-slate-200 bg-slate-50 p-4 font-bold outline-none focus:border-blue-400" />
          <button onClick={() => setRevealed(true)} className="mt-3 w-full bg-blue-600 px-4 py-3 text-sm font-black text-white">Kiểm tra đáp án</button>
        </div>
      ) : (
        <div className="mt-5 space-y-4">
          <div className={`border p-4 ${typedCorrect ? 'border-emerald-200 bg-emerald-50 text-emerald-900' : 'border-amber-200 bg-amber-50 text-amber-900'}`}>
            <p className="text-sm font-black">{typedCorrect ? 'Câu trả lời có vẻ đúng.' : 'So sánh với đáp án rồi tự đánh giá mức nhớ.'}</p>
            <p className="mt-2 text-sm font-semibold">Đáp án: <strong>{promptMeaning ? current.word : current.meaning || 'Chưa có nghĩa'}</strong></p>
            {current.example && <p className="mt-2 text-sm font-semibold text-slate-600">{current.example}</p>}
          </div>
          <div><p className="mb-2 text-sm font-black text-slate-700">Bạn nhớ từ này ở mức nào?</p><div className="grid gap-2 sm:grid-cols-4">
            <button disabled={saving} onClick={() => rate('again')} className="bg-rose-100 px-3 py-3 text-sm font-black text-rose-700">Quên<br /><span className="text-xs">1 ngày</span></button>
            <button disabled={saving} onClick={() => rate('hard')} className="bg-orange-100 px-3 py-3 text-sm font-black text-orange-700">Khó<br /><span className="text-xs">sớm hơn</span></button>
            <button disabled={saving} onClick={() => rate('good')} className="bg-blue-100 px-3 py-3 text-sm font-black text-blue-700">Tốt<br /><span className="text-xs">giãn lịch</span></button>
            <button disabled={saving} onClick={() => rate('easy')} className="bg-emerald-100 px-3 py-3 text-sm font-black text-emerald-700">Dễ<br /><span className="text-xs">giãn nhiều</span></button>
          </div></div>
        </div>
      )}
      {error && <p className="mt-4 border-l-4 border-rose-500 bg-rose-50 p-3 text-sm font-bold text-rose-700">{error}</p>}
    </section>
  );
};

export default VocaPractice;
