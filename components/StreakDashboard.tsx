import React, { useEffect, useMemo, useState } from 'react';
import { StreakDayNote, StreakTask, StreakTaskStatus } from '../services/streakTypes';
import { deleteStreakDay, deleteStreakTask, fetchStreakDayNotes, fetchStreakTasks, saveStreakDayNote, saveStreakTask } from '../services/supabaseService';

interface StreakDashboardProps {
  activeTaskId: string | null;
  pomodoroRunning: boolean;
  refreshKey: number;
  onStartTask: (task: StreakTask) => void;
  onCompleteActiveTask: () => void;
}

const text = {
  title: 'K\u1ebf ho\u1ea1ch h\u1ecdc t\u1eadp & Streak',
  desc: 'Qu\u1ea3n l\u00fd l\u1ecbch h\u1ecdc theo ng\u00e0y. Khi b\u1eaft \u0111\u1ea7u H\u1ecdc Pomo, task ch\u1ec9 chuy\u1ec3n sang ho\u00e0n th\u00e0nh sau khi Pomodoro k\u1ebft th\u00fac.',
  addDay: 'Th\u00eam h\u00e0ng h\u00f4m nay',
  deleteDay: 'X\u00f3a c\u1ea3 k\u1ebf ho\u1ea1ch ng\u00e0y',
  addRow: '+ H\u00e0ng',
  loadFail: 'Kh\u00f4ng t\u1ea3i \u0111\u01b0\u1ee3c danh s\u00e1ch k\u1ebf ho\u1ea1ch.',
  saveFail: 'L\u01b0u thay \u0111\u1ed5i th\u1ea5t b\u1ea1i.',
  noteFail: 'L\u01b0u ghi ch\u00fa ng\u00e0y th\u1ea5t b\u1ea1i.',
  addFail: 'Th\u00eam h\u00e0ng m\u1edbi th\u1ea5t b\u1ea1i.',
  deleteAsk: 'X\u00f3a h\u00e0ng k\u1ebf ho\u1ea1ch n\u00e0y?',
  deleteFail: 'X\u00f3a h\u00e0ng th\u1ea5t b\u1ea1i.',
  deleteDayAsk: 'X\u00f3a to\u00e0n b\u1ed9 k\u1ebf ho\u1ea1ch c\u1ee7a ng\u00e0y n\u00e0y?',
  deleteDayFail: 'X\u00f3a k\u1ebf ho\u1ea1ch ng\u00e0y th\u1ea5t b\u1ea1i.',
  newSubject: 'Ch\u1ee7 \u0111\u1ec1 m\u1edbi',
  dayNote: 'Ghi ch\u00fa theo ng\u00e0y',
  target: 'M\u1ee5c ti\u00eau/t\u1ed5ng gi\u1edd',
  noData: 'Ch\u01b0a c\u00f3 k\u1ebf ho\u1ea1ch n\u00e0o.',
  date: 'Ng\u00e0y',
  time: 'Th\u1eddi gian',
  subject: 'N\u1ed9i dung',
  hours: 'Gi\u1edd',
  status: 'Tr\u1ea1ng th\u00e1i',
  notes: 'Ghi ch\u00fa',
  actions: 'Thao t\u00e1c',
  pomo: 'H\u1ecdc Pomo',
  complete: 'Ho\u00e0n th\u00e0nh',
  doneShort: '\u0110\u00e3 xong',
};

const statusLabel: Record<StreakTaskStatus, string> = {
  todo: '\u2b1c Ch\u01b0a b\u1eaft \u0111\u1ea7u',
  doing: '\ud83d\udd35 \u0110ang h\u1ecdc',
  done: '\u2705 \u0110\u00e3 ho\u00e0n th\u00e0nh',
};

const statusClass: Record<StreakTaskStatus, string> = {
  todo: 'bg-slate-100 text-slate-500',
  doing: 'bg-blue-50 text-blue-600 animate-pulse',
  done: 'bg-emerald-50 text-emerald-600',
};

const formatViDate = (date: string) => {
  const [year, month, day] = date.split('-');
  return year && month && day ? `${day}/${month}/${year}` : date;
};

const toIsoDate = (value: string) => {
  const trimmed = value.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
  const parts = trimmed.split('/');
  if (parts.length === 3) {
    const [day, month, year] = parts;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }
  return trimmed;
};

const getLocalDateKey = (date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const StreakDashboard: React.FC<StreakDashboardProps> = ({ activeTaskId, pomodoroRunning, refreshKey, onStartTask, onCompleteActiveTask }) => {
  const [tasks, setTasks] = useState<StreakTask[]>([]);
  const [dayNotes, setDayNotes] = useState<Record<string, StreakDayNote>>({});
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const groupedTasks = useMemo(() => {
    return tasks.reduce<Record<string, StreakTask[]>>((acc, task) => {
      if (!acc[task.studyDate]) acc[task.studyDate] = [];
      acc[task.studyDate].push(task);
      return acc;
    }, {});
  }, [tasks]);

  const dates = useMemo(() => Object.keys(groupedTasks).sort(), [groupedTasks]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [taskData, noteData] = await Promise.all([fetchStreakTasks(), fetchStreakDayNotes()]);
      setTasks(taskData);
      setDayNotes(noteData.reduce<Record<string, StreakDayNote>>((acc, note) => {
        acc[note.studyDate] = note;
        return acc;
      }, {}));
    } catch {
      setMessage(text.loadFail);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [refreshKey]);

  const handleCellChange = async (task: StreakTask, field: keyof StreakTask, value: any) => {
    const updated = { ...task, [field]: value };
    setTasks(prev => prev.map(item => item.id === task.id ? updated : item));
    try {
      await saveStreakTask(updated);
    } catch {
      setMessage(text.saveFail);
    }
  };

  const handleDayNoteChange = async (date: string, field: keyof StreakDayNote, value: string) => {
    const oldNote = dayNotes[date] || { studyDate: date, weekday: '', totalHours: '', notes: '' };
    const nextNote = { ...oldNote, [field]: value };
    setDayNotes(prev => ({ ...prev, [date]: nextNote }));
    try {
      await saveStreakDayNote(nextNote);
    } catch {
      setMessage(text.noteFail);
    }
  };

  const handleAddNew = async (date = getLocalDateKey()) => {
    const newTask: StreakTask = {
      id: crypto.randomUUID(),
      studyDate: date,
      timeSlot: '08:30-10:30',
      subject: text.newSubject,
      durationHours: 2,
      status: 'todo',
      notes: '',
    };
    setMessage('');
    setTasks(prev => [...prev, newTask]);
    try {
      await saveStreakTask(newTask);
    } catch {
      setTasks(prev => prev.filter(task => task.id !== newTask.id));
      setMessage(text.addFail);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(text.deleteAsk)) return;
    setTasks(prev => prev.filter(task => task.id !== id));
    try {
      await deleteStreakTask(id);
    } catch {
      setMessage(text.deleteFail);
    }
  };

  const handleDeleteDay = async (date: string) => {
    if (!confirm(text.deleteDayAsk)) return;
    const previousTasks = tasks;
    const previousNote = dayNotes[date];
    setTasks(prev => prev.filter(task => task.studyDate !== date));
    setDayNotes(prev => {
      const next = { ...prev };
      delete next[date];
      return next;
    });
    try {
      await deleteStreakDay(date);
    } catch {
      setTasks(previousTasks);
      if (previousNote) setDayNotes(prev => ({ ...prev, [date]: previousNote }));
      setMessage(text.deleteDayFail);
    }
  };

  const startTaskPomodoro = async (task: StreakTask) => {
    const updated: StreakTask = { ...task, status: 'doing' };
    setTasks(prev => prev.map(item => item.id === task.id ? updated : item));
    await saveStreakTask(updated);
    onStartTask(updated);
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-2xl font-black text-slate-950">{text.title}</h2>
          <p className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-slate-500">{text.desc}</p>
        </div>
        <button type="button" onClick={() => void handleAddNew(getLocalDateKey())} className="rounded-xl bg-blue-600 px-5 py-3 text-xs font-black text-white shadow-lg shadow-blue-200 hover:bg-blue-700">{text.addDay}</button>
      </div>

      {message && <div className="rounded-xl bg-blue-50 p-4 font-bold text-blue-700">{message}</div>}
      {loading && <div className="rounded-xl bg-white p-5 text-center font-black text-slate-400">Loading...</div>}
      {!loading && dates.length === 0 && <div className="rounded-xl border border-dashed border-slate-300 bg-white p-7 text-center font-bold text-slate-400">{text.noData}</div>}

      {dates.map(date => {
        const note = dayNotes[date] || { studyDate: date, weekday: '', totalHours: '', notes: '' };
        return (
          <section key={date} className="overflow-hidden rounded-xl border border-slate-100 bg-white shadow-xl shadow-slate-200/50">
            <div className="grid gap-3 border-b border-slate-100 bg-slate-50 p-4 lg:grid-cols-[220px_150px_1fr_auto] lg:items-center">
              <div className="font-black text-slate-950">{formatViDate(date)}</div>
              <input value={note.totalHours} onChange={event => handleDayNoteChange(date, 'totalHours', event.target.value)} placeholder={text.target} className="bg-white px-3 py-2 text-sm font-bold outline-none ring-1 ring-slate-200 focus:ring-blue-500" />
              <input value={note.notes} onChange={event => handleDayNoteChange(date, 'notes', event.target.value)} placeholder={text.dayNote} className="bg-white px-3 py-2 text-sm font-semibold outline-none ring-1 ring-slate-200 focus:ring-blue-500" />
              <div className="flex items-center justify-end gap-2">
                <button type="button" onClick={() => void handleAddNew(date)} className="rounded-xl bg-blue-600 px-3 py-1.5 text-[10px] font-black text-white">{text.addRow}</button>
                <button type="button" onClick={() => void handleDeleteDay(date)} title={text.deleteDay} aria-label={text.deleteDay} className="grid h-8 w-8 place-items-center rounded-xl text-slate-300 transition hover:bg-red-50 hover:text-red-500"><i className="fa-solid fa-trash-can" /></button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-[980px] w-full text-left text-sm">
                <thead className="bg-white text-[10px] font-black uppercase tracking-widest text-slate-400">
                  <tr>
                    <th className="p-3">{text.date}</th>
                    <th className="p-3">{text.time}</th>
                    <th className="p-3">{text.subject}</th>
                    <th className="p-3">{text.hours}</th>
                    <th className="p-3">{text.status}</th>
                    <th className="p-3">{text.notes}</th>
                    <th className="p-3 text-right">{text.actions}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {groupedTasks[date].map(task => {
                    const isActive = activeTaskId === task.id && pomodoroRunning;
                    return (
                      <tr key={task.id} className={`hover:bg-slate-50/50 ${isActive ? 'bg-blue-50/40' : ''}`}>
                        <td className="p-3"><input type="text" value={formatViDate(task.studyDate)} onChange={event => handleCellChange(task, 'studyDate', toIsoDate(event.target.value))} className="w-24 rounded bg-transparent px-1.5 py-1 font-bold text-slate-950 outline-none focus:ring-2 focus:ring-blue-500" placeholder="dd/mm/yyyy" /></td>
                        <td className="p-3"><input type="text" value={task.timeSlot} onChange={event => handleCellChange(task, 'timeSlot', event.target.value)} className="w-28 rounded bg-transparent px-1.5 py-1 text-slate-700 outline-none focus:ring-2 focus:ring-blue-500" /></td>
                        <td className="p-3"><input type="text" value={task.subject} onChange={event => handleCellChange(task, 'subject', event.target.value)} className="w-full rounded bg-transparent px-1.5 py-1 text-slate-950 outline-none focus:ring-2 focus:ring-blue-500" /></td>
                        <td className="p-3"><input type="number" step="0.5" min="0" value={task.durationHours} onChange={event => handleCellChange(task, 'durationHours', Number(event.target.value))} className="w-16 rounded bg-transparent px-1.5 py-1 text-slate-700 outline-none focus:ring-2 focus:ring-blue-500" /></td>
                        <td className="p-3"><span className={`inline-block rounded-full px-3 py-1 text-[10px] font-black ${statusClass[task.status]}`}>{statusLabel[task.status]}</span></td>
                        <td className="p-3"><input type="text" value={task.notes} onChange={event => handleCellChange(task, 'notes', event.target.value)} className="w-full rounded bg-transparent px-1.5 py-1 font-semibold text-slate-500 outline-none focus:ring-2 focus:ring-blue-500" placeholder="..." /></td>
                        <td className="p-3">
                          <div className="flex min-w-[150px] items-center justify-end gap-2">
                            {task.status !== 'done' && !isActive && <button onClick={() => startTaskPomodoro(task)} className="min-w-[92px] rounded-xl bg-slate-950 px-3 py-1.5 font-black text-white transition hover:bg-blue-600">{text.pomo}</button>}
                            {isActive && <button onClick={onCompleteActiveTask} className="min-w-[92px] rounded-xl bg-emerald-600 px-3 py-1.5 font-black text-white transition hover:bg-emerald-700">{text.complete}</button>}
                            {task.status === 'done' && !isActive && <span className="min-w-[92px] text-center text-[10px] font-black uppercase text-emerald-500">{text.doneShort}</span>}
                            <button onClick={() => handleDelete(task.id)} className="grid h-8 w-8 place-items-center text-slate-300 transition hover:text-red-500"><i className="fa-solid fa-trash-can" /></button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        );
      })}
    </div>
  );
};

export default StreakDashboard;
