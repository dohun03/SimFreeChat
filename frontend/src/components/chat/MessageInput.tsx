import { useRef, useState } from 'react';
import { SendHorizontal, Paperclip } from 'lucide-react';
import { apiGet, apiPost } from '../../services/api';

export function MessageInput({ roomId, onSendText, onSendImage, onTyping }: any) {
  const [input, setInput] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const createThumbnail = (file: File): Promise<Blob> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 200;
          const scaleSize = MAX_WIDTH / img.width;
          canvas.width = MAX_WIDTH;
          canvas.height = img.height * scaleSize;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
          canvas.toBlob((blob) => resolve(blob!), 'image/webp', 0.7);
        };
      };
    });
  };

  const handleSubmit = (e?: any) => {
    e?.preventDefault();
    if (!input.trim()) return;
    onSendText(input.trim());
    setInput('');
    if (onTyping) onTyping(false);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const thumbnailBlob = await createThumbnail(file);
      const formData = new FormData();
      formData.append('file', file);
      formData.append('thumbnail', thumbnailBlob, 'thumbnail.webp');

      const data = await apiPost<{ filename: string }>(
        `/api/uploads/${roomId}`, 
        formData
      );

      if (data?.filename) {
        onSendImage(data.filename);
      }
    } catch (err: any) {
      console.error('업로드 에러:', err);
      alert(err.message || '이미지 업로드에 실패했습니다.');
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="flex items-center gap-2 bg-transparent p-1">
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileChange} 
        className="hidden" 
        accept="image/*" 
      />

      {/* 전체를 감싸는 컨테이너에 둥근 모서리 적용 */}
      <div className="flex flex-1 items-center gap-0 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition-all focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-50">
        
        {/* 파일 첨부 버튼 */}
        <button 
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="flex h-12 w-12 shrink-0 items-center justify-center border-r border-slate-50 text-slate-400 hover:bg-slate-50 hover:text-blue-500 transition-all"
        >
          <Paperclip size={20} strokeWidth={1.8} />
        </button>

        {/* 텍스트 입력창 */}
        <textarea
          className="max-h-32 min-h-[48px] flex-1 resize-none border-0 bg-white px-4 py-3 text-[16px] font-medium text-slate-800 outline-none placeholder:text-slate-300"
          placeholder="메시지를 입력하세요..."
          rows={1}
          value={input}
          onChange={(e) => {
            setInput(e.target.value);
            if (onTyping) onTyping(e.target.value.length > 0);
          }}
          onKeyDown={(e) => { 
            if (e.key === 'Enter' && !e.shiftKey) { 
              e.preventDefault(); 
              handleSubmit(); 
            } 
          }}
        />

        {/* 전송 버튼 (푸른색 계열로 변경) */}
        <button
          type="button"
          onClick={() => handleSubmit()}
          className="flex h-12 w-14 shrink-0 items-center justify-center bg-blue-600 text-white hover:bg-blue-700 transition-all active:scale-90"
        >
          <SendHorizontal size={20} strokeWidth={2} />
        </button>
      </div>
    </div>
  );
}