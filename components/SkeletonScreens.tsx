import React from 'react';
import { useViewport } from '../hooks/useViewport';

// Base skeleton component with shimmer animation
const SkeletonBase: React.FC<{ 
  className?: string; 
  children?: React.ReactNode;
  shimmer?: boolean;
}> = ({ 
  className = '', 
  children,
  shimmer = true 
}) => (
  <div 
    className={`
      bg-gray-300 dark:bg-gray-700 rounded
      ${shimmer ? 'animate-pulse' : ''}
      ${className}
    `}
    style={{
      background: shimmer ? `
        linear-gradient(90deg, 
          theme(colors.gray.300) 25%, 
          theme(colors.gray.200) 50%, 
          theme(colors.gray.300) 75%
        )
      ` : undefined,
      backgroundSize: shimmer ? '200% 100%' : undefined,
      animation: shimmer ? 'shimmer 1.5s infinite linear' : undefined
    }}
  >
    {children}
  </div>
);

// Image uploader skeleton
export const ImageUploaderSkeleton: React.FC = () => {
  const { isMobile } = useViewport();
  
  return (
    <div className={`
      border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-xl
      ${isMobile ? 'p-6' : 'p-8'}
    `}>
      <div className="text-center space-y-4">
        <SkeletonBase className="w-16 h-16 rounded-full mx-auto" />
        <div className="space-y-2">
          <SkeletonBase className="h-6 w-48 mx-auto" />
          <SkeletonBase className="h-4 w-36 mx-auto" />
        </div>
        <SkeletonBase className={`h-12 ${isMobile ? 'w-full' : 'w-40'} mx-auto rounded-lg`} />
      </div>
    </div>
  );
};

// Photo type selector skeleton
export const PhotoTypeSelectorSkeleton: React.FC = () => {
  const { isMobile } = useViewport();
  
  return (
    <div className="space-y-4">
      <SkeletonBase className="h-6 w-32" />
      <div className={`grid gap-3 ${isMobile ? 'grid-cols-1' : 'grid-cols-3'}`}>
        {[1, 2, 3].map(i => (
          <SkeletonBase key={i} className="h-16 rounded-lg" />
        ))}
      </div>
    </div>
  );
};

// Prompt input skeleton
export const PromptInputSkeleton: React.FC = () => (
  <div className="space-y-4">
    <SkeletonBase className="h-4 w-24" />
    <SkeletonBase className="h-24 w-full rounded-lg" />
    <SkeletonBase className="h-12 w-full rounded-lg" />
  </div>
);

// Image display skeleton
export const ImageDisplaySkeleton: React.FC<{ count?: number }> = ({ count = 3 }) => {
  const { isMobile } = useViewport();
  
  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <SkeletonBase className="h-8 w-48 mx-auto" />
        {isMobile && <SkeletonBase className="h-4 w-36 mx-auto" />}
      </div>
      
      <div className={`grid gap-6 ${
        isMobile ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
      }`}>
        {Array.from({ length: count }).map((_, i) => (
          <ImageCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
};

// Individual image card skeleton
export const ImageCardSkeleton: React.FC = () => {
  const { isMobile } = useViewport();
  
  return (
    <div className={`
      bg-gray-100 dark:bg-gray-800 rounded-lg p-4 space-y-4
      ${isMobile ? 'mx-2' : ''}
    `}>
      <SkeletonBase className="h-6 w-32 mx-auto" />
      <SkeletonBase className={`
        ${isMobile ? 'h-64' : 'h-72'} w-full rounded-lg
      `} />
      <SkeletonBase className="h-4 w-3/4 mx-auto" />
    </div>
  );
};

// Swipeable gallery skeleton
export const SwipeableGallerySkeleton: React.FC = () => (
  <div className="relative w-full">
    <div 
      className="relative w-full overflow-hidden bg-gray-800 rounded-xl"
      style={{ height: '70vh', maxHeight: '600px' }}
    >
      <SkeletonBase className="w-full h-full" shimmer={false} />
      
      {/* Title overlay skeleton */}
      <div className="absolute top-0 left-0 right-0 p-4">
        <SkeletonBase className="h-6 w-48 mx-auto bg-gray-600" />
      </div>
      
      {/* Pagination dots skeleton */}
      <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-2">
        {[1, 2, 3].map(i => (
          <SkeletonBase key={i} className="w-2 h-2 rounded-full bg-gray-600" shimmer={false} />
        ))}
      </div>
    </div>
    
    <SkeletonBase className="h-4 w-64 mx-auto mt-3" />
  </div>
);

// Bottom navigation skeleton
export const BottomNavigationSkeleton: React.FC = () => {
  const { isMobile } = useViewport();
  
  if (!isMobile) return null;
  
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
      <div className="flex items-center justify-around h-16">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="flex flex-col items-center justify-center space-y-1">
            <SkeletonBase className="w-6 h-6" />
            <SkeletonBase className="w-8 h-3" />
          </div>
        ))}
      </div>
    </nav>
  );
};

// Header skeleton
export const HeaderSkeleton: React.FC = () => {
  const { isMobile } = useViewport();
  
  return (
    <header className={`
      ${isMobile ? 'fixed top-0 left-0 right-0 z-40' : 'relative'}
      bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700
    `}>
      <div className="flex items-center justify-between h-14 px-4">
        <div className="flex items-center gap-3">
          {isMobile && <SkeletonBase className="w-6 h-6" />}
          <SkeletonBase className="w-12 h-8" />
        </div>
        
        <div className="flex items-center gap-3">
          <SkeletonBase className="w-16 h-8 rounded-full" />
          <SkeletonBase className="w-8 h-8 rounded-full" />
        </div>
      </div>
    </header>
  );
};

// Usage counter skeleton
export const UsageCounterSkeleton: React.FC = () => (
  <div className="flex justify-center">
    <div className="bg-white dark:bg-gray-800 rounded-lg p-3 shadow-sm border">
      <div className="flex items-center gap-3">
        <SkeletonBase className="w-5 h-5 rounded-full" />
        <SkeletonBase className="w-24 h-4" />
      </div>
    </div>
  </div>
);

// Modal skeleton
export const ModalSkeleton: React.FC<{ title?: boolean }> = ({ title = true }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
    <div className="fixed inset-0 bg-black/50" />
    <div className="relative bg-white dark:bg-gray-800 rounded-lg w-full max-w-md">
      {title && (
        <div className="flex items-center justify-between p-4 border-b">
          <SkeletonBase className="h-6 w-32" />
          <SkeletonBase className="w-6 h-6" />
        </div>
      )}
      <div className="p-4 space-y-4">
        <SkeletonBase className="h-4 w-full" />
        <SkeletonBase className="h-4 w-3/4" />
        <SkeletonBase className="h-4 w-1/2" />
        <div className="flex gap-2 pt-4">
          <SkeletonBase className="h-10 flex-1 rounded-lg" />
          <SkeletonBase className="h-10 flex-1 rounded-lg" />
        </div>
      </div>
    </div>
  </div>
);

// Full page skeleton
export const FullPageSkeleton: React.FC = () => {
  const { isMobile } = useViewport();
  
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <HeaderSkeleton />
      
      <main className={isMobile ? 'pt-14 pb-16 p-4' : 'p-8'}>
        <div className="max-w-4xl mx-auto space-y-8">
          <PhotoTypeSelectorSkeleton />
          <UsageCounterSkeleton />
          <ImageUploaderSkeleton />
          <PromptInputSkeleton />
          <ImageDisplaySkeleton />
        </div>
      </main>
      
      <BottomNavigationSkeleton />
    </div>
  );
};

// List skeleton (for drawers, settings, etc.)
export const ListSkeleton: React.FC<{ items?: number }> = ({ items = 5 }) => (
  <div className="space-y-1">
    {Array.from({ length: items }).map((_, i) => (
      <div key={i} className="flex items-center gap-3 p-3">
        <SkeletonBase className="w-6 h-6" />
        <div className="flex-1 space-y-1">
          <SkeletonBase className="h-4 w-3/4" />
          <SkeletonBase className="h-3 w-1/2" />
        </div>
        <SkeletonBase className="w-4 h-4" />
      </div>
    ))}
  </div>
);

// Add shimmer animation CSS (should be added to global styles)
export const SkeletonStyles = () => (
  <style jsx global>{`
    @keyframes shimmer {
      0% {
        background-position: -200% 0;
      }
      100% {
        background-position: 200% 0;
      }
    }
    
    .animate-shimmer {
      animation: shimmer 1.5s infinite linear;
      background: linear-gradient(
        90deg,
        transparent 25%,
        rgba(255, 255, 255, 0.4) 50%,
        transparent 75%
      );
      background-size: 200% 100%;
    }
  `}</style>
);

export default {
  ImageUploaderSkeleton,
  PhotoTypeSelectorSkeleton,
  PromptInputSkeleton,
  ImageDisplaySkeleton,
  ImageCardSkeleton,
  SwipeableGallerySkeleton,
  BottomNavigationSkeleton,
  HeaderSkeleton,
  UsageCounterSkeleton,
  ModalSkeleton,
  FullPageSkeleton,
  ListSkeleton,
  SkeletonStyles
};