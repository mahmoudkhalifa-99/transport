
import React, { useEffect } from 'react';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

interface ToastProps {
  message: string;
  type: ToastType;
  isVisible: boolean;
  onClose: () => void;
  id?: number; // إضافة ID لضمان تتبع الإشعارات المتتالية
}

const Toast: React.FC<ToastProps> = ({ message, type, isVisible, onClose, id }) => {
  useEffect(() => {
    if (isVisible) {
      // الـ Timer سيتم تفعيله أو إعادة تعيينه بناءً على تغير الـ ID أو حالة الظهور
      const timer = setTimeout(() => {
        onClose();
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [isVisible, onClose, id]);

  if (!isVisible) return null;

  const styles = {
    success: { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-800', icon: 'fa-check-circle', iconColor: 'text-emerald-500' },
    error: { bg: 'bg-rose-50', border: 'border-rose-200', text: 'text-rose-800', icon: 'fa-exclamation-circle', iconColor: 'text-rose-500' },
    warning: { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-800', icon: 'fa-exclamation-triangle', iconColor: 'text-amber-500' },
    info: { bg: 'bg-indigo-50', border: 'border-indigo-200', text: 'text-indigo-800', icon: 'fa-info-circle', iconColor: 'text-indigo-500' }
  };

  const currentStyle = styles[type];

  return (
    <div key={id} className="fixed top-24 left-1/2 -translate-x-1/2 z-[100] w-[90%] max-w-md animate-in slide-in-from-top-4 duration-300">
      <div className={`${currentStyle.bg} ${currentStyle.border} border shadow-2xl rounded-2xl p-4 flex items-center gap-4 backdrop-blur-md`}>
        <div className={`${currentStyle.iconColor} text-xl`}>
          <i className={`fas ${currentStyle.icon}`}></i>
        </div>
        <div className="flex-1">
          <p className={`${currentStyle.text} text-sm font-black leading-relaxed text-right`}>
            {message}
          </p>
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
          <i className="fas fa-times text-xs"></i>
        </button>
      </div>
    </div>
  );
};

export default Toast;
