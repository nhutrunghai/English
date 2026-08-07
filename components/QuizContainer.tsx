import React, { useEffect, useRef, useState } from 'react';
import { ExerciseItem, QuizState } from '../types';

interface QuizContainerProps {
  list: ExerciseItem[];
  onExit: () => void;
}

const QuizContainer: React.FC<QuizContainerProps> = ({ list, onExit }) => {
  const [state, setState] = useState<QuizState>({
    currentIndex: 0,
    score: 0,
    isFinished: false,
    userInput: '',
    selectedOption: null,
    feedback: null,
  });
  const [orderingWords, setOrderingWords] = useState<string[]>([]);
  const [orderingSelected, setOrderingSelected] = useState<string[]>([]);
  const [matchingSelectedLeft, setMatchingSelectedLeft] = useState<string | null>(null);
  const [matchingPairs, setMatchingPairs] = useState<Record<string, string>>({});
  const inputRef = useRef<HTMLInputElement>(null);

  const currentItem = list[state.currentIndex];

  useEffect(() => {
    if (!currentItem) return;
    setState(prev => ({
      ...prev,
      userInput: '',
      selectedOption: null,
      feedback: null,
    }));
    setOrderingSelected([]);
    setMatchingSelectedLeft(null);
    setMatchingPairs({});

    if (currentItem.type === 'ORDERING') {
      const words = currentItem.question.split(/\s*\|\s*/).filter(Boolean);
      setOrderingWords([...words].sort(() => Math.random() - 0.5));
    } else {
      setOrderingWords([]);
    }

    setTimeout(() => inputRef.current?.focus(), 100);
  }, [state.currentIndex, currentItem]);

  if (!currentItem || state.isFinished) {
    return (
      <div className="mx-auto max-w-xl rounded-xl border border-gray-100 bg-white p-6 text-center shadow-2xl animate-slideUp">
        <div className="mx-auto mb-6 grid h-16 w-16 place-items-center rounded-xl bg-emerald-100 text-emerald-600">
          <i className="fa-solid fa-trophy text-2xl" />
        </div>
        <h2 className="text-2xl font-black text-slate-950">Luyện tập hoàn thành!</h2>
        <p className="mt-2 font-bold text-slate-500">Kết quả: {state.score} / {list.length} câu đúng</p>
        <button onClick={onExit} className="mt-8 w-full rounded-xl bg-slate-950 py-4 text-sm font-black text-white hover:bg-blue-600">
          Về trang chủ
        </button>
      </div>
    );
  }

  const checkAnswer = (answerText: string) => {
    if (state.feedback) return;

    const normalizedUser = answerText.trim().toLowerCase().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g,"");
    const normalizedCorrect = currentItem.answer.trim().toLowerCase().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g,"");

    const isCorrect = answerText === '__matching_correct__' ? true : answerText === '__matching_incorrect__' ? false : normalizedUser === normalizedCorrect;

    setState(prev => ({
      ...prev,
      userInput: answerText,
      feedback: isCorrect ? 'correct' : 'incorrect',
      score: isCorrect ? prev.score + 1 : prev.score,
    }));

    setTimeout(() => {
      setState(prev => {
        const nextIndex = prev.currentIndex + 1;
        if (nextIndex >= list.length) {
          return { ...prev, isFinished: true };
        }
        return { ...prev, currentIndex: nextIndex };
      });
    }, 2500);
  };

  const handleFormSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    checkAnswer(state.userInput);
  };

  const handleOrderingClick = (word: string, isFromSelected: boolean) => {
    if (state.feedback) return;

    if (isFromSelected) {
      setOrderingSelected(prev => prev.filter(w => w !== word));
      setOrderingWords(prev => [...prev, word]);
    } else {
      setOrderingWords(prev => prev.filter(w => w !== word));
      const nextSelected = [...orderingSelected, word];
      setOrderingSelected(nextSelected);

      if (nextSelected.length === currentItem.question.split('|').length) {
        checkAnswer(nextSelected.join(' '));
      }
    }
  };

  const matchingLeft = currentItem.type === 'MATCHING' ? currentItem.question.split(/\s*\|\s*/).filter(Boolean) : [];
  const matchingRight = currentItem.type === 'MATCHING' ? currentItem.options || [] : [];
  const matchingAnswer = (() => {
    try {
      const parsed = JSON.parse(currentItem.answer || '[]');
      return Array.isArray(parsed) ? parsed.reduce<Record<string, string>>((pairs, pair) => ({ ...pairs, [String(pair.left)]: String(pair.right) }), {}) : {};
    } catch {
      return {};
    }
  })();
  const hasMatchingAnswer = Object.keys(matchingAnswer).length > 0;

  const selectMatchingRight = (right: string) => {
    if (!matchingSelectedLeft || state.feedback) return;
    setMatchingPairs(previous => ({ ...previous, [matchingSelectedLeft]: right }));
    setMatchingSelectedLeft(null);
  };

  const checkMatching = () => {
    if (state.feedback || Object.keys(matchingPairs).length !== matchingLeft.length) return;
    if (!hasMatchingAnswer) {
      setState(previous => ({ ...previous, feedback: 'incorrect' }));
      return;
    }
    const correct = matchingLeft.every(left => matchingPairs[left] === matchingAnswer[left]);
    checkAnswer(correct ? '__matching_correct__' : '__matching_incorrect__');
  };

  const getOptions = () => {
    if (currentItem.type === 'TRUE_FALSE') return ['True', 'False'];
    return currentItem.options || [];
  };

  const showChoiceUI = ['MULTIPLE_CHOICE', 'TRUE_FALSE'].includes(currentItem.type);
  const showTextUI = ['FILL_BLANK', 'REWRITE', 'VOCAB', 'SHORT_ANSWER'].includes(currentItem.type);
  const showOrderingUI = currentItem.type === 'ORDERING';
  const showMatchingUI = currentItem.type === 'MATCHING';

  return (
    <div className="mx-auto max-w-xl rounded-xl border border-gray-100 bg-white p-6 shadow-2xl animate-slideUp">
      <div className="flex items-center justify-between border-b border-gray-50 pb-4 mb-6">
        <span className="text-xs font-black text-slate-400">CÂU HỎI {state.currentIndex + 1} / {list.length}</span>
        <span className="text-xs font-black text-emerald-600">ĐÚNG: {state.score}</span>
      </div>

      {currentItem.imageB64 && (
        <div className="mb-6 overflow-hidden rounded-xl border border-slate-100 bg-slate-50 p-2">
          <img src={currentItem.imageB64} alt="Question context" className="max-h-40 mx-auto object-contain" />
        </div>
      )}

      <div className="text-center space-y-3 mb-6">
        <div className="inline-block px-3 py-1 rounded-full bg-blue-50 text-blue-600 text-[10px] font-black uppercase tracking-wider">
          {currentItem.type.replace('_', ' ')}
        </div>
        <p className="text-xs font-bold text-slate-400 italic">{currentItem.instruction}</p>

        <h3 className="text-xl font-black text-slate-900 leading-tight">
          {currentItem.type === 'ORDERING' ? 'Sắp xếp các từ dưới đây:' : currentItem.question}
        </h3>
      </div>

      {showChoiceUI && (
        <div className="grid grid-cols-1 gap-3">
          {getOptions().map((opt, index) => {
            const isSelected = state.userInput === opt;
            const isCorrectOption = opt.trim().toLowerCase() === currentItem.answer.trim().toLowerCase();
            let btnClass = 'border-slate-100 hover:border-blue-400 hover:bg-blue-50 text-slate-700';

            if (state.feedback) {
              if (isSelected) {
                btnClass = state.feedback === 'correct' ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-red-500 bg-red-50 text-red-700';
              } else if (isCorrectOption) {
                btnClass = 'border-emerald-500 bg-emerald-50 text-emerald-700';
              }
            }

            return (
              <button
                key={index}
                disabled={!!state.feedback}
                onClick={() => checkAnswer(opt)}
                className={`p-4 rounded-xl border-2 font-bold text-sm transition-all text-left flex items-center space-x-3 ${btnClass}`}
              >
                <span className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-xs shrink-0">{String.fromCharCode(65 + index)}</span>
                <span className="truncate">{opt}</span>
              </button>
            );
          })}
        </div>
      )}

      {showOrderingUI && (
        <div className="space-y-6">
          <div className="min-h-12 p-3 rounded-xl bg-slate-50 border border-dashed border-slate-200 flex flex-wrap gap-2">
            {orderingSelected.map((word, index) => (
              <button key={index} disabled={!!state.feedback} onClick={() => handleOrderingClick(word, true)} className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 font-bold text-xs shadow-sm hover:border-red-400">
                {word}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap gap-2 justify-center">
            {orderingWords.map((word, index) => (
              <button key={index} disabled={!!state.feedback} onClick={() => handleOrderingClick(word, false)} className="px-3 py-1.5 rounded-xl bg-slate-100 font-bold text-xs hover:bg-blue-50 hover:text-blue-600">
                {word}
              </button>
            ))}
          </div>
        </div>
      )}

      {showMatchingUI && (
        <div className="space-y-4">
          <p className="text-center text-xs font-bold text-slate-500">Chọn một ô bên trái, sau đó chọn ô phù hợp ở bên phải để nối thành cặp.</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              {matchingLeft.map(left => (
                <button key={left} disabled={!!state.feedback} onClick={() => setMatchingSelectedLeft(left)} className={`flex w-full items-center justify-between rounded-xl border-2 px-4 py-3 text-left text-sm font-black transition ${matchingSelectedLeft === left ? 'border-blue-500 bg-blue-50 text-blue-700' : matchingPairs[left] ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-slate-100 text-slate-700 hover:border-blue-300'}`}>
                  <span>{left}</span>{matchingPairs[left] && <span className="ml-2 text-xs font-bold">→ {matchingPairs[left]}</span>}
                </button>
              ))}
            </div>
            <div className="space-y-2">
              {matchingRight.map(right => {
                const paired = Object.values(matchingPairs).includes(right);
                return <button key={right} disabled={!!state.feedback || !matchingSelectedLeft || paired} onClick={() => selectMatchingRight(right)} className={`w-full rounded-xl border-2 px-4 py-3 text-left text-sm font-bold transition ${paired ? 'border-slate-100 bg-slate-50 text-slate-400' : matchingSelectedLeft ? 'border-blue-200 bg-white text-slate-700 hover:border-blue-500 hover:bg-blue-50' : 'border-slate-100 text-slate-500'}`}>{right}</button>;
              })}
            </div>
          </div>
          {!hasMatchingAnswer && <p className="rounded-xl bg-amber-50 p-3 text-xs font-bold text-amber-700">Bài nối này được tạo trước khi hệ thống lưu đáp án từng cặp, nên không thể chấm chính xác. Các bài mới sẽ có đáp án nối đầy đủ.</p>}
          {!state.feedback && <button disabled={Object.keys(matchingPairs).length !== matchingLeft.length || !hasMatchingAnswer} onClick={checkMatching} className="w-full rounded-xl bg-blue-600 py-4 text-sm font-black text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50">Kiểm tra các cặp nối</button>}
        </div>
      )}

      {showTextUI && (
        <form onSubmit={handleFormSubmit} className="space-y-4">
          <input
            ref={inputRef}
            autoFocus
            value={state.userInput}
            onChange={event => setState(prev => ({ ...prev, userInput: event.target.value }))}
            disabled={!!state.feedback}
            className={`w-full p-4 text-lg text-center rounded-xl border-2 outline-none transition-all font-bold ${state.feedback === 'correct' ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : state.feedback === 'incorrect' ? 'border-red-500 bg-red-50 text-red-700' : 'border-slate-100 focus:border-blue-500 focus:ring-4 focus:ring-blue-50 shadow-sm'}`}
            placeholder="Nhập câu trả lời..."
          />
          {!state.feedback && (
            <button type="submit" className="w-full py-4 rounded-xl bg-blue-600 text-white font-black text-sm hover:bg-blue-700 transition shadow-lg">
              Kiểm tra kết quả
            </button>
          )}
        </form>
      )}

      {state.feedback && (
        <div className={`text-center py-3 mt-4 rounded-xl animate-fadeIn ${state.feedback === 'correct' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}`}>
          {state.feedback === 'correct' ? (
            <div className="flex items-center justify-center space-x-2 font-black text-xs">
              <i className="fa-solid fa-circle-check text-lg" />
              <span>CHÍNH XÁC!</span>
            </div>
          ) : (
            <div className="space-y-1 text-xs">
              <div className="flex items-center justify-center space-x-2 font-black">
                <i className="fa-solid fa-circle-xmark text-lg" />
                <span>CHƯA ĐÚNG RỒI</span>
              </div>
              <div className="font-bold">Đáp án đúng là: <span className="underline">{currentItem.answer}</span></div>
            </div>
          )}
        </div>
      )}

      <button onClick={onExit} className="mt-6 text-slate-400 hover:text-red-500 w-full text-center text-xs font-bold transition">
        <i className="fa-solid fa-xmark mr-2" />Dừng luyện tập
      </button>
    </div>
  );
};

export default QuizContainer;
