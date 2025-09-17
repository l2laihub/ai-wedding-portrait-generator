import React, { useState } from 'react';
import { GeneratedContent } from '../types';
import { themeManager } from '../services/templateEngine/ThemeManager';
import ThemePreview from './ThemePreview';
import Modal from './Modal';

interface EnhancedImageDisplayProps {
  contents: GeneratedContent[];
  generationId: string | null;
  photoType: 'single' | 'couple' | 'family';
  familyMemberCount: number;
  generationProgress?: Array<{
    style: string;
    status: 'waiting' | 'in_progress' | 'completed' | 'failed';
    startTime?: number;
  }>;
}

const EnhancedImageDisplay: React.FC<EnhancedImageDisplayProps> = ({
  contents,
  generationId,
  photoType,
  familyMemberCount,
  generationProgress = []
}) => {
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null);
  const [showThemeDetails, setShowThemeDetails] = useState<string | null>(null);

  const downloadImage = (imageUrl: string, styleName: string) => {
    const link = document.createElement('a');
    link.href = imageUrl;
    link.download = `wedding-portrait-${styleName.replace(/\s+/g, '-').toLowerCase()}-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getThemeIcon = (styleName: string) => {
    // Try to find the style in theme manager
    const styles = themeManager.getAvailableStyles();
    const style = styles.find(s => s.name === styleName);
    if (style) {
      const icons: Record<string, string> = {
        traditional: '⛪',
        modern: '🏙️',
        vintage: '🕰️',
        themed: '🎭',
        seasonal: '🌺',
        cultural: '🌏',
        fantasy: '🏰',
        luxury: '💎',
      };
      return icons[style.category] || '✨';
    }
    return '💍';
  };

  const getProgressStatus = (styleName: string) => {
    const progress = generationProgress.find(p => p.style === styleName);
    return progress?.status || 'completed';
  };

  return (
    <div className="space-y-6">
      {/* Generation Header */}
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Your Wedding Portraits
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          {photoType === 'family' 
            ? `Family portrait with ${familyMemberCount} members`
            : `${photoType.charAt(0).toUpperCase() + photoType.slice(1)} portrait`
          } • {contents.filter(c => c.imageUrl).length} styles generated
        </p>
      </div>

      {/* Portrait Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {contents.map((content, index) => {
          const status = getProgressStatus(content.style || '');
          const isGenerating = status === 'waiting' || status === 'in_progress';
          const hasFailed = status === 'failed' || !content.imageUrl;
          
          return (
            <div 
              key={index} 
              className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden transition-all hover:shadow-xl"
            >
              {/* Theme Header */}
              <div className="px-4 py-3 bg-gradient-to-r from-blue-500 to-teal-500 text-white">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{getThemeIcon(content.style || '')}</span>
                    <h3 className="font-semibold">{content.style}</h3>
                  </div>
                  <button
                    onClick={() => {
                      const styles = themeManager.getAvailableStyles();
                      const style = styles.find(s => s.name === content.style);
                      if (style) {
                        setShowThemeDetails(style.id);
                      }
                    }}
                    className="text-white/80 hover:text-white transition-colors"
                    title="View theme details"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Image Container */}
              <div className="relative aspect-[3/4] bg-gray-100 dark:bg-gray-700">
                {isGenerating ? (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                      <div className="mb-4">
                        <svg className="animate-spin h-12 w-12 mx-auto text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {status === 'waiting' ? 'Waiting...' : 'Generating...'}
                      </p>
                    </div>
                  </div>
                ) : hasFailed ? (
                  <div className="absolute inset-0 flex items-center justify-center p-6">
                    <div className="text-center">
                      <div className="mb-3 text-red-500">
                        <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <p className="text-sm text-red-600 dark:text-red-400">
                        {content.text || 'Generation failed'}
                      </p>
                    </div>
                  </div>
                ) : (
                  <>
                    <img
                      src={content.imageUrl!}
                      alt={`${content.style} wedding portrait`}
                      className="w-full h-full object-cover cursor-pointer"
                      onClick={() => setSelectedImageIndex(index)}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent opacity-0 hover:opacity-100 transition-opacity flex items-end justify-center pb-4 cursor-pointer"
                         onClick={() => setSelectedImageIndex(index)}>
                      <span className="text-white text-sm font-medium">Click to view full size</span>
                    </div>
                  </>
                )}
              </div>

              {/* Action Bar */}
              {content.imageUrl && !isGenerating && (
                <div className="p-4 flex items-center justify-between">
                  <button
                    onClick={() => downloadImage(content.imageUrl!, content.style || 'portrait')}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    Download
                  </button>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        if (navigator.share && content.imageUrl) {
                          navigator.share({
                            title: `${content.style} Wedding Portrait`,
                            text: `Check out this beautiful ${content.style} wedding portrait!`,
                            url: content.imageUrl
                          });
                        }
                      }}
                      className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
                      title="Share"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                      </svg>
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Full Size Image Modal */}
      {selectedImageIndex !== null && contents[selectedImageIndex]?.imageUrl && (
        <Modal
          isOpen={true}
          onClose={() => setSelectedImageIndex(null)}
          title={contents[selectedImageIndex].style || 'Wedding Portrait'}
          size="full"
        >
          <div className="relative">
            <img
              src={contents[selectedImageIndex].imageUrl!}
              alt={`${contents[selectedImageIndex].style} wedding portrait`}
              className="w-full h-auto max-h-[80vh] object-contain mx-auto"
            />
            <div className="mt-4 flex justify-center gap-4">
              <button
                onClick={() => downloadImage(
                  contents[selectedImageIndex].imageUrl!,
                  contents[selectedImageIndex].style || 'portrait'
                )}
                className="px-6 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
              >
                Download Image
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Theme Details Modal */}
      {showThemeDetails && (
        <Modal
          isOpen={true}
          onClose={() => setShowThemeDetails(null)}
          title=""
          size="medium"
        >
          {(() => {
            const style = themeManager.getStyle(showThemeDetails);
            return style ? (
              <ThemePreview style={style} isCompact={false} showDetails={true} />
            ) : null;
          })()}
        </Modal>
      )}
    </div>
  );
};

export default EnhancedImageDisplay;