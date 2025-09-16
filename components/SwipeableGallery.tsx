import React, { useState, useRef, useEffect, useCallback } from 'react';
import { GeneratedContent } from '../types';
import { useTouch } from '../hooks/useTouch';
import { useHapticFeedback } from './MobileEnhancements';
import Icon from './Icon';
import ImagePreviewModal from './ImagePreviewModal';
import { posthogService } from '../services/posthogService';
import { generatePortraitFilename } from '../utils/filenameUtils';

interface SwipeableGalleryProps {
  contents: GeneratedContent[];
  generationId?: string;
  onImageTap?: (index: number) => void;
  onShowToast?: (message: string, type: 'success' | 'error' | 'warning' | 'info') => void;
  photoType?: 'single' | 'couple' | 'family';
  familyMemberCount?: number;
}

const SwipeableGallery: React.FC<SwipeableGalleryProps> = ({
  contents,
  generationId,
  onImageTap,
  onShowToast,
  photoType = 'couple',
  familyMemberCount
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showActions, setShowActions] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);
  const [imageLoadStates, setImageLoadStates] = useState<Record<number, boolean>>({});
  
  const containerRef = useRef<HTMLDivElement>(null);
  const { triggerHaptic } = useHapticFeedback();
  const startX = useRef<number | null>(null);
  const velocityX = useRef<number>(0);
  const lastX = useRef<number | null>(null);
  const lastTime = useRef<number | null>(null);

  // Preload adjacent images
  useEffect(() => {
    if (contents.length === 0) return;

    const preloadImage = (index: number) => {
      if (index >= 0 && index < contents.length && contents[index].imageUrl) {
        const img = new Image();
        img.src = contents[index].imageUrl!;
      }
    };

    // Preload current, previous, and next images
    preloadImage(currentIndex - 1);
    preloadImage(currentIndex);
    preloadImage(currentIndex + 1);
  }, [currentIndex, contents]);

  // Track when images are viewed
  useEffect(() => {
    const currentContent = contents[currentIndex];
    if (currentContent?.imageUrl) {
      const timer = setTimeout(() => {
        posthogService.trackStyleViewed(
          currentContent.style || 'unknown',
          generationId || 'unknown'
        );
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [currentIndex, contents, generationId]);

  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (e.touches.length !== 1) return;
    
    startX.current = e.touches[0].clientX;
    lastX.current = e.touches[0].clientX;
    lastTime.current = Date.now();
    velocityX.current = 0;
    setIsDragging(true);
  }, []);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!startX.current || e.touches.length !== 1) return;
    
    // Prevent default to avoid scrolling
    e.preventDefault();
    
    const currentX = e.touches[0].clientX;
    const diffX = currentX - startX.current;
    
    // Calculate velocity
    if (lastX.current !== null && lastTime.current !== null) {
      const timeDiff = Date.now() - lastTime.current;
      if (timeDiff > 0) {
        velocityX.current = (currentX - lastX.current) / timeDiff;
      }
    }
    
    lastX.current = currentX;
    lastTime.current = Date.now();
    
    // Apply resistance at edges
    let adjustedOffset = diffX;
    if ((currentIndex === 0 && diffX > 0) || 
        (currentIndex === contents.length - 1 && diffX < 0)) {
      adjustedOffset = diffX * 0.3; // Rubber band effect
    }
    
    setDragOffset(adjustedOffset);
  }, [currentIndex, contents.length]);

  const handleTouchEnd = useCallback(() => {
    if (!startX.current) return;
    
    const threshold = window.innerWidth * 0.25; // 25% of screen width
    const velocityThreshold = 0.5;
    
    let nextIndex = currentIndex;
    
    // Determine next index based on drag distance and velocity
    if (Math.abs(dragOffset) > threshold || Math.abs(velocityX.current) > velocityThreshold) {
      if (dragOffset > 0 && currentIndex > 0) {
        nextIndex = currentIndex - 1;
      } else if (dragOffset < 0 && currentIndex < contents.length - 1) {
        nextIndex = currentIndex + 1;
      }
    }
    
    if (nextIndex !== currentIndex) {
      triggerHaptic('light');
      setCurrentIndex(nextIndex);
    }
    
    // Reset states
    setIsDragging(false);
    setDragOffset(0);
    startX.current = null;
    velocityX.current = 0;
  }, [currentIndex, contents.length, dragOffset, triggerHaptic]);

  // Add touch event listeners
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.addEventListener('touchstart', handleTouchStart, { passive: true });
    container.addEventListener('touchmove', handleTouchMove, { passive: false }); // Non-passive to allow preventDefault
    container.addEventListener('touchend', handleTouchEnd);
    container.addEventListener('touchcancel', handleTouchEnd);

    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
      container.removeEventListener('touchcancel', handleTouchEnd);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd]);

  const handleImageTap = () => {
    if (!isDragging) {
      setShowActions(!showActions);
      onImageTap?.(currentIndex);
    }
  };

  const handleDownload = async () => {
    const content = contents[currentIndex];
    if (!content.imageUrl) {
      onShowToast?.('No image available to save', 'error');
      return;
    }
    
    try {
      const filename = generatePortraitFilename({
        photoType,
        familyMemberCount,
        style: content.style || 'portrait'
      });
      
      // Check if this is actually a real iOS device (not just responsive mode)
      const isRealIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
      const isActualSafari = /Safari/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent);
      
      // Only use iOS-specific handling for real iOS Safari
      if (isRealIOS && isActualSafari) {
        // Real iOS Safari - limited download capabilities
        try {
          const response = await fetch(content.imageUrl);
          const blob = await response.blob();
          
          // For iOS Safari, open in new tab is the most reliable method
          const url = URL.createObjectURL(blob);
          const newWindow = window.open(url, '_blank');
          if (newWindow) {
            onShowToast?.('Photo opened in new tab. Long press and select "Save to Photos"', 'info');
          } else {
            // Fallback: copy image URL
            if (navigator.clipboard) {
              await navigator.clipboard.writeText(content.imageUrl);
              onShowToast?.('Image link copied to clipboard', 'info');
            } else {
              throw new Error('Unable to save on this device');
            }
          }
          // Clean up the object URL after a delay
          setTimeout(() => URL.revokeObjectURL(url), 2000);
        } catch (iosError) {
          console.error('iOS save failed:', iosError);
          // Final fallback - just copy the original URL
          if (navigator.clipboard) {
            await navigator.clipboard.writeText(content.imageUrl);
            onShowToast?.('Image link copied to clipboard. Open link to save photo.', 'info');
          } else {
            throw new Error('Unable to save on this device');
          }
        }
      } else {
        // Standard download for desktop browsers, Chrome mobile, etc.
        try {
          const link = document.createElement('a');
          link.href = content.imageUrl;
          link.download = filename;
          link.style.display = 'none';
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          onShowToast?.('Photo saved successfully!', 'success');
        } catch (downloadError) {
          // If standard download fails, try opening in new tab
          const newWindow = window.open(content.imageUrl, '_blank');
          if (newWindow) {
            onShowToast?.('Photo opened in new tab. Right-click to save.', 'info');
          } else {
            throw new Error('Download failed');
          }
        }
      }
      
      posthogService.trackImageDownloaded(content.style || 'unknown', generationId || 'unknown');
      
    } catch (error) {
      console.error('Download failed:', error);
      onShowToast?.('Failed to save photo. Please try again.', 'error');
    }
    
    setShowActions(false);
  };

  const handleShare = async () => {
    const content = contents[currentIndex];
    if (!content.imageUrl) return;
    
    try {
      if (navigator.share) {
        const response = await fetch(content.imageUrl);
        const blob = await response.blob();
        const filename = generatePortraitFilename({
          photoType,
          familyMemberCount,
          style: content.style || 'portrait'
        });
        const file = new File([blob], filename, { type: blob.type });
        
        await navigator.share({
          files: [file],
          title: `Wedding Portrait - ${content.style}`,
          text: `Check out this beautiful AI-generated wedding portrait in ${content.style} style! 💕`
        });
      }
    } catch (err) {
      console.error('Share failed:', err);
    }
    
    setShowActions(false);
  };

  if (!contents || contents.length === 0) return null;

  const currentContent = contents[currentIndex];

  return (
    <div className="relative w-full swipeable-gallery">
      {/* Gallery Container */}
      <div 
        ref={containerRef}
        className="relative w-full overflow-hidden bg-gray-900 rounded-xl"
        style={{ 
          height: '70vh', 
          maxHeight: '600px',
          touchAction: 'pan-x', // Allow horizontal panning for swipe
          overscrollBehavior: 'contain', // Prevent pull-to-refresh when scrolling gallery
          WebkitOverscrollBehavior: 'contain', // Safari specific
          position: 'relative',
          zIndex: 10 // Ensure it's above pull-to-refresh detection
        }}
        onClick={handleImageTap}
      >
        {/* Images Track */}
        <div 
          className={`
            absolute inset-0 flex
            ${isDragging ? '' : 'transition-transform duration-300 ease-out'}
          `}
          style={{
            transform: `translateX(${-currentIndex * 100 + (dragOffset / window.innerWidth) * 100}%)`
          }}
        >
          {contents.map((content, index) => (
            <div 
              key={index}
              className="w-full h-full flex-shrink-0 relative"
            >
              {content.imageUrl ? (
                <>
                  <img
                    src={content.imageUrl}
                    alt={`Wedding portrait in ${content.style} style`}
                    className="w-full h-full object-contain"
                    draggable={false}
                    onLoad={() => setImageLoadStates(prev => ({ ...prev, [index]: true }))}
                    style={{ 
                      WebkitUserSelect: 'none',
                      userSelect: 'none',
                      WebkitTouchCallout: 'none'
                    }}
                  />
                  
                  {/* Loading state */}
                  {!imageLoadStates[index] && (
                    <div className="absolute inset-0 bg-gray-800 animate-pulse flex items-center justify-center">
                      <Icon 
                        path="M12 4.5C7.5 4.5 4.73 7.5 4.5 12h-2c.28-5.5 4.53-9.5 9.5-9.5s9.22 4 9.5 9.5h-2c-.23-4.5-3-7.5-7.5-7.5zM12 19.5c-4.5 0-7.27-3-7.5-7.5h2c.23 4.5 3 7.5 7.5 7.5s7.27-3 7.5-7.5h2c-.28 5.5-4.53 9.5-9.5 9.5z"
                        className="w-8 h-8 text-gray-400 animate-spin"
                      />
                    </div>
                  )}
                </>
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <div className="text-center text-red-400">
                    <Icon 
                      path="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"
                      className="w-12 h-12 mx-auto mb-2"
                    />
                    <p className="font-medium">Generation Failed</p>
                    <p className="text-sm text-gray-500 mt-1">
                      {content.text || 'Please try again'}
                    </p>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Style Title Overlay */}
        <div className="absolute top-0 left-0 right-0 p-4 bg-gradient-to-b from-black/60 to-transparent pointer-events-none">
          <h3 className="text-white font-bold text-xl text-center">
            {currentContent.style}
          </h3>
        </div>

        {/* Action Buttons Overlay */}
        {currentContent.imageUrl && (
          <div 
            className={`
              absolute bottom-0 left-0 right-0 p-6
              bg-gradient-to-t from-black/80 to-transparent
              transform transition-all duration-300
              ${showActions ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0'}
            `}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-center gap-4">
              <button
                onClick={() => setShowPreview(true)}
                className="bg-blue-600 text-white px-6 py-3 rounded-full flex items-center gap-2 font-medium shadow-lg active:scale-95 transition-transform"
              >
                <Icon 
                  path="M12 4.5C7 4.5 4.73 7.61 3.82 12 4.73 16.39 7 19.5 12 19.5c4.99 0 7.27-3.11 8.18-7.5C19.27 7.61 17 4.5 12 4.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"
                  className="w-5 h-5"
                />
                View
              </button>
              
              <button
                onClick={handleDownload}
                className="bg-white text-gray-900 px-6 py-3 rounded-full flex items-center gap-2 font-medium shadow-lg active:scale-95 transition-transform"
              >
                <Icon 
                  path="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM17 13l-5 5-5-5h3V9h4v4h3z"
                  className="w-5 h-5"
                />
                Save
              </button>
              
              <button
                onClick={handleShare}
                className="bg-purple-600 text-white px-6 py-3 rounded-full flex items-center gap-2 font-medium shadow-lg active:scale-95 transition-transform"
              >
                <Icon 
                  path="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92s2.92-1.31 2.92-2.92S19.61 16.08 18 16.08z"
                  className="w-5 h-5"
                />
                Share
              </button>
            </div>
          </div>
        )}

        {/* Pagination Dots */}
        <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-2 pointer-events-none">
          {contents.map((_, index) => (
            <div
              key={index}
              className={`
                w-2 h-2 rounded-full transition-all duration-300
                ${index === currentIndex 
                  ? 'w-8 bg-white' 
                  : 'bg-white/40'
                }
              `}
            />
          ))}
        </div>

        {/* Navigation Arrows (for tablet) */}
        {contents.length > 1 && !isDragging && (
          <>
            {currentIndex > 0 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setCurrentIndex(currentIndex - 1);
                  triggerHaptic('light');
                }}
                className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 text-white p-2 rounded-full hidden md:block hover:bg-black/70 transition-colors"
              >
                <Icon 
                  path="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"
                  className="w-6 h-6"
                />
              </button>
            )}
            
            {currentIndex < contents.length - 1 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setCurrentIndex(currentIndex + 1);
                  triggerHaptic('light');
                }}
                className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 text-white p-2 rounded-full hidden md:block hover:bg-black/70 transition-colors"
              >
                <Icon 
                  path="M8.59 16.59L10 18l6-6-6-6-1.41 1.41L13.17 12z"
                  className="w-6 h-6"
                />
              </button>
            )}
          </>
        )}
      </div>

      {/* Instructions */}
      <div className="text-center mt-3">
        <p className="text-gray-500 dark:text-gray-400 text-sm">
          {contents.length > 1 
            ? 'Swipe left or right to browse • Tap to show actions'
            : 'Tap image to show actions'
          }
        </p>
        {contents.length > 1 && (
          <div className="flex items-center justify-center gap-2 mt-2">
            <span className="text-xs text-gray-400">Image {currentIndex + 1} of {contents.length}</span>
          </div>
        )}
      </div>

      {/* Full Screen Preview */}
      {currentContent.imageUrl && (
        <ImagePreviewModal
          imageUrl={currentContent.imageUrl}
          title={`${currentContent.style} Wedding Portrait`}
          isOpen={showPreview}
          onClose={() => setShowPreview(false)}
          photoType={photoType}
          familyMemberCount={familyMemberCount}
          style={currentContent.style}
        />
      )}
    </div>
  );
};

export default SwipeableGallery;