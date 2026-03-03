import { useEffect, useState } from 'react';

type SystemAlertProps = {
  message: string;
  onClose?: () => void;
};

export function SystemAlert({ message, onClose }: SystemAlertProps) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(() => onClose?.(), 300);
    }, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  if (!visible) return null;

  return (
    <div className="mb-3 animate-fade-in rounded-xl border-2 border-white bg-slate-900 px-4 py-3 text-center text-sm font-black text-white shadow-lg">
      {message}
    </div>
  );
}
