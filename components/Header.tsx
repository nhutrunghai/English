import React from 'react';
import { AppMode } from '../types';

interface HeaderProps {
  mode: AppMode;
  onNavigate: (mode: AppMode) => void;
  onSync: () => void;
  syncing: boolean;
}

const navItems = [
  { mode: AppMode.HOME, label: 'Trang ch\u1ee7', icon: 'fa-house' },
  { mode: AppMode.HISTORY, label: 'B\u1ed9 t\u1eeb', icon: 'fa-layer-group' },
  { mode: AppMode.VOCA, label: 'Voca', icon: 'fa-book-open-reader' },
  { mode: AppMode.NOTE, label: 'Note', icon: 'fa-note-sticky' },
  { mode: AppMode.POMODORO, label: 'Pomodoro', icon: 'fa-fire' },
  { mode: AppMode.STREAK, label: 'Streak', icon: 'fa-table-list' },
];

const Header: React.FC<HeaderProps> = ({ mode, onNavigate, onSync, syncing }) => {
  return (
    <aside className="fixed inset-y-0 left-0 z-50 w-[68px] border-r border-white/70 bg-white/85 shadow-[20px_0_60px_rgba(15,23,42,0.06)] backdrop-blur-2xl lg:w-56">
      <div className="flex h-full flex-col px-3 py-2.5 lg:px-3 lg:py-6">
        <button onClick={() => onNavigate(AppMode.HOME)} className="mb-8 flex items-center justify-center gap-3 lg:justify-start">
          <div className="grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br from-indigo-600 via-blue-600 to-cyan-500 text-white shadow-lg shadow-blue-200">
            <i className="fa-solid fa-bolt text-lg" />
          </div>
          <div className="hidden text-left lg:block">
            <div className="text-lg font-black tracking-tight text-slate-950">LingoSnap</div>
            <div className="text-xs font-bold uppercase tracking-[0.22em] text-slate-400">AI vocab</div>
          </div>
        </button>

        <nav className="space-y-3">
          {navItems.map(item => {
            const active = mode === item.mode;
            return (
              <button
                key={item.mode}
                onClick={() => onNavigate(item.mode)}
                title={item.label}
                className={`group flex w-full items-center justify-center gap-3 rounded-xl px-0 py-2.5 text-sm font-black transition lg:justify-start lg:px-3 ${active ? 'bg-slate-950 text-white shadow-xl shadow-slate-200' : 'text-slate-400 hover:bg-slate-100 hover:text-slate-950'}`}
              >
                <i className={`fa-solid ${item.icon} text-lg lg:w-5`} />
                <span className="hidden lg:inline">{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="mt-auto space-y-3">
          <button
            onClick={onSync}
            disabled={syncing}
            title={'L\u00e0m m\u1edbi d\u1eef li\u1ec7u'}
            className="flex w-full items-center justify-center gap-3 rounded-xl bg-blue-50 px-0 py-2.5 text-sm font-black text-blue-600 transition hover:bg-blue-100 disabled:opacity-60 lg:justify-start lg:px-3"
          >
            <i className={`fa-solid fa-arrows-rotate text-lg lg:w-5 ${syncing ? 'animate-spin' : ''}`} />
            <span className="hidden lg:inline">{'\u0110\u1ed3ng b\u1ed9'}</span>
          </button>
        </div>
      </div>
    </aside>
  );
};

export default Header;


