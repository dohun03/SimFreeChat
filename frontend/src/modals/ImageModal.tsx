import { ModalLayout } from '../layout/ModalLayout'; // 경로 확인 필요!

type ImageModalProps = {
  imageUrl: string | null;
  isOpen: boolean; // 이제 사실상 필요 없지만 유지하거나 호출부에서 제어 가능
  onClose: () => void;
};

export function ImageModal({ imageUrl, isOpen, onClose }: ImageModalProps) {
  if (!isOpen || !imageUrl) return null;

  return (
    <ModalLayout onClose={onClose}>
      <div className="relative flex items-center justify-center bg-slate-900 overflow-hidden">
        <button
          className="absolute right-4 top-4 z-50 rounded-full bg-black/50 p-2 text-white hover:bg-black/70 transition-colors"
          onClick={onClose}
        >
          <span className="sr-only">Close</span>
          ✕
        </button>

        <img
          src={imageUrl}
          alt="Original"
          className="max-h-[85vh] w-full object-contain"
          onClick={(e) => e.stopPropagation()}
        />
      </div>
    </ModalLayout>
  );
}