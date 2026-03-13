'use client';

import React, { useEffect } from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  widthClassName?: string;
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children, widthClassName }) => {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      const handleEscape = (event: KeyboardEvent) => {
        if (event.key === 'Escape') onClose();
      };
      document.addEventListener('keydown', handleEscape);
      return () => {
        document.body.style.overflow = 'unset';
        document.removeEventListener('keydown', handleEscape);
      };
    } else {
      document.body.style.overflow = 'unset';
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />
      {/* Centering wrapper */}
      <div className="absolute inset-0 overflow-y-auto">
        <div className="min-h-full flex items-start justify-center p-4 sm:p-6 md:pt-[8vh]">
          <div
            className={`relative bg-white rounded-2xl shadow-[var(--shadow-modal)] w-full ${widthClassName || 'max-w-3xl'} max-h-[85vh] overflow-hidden animate-scale-in`}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border)]">
              <h3 className="text-lg font-semibold text-[var(--foreground)]">{title}</h3>
              <button
                aria-label="Close"
                onClick={onClose}
                className="flex items-center justify-center w-8 h-8 rounded-lg text-[var(--muted-400)] hover:text-[var(--foreground)] hover:bg-[var(--muted-100)] transition-all duration-150 cursor-pointer"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            {/* Body */}
            <div className="px-6 py-5 overflow-y-auto max-h-[calc(85vh-64px)]">
              {children}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Modal;
