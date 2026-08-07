import React, { useCallback, useEffect } from 'react';

interface ImageUploaderProps {
  onImageSelect: (base64: string) => void;
  onPdfSelect: (file: File) => void;
}

const ImageUploader: React.FC<ImageUploaderProps> = ({ onImageSelect, onPdfSelect }) => {
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
      onPdfSelect(file);
      return;
    }

    if (!file.type.startsWith('image/')) {
      alert('Chỉ hỗ trợ file ảnh hoặc PDF.');
      return;
    }

    const reader = new FileReader();
    reader.onload = loadEvent => {
      if (loadEvent.target?.result) onImageSelect(loadEvent.target.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handlePaste = useCallback((event: ClipboardEvent) => {
    const items = event.clipboardData?.items;
    if (!items) return;

    for (let index = 0; index < items.length; index += 1) {
      if (!items[index].type.includes('image')) continue;
      const blob = items[index].getAsFile();
      if (!blob) continue;

      const reader = new FileReader();
      reader.onload = loadEvent => {
        if (loadEvent.target?.result) onImageSelect(loadEvent.target.result as string);
      };
      reader.readAsDataURL(blob);
    }
  }, [onImageSelect]);

  useEffect(() => {
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [handlePaste]);

  return (
    <section className="group relative w-full overflow-hidden rounded-xl border border-white/70 bg-white p-5 text-left shadow-xl shadow-slate-200/70 transition hover:-translate-y-1 hover:shadow-2xl sm:p-5 lg:p-5">
      <input id="file-upload" type="file" accept="image/*,application/pdf,.pdf" className="hidden" onChange={handleFileChange} />
      <div className="absolute -right-16 -top-16 h-44 w-44 rounded-full bg-blue-100 blur-2xl transition group-hover:bg-cyan-100" />
      <div className="relative grid gap-4 md:grid-cols-[auto_1fr_auto] md:items-center">
        <div className="grid h-14 w-14 place-items-center rounded-xl bg-slate-950 text-white shadow-lg shadow-slate-200">
          <i className="fa-solid fa-file-arrow-up text-lg" />
        </div>
        <div>
          <div className="mb-2 text-xs font-black uppercase tracking-[0.22em] text-blue-500">AI scan</div>
          <h3 className="text-xl font-black tracking-tight text-slate-950">Tải ảnh hoặc PDF bài tập</h3>
          <p className="mt-2 max-w-xl text-sm font-semibold leading-6 text-slate-500">Chọn ảnh, PDF hoặc nhấn Ctrl + V để dán ảnh. PDF chỉ được gửi tạm thời cho AI đọc, sau đó bài tập sẽ mở để bạn chỉnh sửa trước khi lưu.</p>
        </div>
        <button type="button" onClick={() => document.getElementById('file-upload')?.click()} className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-black text-white shadow-lg shadow-blue-200 transition hover:bg-blue-700">
          <i className="fa-solid fa-plus" />
          Thêm file
        </button>
      </div>
    </section>
  );
};

export default ImageUploader;
