import React, { useEffect } from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'small' | 'medium' | 'large' | 'full';
  closeOnBackdrop?: boolean;
  closeOnEscape?: boolean;
  preventScroll?: boolean;
  className?: string;
}

const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  children,
  title,
  size = 'md',
  closeOnBackdrop = true,
  closeOnEscape = true,
  preventScroll = true,
  className = ''
}) => {
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (closeOnBackdrop && e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleEscapeKey = (e: KeyboardEvent) => {
    if (closeOnEscape && e.key === 'Escape') {
      onClose();
    }
  };

  // Handle escape key and body scroll
  useEffect(() => {
    if (isOpen) {
      if (closeOnEscape) {
        document.addEventListener('keydown', handleEscapeKey);
      }
      
      if (preventScroll) {
        document.body.style.overflow = 'hidden';
      }

      return () => {
        if (closeOnEscape) {
          document.removeEventListener('keydown', handleEscapeKey);
        }
        
        if (preventScroll) {
          document.body.style.overflow = 'unset';
        }
      };
    }
  }, [isOpen, closeOnEscape, preventScroll]);

  if (!isOpen) return null;

  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
      case 'small': 
        return 'max-w-sm';
      case 'md':
      case 'medium': 
        return 'max-w-2xl';
      case 'lg':
      case 'large': 
        return 'max-w-4xl';
      case 'xl': 
        return 'max-w-6xl';
      case 'full':
        return 'max-w-[95vw]';
      default: 
        return 'max-w-md';
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 animate-in fade-in duration-200"
      onClick={handleBackdropClick}
    >
      <div 
        className={`bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full mx-4 max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200 ${getSizeClasses()} ${className}`}
        onClick={(e) => e.stopPropagation()}
      >
        {title && (
          <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              {title}
            </h2>
            <ModalCloseButton onClose={onClose} />
          </div>
        )}
        <div className={title ? '' : ''}>
          {children}
        </div>
      </div>
    </div>
  );
};

// Optional close button component that can be used inside modals
export const ModalCloseButton: React.FC<{ onClose: () => void; className?: string }> = ({ 
  onClose, 
  className = '' 
}) => (
  <button
    onClick={onClose}
    className={`flex items-center justify-center w-8 h-8 text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-600 rounded-full transition-all duration-200 ${className}`}
    aria-label="Close modal"
  >
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  </button>
);

export default Modal;