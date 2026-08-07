import React, { useState } from 'react';
import { ExerciseItem, ExerciseType } from '../types';

interface VocabEditorProps {
  initialList: ExerciseItem[];
  onSave: (list: ExerciseItem[]) => void;
  onCancel: () => void;
}

const formatMatchingPairs = (answer: string) => {
  try {
    const pairs = JSON.parse(answer);
    return Array.isArray(pairs) ? pairs.map(pair => `${pair.left} → ${pair.right}`).join(' | ') : answer;
  } catch {
    return answer;
  }
};

const parseMatchingPairs = (value: string) => {
  const pairs = value.split('|').map(part => part.trim()).filter(Boolean).map(part => {
    const [left, right] = part.split('→').map(item => item.trim());
    return left && right ? { left, right } : null;
  }).filter(Boolean);
  return pairs.length ? JSON.stringify(pairs) : value;
};

const VocabEditor: React.FC<VocabEditorProps> = ({ initialList, onSave, onCancel }) => {
  const [list, setList] = useState<ExerciseItem[]>(initialList);
  const currentListId = initialList.length > 0 ? initialList[0].listId : `list_${Date.now()}`;

  const updateItem = (id: string, field: keyof ExerciseItem, value: any) => {
    setList(list.map(item => item.id === id ? { ...item, [field]: value } : item));
  };

  const updateOption = (id: string, optIndex: number, newValue: string) => {
    setList(list.map(item => {
      if (item.id === id && item.options) {
        const newOptions = [...item.options];
        newOptions[optIndex] = newValue;
        return { ...item, options: newOptions };
      }
      return item;
    }));
  };

  const addOption = (id: string) => {
    setList(list.map(item => {
      if (item.id === id) {
        return { ...item, options: [...(item.options || []), ''] };
      }
      return item;
    }));
  };

  const removeOption = (id: string, optIndex: number) => {
    setList(list.map(item => {
      if (item.id === id && item.options) {
        return { ...item, options: item.options.filter((_, i) => i !== optIndex) };
      }
      return item;
    }));
  };

  const deleteItem = (id: string) => {
    setList(list.filter(item => item.id !== id));
  };

  const handleAddNew = () => {
    const newItem: ExerciseItem = {
      id: crypto.randomUUID(),
      listId: currentListId,
      type: 'VOCAB',
      instruction: 'Dịch từ vựng',
      question: '',
      answer: '',
      options: [],
      imageB64: initialList[0]?.imageB64 || '',
      dateLearned: new Date().toLocaleDateString('vi-VN'),
    };
    setList([...list, newItem]);
  };

  const showOptions = (type: ExerciseType) => ['MULTIPLE_CHOICE', 'MATCHING', 'ORDERING'].includes(type);

  return (
    <div className="mx-auto max-w-4xl rounded-xl border border-gray-100 bg-white p-5 shadow-2xl animate-slideUp">
      <div className="flex flex-col justify-between items-start mb-8 gap-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-2xl font-black text-gray-900">Kiểm tra nội dung AI</h2>
          <p className="text-xs font-semibold text-gray-500 mt-1">Dữ liệu bài tập đa dạng đang được đồng bộ</p>
        </div>
        <button onClick={handleAddNew} className="flex items-center rounded-xl bg-blue-600 px-6 py-3 text-sm font-black text-white hover:bg-blue-700 shadow-lg shadow-blue-200">
          <i className="fa-solid fa-plus mr-2" />
          Thêm bài tập
        </button>
      </div>

      {initialList[0]?.imageB64 && (
        <div className="mb-8 rounded-xl border border-slate-100 bg-slate-50 p-4">
          <p className="text-xs font-black uppercase tracking-widest text-slate-400 mb-2">Ảnh bài tập gốc</p>
          <img src={initialList[0].imageB64} alt="Source" className="max-h-48 rounded-xl object-contain" />
        </div>
      )}

      <div className="space-y-6 mb-8 max-h-[60vh] overflow-y-auto px-1">
        {list.length === 0 ? (
          <div className="text-center py-20 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
            <i className="fa-solid fa-file-circle-exclamation text-4xl text-gray-300 mb-4 block" />
            <p className="text-slate-400 font-bold">Danh sách trống. Hãy thêm bài tập mới.</p>
          </div>
        ) : (
          list.map((item, index) => (
            <div key={item.id} className="p-5 bg-white rounded-xl border border-gray-100 shadow-sm space-y-4 hover:border-blue-200 transition">
              <div className="flex justify-between items-center border-b border-gray-50 pb-3">
                <div className="flex items-center space-x-3">
                  <span className="w-8 h-8 flex items-center justify-center font-black bg-blue-600 text-white rounded-xl text-xs">#{index + 1}</span>
                  <select
                    value={item.type}
                    onChange={event => updateItem(item.id, 'type', event.target.value as ExerciseType)}
                    className="rounded-xl bg-gray-50 px-3 py-1.5 text-xs font-black text-slate-700 outline-none ring-1 ring-gray-100 focus:ring-blue-500"
                  >
                    <option value="VOCAB">TỪ VỰNG</option>
                    <option value="MULTIPLE_CHOICE">TRẮC NGHIỆM</option>
                    <option value="MATCHING">NỐI CẶP</option>
                    <option value="FILL_BLANK">ĐIỀN TỪ</option>
                    <option value="REWRITE">VIẾT LẠI CÂU</option>
                    <option value="TRUE_FALSE">TRUE / FALSE</option>
                    <option value="ORDERING">SẮP XẾP</option>
                    <option value="SHORT_ANSWER">TRẢ LỜI NGẮN</option>
                  </select>
                </div>
                <button onClick={() => deleteItem(item.id)} className="text-slate-300 hover:text-red-500 transition p-1.5">
                  <i className="fa-solid fa-trash-can" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <label className="space-y-1.5 text-xs font-bold text-gray-400">
                  HƯỚNG DẪN THỰC HIỆN
                  <input
                    value={item.instruction}
                    onChange={event => updateItem(item.id, 'instruction', event.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-gray-50 text-xs font-bold text-slate-800 outline-none focus:bg-white focus:ring-2 focus:ring-blue-500"
                    placeholder="Ví dụ: Nối từ với nghĩa đúng"
                  />
                </label>
                <label className="space-y-1.5 text-xs font-bold text-gray-400">
                  ĐÁP ÁN CHÍNH XÁC
                  <input
                    value={item.type === 'MATCHING' ? formatMatchingPairs(item.answer) : item.answer}
                    onChange={event => updateItem(item.id, 'answer', item.type === 'MATCHING' ? parseMatchingPairs(event.target.value) : event.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-green-50 text-xs font-bold text-green-700 outline-none focus:bg-white focus:ring-2 focus:ring-green-500"
                    placeholder="Đáp án đúng..."
                  />
                </label>
              </div>

              <label className="space-y-1.5 text-xs font-bold text-gray-400 block">
                NỘI DUNG CÂU HỎI
                <textarea
                  value={item.question}
                  onChange={event => updateItem(item.id, 'question', event.target.value)}
                  rows={2}
                  className="w-full px-4 py-2.5 rounded-xl bg-gray-50 text-xs font-bold text-slate-800 outline-none focus:bg-white focus:ring-2 focus:ring-blue-500"
                  placeholder="Nhập câu hỏi hoặc từ tiếng Anh (Dùng ____ cho chỗ trống)"
                />
              </label>

              {showOptions(item.type) && (
                <div className="p-4 bg-blue-50/50 rounded-xl space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-black text-blue-600 uppercase tracking-wider">Các lựa chọn / Vế nối / Từ sắp xếp</span>
                    <button onClick={() => addOption(item.id)} className="text-[10px] font-black text-blue-600 bg-white px-2 py-1 rounded-md border border-blue-200 hover:bg-blue-600 hover:text-white">
                      + THÊM
                    </button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {(item.options || []).map((opt, oIdx) => (
                      <div key={oIdx} className="flex items-center space-x-2 bg-white p-2 rounded-xl border border-blue-100 shadow-sm">
                        <span className="text-[10px] font-bold text-blue-300 w-4">{String.fromCharCode(65 + oIdx)}</span>
                        <input
                          value={opt}
                          onChange={event => updateOption(item.id, oIdx, event.target.value)}
                          className="flex-1 bg-transparent border-none text-xs font-bold outline-none"
                          placeholder={`Lựa chọn ${oIdx + 1}`}
                        />
                        <button onClick={() => removeOption(item.id, oIdx)} className="text-slate-300 hover:text-red-500">
                          <i className="fa-solid fa-circle-minus" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      <div className="flex flex-col sm:flex-row justify-end gap-3 pt-6 border-t border-gray-100">
        <button onClick={onCancel} className="px-6 py-3 rounded-xl text-slate-500 font-bold hover:bg-gray-100 transition order-2 sm:order-1">
          Hủy bỏ
        </button>
        <button onClick={() => onSave(list)} className="px-10 py-3 rounded-xl bg-slate-950 text-white font-black hover:bg-blue-600 shadow-lg active:scale-95 order-1 sm:order-2">
          Lưu dữ liệu & Luyện tập
        </button>
      </div>
    </div>
  );
};

export default VocabEditor;
