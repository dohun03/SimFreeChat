import { useEffect, useRef, useState } from 'react';
import { apiGet } from '../services/api';
import { ModalLayout } from '../layout/ModalLayout';
import { X } from 'lucide-react';

type SummaryModalProps = {
  roomId: number;
  isOpen: boolean;
  onClose: () => void;
};

export function SummaryModal({ roomId, isOpen, onClose }: SummaryModalProps) {
  const [summary, setSummary] = useState('');
  const [loading, setLoading] = useState(false);

  const isRequesting = useRef(false);

  useEffect(() => {
    if (!isOpen || summary || isRequesting.current) return;

    isRequesting.current = true; 
    setLoading(true);

    apiGet<{ summary: string }>(`/api/messages/${roomId}/summary`)
      .then((data) => {
        setSummary(data?.summary || '');
      })
      .catch(() => {
        setSummary('요약 생성 중 오류가 발생했습니다.');
      })
      .finally(() => {
        setLoading(false);
        isRequesting.current = false; 
      });
  }, [isOpen, roomId, summary]);

  if (!isOpen) return null;

  return (
    <ModalLayout onClose={onClose} maxWidth="max-w-3xl">
      <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
        <div className="flex items-center gap-2">
          <span className="text-xl">🤖</span>
          <h5 className="text-lg font-black text-slate-800">AI 대화 요약 분석</h5>
        </div>
        <button className="text-slate-400 hover:text-slate-600 transition-colors" onClick={onClose}>
          <X size={24} /> {/* lucide-react X 아이콘 사용 권장 */}
        </button>
      </div>

      <div className="p-6">
        <div className="relative min-h-[300px] max-h-[500px] overflow-y-auto whitespace-pre-wrap rounded-2xl bg-slate-50 p-6 text-base leading-relaxed text-slate-700 shadow-inner border border-slate-100">
          {loading ? (
            <div className="flex h-full items-center justify-center py-20 text-slate-400 font-bold animate-pulse">
              대화 내용을 분석하여 요약 중입니다...
            </div>
          ) : (
            summary || '최근 나눈 대화가 없어 요약할 내용이 없습니다.'
          )}
        </div>
        <p className="mt-4 text-center text-xs font-bold text-slate-400 uppercase tracking-tighter">
          Powered by Gemini AI Analysis
        </p>
      </div>

      <div className="border-t border-slate-50 p-4 bg-slate-50/50">
        <button 
          className="w-full rounded-xl bg-slate-900 py-4 text-sm font-black text-white hover:bg-slate-800 transition-all active:scale-[0.98]" 
          onClick={onClose}
        >
          확인했습니다
        </button>
      </div>
    </ModalLayout>
  );
}
