import React, { useState, useEffect } from 'react';
import { GeneratedContent } from '../types';
import { useViewport } from '../hooks/useViewport';
import { useNetworkStatus } from '../hooks/useNetworkStatus';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../hooks/useTheme';

// Enhanced mobile components
import MobileAppShell from './MobileAppShell';
import SwipeableGallery from './SwipeableGallery';
import FloatingActionButton from './FloatingActionButton';
import { MobileToastManager, useMobileToasts } from './MobileToast';
import BottomSheet from './BottomSheet';

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

interface MobileAppProps {
  navigate: (route: 'home' | 'privacy' | 'terms') => void;
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

const MobileApp: React.FC<MobileAppProps> = ({ navigate }) => {
  const [sourceImageFile, setSourceImageFile] = useState<File | null>(null);
  const [sourceImageUrl, setSourceImageUrl] = useState<string | null>(null);
  const [generatedContents, setGeneratedContents] = useState<GeneratedContent[] | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [customPrompt, setCustomPrompt] = useState<string>('');
  const [currentGenerationId, setCurrentGenerationId] = useState<string | null>(null);
  const [photoType, setPhotoType] = useState<'single' | 'couple' | 'family'>('couple');
  const [familyMemberCount, setFamilyMemberCount] = useState<number>(4);
  
  // Mobile-specific states
  const [currentTab, setCurrentTab] = useState('home');
  const [showUploadSheet, setShowUploadSheet] = useState(false);
  const [showSettingsSheet, setShowSettingsSheet] = useState(false);
  const [showPromptSheet, setShowPromptSheet] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Modal states
  const [showLimitModal, setShowLimitModal] = useState<boolean>(false);
  const [showLoginModal, setShowLoginModal] = useState<boolean>(false);
  const [showProfileModal, setShowProfileModal] = useState<boolean>(false);
  const [loginMode, setLoginMode] = useState<'signin' | 'signup'>('signin');

  const { isMobile } = useViewport();
  const { isSlowConnection, isOnline } = useNetworkStatus();
  const { theme } = useTheme();
  const { user, isAuthenticated, signOut } = useAuth();
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
      // Clear current results
      setGeneratedContents(null);
      setError(null);
      
      // Show success feedback
      showSuccess('Refreshed successfully');
      
      // If there's an image, trigger a new generation
      if (sourceImageFile) {
        await handleGenerate();
      }
    } finally {
      setIsRefreshing(false);
    }
  };

  // Enhanced image upload handler
  const handleImageUpload = (file: File) => {
    setSourceImageFile(file);
    setSourceImageUrl(URL.createObjectURL(file));
    setGeneratedContents(null);
    setError(null);
    setShowUploadSheet(false);
    
    showSuccess('Image uploaded successfully!');
  };

  // Handle generation with mobile optimizations
  const handleGenerate = async () => {
    if (!sourceImageFile) {
      showError("Please upload an image first.");
      return;
    }

    if (!isOnline) {
      showError("Please check your internet connection.");
      return;
    }

    // Check credits
    let canProceed = true;
    if (user) {
      const balance = await creditsService.getBalance();
      if (!balance.canUseCredits) {
        setShowLimitModal(true);
        return;
      }
    } else {
      const limitCheck = rateLimiter.checkLimit();
      if (!limitCheck.canProceed) {
        setShowLimitModal(true);
        return;
      }
    }

    setIsLoading(true);
    setError(null);
    setGeneratedContents(null);
    setShowPromptSheet(false);

    // Consume credit
    if (user) {
      const consumeResult = await creditsService.consumeCredit(`Portrait generation - ${photoType}`);
      if (!consumeResult.success) {
        showError(consumeResult.error || 'Failed to consume credit');
        setIsLoading(false);
        return;
      }
    } else {
      rateLimiter.consumeCredit();
    }

    const generationId = `gen_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    setCurrentGenerationId(generationId);

    try {
      const stylesToGenerate = getRandomWeddingStyles();
      
      posthogService.trackGenerationStarted(generationId, {
        styles: stylesToGenerate,
        customPrompt: customPrompt || undefined,
        photoType,
        familyMemberCount: photoType === 'family' ? familyMemberCount : undefined,
      });

      // Use sequential generation for mobile
      const finalContents: GeneratedContent[] = [];
      
      for (let i = 0; i < stylesToGenerate.length; i++) {
        const style = stylesToGenerate[i];
        const prompt = photoType === 'couple' 
          ? `Transform the couple into a beautiful wedding portrait with a "${style}" theme. Keep their faces EXACTLY identical. ${customPrompt}`
          : `Transform into a wedding portrait with a "${style}" theme. Keep faces identical. ${customPrompt}`;

        try {
          const content = await editImageWithNanoBanana(sourceImageFile, prompt);
          finalContents.push({ ...content, style });
          
          // Update UI with partial results
          setGeneratedContents([...finalContents]);
        } catch (err) {
          console.error(`Error generating style "${style}":`, err);
          finalContents.push({
            imageUrl: null,
            text: err instanceof Error ? err.message : 'Generation failed',
            style,
          });
        }
      }

      const successCount = finalContents.filter(c => c.imageUrl !== null).length;
      
      if (successCount > 0) {
        showSuccess(`${successCount} portrait${successCount > 1 ? 's' : ''} generated successfully!`);
      } else {
        showError('All generations failed. Please try again.');
      }

      // Track completion
      const successfulStyles = finalContents.filter(c => c.imageUrl !== null).map(c => c.style);
      const failedStyles = finalContents.filter(c => c.imageUrl === null).map(c => c.style);
      
      posthogService.trackGenerationCompleted(generationId, successfulStyles, failedStyles);
      counterService.incrementCounter(generationId, successCount, stylesToGenerate.length, photoType);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Generation failed";
      showError(errorMessage);
      posthogService.trackGenerationFailed(generationId, errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // FAB actions
  const fabActions = sourceImageUrl ? [
    {
      id: 'generate',
      label: 'Generate Portraits',
      icon: 'M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z',
      onClick: () => setShowPromptSheet(true)
    },
    {
      id: 'upload',
      label: 'New Image',
      icon: 'M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm4 18H6V4h7v5h5v11z',
      onClick: () => setShowUploadSheet(true)
    }
  ] : [
    {
      id: 'upload',
      label: 'Upload Photo',
      icon: 'M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm4 18H6V4h7v5h5v11z',
      onClick: () => setShowUploadSheet(true)
    }
  ];

  const handleTabChange = (tabId: string) => {
    setCurrentTab(tabId);
    
    switch (tabId) {
      case 'gallery':
        if (generatedContents && generatedContents.length > 0) {
          // Scroll to gallery
          const galleryElement = document.querySelector('.swipeable-gallery');
          galleryElement?.scrollIntoView({ behavior: 'smooth' });
        }
        break;
      case 'create':
        setShowUploadSheet(true);
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

  // Loading states with skeletons
  if (isLoading) {
    return (
      <MobileAppShell
        currentTab={currentTab}
        onTabChange={handleTabChange}
        onRefresh={handleRefresh}
        headerTitle="Generating Portraits..."
      >
        <div className="space-y-6 p-4">
          <PhotoTypeSelectorSkeleton />
          <UsageCounterSkeleton />
          <ImageUploaderSkeleton />
          <Loader message="Creating your wedding portraits..." />
          <ImageDisplaySkeleton count={3} />
        </div>
        <MobileToastManager toasts={toasts} onDismiss={dismissToast} />
      </MobileAppShell>
    );
  }

  return (
    <MobileAppShell
      currentTab={currentTab}
      onTabChange={handleTabChange}
      onRefresh={handleRefresh}
      headerTitle="WedAI"
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
            onImageUpload={handleImageUpload}
            sourceImageUrl={sourceImageUrl}
          />
        )}

        {/* Current Image Preview */}
        {sourceImageUrl && !generatedContents && (
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4">
            <h3 className="font-semibold mb-3 text-center">Your Photo</h3>
            <div className="relative">
              <img 
                src={sourceImageUrl} 
                alt="Uploaded" 
                className="w-full max-h-64 object-contain rounded-lg"
              />
              <button
                onClick={() => setShowUploadSheet(true)}
                className="absolute top-2 right-2 bg-black/50 text-white p-2 rounded-full"
              >
                ✏️
              </button>
            </div>
          </div>
        )}

        {/* Generated Results */}
        {generatedContents && (
          <div className="swipeable-gallery">
            <SwipeableGallery
              contents={generatedContents}
              generationId={currentGenerationId}
            />
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
                <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-700 rounded-full flex items-center justify-center mx-auto mb-3">
                  <span className="text-xl">📸</span>
                </div>
                <h4 className="font-semibold mb-2">Upload Photo</h4>
                <p className="text-sm text-gray-600 dark:text-gray-300">Upload your couple photo</p>
              </div>
              
              <div className="text-center">
                <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-700 rounded-full flex items-center justify-center mx-auto mb-3">
                  <span className="text-xl">✨</span>
                </div>
                <h4 className="font-semibold mb-2">AI Magic</h4>
                <p className="text-sm text-gray-600 dark:text-gray-300">Generate 3 unique wedding portraits</p>
              </div>
              
              <div className="text-center">
                <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-700 rounded-full flex items-center justify-center mx-auto mb-3">
                  <span className="text-xl">💕</span>
                </div>
                <h4 className="font-semibold mb-2">Download & Share</h4>
                <p className="text-sm text-gray-600 dark:text-gray-300">Save and share your portraits</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Floating Action Button */}
      <FloatingActionButton actions={fabActions} />

      {/* Bottom Sheets */}
      
      {/* Upload Sheet */}
      <BottomSheet
        isOpen={showUploadSheet}
        onClose={() => setShowUploadSheet(false)}
        title="Upload Your Photo"
        snapPoints={[70, 90]}
      >
        <div className="p-4">
          <SuspenseImageUploader 
            onImageUpload={handleImageUpload}
            sourceImageUrl={sourceImageUrl}
          />
        </div>
      </BottomSheet>

      {/* Prompt Sheet */}
      <BottomSheet
        isOpen={showPromptSheet}
        onClose={() => setShowPromptSheet(false)}
        title="Generate Portraits"
        snapPoints={[60, 80]}
      >
        <div className="p-4">
          <SuspensePromptInput
            onSubmit={handleGenerate}
            isLoading={isLoading}
            customPrompt={customPrompt}
            onCustomPromptChange={setCustomPrompt}
          />
        </div>
      </BottomSheet>

      {/* Modals */}
      <LimitReachedModal 
        isOpen={showLimitModal}
        onClose={() => setShowLimitModal(false)}
        onEmailSubmitted={(email) => {
          console.log('Email submitted:', email);
          showSuccess('Added to waitlist!');
        }}
      />
      
      <LoginModal 
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        onSuccess={() => {
          setShowLoginModal(false);
          showSuccess('Logged in successfully!');
        }}
        defaultMode={loginMode}
      />
      
      {user && (
        <UserProfile
          isOpen={showProfileModal}
          onClose={() => setShowProfileModal(false)}
          user={user}
          onSignOut={signOut}
        />
      )}

      {/* Toast Manager */}
      <MobileToastManager toasts={toasts} onDismiss={dismissToast} />
    </MobileAppShell>
  );
};

export default MobileApp;