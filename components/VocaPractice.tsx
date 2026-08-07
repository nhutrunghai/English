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
  return {
    ...word,
    reviewCount: (word.reviewCount || 0) + 1,
    lapseCount,
    intervalDays,
    easeFactor,
    lastReviewedAt: now.toISOString(),
    nextReviewAt: new Date(now.getTime() + intervalDays * 86400000).toISOString(),
  };
};

const getQueue = (words: VocaWord[]) => {
  const now = Date.now();
  const due = words
    .filter(word => word.nextReviewAt && new Date(word.nextReviewAt).getTime() <= now)
    .sort((a, b) => new Date(a.nextReviewAt!).getTime() - new Date(b.nextReviewAt!).getTime());
  const fresh = words
    .filter(word => !word.nextReviewAt)
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
  const typedCorrect = current
    ? (promptMeaning ? normalize(answer).includes(normalize(current.word)) : normalize(answer).includes(normalize(current.meaning)))
    : false;

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
      <main className="min-h-[calc(100vh-9rem)] overflow-hidden rounded-[2rem] border border-slate-200 bg-slate-50 shadow-[0_20px_70px_rgba(15,23,42,0.1)]">
        <header className="bg-slate-950 px-6 py-5 text-white sm:px-10">
          <p className="text-xs font-black uppercase tracking-[0.28em] text-cyan-300">Vocabulary practice</p>
          <h2 className="mt-2 text-2xl font-black">Luyện từ vựng</h2>
        </header>
        <div className="mx-auto flex max-w-2xl flex-col items-center px-6 py-20 text-center sm:px-10">
          <span className="flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100 text-3xl text-emerald-600"><i className="fa-solid fa-circle-check" /></span>
          <p className="mt-7 text-xs font-black uppercase tracking-[0.24em] text-emerald-600">Hoàn thành phiên hôm nay</p>
          <h3 className="mt-3 text-3xl font-black text-slate-950">Bạn đã ôn {queue.length} từ</h3>
          <p className="mt-4 max-w-lg font-semibold leading-7 text-slate-600">Những từ cần ôn tiếp sẽ tự quay lại theo lịch phù hợp với mức độ bạn nhớ. Hãy quay lại vào ngày mai để tiếp tục.</p>
          <button onClick={onClose} className="mt-8 bg-slate-950 px-6 py-3 text-sm font-black text-white transition hover:bg-slate-800">Về kho từ vựng</button>
        </div>
      </main>
    );
  }

  const progress = Math.round((index / queue.length) * 100);
  const isNew = !current.reviewCount;

  return (
    <main className="min-h-[calc(100vh-9rem)] overflow-hidden rounded-[2rem] border border-slate-200 bg-slate-50 shadow-[0_20px_70px_rgba(15,23,42,0.1)]">
      <header className="bg-slate-950 px-6 py-5 text-white sm:px-10">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.28em] text-cyan-300">Vocabulary practice</p>
            <h2 className="mt-2 text-2xl font-black">Luyện từ vựng</h2>
          </div>
          <button onClick={onClose} className="border border-white/25 px-4 py-2 text-xs font-black text-white transition hover:bg-white/10">Thoát phiên ôn</button>
        </div>
      </header>

      <div className="mx-auto grid max-w-6xl gap-6 px-5 py-6 lg:grid-cols-[minmax(0,1fr)_250px] sm:px-8 sm:py-8">
        <section className="min-w-0">
          <div className="mb-5 flex items-center justify-between gap-4">
            <p className="text-sm font-black text-slate-700">Từ {index + 1} / {queue.length}</p>
            <p className="text-xs font-bold text-slate-500">{isNew ? 'Từ mới' : `Đã ôn ${current.reviewCount} lần`}</p>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-slate-200"><div className="h-full rounded-full bg-cyan-400 transition-all duration-500" style={{ width: `${progress}%` }} /></div>

          <article className="mt-6 overflow-hidden rounded-3xl bg-white shadow-[0_14px_40px_rgba(15,23,42,0.08)]">
            <div className="bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 px-7 py-10 text-white sm:px-10 sm:py-14">
              <p className="text-xs font-black uppercase tracking-[0.22em] text-cyan-300">{promptMeaning ? 'Viết từ tiếng Anh' : 'Viết nghĩa tiếng Việt'}</p>
              <h1 className="mt-5 break-words text-4xl font-black leading-tight sm:text-5xl">{promptMeaning ? current.meaning || 'Chưa có nghĩa' : current.word}</h1>
              {promptMeaning && current.ipa && <p className="mt-4 font-mono text-sm font-bold text-cyan-100">Gợi ý IPA: {current.ipa}</p>}
            </div>

            <div className="p-6 sm:p-8">
              {!revealed ? (
                <>
                  <label className="text-sm font-black text-slate-800" htmlFor="voca-answer">Câu trả lời của bạn</label>
                  <textarea id="voca-answer" autoFocus value={answer} onChange={event => setAnswer(event.target.value)} placeholder="Tự nhớ trước, rồi nhập câu trả lời..." rows={4} className="mt-3 w-full resize-none rounded-xl border border-slate-200 bg-slate-50 p-4 font-bold text-slate-800 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100" />
                  <button onClick={() => setRevealed(true)} className="mt-4 w-full rounded-xl bg-blue-600 px-4 py-4 text-sm font-black text-white transition hover:bg-blue-700">Kiểm tra đáp án</button>
                </>
              ) : (
                <div className="space-y-6">
                  <div className={`rounded-xl border p-5 ${typedCorrect ? 'border-emerald-200 bg-emerald-50 text-emerald-950' : 'border-amber-200 bg-amber-50 text-amber-950'}`}>
                    <p className="text-sm font-black">{typedCorrect ? 'Câu trả lời có vẻ đúng.' : 'So sánh đáp án, rồi tự đánh giá mức độ ghi nhớ.'}</p>
                    <p className="mt-3 text-sm font-semibold">Đáp án: <strong>{promptMeaning ? current.word : current.meaning || 'Chưa có nghĩa'}</strong></p>
                    {current.example && <p className="mt-3 border-t border-black/10 pt-3 text-sm font-semibold text-slate-600">Ví dụ: {current.example}</p>}
                  </div>
                  <div>
                    <p className="mb-3 text-sm font-black text-slate-800">Bạn nhớ từ này ở mức nào?</p>
                    <div className="grid gap-2 sm:grid-cols-4">
                      <button disabled={saving} onClick={() => rate('again')} className="rounded-xl bg-rose-100 px-3 py-4 text-sm font-black text-rose-700 transition hover:bg-rose-200 disabled:opacity-50">Quên<span className="mt-1 block text-xs font-bold">ôn lại 1 ngày</span></button>
                      <button disabled={saving} onClick={() => rate('hard')} className="rounded-xl bg-orange-100 px-3 py-4 text-sm font-black text-orange-700 transition hover:bg-orange-200 disabled:opacity-50">Khó<span className="mt-1 block text-xs font-bold">ôn sớm hơn</span></button>
                      <button disabled={saving} onClick={() => rate('good')} className="rounded-xl bg-blue-100 px-3 py-4 text-sm font-black text-blue-700 transition hover:bg-blue-200 disabled:opacity-50">Tốt<span className="mt-1 block text-xs font-bold">giãn theo lịch</span></button>
                      <button disabled={saving} onClick={() => rate('easy')} className="rounded-xl bg-emerald-100 px-3 py-4 text-sm font-black text-emerald-700 transition hover:bg-emerald-200 disabled:opacity-50">Dễ<span className="mt-1 block text-xs font-bold">giãn nhiều hơn</span></button>
                    </div>
                  </div>
                </div>
              )}
              {error && <p className="mt-5 border-l-4 border-rose-500 bg-rose-50 p-3 text-sm font-bold text-rose-700">{error}</p>}
            </div>
          </article>
        </section>

        <aside className="rounded-3xl border border-slate-200 bg-white p-6 shadow-[0_10px_30px_rgba(15,23,42,0.05)]">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-blue-600">Phiên hôm nay</p>
          <dl className="mt-5 space-y-5">
            <div className="border-b border-slate-100 pb-4"><dt className="text-xs font-bold text-slate-500">Tiến độ</dt><dd className="mt-1 text-2xl font-black text-slate-950">{index}/{queue.length}</dd></div>
            <div className="border-b border-slate-100 pb-4"><dt className="text-xs font-bold text-slate-500">Kiểu câu hỏi</dt><dd className="mt-1 text-sm font-black text-slate-800">{promptMeaning ? 'Nghĩa → tiếng Anh' : 'Tiếng Anh → nghĩa'}</dd></div>
            <div><dt className="text-xs font-bold text-slate-500">Cách ôn</dt><dd className="mt-1 text-sm font-semibold leading-6 text-slate-600">Từ đến hạn được ưu tiên. Từ mới được giới hạn để không quá tải.</dd></div>
          </dl>
        </aside>
      </div>
    </main>
  );
};

export default VocaPractice;
