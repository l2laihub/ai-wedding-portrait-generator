import React from 'react';
import Icon from './Icon';

interface HelpSupportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const HelpSupportModal: React.FC<HelpSupportModalProps> = ({
  isOpen,
  onClose
}) => {
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleEscapeKey = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    }
  };

  // Add escape key listener
  React.useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleEscapeKey);
      document.body.style.overflow = 'hidden';
      return () => {
        document.removeEventListener('keydown', handleEscapeKey);
        document.body.style.overflow = 'unset';
      };
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const helpSections = [
    {
      title: '🎨 How to Create Portraits',
      items: [
        'Upload a clear photo of yourself or couple',
        'Choose photo type (single, couple, or family)',
        'Optionally customize your prompt',
        'Click Start Photo Shoot to create 3 unique wedding portraits',
        'Download and share your beautiful results!'
      ]
    },
    {
      title: '💳 Photo Shoots & Pricing',
      items: [
        'Get 3 free daily photo shoots to start (9 images)',
        'Each photo shoot creates 3 unique themed portraits',
        'Purchase photo packs for unlimited portrait creation',
        'Photo shoots never expire once purchased',
        'Check your balance in your Profile'
      ]
    },
    {
      title: '📱 Tips for Best Results',
      items: [
        'Use high-quality, well-lit photos',
        'Face should be clearly visible',
        'Avoid blurry or heavily filtered images',
        'For couples: both faces should be visible',
        'Try different prompts for variety'
      ]
    },
    {
      title: '🔧 Troubleshooting',
      items: [
        'If generation fails, try a different photo',
        'Check your internet connection',
        'Make sure you have available photo shoots',
        'Clear browser cache if experiencing issues',
        'Contact support if problems persist'
      ]
    }
  ];

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center z-[60] p-4 animate-in fade-in duration-200 overflow-y-auto"
      onClick={handleBackdropClick}
      style={{ paddingTop: 'max(2rem, env(safe-area-inset-top))' }}
    >
      <div 
        className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-md w-full mx-4 my-8 animate-in zoom-in-95 duration-200 flex flex-col"
        onClick={(e) => e.stopPropagation()}
        style={{ maxHeight: 'calc(100vh - 4rem)' }}
      >
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            Help & Support
          </h2>
          <button
            onClick={onClose}
            className="flex items-center justify-center w-10 h-10 text-gray-700 dark:text-gray-200 hover:text-gray-900 dark:hover:text-white bg-gray-100 dark:bg-gray-600 hover:bg-gray-200 dark:hover:bg-gray-500 border-2 border-gray-300 dark:border-gray-500 rounded-full transition-all duration-200 shadow-sm hover:shadow-md"
            aria-label="Close modal"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1">
          {helpSections.map((section, index) => (
            <div key={index} className="space-y-3">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {section.title}
              </h3>
              <ul className="space-y-2">
                {section.items.map((item, itemIndex) => (
                  <li key={itemIndex} className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-300">
                    <Icon 
                      path="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" 
                      className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" 
                    />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          {/* Contact Support */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-2">
              📧 Need More Help?
            </h3>
            <p className="text-sm text-blue-800 dark:text-blue-200 mb-3">
              Can't find what you're looking for? Our team is here to help!
            </p>
            <a
              href="mailto:huybuilds@gmail.com?subject=WedAI Support Request"
              className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              <Icon 
                path="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" 
                className="w-4 h-4" 
              />
              Contact Support
            </a>
          </div>

          {/* App Info */}
          <div className="text-center text-xs text-gray-500 dark:text-gray-400 pt-4 border-t border-gray-200 dark:border-gray-700">
            <p>WedAI v1.0 • Made with ❤️ by HuyBuilds</p>
            <p className="mt-1">Free AI-powered wedding portrait generator</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HelpSupportModal;