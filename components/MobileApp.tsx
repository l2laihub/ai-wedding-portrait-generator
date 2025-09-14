import React, { useState, useEffect } from 'react';
import { GeneratedContent } from '../types';
import { useViewport } from '../hooks/useViewport';
import { useNetworkStatus } from '../hooks/useNetworkStatus';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../hooks/useTheme';

// Enhanced mobile components
import MobileAppShell from './MobileAppShell';
import SwipeableGallery from './SwipeableGallery';
import { MobileToastManager, useMobileToasts } from './MobileToast';

// Existing components with mobile optimizations
import { 
  SuspenseImageUploader, 
  SuspensePromptInput,
  SuspensePhotoTypeSelector
} from './LazyComponents';
import LoginModal from './LoginModal';
import UserProfile from './UserProfile';
import LimitReachedModal from './LimitReachedModal';
import ImagePreviewModal from './ImagePreviewModal';
import MaintenanceBanner from './MaintenanceBanner';

// Skeleton components
import {
  ImageDisplaySkeleton,
  ImageUploaderSkeleton,
  PromptInputSkeleton,
  PhotoTypeSelectorSkeleton,
  UsageCounterSkeleton
} from './SkeletonScreens';

import { editImageWithNanoBanana } from '../services/geminiService';
import { rateLimiter } from '../utils/rateLimiter';
import { creditsService } from '../services/creditsService';
import { posthogService } from '../services/posthogService';
import { counterService } from '../services/counterService';
import UsageCounter from './UsageCounter';
import Loader from './Loader';
import GenerationProgress from './GenerationProgress';

interface MobileAppProps {
  navigate: (route: 'home' | 'privacy' | 'terms') => void;
  // Shared state from App.tsx
  sourceImageFile: File | null;
  sourceImageUrl: string | null;
  generatedContents: GeneratedContent[] | null;
  isLoading: boolean;
  error: string | null;
  customPrompt: string;
  currentGenerationId: string | null;
  photoType: 'single' | 'couple' | 'family';
  familyMemberCount: number;
  showLimitModal: boolean;
  showLoginModal: boolean;
  showProfileModal: boolean;
  loginMode: 'signin' | 'signup';
  // Shared handlers from App.tsx
  handleImageUpload: (file: File) => void;
  handleGenerate: () => Promise<void>;
  handleCustomPromptChange: (prompt: string) => void;
  setPhotoType: (type: 'single' | 'couple' | 'family') => void;
  setFamilyMemberCount: (count: number) => void;
  setShowLimitModal: (show: boolean) => void;
  setShowLoginModal: (show: boolean) => void;
  setShowProfileModal: (show: boolean) => void;
  setLoginMode: (mode: 'signin' | 'signup') => void;
  // Additional mobile-specific props
  stylesToGenerate?: string[];
  resetState: () => void;
}

const ALL_WEDDING_STYLES = [
  "Classic & Timeless Wedding",
  "Rustic Barn Wedding", 
  "Bohemian Beach Wedding",
  "Vintage Victorian Wedding",
  "Modern Minimalist Wedding",
  "Fairytale Castle Wedding",
  "Enchanted Forest Wedding",
  "Gatsby Art Deco Wedding",
  "Tropical Paradise Wedding",
  "Winter Wonderland Wedding"
];

const MobileApp: React.FC<MobileAppProps> = ({ 
  navigate,
  // Shared state from App.tsx
  sourceImageFile,
  sourceImageUrl,
  generatedContents,
  isLoading,
  error,
  customPrompt,
  currentGenerationId,
  photoType,
  familyMemberCount,
  showLimitModal,
  showLoginModal,
  showProfileModal,
  loginMode,
  // Shared handlers from App.tsx
  handleImageUpload,
  handleGenerate,
  handleCustomPromptChange,
  setPhotoType,
  setFamilyMemberCount,
  setShowLimitModal,
  setShowLoginModal,
  setShowProfileModal,
  setLoginMode,
  stylesToGenerate = [],
  resetState
}) => {
  // Mobile-specific states only
  const [currentTab, setCurrentTab] = useState('home');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const { isMobile } = useViewport();
  const { isSlowConnection, isOnline } = useNetworkStatus();
  const { theme } = useTheme();
  const { user, isAuthenticated, signOut } = useAuth();
  
  // Check maintenance mode
  const isMaintenanceMode = (import.meta.env as any).VITE_MAINTENANCE_MODE === 'true';
  const { 
    toasts, 
    showSuccess, 
    showError, 
    showWarning, 
    showInfo,
    dismissToast 
  } = useMobileToasts();

  // Get 3 random wedding styles for each generation
  const getRandomWeddingStyles = () => {
    const shuffled = [...ALL_WEDDING_STYLES].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, 3);
  };

  // Handle refresh for mobile app shell
  const handleRefresh = async () => {
    if (!isOnline) {
      showWarning('Please check your connection');
      return;
    }

    setIsRefreshing(true);
    try {
      // Show success feedback
      showSuccess('Refreshed successfully');
      
      // If there's an image, trigger a new generation
      if (sourceImageFile) {
        await handleMobileGenerate();
      }
    } finally {
      setIsRefreshing(false);
    }
  };

  // Mobile upload handler wrapper
  const handleMobileImageUpload = (file: File) => {
    handleImageUpload(file);
    showSuccess('Image uploaded successfully!');
  };

  // Mobile generate handler wrapper
  const handleMobileGenerate = async () => {
    try {
      await handleGenerate();
      if (generatedContents && generatedContents.length > 0) {
        showSuccess('Portraits generated successfully!');
      }
    } catch (error) {
      showError('Generation failed. Please try again.');
    }
  };

  // Generation handler removed - using shared handler from App.tsx

  const handleTabChange = (tabId: string) => {
    setCurrentTab(tabId);
    
    switch (tabId) {
      case 'gallery':
        if (generatedContents && generatedContents.length > 0) {
          // Scroll to gallery
          const galleryElement = document.querySelector('.swipeable-gallery');
          galleryElement?.scrollIntoView({ behavior: 'smooth' });
          showInfo('Viewing your generated portraits');
        } else {
          // No gallery content, show message and switch back to home
          showInfo('No portraits generated yet. Create some portraits first!');
          setCurrentTab('home');
        }
        break;
      case 'create':
        // Reset state to show upload UI
        resetState();
        break;
      case 'profile':
        if (isAuthenticated) {
          setShowProfileModal(true);
        } else {
          setShowLoginModal(true);
        }
        break;
    }
  };

  // Loading states with enhanced progress UI
  if (isLoading) {
    const currentStyles = stylesToGenerate.length > 0 ? stylesToGenerate : getRandomWeddingStyles();
    
    return (
      <MobileAppShell
        currentTab={currentTab}
        onTabChange={handleTabChange}
        onRefresh={handleRefresh}
        headerTitle="Generating Portraits..."
        navigate={navigate}
      >
        <div className="space-y-6 p-4">
          <PhotoTypeSelectorSkeleton />
          <UsageCounterSkeleton />
          <ImageUploaderSkeleton />
          
          {/* Enhanced loading with progress */}
          <GenerationProgress
            styles={currentStyles}
            currentIndex={0}
            completedCount={0}
            className="mb-4"
          />
          
          <Loader message="Creating your wedding portraits..." />
          <ImageDisplaySkeleton count={3} />
        </div>
        <MobileToastManager toasts={toasts} onDismiss={dismissToast} />
      </MobileAppShell>
    );
  }

  return (
    <>
      {/* Maintenance Mode - Must be first to overlay everything */}
      <MaintenanceBanner variant="overlay" />
      
      <MobileAppShell
        currentTab={currentTab}
        onTabChange={handleTabChange}
        onRefresh={handleRefresh}
        headerTitle="WedAI"
        navigate={navigate}
      >
      <div className="space-y-6 p-4">
        {/* Photo Type Selector */}
        <SuspensePhotoTypeSelector
          photoType={photoType}
          onPhotoTypeChange={setPhotoType}
          familyMemberCount={familyMemberCount}
          onFamilyMemberCountChange={setFamilyMemberCount}
        />

        {/* Usage Counter */}
        <div className="flex justify-center">
          <UsageCounter variant="compact" showTimeUntilReset={true} />
        </div>

        {/* Image Upload Area - Only show if no image */}
        {!sourceImageUrl && (
          <SuspenseImageUploader 
            onImageUpload={handleMobileImageUpload}
            sourceImageUrl={sourceImageUrl}
          />
        )}

        {/* Current Image Preview with Generate Button */}
        {sourceImageUrl && !generatedContents && (
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4">
            <h3 className="font-semibold mb-3 text-center">Your Photo</h3>
            <div className="relative mb-4">
              <img 
                src={sourceImageUrl} 
                alt="Uploaded" 
                className="w-full max-h-64 object-contain rounded-lg"
              />
              <button
                onClick={resetState}
                className="absolute top-2 right-2 bg-black/50 text-white p-2 rounded-full"
                title="Upload new photo"
              >
                🔄
              </button>
            </div>
            
            {/* Custom Prompt Input */}
            <div className="mb-4">
              <SuspensePromptInput
                onSubmit={handleMobileGenerate}
                isLoading={isLoading}
                customPrompt={customPrompt}
                onCustomPromptChange={handleCustomPromptChange}
              />
            </div>
            
            {/* Direct Generate Button */}
            <button
              onClick={handleMobileGenerate}
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 disabled:opacity-50 text-white font-bold py-4 px-6 rounded-xl transition-all duration-200 flex items-center justify-center gap-2"
            >
              <span className="text-xl">✨</span>
              Generate Wedding Portraits
            </button>
          </div>
        )}

        {/* Generated Results */}
        {generatedContents && (
          <div className="space-y-4">
            <SwipeableGallery
              contents={generatedContents}
              generationId={currentGenerationId}
            />
            
            {/* New Image Button */}
            <div className="text-center">
              <button
                onClick={resetState}
                className="bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-6 py-3 rounded-xl font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                📸 Upload New Photo
              </button>
            </div>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-300 dark:border-red-700 text-red-800 dark:text-red-200 p-4 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <span>⚠️</span>
              <strong>Generation Issue</strong>
            </div>
            <p className="text-sm">{error}</p>
          </div>
        )}

        {/* How it works - Show when no content */}
        {!sourceImageUrl && !isLoading && (
          <div className="bg-white/60 dark:bg-gray-800/40 rounded-2xl p-6 backdrop-blur-sm">
            <h3 className="text-xl font-bold text-center mb-6">How It Works</h3>
            <div className="grid grid-cols-1 gap-6">
              <div className="text-center">
                <div className="w-12 h-12 bg-gradient-to-br from-cyan-400 to-blue-600 rounded-full flex items-center justify-center mx-auto mb-3">
                  <span className="text-xl">📸</span>
                </div>
                <h4 className="font-semibold mb-2">Upload Photo</h4>
                <p className="text-sm text-gray-600 dark:text-gray-300">Upload your couple photo</p>
              </div>
              
              <div className="text-center">
                <div className="w-12 h-12 bg-gradient-to-br from-cyan-400 to-blue-600 rounded-full flex items-center justify-center mx-auto mb-3">
                  <span className="text-xl">✨</span>
                </div>
                <h4 className="font-semibold mb-2">AI Magic</h4>
                <p className="text-sm text-gray-600 dark:text-gray-300">Generate 3 unique wedding portraits</p>
              </div>
              
              <div className="text-center">
                <div className="w-12 h-12 bg-gradient-to-br from-cyan-400 to-blue-600 rounded-full flex items-center justify-center mx-auto mb-3">
                  <span className="text-xl">💕</span>
                </div>
                <h4 className="font-semibold mb-2">Download & Share</h4>
                <p className="text-sm text-gray-600 dark:text-gray-300">Save and share your portraits</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* FloatingActionButton removed - using inline generate button instead */}

      {/* Bottom Sheets removed - using inline UI for simpler mobile experience */}

      {/* Modals */}
      <LimitReachedModal 
        isOpen={showLimitModal && !isMaintenanceMode}
        onClose={() => setShowLimitModal(false)}
        onEmailSubmitted={(email) => {
          console.log('Email submitted:', email);
          showSuccess('Added to waitlist!');
        }}
      />
      
      <LoginModal 
        isOpen={showLoginModal && !isMaintenanceMode}
        onClose={() => setShowLoginModal(false)}
        onSuccess={() => {
          setShowLoginModal(false);
          showSuccess('Logged in successfully!');
        }}
        defaultMode={loginMode}
      />
      
      {user && (
        <UserProfile
          isOpen={showProfileModal && !isMaintenanceMode}
          onClose={() => setShowProfileModal(false)}
          user={user}
          onSignOut={signOut}
        />
      )}

      {/* Toast Manager */}
      <MobileToastManager toasts={toasts} onDismiss={dismissToast} />
    </MobileAppShell>
    </>
  );
};

export default MobileApp;