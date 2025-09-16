import React, { useState, useCallback, useEffect } from 'react';
import { GeneratedContent } from '../types';
import Icon from './Icon';
import { useViewport } from '../hooks/useViewport';
import { useLazyImage } from '../hooks/useIntersectionObserver';
import { useTouch } from '../hooks/useTouch';
import { posthogService } from '../services/posthogService';
import { generatePortraitFilename } from '../utils/filenameUtils';
import ImagePreviewModal from './ImagePreviewModal';
import SwipeableGallery from './SwipeableGallery';

interface ImageDisplayProps {
  contents: GeneratedContent[];
  generationId?: string;
  photoType?: 'single' | 'couple' | 'family';
  familyMemberCount?: number;
}

// Note: generatePortraitFilename utility now handles consistent naming

// Download handler with consistent filename and tracking
const handleDownload = async (
  imageUrl: string, 
  style: string, 
  generationId?: string,
  photoType: 'single' | 'couple' | 'family' = 'couple',
  familyMemberCount?: number
) => {
  const filename = generatePortraitFilename({
    photoType,
    familyMemberCount,
    style
  });
  
  // Track download event
  posthogService.trackImageDownloaded(style, generationId || 'unknown');
  
  const link = document.createElement('a');
  link.href = imageUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

// Share handler with native API support and consistent filename
const handleShare = async (
  imageUrl: string, 
  style: string,
  photoType: 'single' | 'couple' | 'family' = 'couple',
  familyMemberCount?: number
) => {
  try {
    // Try native share API first (mobile)
    if (navigator.share) {
      const filename = generatePortraitFilename({
        photoType,
        familyMemberCount,
        style
      });
      
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const file = new File([blob], filename, {
        type: blob.type
      });

      await navigator.share({
        files: [file],
        title: `Wedding Portrait - ${style}`,
        text: `Check out this beautiful AI-generated wedding portrait in ${style} style! 💕`
      });
      return;
    }
  } catch (err) {
    console.log('Native share failed, trying fallback share options');
  }

  // Fallback: Copy link to clipboard and show share options
  try {
    await navigator.clipboard.writeText(`Check out this beautiful AI-generated wedding portrait in ${style} style!`);
    alert('Share text copied to clipboard! You can now paste it with the image on social media.');
  } catch (err) {
    // Final fallback: Basic share text
    const shareText = `Check out this beautiful AI-generated wedding portrait in ${style} style!`;
    
    // Try to open a basic share dialog or show share options
    if (window.confirm(`Share this portrait?\n"${shareText}"\n\nClick OK to copy share text to clipboard.`)) {
      try {
        await navigator.clipboard.writeText(shareText);
        alert('Share text copied to clipboard!');
      } catch {
        prompt('Copy this share text:', shareText);
      }
    }
  }
};

const LazyImage: React.FC<{ src: string; alt: string; className: string }> = ({ src, alt, className }) => {
  const { elementRef, imageSrc, isLoaded } = useLazyImage(src, '');

  return (
    <div ref={elementRef} className={`${className} ${!isLoaded ? 'bg-gray-700 animate-pulse' : ''}`}>
      {imageSrc && (
        <img
          src={imageSrc}
          alt={alt}
          className="w-full h-full object-contain rounded-lg transition-opacity duration-300"
          loading="lazy"
          style={{ opacity: isLoaded ? 1 : 0 }}
          onLoad={() => {/* Image loaded */}}
        />
      )}
      {!isLoaded && (
        <div className="absolute inset-0 flex items-center justify-center">
          <Icon 
            path="M12 4.5C7.5 4.5 4.73 7.5 4.5 12h-2c.28-5.5 4.53-9.5 9.5-9.5s9.22 4 9.5 9.5h-2c-.23-4.5-3-7.5-7.5-7.5zM12 19.5c-4.5 0-7.27-3-7.5-7.5h2c.23 4.5 3 7.5 7.5 7.5s7.27-3 7.5-7.5h2c-.28 5.5-4.53 9.5-9.5 9.5z" 
            className="w-6 h-6 text-gray-400 animate-spin" 
          />
        </div>
      )}
    </div>
  );
};

const GeneratedImageCard: React.FC<{ 
  content: GeneratedContent; 
  index: number; 
  generationId?: string;
  photoType?: 'single' | 'couple' | 'family';
  familyMemberCount?: number;
}> = ({ content, index, generationId, photoType = 'couple', familyMemberCount }) => {
  const { imageUrl, text, style = 'portrait' } = content;
  const { isMobile } = useViewport();
  const [showActions, setShowActions] = useState(false);
  const [hasBeenViewed, setHasBeenViewed] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const handleDownloadClick = useCallback(() => {
    if (imageUrl) {
      handleDownload(imageUrl, style, generationId, photoType, familyMemberCount);
    }
  }, [imageUrl, style, generationId, photoType, familyMemberCount]);

  const handleShareClick = useCallback(() => {
    if (imageUrl) {
      handleShare(imageUrl, style, photoType, familyMemberCount);
    }
  }, [imageUrl, style, photoType, familyMemberCount]);

  // Track when style is viewed (image loads successfully)
  useEffect(() => {
    if (imageUrl && !hasBeenViewed) {
      const timer = setTimeout(() => {
        posthogService.trackStyleViewed(style, generationId || 'unknown');
        setHasBeenViewed(true);
      }, 1000); // Track after 1 second of viewing
      
      return () => clearTimeout(timer);
    }
  }, [imageUrl, style, generationId, hasBeenViewed]);

  // Touch handlers for mobile interaction
  const touchHandlers = useTouch({
    onTap: () => {
      if (isMobile && imageUrl) {
        setShowActions(!showActions);
      }
    },
    onLongPress: () => {
      if (isMobile && imageUrl) {
        setShowActions(true);
      }
    }
  });

  const getCardHeight = () => {
    if (isMobile) {
      return 'min-h-[280px] max-h-[400px]';
    }
    return 'min-h-[300px]';
  };

  return (
    <div 
      className={`
        bg-gray-800 rounded-lg shadow-xl p-4 flex flex-col group
        ${isMobile ? 'mx-2' : ''}
        transform transition-all duration-300 hover:scale-[1.02]
      `}
      style={{ animationDelay: `${index * 100}ms` }}
    >
      <h3 className={`font-bold text-center text-white mb-3 ${isMobile ? 'text-lg' : 'text-xl'}`}>
        {style}
      </h3>
      
      <div 
        className={`flex-grow flex items-center justify-center relative ${getCardHeight()}`}
        {...(isMobile ? touchHandlers : {})}
      >
        {imageUrl ? (
          <>
            <LazyImage
              src={imageUrl}
              alt={`Generated wedding portrait in ${style} style`}
              className="w-full h-full relative"
            />
            
            {/* Action overlay - always visible on mobile when showActions is true */}
            <div 
              className={`
                absolute inset-0 bg-black bg-opacity-50 flex flex-col items-center justify-center rounded-lg
                transition-opacity duration-300
                ${isMobile ? 
                  (showActions ? 'opacity-100' : 'opacity-0') : 
                  'opacity-0 group-hover:opacity-100'
                }
              `}
              onClick={(e) => {
                if (isMobile && e.target === e.currentTarget) {
                  setShowActions(false);
                }
              }}
            >
              <div className="flex gap-3 items-center">
                {/* Preview Button */}
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log('Preview button clicked', { imageUrl, style });
                    setShowPreview(true);
                    if (isMobile) setShowActions(false);
                  }}
                  className={`
                    flex items-center gap-2 bg-blue-600 text-white font-bold rounded-full 
                    hover:bg-blue-700 transition-all duration-200
                    ${isMobile ? 'py-3 px-4 text-sm' : 'py-2 px-4 text-sm'}
                    ${isMobile ? 'active:scale-95' : 'hover:scale-105'}
                  `}
                  title="Preview full size"
                  type="button"
                >
                  <Icon 
                    path="M12 4.5C7 4.5 4.73 7.61 3.82 12 4.73 16.39 7 19.5 12 19.5c4.99 0 7.27-3.11 8.18-7.5C19.27 7.61 17 4.5 12 4.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"
                    className="w-5 h-5" 
                  />
                  {isMobile ? '' : 'Preview'}
                </button>

                {/* Download Button */}
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleDownloadClick();
                  }}
                  className={`
                    flex items-center gap-2 bg-white text-gray-900 font-bold rounded-full 
                    hover:bg-gray-100 transition-all duration-200
                    ${isMobile ? 'py-3 px-4 text-sm' : 'py-2 px-4 text-sm'}
                    ${isMobile ? 'active:scale-95' : 'hover:scale-105'}
                  `}
                  title="Download image"
                >
                  <Icon 
                    path="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM17 13l-5 5-5-5h3V9h4v4h3z"
                    className="w-5 h-5" 
                  />
                  {isMobile ? '' : 'Download'}
                </button>
                
                {/* Share Button */}
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleShareClick();
                  }}
                  className={`
                    flex items-center gap-2 bg-purple-600 text-white font-bold rounded-full 
                    hover:bg-purple-700 transition-all duration-200
                    ${isMobile ? 'py-3 px-4 text-sm' : 'py-2 px-4 text-sm'}
                    ${isMobile ? 'active:scale-95' : 'hover:scale-105'}
                  `}
                  title="Share image"
                >
                  <Icon 
                    path="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92s2.92-1.31 2.92-2.92S19.61 16.08 18 16.08z"
                    className="w-5 h-5" 
                  />
                  {isMobile ? '' : 'Share'}
                </button>
              </div>
              
              {isMobile && (
                <p className="text-white text-xs mt-3 opacity-75">
                  Tap outside to close
                </p>
              )}
            </div>
          </>
        ) : (
          <div className="text-center text-red-400">
            <Icon 
              path="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" 
              className={`mx-auto ${isMobile ? 'w-8 h-8' : 'w-12 h-12'}`} 
            />
            <p className={`font-semibold mt-2 ${isMobile ? 'text-sm' : 'text-base'}`}>
              Generation Failed
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {text || 'Please try again'}
            </p>
          </div>
        )}
      </div>
      
      {text && imageUrl && (
        <p className={`mt-4 text-center text-gray-400 italic ${isMobile ? 'text-xs' : 'text-sm'}`}>
          {`"${text.length > 100 ? text.substring(0, 100) + '...' : text}"`}
        </p>
      )}
      
      {/* Preview Modal */}
      {imageUrl && (
        <ImagePreviewModal
          imageUrl={imageUrl}
          title={`${style} Wedding Portrait`}
          isOpen={showPreview}
          onClose={() => {
            console.log('Closing preview modal');
            setShowPreview(false);
          }}
          photoType={photoType}
          familyMemberCount={familyMemberCount}
          style={style}
        />
      )}
    </div>
  );
};

const ImageDisplay: React.FC<ImageDisplayProps> = ({ contents, generationId, photoType = 'couple', familyMemberCount }) => {
  const { isMobile } = useViewport();

  if (!contents || contents.length === 0) {
    return null;
  }

  // Use SwipeableGallery on mobile for better UX
  if (isMobile) {
    return (
      <div className="mt-10 w-full">
        <h2 className="font-bold text-center text-gray-900 dark:text-white mb-6 text-2xl">
          Your Wedding Portraits
        </h2>
        <SwipeableGallery
          contents={contents}
          generationId={generationId}
          photoType={photoType}
          familyMemberCount={familyMemberCount}
        />
      </div>
    );
  }

  // Desktop grid layout
  const getGridClasses = () => {
    return 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6';
  };

  return (
    <div className="mt-10 w-full mx-auto max-w-7xl">
      <h2 className="font-bold text-center text-gray-900 dark:text-white mb-6 text-3xl">
        Your Wedding Portraits
      </h2>
      
      <div className={getGridClasses()}>
        {contents.map((content, index) => (
          <GeneratedImageCard 
            key={content.style || index} 
            content={content} 
            index={index}
            generationId={generationId}
            photoType={photoType}
            familyMemberCount={familyMemberCount}
          />
        ))}
      </div>
    </div>
  );
};

export default ImageDisplay;