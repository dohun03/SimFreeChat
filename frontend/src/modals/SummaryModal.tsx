import { ModalLayout } from '../layout/ModalLayout';
import { X, Sparkles } from 'lucide-react'; // 아이콘 통일

type SummaryModalProps = {
  isOpen: boolean;
  onClose: () => void;
  summary: string; // 부모가 넘겨줄 데이터
};

const formatSummary = (text: string) => {
  if (!text) return text;
  const parts = text.split(/(\*\*.*?\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={i} className="font-bold text-slate-900 bg-purple-100/50 px-1 rounded-sm">
          {part.replace(/\*\*/g, '')}
        </strong>
      );
    }
    return part;
  });
};

export function SummaryModal({ isOpen, onClose, summary }: SummaryModalProps) {
  if (!isOpen) return null;

  return (
    <ModalLayout onClose={onClose} maxWidth="max-w-3xl">
      <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
        <div className="flex items-center gap-2">
          <Sparkles size={20} className="text-purple-500" fill="currentColor" />
          <h5 className="text-lg font-black text-slate-800">AI 대화 요약 분석</h5>
        </div>
        <button className="text-slate-400 hover:text-slate-600 transition-colors" onClick={onClose}>
          <X size={24} />
        </button>
      </div>

      <div className="p-6">
        <div className="relative min-h-[300px] max-h-[500px] overflow-y-auto whitespace-pre-wrap rounded-2xl bg-slate-50 p-8 text-[15px] leading-relaxed text-slate-700 shadow-inner border border-slate-100">
          {summary ? formatSummary(summary) : '요약된 내용이 없습니다.'}
        </div>
        <p className="mt-4 text-center text-[10px] font-black text-slate-300 uppercase tracking-widest">
          AI-Generated Content Analysis
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