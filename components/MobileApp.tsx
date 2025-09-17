import React, { useState, useEffect } from 'react';
import { GeneratedContent } from '../types';
import { useViewport } from '../hooks/useViewport';
import { useNetworkStatus } from '../hooks/useNetworkStatus';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../hooks/useTheme';
import { useGenerationCounter } from '../hooks/useGenerationCounter';

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
import UpgradePrompt from './UpgradePrompt';
import PricingModal from './PricingModal';
import HelpSupportModal from './HelpSupportModal';
import SettingsModal from './SettingsModal';

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
  generationProgress?: Array<{
    style: string;
    status: 'waiting' | 'in_progress' | 'completed' | 'failed';
    startTime?: number;
  }>;
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
  generationProgress = [],
  resetState
}) => {
  // Mobile-specific states only
  const [currentTab, setCurrentTab] = useState('home');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showPricingModal, setShowPricingModal] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  const { isMobile } = useViewport();
  const { isSlowConnection, isOnline } = useNetworkStatus();
  const { theme } = useTheme();
  const { totalGenerations, dailyGenerations } = useGenerationCounter();
  const { user, isAuthenticated, signOut } = useAuth();
  
  // Debug logging for auth state changes
  useEffect(() => {
    console.log('MobileApp: Auth state changed - isAuthenticated:', isAuthenticated, 'user:', user?.email);
  }, [isAuthenticated, user]);
  
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

  // Handle refresh for mobile app shell - avoid unwanted regeneration
  const handleRefresh = async () => {
    if (!isOnline) {
      showWarning('Please check your connection');
      return;
    }

    setIsRefreshing(true);
    try {
      // Just refresh the app state without regenerating photos
      // Trigger counter updates and check for any pending data
      window.dispatchEvent(new CustomEvent('counterUpdate'));
      
      // Show success feedback
      showSuccess('Refreshed successfully');
    } finally {
      setIsRefreshing(false);
    }
  };

  // Mobile upload handler wrapper
  const handleMobileImageUpload = (file: File) => {
    handleImageUpload(file);
    // Only show notification on upload failure, not success
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

  // Purchase handler
  const handlePurchase = async (priceId: string, planId: string) => {
    if (!isAuthenticated || !user) {
      showError('Please sign in to purchase credits');
      return;
    }

    try {
      // Create checkout session using Supabase Edge Function
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const apiUrl = `${supabaseUrl}/functions/v1/stripe-checkout`;
        
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify({
          priceId,
          userId: user.id
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create checkout session');
      }

      // Close pricing modal and redirect to Stripe Checkout
      setShowPricingModal(false);
      
      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error('No checkout URL received');
      }
    } catch (error) {
      console.error('Purchase error:', error);
      showError(`Failed to start checkout: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleTabChange = (tabId: string) => {
    setCurrentTab(tabId);
    
    switch (tabId) {
      case 'create':
        // Reset state to show upload UI and scroll to top
        resetState();
        window.scrollTo({ top: 0, behavior: 'smooth' });
        showInfo('Ready to create new portraits!');
        break;
      case 'profile':
        if (isAuthenticated) {
          setShowProfileModal(true);
        } else {
          setShowLoginModal(true);
        }
        break;
      case 'signin':
        setShowLoginModal(true);
        break;
      case 'help':
        setShowHelpModal(true);
        break;
      case 'settings':
        setShowSettingsModal(true);
        break;
    }
  };

  // Create dynamic navigation items based on authentication status
  const getNavigationItems = () => {
    const baseItems = [
      {
        id: 'home',
        label: 'Home',
        icon: 'M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z'
      },
      {
        id: 'create',
        label: 'Create',
        icon: 'M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z'
      }
    ];

    if (isAuthenticated && user) {
      // Show Profile tab if user is authenticated
      baseItems.push({
        id: 'profile',
        label: 'Profile',
        icon: 'M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z'
      });
    } else {
      // Show Sign In tab if user is not authenticated
      baseItems.push({
        id: 'signin',
        label: 'Sign In',
        icon: 'M11 7L9.6 8.4l2.6 2.6H2v2h10.2l-2.6 2.6L11 17l5-5-5-5z'
      });
    }

    return baseItems;
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
        navigationItems={getNavigationItems()}
        onHelpClick={() => setShowHelpModal(true)}
        onSettingsClick={() => setShowSettingsModal(true)}
      >
        <div className="flex flex-col items-center justify-center min-h-[60vh] p-4">
          {/* Show current photo being processed */}
          {sourceImageUrl && (
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 mb-6 w-full max-w-sm">
              <h3 className="font-semibold mb-3 text-center">Processing Your Photo</h3>
              <img 
                src={sourceImageUrl} 
                alt="Processing" 
                className="w-full max-h-48 object-contain rounded-lg"
              />
            </div>
          )}
          
          {/* Enhanced loading with progress - main focus */}
          <GenerationProgress
            styles={currentStyles}
            currentIndex={0}
            completedCount={0}
            progressData={generationProgress.length > 0 ? generationProgress : undefined}
            className="w-full max-w-md"
          />
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
        navigationItems={getNavigationItems()}
        onHelpClick={() => setShowHelpModal(true)}
        onSettingsClick={() => setShowSettingsModal(true)}
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
            
            {/* Custom Prompt Input with Generate Button */}
            <SuspensePromptInput
              onSubmit={handleMobileGenerate}
              isLoading={isLoading}
              customPrompt={customPrompt}
              onCustomPromptChange={handleCustomPromptChange}
            />
          </div>
        )}

        {/* Generated Results */}
        {generatedContents && (
          <div className="space-y-4">
            <SwipeableGallery
              contents={generatedContents}
              generationId={currentGenerationId}
              onShowToast={(message, type) => {
                switch (type) {
                  case 'success':
                    showSuccess(message);
                    break;
                  case 'error':
                    showError(message);
                    break;
                  case 'warning':
                    showWarning(message);
                    break;
                  case 'info':
                    showInfo(message);
                    break;
                }
              }}
            />
            
            {/* Try Again Section */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4">
              <h3 className="font-semibold mb-3 text-center">Try Different Styles</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 text-center">
                Modify your prompt and generate new portraits with the same photo
              </p>
              
              {/* Custom Prompt Input for Regeneration */}
              <SuspensePromptInput
                onSubmit={handleMobileGenerate}
                isLoading={isLoading}
                customPrompt={customPrompt}
                onCustomPromptChange={handleCustomPromptChange}
              />
            </div>
            
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

        {/* Upgrade Prompt - Show when user has used 5+ portraits */}
        {!sourceImageUrl && !isLoading && (() => {
          const usageStats = rateLimiter.getUsageStats();
          if (usageStats.used >= 5) {
            return (
              <div className="mt-6">
                <UpgradePrompt 
                  variant="card"
                  onJoinWaitlist={() => {
                    // If not authenticated, show login modal
                    // If authenticated, show limit modal for waitlist
                    if (!isAuthenticated) {
                      setShowLoginModal(true);
                    } else {
                      setShowLimitModal(true);
                    }
                  }}
                  onShowPricing={() => setShowPricingModal(true)}
                />
              </div>
            );
          }
          return null;
        })()}
        
        {/* Buy More Credits - Show for authenticated users at bottom */}
        {isAuthenticated && user && (
          <div className="mt-8">
            <UpgradePrompt 
              variant="banner"
              onJoinWaitlist={() => setShowLimitModal(true)}
              onShowPricing={() => setShowPricingModal(true)}
            />
          </div>
        )}

        {/* Footer Section - Always show */}
        <div className="mt-8 space-y-6">
          {/* App Description */}
          <div className="bg-gradient-to-r from-slate-700 to-slate-800 text-white rounded-xl p-4 text-center shadow-lg">
            <div className="text-sm mb-2">Every photo shoot creates 3 unique themed wedding portraits</div>
            <div className="text-xs text-gray-200">Completely free, privacy-first, and optimized for all devices</div>
            <div className="flex justify-center gap-2 mt-3 text-xs">
              <span className="flex items-center gap-1">❤️ Made with Love</span>
              <span className="flex items-center gap-1">🌟 Free Forever</span>
              <span className="flex items-center gap-1">🔒 Your Privacy Matters</span>
            </div>
          </div>
          
          {/* Usage Statistics */}
          <div className="bg-gradient-to-r from-blue-600 to-purple-700 text-white rounded-xl p-4 shadow-lg">
            <div className="grid grid-cols-2 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold">{totalGenerations.toLocaleString()}</div>
                <div className="text-sm text-blue-100">Total Portraits</div>
              </div>
              <div>
                <div className="text-2xl font-bold">{dailyGenerations}</div>
                <div className="text-sm text-blue-100">Today's Portraits</div>
              </div>
            </div>
            <div className="text-center mt-3 text-xs text-blue-200">Powered by Google Gemini AI</div>
          </div>
          
          {/* Footer */}
          <div className="text-center space-y-3 pb-20">
            <div className="text-sm text-gray-600 dark:text-gray-400">
              © 2025 HuyBuilds. All rights reserved. WedAI is free to use.
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-500">
              We use anonymous analytics to improve the app.
            </div>
            <div className="flex justify-center gap-4 pt-2">
              <button 
                onClick={() => navigate('privacy')} 
                className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
              >
                Privacy
              </button>
              <button 
                onClick={() => navigate('terms')} 
                className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
              >
                Terms
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* FloatingActionButton removed - using inline generate button instead */}

      {/* Bottom Sheets removed - using inline UI for simpler mobile experience */}

      {/* Modals */}
      <LimitReachedModal 
        isOpen={showLimitModal && !isMaintenanceMode}
        onClose={() => setShowLimitModal(false)}
        onPurchase={handlePurchase}
        onShowLoginModal={(mode) => {
          setLoginMode(mode);
          setShowLoginModal(true);
        }}
      />
      
      <LoginModal 
        isOpen={showLoginModal && !isMaintenanceMode}
        onClose={() => {
          setShowLoginModal(false);
          // Reset tab to home when modal closes to prevent signin button staying highlighted
          setCurrentTab('home');
        }}
        onSuccess={() => {
          setShowLoginModal(false);
          showSuccess('Logged in successfully!');
          // Reset tab to home after successful login
          setCurrentTab('home');
        }}
        defaultMode={loginMode}
      />
      
      {user && (
        <UserProfile
          isOpen={showProfileModal && !isMaintenanceMode}
          onClose={() => {
            setShowProfileModal(false);
            // Reset tab to home when profile modal closes
            setCurrentTab('home');
          }}
          user={user}
          onSignOut={signOut}
        />
      )}

      {/* Pricing Modal */}
      <PricingModal
        isOpen={showPricingModal && !isMaintenanceMode}
        onClose={() => setShowPricingModal(false)}
        onPurchase={handlePurchase}
        user={user}
        isAuthenticated={isAuthenticated}
      />

      {/* Help & Support Modal */}
      <HelpSupportModal
        isOpen={showHelpModal && !isMaintenanceMode}
        onClose={() => {
          setShowHelpModal(false);
          setCurrentTab('home'); // Reset tab when modal closes
        }}
      />

      {/* Settings Modal */}
      <SettingsModal
        isOpen={showSettingsModal && !isMaintenanceMode}
        onClose={() => {
          setShowSettingsModal(false);
          setCurrentTab('home'); // Reset tab when modal closes
        }}
      />

      {/* Toast Manager */}
      <MobileToastManager toasts={toasts} onDismiss={dismissToast} />
    </MobileAppShell>
    </>
  );
};

export default MobileApp;