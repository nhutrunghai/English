import React, { useEffect, useMemo, useState } from 'react';
import { AppMode, ExerciseItem, VocabList } from './types';
import Header from './components/Header';
import ImageUploader from './components/ImageUploader';
import ImageCropper from './components/ImageCropper';
import VocabEditor from './components/VocabEditor';
import QuizContainer from './components/QuizContainer';
import PronunciationMode from './components/PronunciationMode';
import PomodoroDashboard from './components/PomodoroDashboard';
import FloatingPomodoro from './components/FloatingPomodoro';
import CelebrationOverlay from './components/CelebrationOverlay';
import StreakDashboard from './components/StreakDashboard';
import VocaDashboard from './components/VocaDashboard';
import NoteDashboard from './components/NoteDashboard';
import HeroSlideshow from './components/HeroSlideshow';
import AuthGate from './components/AuthGate';
import { extractExercisesFromImage, extractExercisesFromPdf } from './services/openaiService';
import { deleteVocabularyList, fetchNotes, fetchPomodoroSessions, fetchStreakTasks, fetchVocaWords, fetchVocabulary, isSupabaseConfigured, savePomodoroSession, saveStreakTask, saveVocabularyList, supabase } from './services/supabaseService';
import { StreakTask } from './services/streakTypes';

const getModeTitle = (mode: AppMode) => {
  if (mode === AppMode.HISTORY) return 'Th\u01b0 vi\u1ec7n h\u1ecdc t\u1eadp';
  if (mode === AppMode.POMODORO) return 'Pomodoro streak';
  if (mode === AppMode.VOCA) return 'Voca c\u00e1 nh\u00e2n';
  if (mode === AppMode.NOTE) return 'Note c\u00e1 nh\u00e2n';
  if (mode === AppMode.STREAK) return 'K\u1ebf ho\u1ea1ch & Streak';
  if (mode === AppMode.CROP) return 'C\u1eaft \u1ea3nh b\u00e0i t\u1eadp';
  if (mode === AppMode.EDITOR) return 'Ch\u1ec9nh s\u1eeda d\u1eef li\u1ec7u';
  if (mode === AppMode.QUIZ) return 'Luy\u1ec7n t\u1eadp';
  if (mode === AppMode.PRONUNCIATION) return 'Ph\u00e1t \u00e2m';
  return 'Dashboard c\u00e1 nh\u00e2n';
};

const App: React.FC = () => {
  const [mode, setMode] = useState<AppMode>(AppMode.HOME);
  const [activeList, setActiveList] = useState<ExerciseItem[]>([]);
  const [tempList, setTempList] = useState<ExerciseItem[]>([]);
  const [rawHistory, setRawHistory] = useState<ExerciseItem[]>([]);
  const [sourceImage, setSourceImage] = useState('');
  const [syncing, setSyncing] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  const [generationStatus, setGenerationStatus] = useState<'idle' | 'processing' | 'ready' | 'error'>('idle');
  const [generationFileName, setGenerationFileName] = useState('');
  const [signedIn, setSignedIn] = useState(!isSupabaseConfigured);
  const [authChecked, setAuthChecked] = useState(!isSupabaseConfigured);
  const [studyMinutes, setStudyMinutes] = useState(() => Number(localStorage.getItem('lingosnap_study_minutes')) || 25);
  const [breakMinutes, setBreakMinutes] = useState(() => Number(localStorage.getItem('lingosnap_break_minutes')) || 5);
  const [pomodoroRunning, setPomodoroRunning] = useState(() => localStorage.getItem('lingosnap_pomodoro_running') === 'true');
  const [pomodoroDeadline, setPomodoroDeadline] = useState(() => Number(localStorage.getItem('lingosnap_pomodoro_deadline')) || 0);
  const [pomodoroSecondsLeft, setPomodoroSecondsLeft] = useState(() => Number(localStorage.getItem('lingosnap_pomodoro_seconds_left')) || (Number(localStorage.getItem('lingosnap_study_minutes')) || 25) * 60);
  const [pomodoroInitialSeconds, setPomodoroInitialSeconds] = useState(() => Number(localStorage.getItem('lingosnap_pomodoro_initial_seconds')) || (Number(localStorage.getItem('lingosnap_study_minutes')) || 25) * 60);
  const [savingPomodoro, setSavingPomodoro] = useState(false);
  const [activeStreakTask, setActiveStreakTask] = useState<StreakTask | null>(() => {
    const savedTask = localStorage.getItem('lingosnap_active_streak_task');
    if (!savedTask) return null;
    try {
      return JSON.parse(savedTask) as StreakTask;
    } catch {
      localStorage.removeItem('lingosnap_active_streak_task');
      return null;
    }
  });
  const [streakRefreshKey, setStreakRefreshKey] = useState(0);
  const [showCelebration, setShowCelebration] = useState(false);
  const [dashboardStats, setDashboardStats] = useState({
    vocaWords: 0,
    notes: 0,
    pomodoroSessions: 0,
    pomodoroMinutes: 0,
    streakDone: 0,
    streakDoing: 0,
    streakTodo: 0,
  });

  const groupedLists = useMemo(() => {
    const groups: { [key: string]: VocabList } = {};
    rawHistory.forEach(item => {
      const listId = String(item.listId || 'default');
      if (!groups[listId]) {
        const timestamp = listId.startsWith('list_') ? parseInt(listId.split('_')[1]) : null;
        const timeStr = timestamp ? new Date(timestamp).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : '\u004c\u01b0u tr\u1eef';

        groups[listId] = {
          id: listId,
          name: listId === 'default' ? '\u0042\u1ed9 b\u00e0i t\u1eadp m\u1eb7c \u0111\u1ecbnh' : `\u0042\u00e0i t\u1eadp l\u00fac ${timeStr}`,
          date: item.dateLearned,
          items: []
        };
      }
      groups[listId].items.push(item);
    });
    return Object.values(groups).sort((a, b) => b.id.localeCompare(a.id));
  }, [rawHistory]);

  const totalQuestions = rawHistory.length;
  const totalTypes = new Set(rawHistory.map(item => item.type)).size;

  const dashboardCards = [
    { label: 'B\u1ed9 \u0111\u00e3 l\u01b0u', value: groupedLists.length, icon: 'fa-layer-group', target: AppMode.HISTORY, className: 'from-blue-500 to-cyan-500 shadow-blue-100' },
    { label: 'C\u00e2u h\u1ecfi', value: totalQuestions, icon: 'fa-circle-question', target: AppMode.HISTORY, className: 'from-violet-500 to-fuchsia-500 shadow-violet-100' },
    { label: 'T\u1eeb Voca', value: dashboardStats.vocaWords, icon: 'fa-book-open-reader', target: AppMode.VOCA, className: 'from-emerald-500 to-teal-500 shadow-emerald-100' },
    { label: 'Note', value: dashboardStats.notes, icon: 'fa-note-sticky', target: AppMode.NOTE, className: 'from-amber-500 to-orange-500 shadow-amber-100' },
    { label: 'Pomodoro', value: dashboardStats.pomodoroSessions, sub: `${Math.round(dashboardStats.pomodoroMinutes / 60)}h`, icon: 'fa-fire', target: AppMode.POMODORO, className: 'from-rose-500 to-red-500 shadow-rose-100' },
    { label: 'Streak xong', value: dashboardStats.streakDone, sub: `${dashboardStats.streakDoing} \u0111ang h\u1ecdc`, icon: 'fa-check-double', target: AppMode.STREAK, className: 'from-slate-900 to-slate-700 shadow-slate-200' },
  ];

  const initData = async () => {
    setSyncing(true);
    try {
      const data = await fetchVocabulary();
      setRawHistory(data || []);

      const [vocaResult, noteResult, pomodoroResult, streakResult] = await Promise.allSettled([
        fetchVocaWords(),
        fetchNotes(),
        fetchPomodoroSessions(),
        fetchStreakTasks(),
      ]);

      const vocaWords = vocaResult.status === 'fulfilled' ? vocaResult.value : [];
      const notes = noteResult.status === 'fulfilled' ? noteResult.value : [];
      const pomodoros = pomodoroResult.status === 'fulfilled' ? pomodoroResult.value : [];
      const streakTasks = streakResult.status === 'fulfilled' ? streakResult.value : [];
      setDashboardStats({
        vocaWords: vocaWords.length,
        notes: notes.length,
        pomodoroSessions: pomodoros.length,
        pomodoroMinutes: pomodoros.reduce((sum, session) => sum + Number(session.minutes || 0), 0),
        streakDone: streakTasks.filter(task => task.status === 'done').length,
        streakDoing: streakTasks.filter(task => task.status === 'doing').length,
        streakTodo: streakTasks.filter(task => task.status === 'todo').length,
      });
    } catch (e) {
      console.error('Sync Error:', e);
    } finally {
      setSyncing(false);
    }
  };

  useEffect(() => {
    if (!supabase) return;

    supabase.auth.getSession().then(({ data }) => {
      setSignedIn(Boolean(data.session));
      setAuthChecked(true);
      if (data.session) initData();
    }).catch(error => {
      console.error('Auth session check error:', error);
      setSignedIn(false);
      setAuthChecked(true);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSignedIn(Boolean(session));
      setAuthChecked(true);
      if (session) initData();
    });

    return () => listener.subscription.unsubscribe();
  }, []);


  const resetPomodoro = () => {
    const taskToCancel = activeStreakTask;
    const nextSeconds = studyMinutes * 60;
    setPomodoroRunning(false);
    setPomodoroDeadline(0);
    setPomodoroSecondsLeft(nextSeconds);
    setActiveStreakTask(null);
    setStreakRefreshKey(key => key + 1);
    localStorage.setItem('lingosnap_pomodoro_running', 'false');
    localStorage.setItem('lingosnap_pomodoro_deadline', '0');
    localStorage.removeItem('lingosnap_active_streak_task');
    setPomodoroInitialSeconds(nextSeconds);
    localStorage.setItem('lingosnap_pomodoro_seconds_left', String(nextSeconds));
    localStorage.setItem('lingosnap_pomodoro_initial_seconds', String(nextSeconds));

    if (taskToCancel?.status === 'doing') {
      saveStreakTask({ ...taskToCancel, status: 'todo' })
        .then(() => setStreakRefreshKey(key => key + 1))
        .catch(error => console.error('Cancel streak task error:', error));
    }
  };

  const completeStreakTask = async (task = activeStreakTask) => {
    if (!task) return;
    const completedTask: StreakTask = { ...task, status: 'done' };
    await saveStreakTask(completedTask);
    setActiveStreakTask(null);
    setStreakRefreshKey(key => key + 1);
    localStorage.removeItem('lingosnap_active_streak_task');
  };

  const completePomodoro = async () => {
    if (savingPomodoro) return;
    setSavingPomodoro(true);
    setPomodoroRunning(false);
    setPomodoroDeadline(0);
    localStorage.setItem('lingosnap_pomodoro_running', 'false');
    localStorage.setItem('lingosnap_pomodoro_deadline', '0');

    try {
      const completedTask = activeStreakTask;
      const completedMinutes = completedTask ? Math.round((completedTask.durationHours || 0) * 60) : studyMinutes;
      await savePomodoroSession(completedMinutes, completedTask?.studyDate);
      await completeStreakTask(completedTask);
      const breakSeconds = breakMinutes * 60;
      setPomodoroSecondsLeft(breakSeconds);
      localStorage.setItem('lingosnap_pomodoro_seconds_left', String(breakSeconds));
      setSaveStatus('success');
      setShowCelebration(true);
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (error) {
      console.error('Pomodoro save error:', error);
      setSaveStatus('error');
    } finally {
      setSavingPomodoro(false);
    }
  };

  const togglePomodoro = () => {
    if (pomodoroRunning) {
      const remaining = Math.max(0, Math.ceil((pomodoroDeadline - Date.now()) / 1000));
      setPomodoroRunning(false);
      setPomodoroDeadline(0);
      setPomodoroSecondsLeft(remaining);
      localStorage.setItem('lingosnap_pomodoro_running', 'false');
      localStorage.setItem('lingosnap_pomodoro_deadline', '0');
      localStorage.setItem('lingosnap_pomodoro_seconds_left', String(remaining));
      return;
    }

    const defaultSeconds = studyMinutes * 60;
    const seconds = pomodoroSecondsLeft > 0 ? pomodoroSecondsLeft : defaultSeconds;
    const deadline = Date.now() + seconds * 1000;
    setPomodoroInitialSeconds(prev => prev || defaultSeconds);
    localStorage.setItem('lingosnap_pomodoro_initial_seconds', String(pomodoroInitialSeconds || defaultSeconds));
    setPomodoroRunning(true);
    setPomodoroDeadline(deadline);
    localStorage.setItem('lingosnap_pomodoro_running', 'true');
    localStorage.setItem('lingosnap_pomodoro_deadline', String(deadline));
    localStorage.setItem('lingosnap_pomodoro_seconds_left', String(seconds));
  };

  const startStreakTaskPomodoro = async (task: StreakTask) => {
    const runningTask: StreakTask = { ...task, status: 'doing' };
    setActiveStreakTask(runningTask);
    localStorage.setItem('lingosnap_active_streak_task', JSON.stringify(runningTask));
    await saveStreakTask(runningTask);
    const seconds = Math.max(1, Math.round((task.durationHours || studyMinutes / 60) * 3600));
    const deadline = Date.now() + seconds * 1000;
    setPomodoroSecondsLeft(seconds);
    setPomodoroInitialSeconds(seconds);
    setPomodoroDeadline(deadline);
    setPomodoroRunning(true);
    localStorage.setItem('lingosnap_pomodoro_seconds_left', String(seconds));
    localStorage.setItem('lingosnap_pomodoro_deadline', String(deadline));
    localStorage.setItem('lingosnap_pomodoro_initial_seconds', String(seconds));
    localStorage.setItem('lingosnap_pomodoro_running', 'true');
    setMode(AppMode.POMODORO);
  };

  const updatePomodoroSettings = (nextStudyMinutes: number, nextBreakMinutes: number) => {
    setStudyMinutes(nextStudyMinutes);
    setBreakMinutes(nextBreakMinutes);
    localStorage.setItem('lingosnap_study_minutes', String(nextStudyMinutes));
    localStorage.setItem('lingosnap_break_minutes', String(nextBreakMinutes));
    setPomodoroRunning(false);
    setPomodoroDeadline(0);
    setPomodoroSecondsLeft(nextStudyMinutes * 60);
    setPomodoroInitialSeconds(nextStudyMinutes * 60);
    localStorage.setItem('lingosnap_pomodoro_running', 'false');
    localStorage.setItem('lingosnap_pomodoro_deadline', '0');
    localStorage.setItem('lingosnap_pomodoro_seconds_left', String(nextStudyMinutes * 60));
    localStorage.setItem('lingosnap_pomodoro_initial_seconds', String(nextStudyMinutes * 60));
  };

  useEffect(() => {
    if (!pomodoroRunning || !pomodoroDeadline) return;

    const tick = () => {
      const remaining = Math.max(0, Math.ceil((pomodoroDeadline - Date.now()) / 1000));
      setPomodoroSecondsLeft(remaining);
      localStorage.setItem('lingosnap_pomodoro_seconds_left', String(remaining));
      if (remaining <= 0) completePomodoro();
    };

    tick();
    const interval = window.setInterval(tick, 1000);
    return () => window.clearInterval(interval);
  }, [pomodoroRunning, pomodoroDeadline, studyMinutes, breakMinutes, savingPomodoro]);

  useEffect(() => {
    const handlePipToggle = () => togglePomodoro();
    const handlePipReset = () => resetPomodoro();
    window.addEventListener('lingosnap:pomodoro-toggle', handlePipToggle);
    window.addEventListener('lingosnap:pomodoro-reset', handlePipReset);
    return () => {
      window.removeEventListener('lingosnap:pomodoro-toggle', handlePipToggle);
      window.removeEventListener('lingosnap:pomodoro-reset', handlePipReset);
    };
  }, [pomodoroRunning, pomodoroDeadline, pomodoroSecondsLeft, pomodoroInitialSeconds, studyMinutes]);

  const handleImageSelect = async (base64: string) => {
    setSourceImage(base64);
    setMode(AppMode.CROP);
  };

  const handlePdfSelect = async (file: File) => {
    setGenerationFileName(file.name);
    setGenerationStatus('processing');
    setMode(AppMode.PROCESSING);
    try {
      const extracted = await extractExercisesFromPdf(file);
      const listId = `list_${Date.now()}`;
      setTempList(extracted.map(item => ({ ...item, listId })));
      setGenerationStatus('ready');
      setMode(currentMode => currentMode === AppMode.PROCESSING ? AppMode.EDITOR : currentMode);
    } catch (error) {
      setGenerationStatus('error');
      alert(error instanceof Error ? error.message : 'Không thể đọc file PDF. Vui lòng thử lại!');
      setMode(currentMode => currentMode === AppMode.PROCESSING ? AppMode.HOME : currentMode);
    }
  };

  const handleCropComplete = async (base64: string) => {
    setGenerationFileName('Ảnh bài tập');
    setGenerationStatus('processing');
    setMode(AppMode.PROCESSING);
    try {
      const extracted = await extractExercisesFromImage(base64);
      const listId = `list_${Date.now()}`;
      setTempList(extracted.map(item => ({ ...item, listId, imageB64: item.imageB64 || base64 })));
      setGenerationStatus('ready');
      setMode(currentMode => currentMode === AppMode.PROCESSING ? AppMode.EDITOR : currentMode);
    } catch (error) {
      setGenerationStatus('error');
      alert(error instanceof Error ? error.message : '\u004b\u0068\u00f4ng th\u1ec3 qu\u00e9t \u1ea3nh. Vui l\u00f2ng th\u1eed l\u1ea1i!');
      setMode(currentMode => currentMode === AppMode.PROCESSING ? AppMode.HOME : currentMode);
    }
  };

  const handleEditorComplete = async (finalList: ExerciseItem[]) => {
    setActiveList(finalList);
    setSaveStatus('saving');
    try {
      const success = await saveVocabularyList(finalList);
      setSaveStatus(success ? 'success' : 'error');
      if (success) {
        setTimeout(() => setSaveStatus('idle'), 2000);
        initData();
      }
    } catch {
      setSaveStatus('error');
    }
    setMode(AppMode.PRONUNCIATION);
  };

  const handleDeleteList = async (listId: string) => {
    if (!confirm('\u0058\u00f3a b\u00e0i t\u1eadp n\u00e0y v\u0129nh vi\u1ec5n?')) return;
    setRawHistory(prev => prev.filter(item => item.listId !== listId));
    await deleteVocabularyList(listId);
    initData();
  };

  if (!authChecked) {
    return (
      <div className="grid min-h-screen place-items-center bg-[radial-gradient(circle_at_top_left,#dbeafe,transparent_32rem),linear-gradient(135deg,#f8fafc,#eef2ff)] text-slate-950">
        <div className="text-center">
          <div className="mx-auto mb-5 grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-indigo-600 via-blue-600 to-cyan-500 text-white shadow-xl shadow-blue-200">
            <i className="fa-solid fa-bolt text-xl" />
          </div>
          <p className="text-xs font-black uppercase tracking-[0.28em] text-blue-500">LingoSnap</p>
          <p className="mt-2 text-sm font-bold text-slate-500">{'\u0110ang kh\u00f4i ph\u1ee5c phi\u00ean \u0111\u0103ng nh\u1eadp...'}</p>
        </div>
      </div>
    );
  }


  if (!signedIn) {
    return <AuthGate onSignedIn={() => { setSignedIn(true); setAuthChecked(true); }} />;
  }

  const renderListCard = (list: VocabList, compact = false) => (
    <article key={list.id} className="group relative overflow-hidden rounded-2xl border border-white/70 bg-white p-5 shadow-xl shadow-slate-200/60 transition hover:-translate-y-1 hover:shadow-2xl sm:p-5">
      <div className="absolute -right-10 -top-7 h-28 w-28 rounded-full bg-indigo-100 blur-2xl transition group-hover:bg-cyan-100" />
      <div className="relative flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="mb-4 grid h-11 w-11 place-items-center rounded-xl bg-slate-100 text-slate-700">
            <i className="fa-solid fa-book-open" />
          </div>
          <h3 className="truncate text-lg font-black tracking-tight text-slate-950">{list.name}</h3>
          <p className="mt-2 text-sm font-bold text-slate-400">{list.date} • {list.items.length} câu hỏi</p>
          {!compact && <p className="mt-3 text-sm font-semibold text-slate-500">Dạng: {Array.from(new Set(list.items.map(item => item.type))).join(', ')}</p>}
        </div>
        <button onClick={() => handleDeleteList(list.id)} className="relative z-10 grid h-9 w-9 shrink-0 place-items-center rounded-xl text-slate-300 transition hover:bg-red-50 hover:text-red-500">
          <i className="fa-solid fa-trash-can" />
        </button>
      </div>
      <button onClick={() => { setActiveList(list.items); setMode(AppMode.QUIZ); }} className="relative z-10 mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 py-2.5 text-sm font-black text-white transition hover:bg-blue-600">
        <i className="fa-solid fa-play" />
        Bắt đầu ôn tập
      </button>
    </article>
  );

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,#dbeafe,transparent_32rem),linear-gradient(135deg,#f8fafc,#eef2ff)] text-slate-950">
      <Header mode={mode} onNavigate={setMode} onSync={initData} syncing={syncing} />

      {saveStatus !== 'idle' && (
        <div className={`fixed right-4 top-5 z-[80] rounded-xl px-4 py-2.5 font-black text-white shadow-2xl ${saveStatus === 'saving' ? 'bg-orange-500' : saveStatus === 'success' ? 'bg-emerald-600' : 'bg-red-600'}`}>
          {saveStatus === 'saving' ? 'Đang lưu vào Supabase...' : saveStatus === 'success' ? 'Đã lưu thành công!' : 'Lỗi lưu dữ liệu'}
        </div>
      )}

      {generationStatus !== 'idle' && (
        <div className={`fixed bottom-5 right-4 z-[80] flex max-w-sm items-center gap-3 rounded-xl px-4 py-3 text-white shadow-2xl ${generationStatus === 'processing' ? 'bg-blue-600' : generationStatus === 'ready' ? 'bg-emerald-600' : 'bg-red-600'}`}>
          <i className={`fa-solid ${generationStatus === 'processing' ? 'fa-spinner animate-spin' : generationStatus === 'ready' ? 'fa-circle-check' : 'fa-circle-exclamation'} text-lg`} />
          <div className="min-w-0">
            <p className="text-sm font-black">{generationStatus === 'processing' ? 'AI đang tạo bài tập' : generationStatus === 'ready' ? 'Bài tập đã sẵn sàng' : 'Tạo bài tập thất bại'}</p>
            <p className="truncate text-xs font-semibold text-white/80">{generationFileName}</p>
          </div>
          {generationStatus === 'ready' && (
            <button onClick={() => setMode(AppMode.EDITOR)} className="shrink-0 rounded-lg bg-white/20 px-3 py-2 text-xs font-black transition hover:bg-white/30">Mở</button>
          )}
          {generationStatus !== 'processing' && (
            <button onClick={() => setGenerationStatus('idle')} title="Đóng thông báo" className="grid h-7 w-7 shrink-0 place-items-center rounded-lg text-white/80 transition hover:bg-white/20 hover:text-white"><i className="fa-solid fa-xmark" /></button>
          )}
        </div>
      )}

      <main className="ml-[68px] min-h-screen px-4 py-5 sm:px-6 lg:ml-56 lg:px-8 lg:py-8">
        <div className="mx-auto max-w-[92rem] space-y-6">
          <div className="flex flex-col gap-4 rounded-2xl border border-white/70 bg-white/70 p-5 shadow-lg shadow-slate-200/40 backdrop-blur-xl sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.25em] text-blue-500">LingoSnap workspace</p>
              <h1 className="mt-1 text-xl font-black tracking-tight text-slate-950 sm:text-2xl">{getModeTitle(mode)}</h1>
            </div>
            <div className="flex items-center gap-3 rounded-2xl bg-slate-950 px-4 py-2.5 text-white">
              <i className="fa-solid fa-database text-cyan-300" />
              <span className="text-sm font-black">Supabase sync</span>
            </div>
          </div>

          {mode === AppMode.HOME && (
            <div className="space-y-6">
              <section className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
                <HeroSlideshow />

                <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
                  {dashboardCards.map(card => (
                    <button key={card.label} onClick={() => setMode(card.target)} className={`group rounded-xl bg-gradient-to-br ${card.className} p-4 text-left text-white shadow-xl transition hover:-translate-y-1`}>
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="text-2xl font-black">{card.value}</div>
                          <div className="mt-1 text-xs font-black uppercase tracking-wide text-white/80">{card.label}</div>
                          {card.sub && <div className="mt-2 text-xs font-bold text-white/70">{card.sub}</div>}
                        </div>
                        <div className="grid h-10 w-10 place-items-center rounded-lg bg-white/20 text-lg"><i className={`fa-solid ${card.icon}`} /></div>
                      </div>
                    </button>
                  ))}
                </div>
              </section>

              <ImageUploader onImageSelect={handleImageSelect} onPdfSelect={handlePdfSelect} />

              <section className="space-y-5">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-black tracking-tight">Bộ bài tập gần đây</h2>
                    <p className="text-sm font-semibold text-slate-500">Chọn một bộ để bắt đầu ôn tập ngay.</p>
                  </div>
                  <button onClick={() => setMode(AppMode.HISTORY)} className="rounded-lg bg-white px-4 py-2.5 text-sm font-black text-blue-600 shadow-lg shadow-slate-200/60">Tất cả</button>
                </div>
                {groupedLists.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-slate-300 bg-white/70 p-7 text-center font-bold text-slate-400">Chưa có dữ liệu. Hãy tải ảnh bài tập đầu tiên.</div>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{groupedLists.slice(0, 6).map(list => renderListCard(list, true))}</div>
                )}
              </section>
            </div>
          )}

          {mode === AppMode.CROP && (
            <ImageCropper imageSrc={sourceImage} onCrop={handleCropComplete} onCancel={() => setMode(AppMode.HOME)} />
          )}

          {mode === AppMode.PROCESSING && (
            <div className="grid min-h-[55vh] place-items-center rounded-lg bg-white shadow-xl shadow-slate-200/60">
              <div className="text-center">
                <div className="relative mx-auto mb-6 h-24 w-24"><div className="absolute inset-0 rounded-full border-8 border-blue-100 border-t-blue-600 animate-spin" /><i className="fa-solid fa-brain absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-lg text-blue-600" /></div>
                <p className="text-xl font-black">AI đang phân tích bài tập...</p>
                <p className="mt-2 font-semibold text-slate-500">Nhận diện dạng bài và tạo danh sách chỉnh sửa.</p>
              </div>
            </div>
          )}

          {mode === AppMode.EDITOR && <VocabEditor initialList={tempList} onSave={handleEditorComplete} onCancel={() => setMode(AppMode.HOME)} />}
          {mode === AppMode.QUIZ && <QuizContainer list={activeList} onExit={() => setMode(AppMode.HOME)} />}
          {mode === AppMode.PRONUNCIATION && <PronunciationMode list={activeList} onNext={() => setMode(AppMode.QUIZ)} />}
          {mode === AppMode.STREAK && <StreakDashboard activeTaskId={activeStreakTask?.id || null} pomodoroRunning={pomodoroRunning} refreshKey={streakRefreshKey} onStartTask={startStreakTaskPomodoro} onCompleteActiveTask={() => completeStreakTask()} />}
          {mode === AppMode.VOCA && <VocaDashboard />}
          {mode === AppMode.NOTE && <NoteDashboard />}
          {mode === AppMode.POMODORO && <PomodoroDashboard secondsLeft={pomodoroSecondsLeft} running={pomodoroRunning} studyMinutes={studyMinutes} breakMinutes={breakMinutes} savingSession={savingPomodoro} onToggle={togglePomodoro} onReset={resetPomodoro} onUpdateSettings={updatePomodoroSettings} />}

          {mode === AppMode.HISTORY && (
            <div className="space-y-6">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <h2 className="text-lg font-black tracking-tight">Tất cả bộ từ đã lưu</h2>
                  <p className="mt-2 font-semibold text-slate-500">Dữ liệu được đồng bộ để bạn ôn trên mọi thiết bị.</p>
                </div>
                <button onClick={() => setMode(AppMode.HOME)} className="rounded-lg bg-white px-4 py-2.5 text-sm font-black text-slate-600 shadow-lg shadow-slate-200/60">Về dashboard</button>
              </div>
              {groupedLists.length === 0 ? (
                <div className="rounded-lg bg-white p-7 text-center font-bold text-slate-400 shadow-xl shadow-slate-200/60">Chưa có bộ từ nào.</div>
              ) : (
                <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">{groupedLists.map(list => renderListCard(list))}</div>
              )}
            </div>
          )}
        </div>
      </main>
      <FloatingPomodoro secondsLeft={pomodoroSecondsLeft} running={pomodoroRunning} initialSeconds={pomodoroInitialSeconds} onToggle={togglePomodoro} onReset={resetPomodoro} />
      <CelebrationOverlay show={showCelebration} onDone={() => setShowCelebration(false)} />
    </div>
  );
};

export default App;










