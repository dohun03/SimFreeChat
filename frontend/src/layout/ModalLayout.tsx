import { ReactNode } from 'react';
import { createPortal } from 'react-dom';

type ModalLayoutProps = {
  children: ReactNode;
  onClose: () => void;
  maxWidth?: string; // 속성은 받아야 하니까 추가!
};

export function ModalLayout({ children, onClose, maxWidth }: ModalLayoutProps) {
  const modalRoot = document.getElementById('modal-root');

  const content = (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      {/* 배경 */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-md animate-modal-backdrop"
        onClick={onClose} 
      />
      {/* 모달 박스 */}
      <div 
        className={`relative w-full ${maxWidth ? maxWidth : 'max-w-md'} overflow-hidden rounded-[1rem] bg-white shadow-2xl animate-modal-content`}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );

  return modalRoot ? createPortal(content, modalRoot) : content;
}