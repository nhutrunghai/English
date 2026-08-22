import React, { useEffect, useMemo, useState } from 'react';
import { InterviewItem } from '../types';
import { deleteInterviewItem, fetchInterviewItems, isSupabaseConfigured, saveInterviewItem } from '../services/supabaseService';

const emptyDraft: Partial<InterviewItem> & { question: string; answer: string; note: string } = {
  question: '', answer: '', note: '', tags: [], reviewed: false,
};

const InterviewDashboard: React.FC = () => {
  const [items, setItems] = useState<InterviewItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState(emptyDraft);
  const [editing, setEditing] = useState(false);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'reviewed' | 'pending'>('all');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  const selected = items.find(item => item.id === selectedId) || null;
  const filteredItems = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    return items.filter(item => {
      const matchesFilter = filter === 'all' || (filter === 'reviewed' ? item.reviewed : !item.reviewed);
      const matchesSearch = !keyword || [item.question, item.answer, item.note, ...item.tags].some(value => value.toLowerCase().includes(keyword));
      return matchesFilter && matchesSearch;
    });
  }, [items, query, filter]);

  const loadItems = async () => {
    if (!isSupabaseConfigured) return;
    setLoading(true);
    try {
      const data = await fetchInterviewItems();
      setItems(data);
      setSelectedId(current => current || data[0]?.id || null);
    } catch (error) {
      console.error(error);
      setMessage('Không tải được dữ liệu phỏng vấn. Hãy chạy SQL migration trước.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadItems(); }, []);

  const startNew = () => {
    setDraft(emptyDraft); setSelectedId(null); setEditing(true); setMessage('');
  };

  const startEdit = (item: InterviewItem) => {
    setDraft(item); setSelectedId(item.id); setEditing(true); setMessage('');
  };

  const saveDraft = async () => {
    if (!draft.question.trim()) { setMessage('Hãy nhập câu hỏi trước khi lưu.'); return; }
    setSaving(true); setMessage('');
    try {
      const saved = await saveInterviewItem({ ...draft, question: draft.question, answer: draft.answer });
      setItems(previous => [saved, ...previous.filter(item => item.id !== saved.id)]);
      setSelectedId(saved.id); setDraft(saved); setEditing(false); setMessage('Đã lưu câu hỏi phỏng vấn.');
    } catch (error) {
      console.error(error); setMessage('Không lưu được. Hãy kiểm tra Supabase và chạy SQL migration.');
    } finally { setSaving(false); }
  };

  const removeItem = async (id: string) => {
    if (!confirm('Xóa câu hỏi phỏng vấn này?')) return;
    try {
      await deleteInterviewItem(id);
      const remaining = items.filter(item => item.id !== id);
      setItems(remaining);
      if (selectedId === id) { setSelectedId(remaining[0]?.id || null); setEditing(false); setDraft(emptyDraft); }
    } catch (error) { console.error(error); setMessage('Không xóa được mục này.'); }
  };

  const toggleReviewed = async (item: InterviewItem) => {
    try {
      const saved = await saveInterviewItem({ ...item, reviewed: !item.reviewed });
      setItems(previous => previous.map(current => current.id === saved.id ? saved : current));
      if (selectedId === saved.id) setDraft(saved);
    } catch (error) { console.error(error); setMessage('Không cập nhật được trạng thái ôn tập.'); }
  };

  const updateTags = (value: string) => setDraft(previous => ({ ...previous, tags: value.split(',').map(tag => tag.trim()).filter(Boolean) }));
  const reviewedCount = items.filter(item => item.reviewed).length;

  return (
    <div className="grid min-h-[70vh] gap-5 xl:grid-cols-[350px_1fr]">
      <aside className="overflow-hidden border border-slate-200 bg-white shadow-[0_12px_40px_rgba(15,23,42,0.06)]">
        <div className="border-b border-slate-100 p-4">
          <div className="flex items-start justify-between gap-3">
            <div><p className="text-xs font-black uppercase tracking-[0.22em] text-violet-500">Interview prep</p><h2 className="text-xl font-black text-slate-950">Câu hỏi phỏng vấn</h2></div>
            <button onClick={startNew} className="bg-slate-950 px-3 py-2 text-xs font-black text-white hover:bg-violet-600">+ Thêm</button>
          </div>
          <p className="mt-3 text-sm font-semibold leading-6 text-slate-500">Lưu câu trả lời mẫu và ghi chú để ôn theo từng câu hỏi.</p>
          <div className="mt-4 grid grid-cols-2 gap-2 text-center text-xs font-black"><div className="bg-violet-50 p-2 text-violet-700">{items.length} câu hỏi</div><div className="bg-emerald-50 p-2 text-emerald-700">{reviewedCount} đã ôn</div></div>
          <input value={query} onChange={event => setQuery(event.target.value)} placeholder="Tìm câu hỏi, câu trả lời, tag..." className="mt-4 w-full border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-bold outline-none focus:border-violet-400" />
          <div className="mt-3 grid grid-cols-3 gap-1 text-[11px] font-black">
            {([['all', 'Tất cả'], ['pending', 'Chưa ôn'], ['reviewed', 'Đã ôn']] as const).map(([value, label]) => <button key={value} onClick={() => setFilter(value)} className={`px-2 py-2 ${filter === value ? 'bg-slate-950 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>{label}</button>)}
          </div>
        </div>
        <div className="max-h-[62vh] overflow-y-auto">
          {loading && <div className="p-5 text-sm font-bold text-slate-400">Đang tải...</div>}
          {!loading && filteredItems.length === 0 && <div className="p-5 text-sm font-bold text-slate-400">Chưa có câu hỏi nào.</div>}
          {filteredItems.map(item => <article key={item.id} className={`border-b border-slate-100 p-4 transition hover:bg-slate-50 ${selectedId === item.id && !editing ? 'bg-violet-50' : ''}`}>
            <button onClick={() => { setSelectedId(item.id); setDraft(item); setEditing(false); setMessage(''); }} className="w-full text-left">
              <div className="flex gap-2"><i className={`fa-solid ${item.reviewed ? 'fa-circle-check text-emerald-500' : 'fa-circle text-slate-300'} mt-0.5`} /><h3 className="line-clamp-2 font-black text-slate-950">{item.question}</h3></div>
              <p className="mt-2 line-clamp-2 text-xs font-semibold leading-5 text-slate-500">{item.answer || 'Chưa có câu trả lời mẫu.'}</p>
              {item.tags.length > 0 && <div className="mt-3 flex flex-wrap gap-1">{item.tags.map(tag => <span key={tag} className="bg-slate-100 px-2 py-1 text-[10px] font-black text-slate-500">#{tag}</span>)}</div>}
            </button>
          </article>)}
        </div>
      </aside>

      <main className="border border-slate-200 bg-white shadow-[0_12px_40px_rgba(15,23,42,0.06)]">
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div><p className="text-xs font-black uppercase tracking-[0.22em] text-slate-400">{editing ? 'Chỉnh sửa' : 'Ôn tập'}</p><h2 className="text-2xl font-black text-slate-950">{editing ? (draft.question || 'Câu hỏi mới') : (selected?.question || 'Chọn một câu hỏi để bắt đầu')}</h2></div>
          <div className="flex flex-wrap gap-2">
            {selected && !editing && <button onClick={() => toggleReviewed(selected)} className={`px-4 py-2 text-sm font-black ${selected.reviewed ? 'bg-emerald-50 text-emerald-700' : 'bg-violet-600 text-white hover:bg-violet-700'}`}><i className={`fa-solid ${selected.reviewed ? 'fa-circle-check' : 'fa-check'} mr-2`} />{selected.reviewed ? 'Đã ôn' : 'Đánh dấu đã ôn'}</button>}
            {selected && !editing && <button onClick={() => startEdit(selected)} className="bg-blue-600 px-4 py-2 text-sm font-black text-white hover:bg-blue-700"><i className="fa-solid fa-pen mr-2" />Chỉnh sửa</button>}
            {selected && <button onClick={() => removeItem(selected.id)} className="bg-rose-50 px-4 py-2 text-sm font-black text-rose-600 hover:bg-rose-100"><i className="fa-solid fa-trash mr-2" />Xóa</button>}
          </div>
        </div>
        {editing ? <div className="space-y-4 p-5">
          <label className="block text-sm font-black text-slate-700">Câu hỏi<textarea value={draft.question} onChange={event => setDraft(previous => ({ ...previous, question: event.target.value }))} placeholder="Ví dụ: Hãy giới thiệu về bản thân bạn." rows={3} className="mt-2 w-full resize-y border border-slate-200 bg-slate-50 px-4 py-3 font-semibold outline-none focus:border-violet-400" /></label>
          <label className="block text-sm font-black text-slate-700">Câu trả lời mẫu<textarea value={draft.answer} onChange={event => setDraft(previous => ({ ...previous, answer: event.target.value }))} placeholder="Viết câu trả lời mà bạn muốn luyện tập..." rows={7} className="mt-2 w-full resize-y border border-slate-200 bg-slate-50 px-4 py-3 font-semibold leading-6 outline-none focus:border-violet-400" /></label>
          <label className="block text-sm font-black text-slate-700">Ghi chú cá nhân<textarea value={draft.note} onChange={event => setDraft(previous => ({ ...previous, note: event.target.value }))} placeholder="Điểm cần nhấn mạnh, ví dụ cụ thể, từ vựng cần nhớ..." rows={4} className="mt-2 w-full resize-y border border-slate-200 bg-amber-50/50 px-4 py-3 font-semibold leading-6 outline-none focus:border-violet-400" /></label>
          <label className="block text-sm font-black text-slate-700">Tags<input value={(draft.tags || []).join(', ')} onChange={event => updateTags(event.target.value)} placeholder="Ví dụ: HR, React, tiếng Anh" className="mt-2 w-full border border-slate-200 bg-slate-50 px-4 py-3 font-semibold outline-none focus:border-violet-400" /></label>
          <div className="flex justify-end gap-3"><button onClick={() => { setEditing(false); if (selected) setDraft(selected); }} className="bg-slate-100 px-5 py-3 text-sm font-black text-slate-600">Hủy</button><button onClick={saveDraft} disabled={saving} className="bg-slate-950 px-5 py-3 text-sm font-black text-white hover:bg-violet-600 disabled:opacity-50">{saving ? 'Đang lưu...' : 'Lưu câu hỏi'}</button></div>
        </div> : selected ? <div className="space-y-6 p-5 sm:p-7">
          <section><p className="text-xs font-black uppercase tracking-[0.22em] text-violet-500">Câu hỏi</p><p className="mt-3 whitespace-pre-wrap text-xl font-black leading-8 text-slate-950">{selected.question}</p></section>
          <section className="border-l-4 border-blue-500 bg-blue-50 p-5"><p className="text-xs font-black uppercase tracking-[0.22em] text-blue-600">Câu trả lời mẫu</p><p className="mt-3 whitespace-pre-wrap font-semibold leading-7 text-slate-700">{selected.answer || 'Bạn chưa thêm câu trả lời mẫu.'}</p></section>
          <section className="border-l-4 border-amber-400 bg-amber-50 p-5"><p className="text-xs font-black uppercase tracking-[0.22em] text-amber-700">Ghi chú</p><p className="mt-3 whitespace-pre-wrap font-semibold leading-7 text-slate-700">{selected.note || 'Chưa có ghi chú.'}</p></section>
          {selected.tags.length > 0 && <div className="flex flex-wrap gap-2">{selected.tags.map(tag => <span key={tag} className="bg-slate-100 px-3 py-1.5 text-xs font-black text-slate-600">#{tag}</span>)}</div>}
        </div> : <div className="grid min-h-[45vh] place-items-center p-6 text-center"><div><i className="fa-solid fa-comments mb-4 text-4xl text-violet-200" /><p className="font-black text-slate-500">Tạo câu hỏi đầu tiên để bắt đầu ôn phỏng vấn.</p><button onClick={startNew} className="mt-4 bg-violet-600 px-4 py-2.5 text-sm font-black text-white hover:bg-violet-700">Thêm câu hỏi</button></div></div>}
        {message && <div className="mx-5 mb-5 border-l-4 border-violet-400 bg-violet-50 p-3 text-sm font-bold text-violet-700">{message}</div>}
        {!isSupabaseConfigured && <div className="mx-5 mb-5 border-l-4 border-orange-400 bg-orange-50 p-3 text-sm font-bold text-orange-700">Chưa cấu hình Supabase nên dữ liệu chưa thể đồng bộ.</div>}
      </main>
    </div>
  );
};

export default InterviewDashboard;
