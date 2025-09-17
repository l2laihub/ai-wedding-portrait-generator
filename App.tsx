import React, { useState, useEffect } from 'react';
import SimpleHeader from './components/SimpleHeader';
import SimpleFooter from './components/SimpleFooter';
import Loader from './components/Loader';
import PWAInstallPrompt from './components/PWAInstallPrompt';
import RateLimitToast from './components/RateLimitToast';
import MaintenanceBanner from './components/MaintenanceBanner';
import MaintenanceToggle from './components/MaintenanceToggle';
import UsageCounter from './components/UsageCounter';
import LimitReachedModal from './components/LimitReachedModal';
import UpgradePrompt from './components/UpgradePrompt';
import PricingModal from './components/PricingModal';
import SuccessPage from './components/SuccessPage';
import { NetworkStatus, PerformanceMonitor } from './components/MobileEnhancements';
import MobileApp from './components/MobileApp';
import SplashScreen from './components/SplashScreen';
import { rateLimiter } from './utils/rateLimiter';
import { databaseService } from './services/databaseService';
import { creditsService } from './services/creditsService';
import { supabase } from './services/supabaseClient';
import LoginModal from './components/LoginModal';
import UserProfile from './components/UserProfile';
import HelpSupportModal from './components/HelpSupportModal';
import SettingsModal from './components/SettingsModal';
import { useAuth } from './hooks/useAuth';
import { useTheme } from './hooks/useTheme';
import { 
  SuspenseImageUploader, 
  SuspenseImageDisplay, 
  SuspensePromptInput,
  SuspensePhotoTypeSelector,
  preloadCriticalComponents
} from './components/LazyComponents';
// Enhanced components
import EnhancedPromptInput from './components/EnhancedPromptInput';
import EnhancedImageDisplay from './components/EnhancedImageDisplay';
import EnhancedComponentErrorBoundary from './components/EnhancedComponentErrorBoundary';
import { editImageWithNanoBanana } from './services/geminiService';
import { secureGeminiService, userIdentificationService } from './services';
// Enhanced services - with fallback handling
// import { enhancedSecureGeminiService } from './services/enhancedSecureGeminiService';
import { GeneratedContent } from './types';
import { useViewport } from './hooks/useViewport';
import { useNetworkStatus } from './hooks/useNetworkStatus';
import { posthogService } from './services/posthogService';
import { counterService } from './services/counterService';
// Enhanced template engine support
import { migrationUtils, TemplateEngineMigration } from './utils/templateEngineMigration';
import { themeManager } from './services/templateEngine/ThemeManager';
// import { useAppFeatureFlags, FEATURE_FLAGS } from './hooks/useFeatureFlags';

// Import admin utilities for debugging (development only)
if (process.env.NODE_ENV === 'development') {
  import('./utils/adminCounterUtils');
}

const ALL_WEDDING_STYLES = [
  "Bohemian Beach Wedding",
  "Classic & Timeless Wedding",
  "Rustic Barn Wedding", 
  "Vintage Victorian Wedding",
  "Modern Minimalist Wedding",
  "Fairytale Castle Wedding",
  "Enchanted Forest Wedding",
  //"Gatsby Art Deco Wedding",
  "Tropical Paradise Wedding",
  //"Winter Wonderland Wedding",
  //"Gothic Romance Wedding",
  //"Starry Night Galaxy Wedding",
  "Japanese Cherry Blossom Wedding",
  //"Mediterranean Villa Wedding",
  "Steampunk Victorian Wedding",
  "Disco 70s Glam Wedding",
  "Hollywood Red Carpet Wedding",
  //"Underwater Mermaid Wedding",
  //"Desert Oasis Wedding",
  //"Harry Potter Wizarding Wedding"
];

// Function to get 3 random wedding styles for each generation
const getRandomWeddingStyles = () => {
  const shuffled = [...ALL_WEDDING_STYLES].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, 3);
};

// Convert number to word for better AI understanding
const numberToWord = (num: number): string => {
  const words = ['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'];
  return words[num] || num.toString();
};

// Get style-specific pose suggestions for single portraits
const getStylePose = (style: string): string => {
  const stylePoses: { [key: string]: string } = {
    "Classic & Timeless Wedding": "elegant standing pose with bouquet, three-quarter turn showing the dress train",
    "Rustic Barn Wedding": "leaning against barn door, relaxed pose with boots visible, natural smile",
    "Bohemian Beach Wedding": "walking barefoot on beach, flowing dress in the wind, carefree pose",
    "Vintage Victorian Wedding": "sitting on vintage chair, hands folded, regal posture with full gown visible",
    "Modern Minimalist Wedding": "confident power pose, clean lines, architectural background, full silhouette",
    "Fairytale Castle Wedding": "twirling in ballgown, dramatic staircase pose, princess-like stance",
    "Enchanted Forest Wedding": "mystical pose among trees, flower crown, ethereal stance with natural lighting",
    //"Gatsby Art Deco Wedding": "glamorous 1920s pose, jazz hands, flapper dress with pearls, champagne glass",
    "Tropical Paradise Wedding": "playful pose with tropical flowers, vibrant colors, beach resort background",
    // "Winter Wonderland Wedding": "elegant pose in faux fur wrap, snowy backdrop, ice queen stance",
    // "Gothic Romance Wedding": "dramatic pose with dark elegance, cathedral background, mysterious allure",
    // "Starry Night Galaxy Wedding": "dreamy pose under stars, cosmic dress effects, celestial goddess stance",
    "Japanese Cherry Blossom Wedding": "graceful pose under sakura trees, traditional elements, serene expression",
    // "Mediterranean Villa Wedding": "romantic pose on terrace, flowing dress, sunset golden hour lighting",
    "Steampunk Victorian Wedding": "adventurous pose with gears and goggles, corset dress, vintage machinery",
    "Disco 70s Glam Wedding": "dancing pose with platform shoes, bell sleeves, groovy peace sign gesture",
    "Hollywood Red Carpet Wedding": "glamorous pose with paparazzi lights, movie star entrance, dramatic train",
    // "Underwater Mermaid Wedding": "flowing underwater pose, ethereal fabric movement, aquatic fantasy stance",
    // "Desert Oasis Wedding": "dramatic pose with flowing fabric, sunset silhouette, bohemian desert queen",
    // "Harry Potter Wizarding Wedding": "magical pose with wand, floating veil effect, Hogwarts castle background"
  };
  return stylePoses[style] || "elegant full body pose";
};

interface AppProps {
  navigate: (route: 'home' | 'privacy' | 'terms') => void;
}

function App({ navigate }: AppProps) {
  const [sourceImageFile, setSourceImageFile] = useState<File | null>(null);
  const [sourceImageUrl, setSourceImageUrl] = useState<string | null>(null);
  const [generatedContents, setGeneratedContents] = useState<GeneratedContent[] | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [customPrompt, setCustomPrompt] = useState<string>('');
  const [currentGenerationId, setCurrentGenerationId] = useState<string | null>(null);
  const [photoType, setPhotoType] = useState<'single' | 'couple' | 'family'>('couple');
  const [familyMemberCount, setFamilyMemberCount] = useState<number>(3);
  const [showLimitModal, setShowLimitModal] = useState<boolean>(false);
  const [showUpgradePrompt, setShowUpgradePrompt] = useState<boolean>(false);
  const [showLoginModal, setShowLoginModal] = useState<boolean>(false);
  const [showProfileModal, setShowProfileModal] = useState<boolean>(false);
  const [showPricingModal, setShowPricingModal] = useState<boolean>(false);
  const [showHelpModal, setShowHelpModal] = useState<boolean>(false);
  const [showSettingsModal, setShowSettingsModal] = useState<boolean>(false);
  const [showSuccessPage, setShowSuccessPage] = useState<boolean>(false);
  const [successSessionId, setSuccessSessionId] = useState<string | null>(null);
  const [loginMode, setLoginMode] = useState<'signin' | 'signup'>('signin');
  const [showSplash, setShowSplash] = useState<boolean>(true);
  const [appReady, setAppReady] = useState<boolean>(false);
  // Current styles being generated (for progress tracking consistency)
  const [currentStyles, setCurrentStyles] = useState<string[]>([]);
  // Real-time generation progress tracking
  const [generationProgress, setGenerationProgress] = useState<Array<{
    style: string;
    status: 'waiting' | 'in_progress' | 'completed' | 'failed';
    startTime?: number;
  }>>([]);
  
  // Enhanced features state
  const [useEnhancedComponents, setUseEnhancedComponents] = useState<boolean>(true);
  const [selectedThemes, setSelectedThemes] = useState<any[]>([]);
  const [enhancedSystemReady, setEnhancedSystemReady] = useState<boolean>(false);
  const [migrationStatus, setMigrationStatus] = useState<any>(null);
  const [enhancedSecureGeminiService, setEnhancedSecureGeminiService] = useState<any>(null);
  
  const { isMobile } = useViewport();
  const { isSlowConnection, isOnline } = useNetworkStatus();
  const { theme } = useTheme();
  const { user, isLoading: authLoading, isAuthenticated, signOut } = useAuth();
  // Temporarily disable feature flags to prevent race conditions
  // const { flags: featureFlags } = useAppFeatureFlags();
  const featureFlags = { enable_sequential_generation: false };

  // Shared handler functions - defined after hooks
  const handleImageUpload = (file: File) => {
    setSourceImageFile(file);
    setSourceImageUrl(URL.createObjectURL(file));
    setGeneratedContents(null); // Clear previous results
    setError(null);
  };
  
  // Track prompt modifications
  const handleCustomPromptChange = (newPrompt: string) => {
    setCustomPrompt(newPrompt);
    if (newPrompt.length > 0) {
      posthogService.trackPromptModified(newPrompt);
    }
  };

  // Enhanced generation handler with theme support
  const handleEnhancedGenerate = async (selectedThemeIds?: string[]) => {
    if (!sourceImageFile) {
      setError("Please upload an image first.");
      return;
    }

    if (!isOnline) {
      setError("Please check your internet connection and try again.");
      return;
    }

    // Initialize user identification service
    await userIdentificationService.initialize();
    
    // Rate limit checks (same as original)
    if (user) {
      const balance = await creditsService.getBalance();
      if (!balance.canUseCredits) {
        setShowLimitModal(true);
        return;
      }
    } else {
      const localLimit = rateLimiter.checkLimit();
      if (!localLimit.canProceed) {
        setShowLimitModal(true);
        setError(`You've used all 3 free photo shoots today (${localLimit.total - localLimit.remaining}/3). Each photo shoot creates 3 images!`);
        return;
      }
      
      const backendLimit = await secureGeminiService.checkRateLimit();
      if (!backendLimit.canProceed) {
        setShowLimitModal(true);
        setError(`Rate limit reached. Please try again later.`);
        return;
      }
    }

    setIsLoading(true);
    setError(null);
    setGeneratedContents(null);
    
    // Get themes using enhanced system or fallback to legacy
    let themesToGenerate;
    
    try {
      if (selectedThemeIds && selectedThemeIds.length > 0 && enhancedSystemReady) {
        // Use selected themes from enhanced system
        themesToGenerate = selectedThemeIds.map(id => {
          const theme = themeManager.getStyle(id);
          return theme || { id, name: id, style: id }; // fallback
        });
        console.log('🎯 Using selected enhanced themes:', themesToGenerate.map(t => t.name));
      } else if (enhancedSystemReady) {
        // Use enhanced random theme selection
        const enhancedThemes = themeManager.getRandomStyles(3, { favorFeatured: true });
        themesToGenerate = enhancedThemes;
        console.log('🎨 Using enhanced random themes:', themesToGenerate.map(t => t.name));
      } else {
        // Fallback to legacy system
        const legacyStyles = getRandomWeddingStyles();
        themesToGenerate = migrationUtils.stylesToThemes(legacyStyles);
        console.log('🔄 Using legacy themes with migration:', themesToGenerate.map(t => t.name));
      }
    } catch (error) {
      console.warn('Theme generation failed, using emergency fallback:', error);
      const legacyStyles = getRandomWeddingStyles();
      themesToGenerate = legacyStyles.map(style => ({ id: style, name: style, style }));
    }
    
    // Store for consistent use across components
    setCurrentStyles(themesToGenerate.map(t => t.name || t.style || t.id)); 
    setSelectedThemes(themesToGenerate);
    
    // Initialize progress tracking
    const initialProgress = themesToGenerate.map(theme => ({
      style: theme.name || theme.style || theme.id,
      status: 'waiting' as const,
      theme: theme
    }));
    setGenerationProgress(initialProgress);

    // Generate unique ID for this generation session
    const generationId = `gen_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    setCurrentGenerationId(generationId);

    try {
      // Track generation started
      posthogService.trackGenerationStarted(generationId, {
        styles: themesToGenerate.map(t => t.name || t.style || t.id),
        themes: themesToGenerate.map(t => t.id),
        customPrompt: customPrompt || undefined,
        generationId,
        timestamp: Date.now(),
        enhancedMode: enhancedSystemReady
      });
      
      // Track each theme in database analytics
      themesToGenerate.forEach(async (theme) => {
        await databaseService.trackUsage(generationId, photoType, theme.name || theme.style || theme.id);
      });
      
      let generationResult;
      
      if (enhancedSystemReady && enhancedSecureGeminiService) {
        console.log(`🎨 Generating ${themesToGenerate.length} styles using enhanced system`);
        
        try {
          // Use enhanced generation service
          generationResult = await enhancedSecureGeminiService.generateMultipleEnhancedPortraits(
            sourceImageFile,
            {
              themes: themesToGenerate,
              customPrompt,
              portraitType: photoType,
              familyMemberCount,
              count: themesToGenerate.length
            },
            (identifier, status, theme) => {
              // Update progress in real-time
              setGenerationProgress(prev => prev.map(p => 
                (p.style === identifier || p.theme?.id === identifier || p.theme?.name === identifier)
                  ? { ...p, status, startTime: status === 'in_progress' ? Date.now() : p.startTime }
                  : p
              ));
            }
          );
          
          console.log('✨ Enhanced generation completed');
        } catch (enhancedError) {
          console.warn('Enhanced generation failed, falling back to legacy:', enhancedError);
          // Fallback to legacy system
          generationResult = await secureGeminiService.generateMultiplePortraits(
            sourceImageFile,
            themesToGenerate.map(t => t.name || t.style || t.id),
            customPrompt,
            photoType,
            familyMemberCount,
            (style, status) => {
              setGenerationProgress(prev => prev.map(p => 
                p.style === style 
                  ? { ...p, status, startTime: status === 'in_progress' ? Date.now() : p.startTime }
                  : p
              ));
            }
          );
        }
      } else {
        console.log(`🔄 Using legacy generation system`);
        
        // Use legacy system
        generationResult = await secureGeminiService.generateMultiplePortraits(
          sourceImageFile,
          themesToGenerate.map(t => t.name || t.style || t.id),
          customPrompt,
          photoType,
          familyMemberCount,
          (style, status) => {
            setGenerationProgress(prev => prev.map(p => 
              p.style === style 
                ? { ...p, status, startTime: status === 'in_progress' ? Date.now() : p.startTime }
                : p
            ));
          }
        );
      }
      
      // Process results (same as original logic)
      const finalContents: GeneratedContent[] = [];
      
      for (const result of generationResult.results) {
        if (result.success && result.data) {
          // Update progress: mark as completed
          setGenerationProgress(prev => prev.map(p => 
            p.style === result.style 
              ? { ...p, status: 'completed' }
              : p
          ));
          
          // Track successful style generation
          posthogService.trackStyleGenerated({
            style: result.style,
            generationId,
            duration: result.processing_time_ms || 0,
            success: true,
          });
          
          finalContents.push(result.data);
        } else {
          // Update progress: mark as failed
          setGenerationProgress(prev => prev.map(p => 
            p.style === result.style 
              ? { ...p, status: 'failed' }
              : p
          ));
          
          // Track failed style generation
          posthogService.trackStyleGenerated({
            style: result.style,
            generationId,
            duration: result.processing_time_ms || 0,
            success: false,
            error: result.error || 'Unknown error',
          });
          
          finalContents.push({
            imageUrl: null,
            text: result.error || 'Generation failed',
            style: result.style,
          });
        }
      }
      
      // Handle remaining logic (credit consumption, etc.)
      if (user && generationResult.successful > 0) {
        const consumeResult = await creditsService.consumeCredit(`Portrait generation - ${photoType}`);
        if (!consumeResult.success) {
          console.warn('Failed to consume credit after generation:', consumeResult.error);
        }
      } else if (!user && generationResult.successful > 0) {
        const limitResult = rateLimiter.consumeCredit();
        window.dispatchEvent(new CustomEvent('counterUpdate', {
          detail: { remaining: limitResult.remaining }
        }));
      }
      
      setGeneratedContents(finalContents);
      
      // Track generation completed
      const successfulStyles = finalContents.filter(c => c.imageUrl !== null).map(c => c.style);
      const failedStyles = finalContents.filter(c => c.imageUrl === null).map(c => c.style);
      posthogService.trackGenerationCompleted(generationId, successfulStyles, failedStyles);
      
      // Increment counter
      incrementCounterWithMetadata(
        generationId,
        successfulStyles.length,
        themesToGenerate.length,
        photoType,
        themesToGenerate.map(t => t.name || t.style || t.id),
        customPrompt
      );
      
      // Handle error messages based on results
      if (failedStyles.length > 0) {
        const hasRateLimitError = finalContents.some(c => 
          c.imageUrl === null && 
          (c.text?.includes('quota') || c.text?.includes('limit') || c.text?.includes('Rate limit') || c.text?.includes('popular today'))
        );
        
        const hasServerError = finalContents.some(c => 
          c.imageUrl === null && 
          (c.text?.includes('Server temporarily unavailable') || c.text?.includes('internal error'))
        );
        
        if (hasRateLimitError) {
          setError(`Some portrait styles hit rate limits, but ${successfulStyles.length} succeeded! 🎆`);
        } else if (hasServerError) {
          setError(`${successfulStyles.length} portraits generated successfully! ${failedStyles.length} styles experienced server issues but you can try regenerating them. 🔄`);
        } else {
          setError(`${successfulStyles.length} portraits are ready! ${failedStyles.length} styles encountered issues - try adjusting your prompt or photo. ✨`);
        }
      }

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "An unexpected error occurred during the generation process.";
      posthogService.trackGenerationFailed(generationId, errorMessage);
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerate = async () => {
    if (!sourceImageFile) {
      setError("Please upload an image first.");
      return;
    }

    if (!isOnline) {
      setError("Please check your internet connection and try again.");
      return;
    }

    // Initialize user identification service
    await userIdentificationService.initialize();
    
    // Check rate limits - different for authenticated vs anonymous users
    if (user) {
      // For authenticated users, check credit balance
      const balance = await creditsService.getBalance();
      if (!balance.canUseCredits) {
        setShowLimitModal(true);
        return;
      }
    } else {
      // For anonymous users, check local rate limiter first
      const localLimit = rateLimiter.checkLimit();
      if (!localLimit.canProceed) {
        setShowLimitModal(true);
        setError(`You've used all 3 free photo shoots today (${localLimit.total - localLimit.remaining}/3). Each photo shoot creates 3 images!`);
        return;
      }
      
      // Also check backend rate limits to ensure consistency
      const backendLimit = await secureGeminiService.checkRateLimit();
      if (!backendLimit.canProceed) {
        setShowLimitModal(true);
        setError(`Rate limit reached. Please try again later.`);
        return;
      }
    }

    setIsLoading(true);
    setError(null);
    setGeneratedContents(null);
    
    // Initialize progress tracking
    const stylesToGenerate = getRandomWeddingStyles();
    setCurrentStyles(stylesToGenerate); // Store for consistent use across components
    const initialProgress = stylesToGenerate.map(style => ({
      style,
      status: 'waiting' as const
    }));
    setGenerationProgress(initialProgress);

    // Generate unique ID for this generation session
    const generationId = `gen_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    setCurrentGenerationId(generationId);

    try {
      // Track generation started
      posthogService.trackGenerationStarted(generationId, {
        styles: stylesToGenerate,
        customPrompt: customPrompt || undefined,
        generationId,
        timestamp: Date.now(),
      });
      
      // Track each style in database analytics
      stylesToGenerate.forEach(async (style) => {
        await databaseService.trackUsage(generationId, photoType, style);
      });
      
      // Use secure backend for generation
      console.log(`🎨 Generating ${stylesToGenerate.length} styles using secure backend`);
      
      const generationResult = await secureGeminiService.generateMultiplePortraits(
        sourceImageFile,
        stylesToGenerate,
        customPrompt,
        photoType,
        familyMemberCount,
        (style, status) => {
          // Update progress in real-time as each style is processed
          setGenerationProgress(prev => prev.map(p => 
            p.style === style 
              ? { ...p, status, startTime: status === 'in_progress' ? Date.now() : p.startTime }
              : p
          ));
        }
      );
      
      // Process results
      const finalContents: GeneratedContent[] = [];
      
      for (const result of generationResult.results) {
        if (result.success && result.data) {
          // Update progress: mark as completed
          setGenerationProgress(prev => prev.map(p => 
            p.style === result.style 
              ? { ...p, status: 'completed' }
              : p
          ));
          
          // Track successful style generation
          posthogService.trackStyleGenerated({
            style: result.style,
            generationId,
            duration: result.processing_time_ms || 0,
            success: true,
          });
          
          finalContents.push(result.data);
        } else {
          // Update progress: mark as failed
          setGenerationProgress(prev => prev.map(p => 
            p.style === result.style 
              ? { ...p, status: 'failed' }
              : p
          ));
          
          // Track failed style generation
          posthogService.trackStyleGenerated({
            style: result.style,
            generationId,
            duration: result.processing_time_ms || 0,
            success: false,
            error: result.error || 'Unknown error',
          });
          
          finalContents.push({
            imageUrl: null,
            text: result.error || 'Generation failed',
            style: result.style,
          });
        }
      }
      
      // Handle credit consumption for successful generations
      if (user && generationResult.successful > 0) {
        const consumeResult = await creditsService.consumeCredit(`Portrait generation - ${photoType}`);
        if (!consumeResult.success) {
          console.warn('Failed to consume credit after generation:', consumeResult.error);
        }
      } else if (!user && generationResult.successful > 0) {
        // For anonymous users, consume from rate limiter
        const limitResult = rateLimiter.consumeCredit();
        
        // Force counter update event to ensure UI syncs
        window.dispatchEvent(new CustomEvent('counterUpdate', {
          detail: { remaining: limitResult.remaining }
        }));
      }
      
      // Set final results
      setGeneratedContents(finalContents);
      
      // Track generation completed
      const successfulStyles = finalContents.filter(c => c.imageUrl !== null).map(c => c.style);
      const failedStyles = finalContents.filter(c => c.imageUrl === null).map(c => c.style);
      posthogService.trackGenerationCompleted(generationId, successfulStyles, failedStyles);
      
      // Increment counter for successful generation with enhanced metadata
      incrementCounterWithMetadata(
        generationId,
        successfulStyles.length,
        stylesToGenerate.length,
        photoType,
        stylesToGenerate,
        customPrompt
      );
      
      // Handle error messages based on results
      if (failedStyles.length > 0) {
        const hasRateLimitError = finalContents.some(c => 
          c.imageUrl === null && 
          (c.text?.includes('quota') || c.text?.includes('limit') || c.text?.includes('Rate limit') || c.text?.includes('popular today'))
        );
        
        const hasServerError = finalContents.some(c => 
          c.imageUrl === null && 
          (c.text?.includes('Server temporarily unavailable') || c.text?.includes('internal error'))
        );
        
        if (hasRateLimitError) {
          setError(`Some portrait styles hit rate limits, but ${successfulStyles.length} succeeded! 🎆`);
        } else if (hasServerError) {
          setError(`${successfulStyles.length} portraits generated successfully! ${failedStyles.length} styles experienced server issues but you can try regenerating them. 🔄`);
        } else {
          setError(`${successfulStyles.length} portraits are ready! ${failedStyles.length} styles encountered issues - try adjusting your prompt or photo. ✨`);
        }
      }

    } catch (err) {
      // This outer catch is for logic errors, not the API calls themselves
      const errorMessage = err instanceof Error ? err.message : "An unexpected error occurred during the generation process.";
      
      // Track generation failure
      posthogService.trackGenerationFailed(generationId, errorMessage);
      
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Helper method to increment counter with enhanced metadata
  const incrementCounterWithMetadata = (
    generationId: string,
    successfulStyles: number,
    totalStyles: number,
    photoType: 'single' | 'couple' | 'family',
    styles: string[],
    customPrompt: string
  ) => {
    // First increment the counter normally
    counterService.incrementCounter(generationId, successfulStyles, totalStyles, photoType);
    
    // Then enhance with additional PostHog metadata
    posthogService.trackCounterIncrement({
      generationId,
      totalGenerations: counterService.getTotalGenerations(),
      dailyGenerations: counterService.getDailyGenerations(),
      successfulStyles,
      totalStyles,
      successRate: totalStyles > 0 ? successfulStyles / totalStyles : 0,
      photoType,
      familyMemberCount: photoType === 'family' ? familyMemberCount : undefined,
      customPrompt: customPrompt.trim() || undefined,
      styles,
      timestamp: Date.now(),
    });
  };

  // Authentication handlers
  const handleLogin = (mode: 'signin' | 'signup' = 'signin') => {
    setLoginMode(mode);
    setShowLoginModal(true);
  };

  const handleLoginSuccess = (user: any) => {
    console.log('User logged in:', user);
    setShowLoginModal(false);
    // Show a brief success message or update UI
  };

  const handleSignOut = async () => {
    await signOut();
    setShowProfileModal(false);
  };

  // Purchase handler
  const handlePurchase = async (priceId: string, planId: string) => {
    if (!isAuthenticated || !user) {
      alert('Please sign in to purchase credits');
      return;
    }

    try {
      // Get current session for authorization
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        throw new Error('No valid session found');
      }

      // Create checkout session using Supabase Edge Function
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://ptgmobxrvptiahundusu.supabase.co';
      const apiUrl = `${supabaseUrl}/functions/v1/stripe-checkout`;
        
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY || ''
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
      alert(`Failed to start checkout: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  // Shared reset function for both desktop and mobile
  const resetState = () => {
    setSourceImageFile(null);
    setSourceImageUrl(null);
    setGeneratedContents(null);
    setError(null);
    setCurrentGenerationId(null);
    setCurrentStyles([]);
    setGenerationProgress([]);
  };

  // Mobile app initialization
  const handleSplashComplete = () => {
    setShowSplash(false);
    setAppReady(true);
  };

  // Check for payment success on page load
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const success = urlParams.get('success');
    const sessionId = urlParams.get('session_id');
    
    console.log('Checking URL params:', { success, sessionId, search: window.location.search });
    
    // Only show success page if we have BOTH success=true AND a valid session_id
    // Also ensure we haven't already processed this (prevent double-processing in React Strict Mode)
    if (success === 'true' && sessionId && sessionId.trim() !== '' && !showSuccessPage) {
      console.log('Payment success detected, showing success page');
      setShowSuccessPage(true);
      setSuccessSessionId(sessionId); // Store session ID for SuccessPage
      // Clear URL parameters immediately to prevent double processing
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (success === 'true' && (!sessionId || sessionId.trim() === '')) {
      console.warn('Success=true found but no session_id - payment may have failed');
      // Clear invalid parameters to prevent confusion
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [showSuccessPage]);

  // Handle escape key for upgrade modal
  useEffect(() => {
    const handleEscapeKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showUpgradePrompt) {
          setShowUpgradePrompt(false);
        }
      }
    };

    if (showUpgradePrompt) {
      document.addEventListener('keydown', handleEscapeKey);
      document.body.style.overflow = 'hidden';
      return () => {
        document.removeEventListener('keydown', handleEscapeKey);
        document.body.style.overflow = 'unset';
      };
    }
  }, [showUpgradePrompt]);

  // Initialize enhanced system and check compatibility
  useEffect(() => {
    const initializeEnhancedSystem = async () => {
      try {
        // Check if enhanced system is available
        const status = migrationUtils.getMigrationStatus();
        setMigrationStatus(status);
        setEnhancedSystemReady(status.migrationReady);
        
        console.log('🚀 Enhanced system status:', {
          ready: status.migrationReady,
          themes: status.themesValidated,
          errors: status.errors.length
        });
        
        // Try to dynamically load enhanced service if system is ready
        if (status.migrationReady) {
          try {
            // Note: Enhanced Gemini service temporarily disabled due to import issues
            // const enhancedModule = await import('./services/enhancedSecureGeminiService');
            // setEnhancedSecureGeminiService(enhancedModule.enhancedSecureGeminiService);
            console.log('⚠️ Enhanced Gemini service temporarily disabled due to import compatibility');
            setEnhancedSecureGeminiService(null);
          } catch (importError) {
            console.warn('⚠️ Failed to load enhanced Gemini service:', importError);
            setEnhancedSecureGeminiService(null);
          }
        }
        
        // Only use enhanced components if system is ready
        setUseEnhancedComponents(status.migrationReady && status.themesValidated > 0);
        
      } catch (error) {
        console.warn('Failed to initialize enhanced system:', error);
        setEnhancedSystemReady(false);
        setUseEnhancedComponents(false);
        setEnhancedSecureGeminiService(null);
      }
    };

    initializeEnhancedSystem();
  }, []);

  // Preload critical components on app mount and identify user
  useEffect(() => {
    preloadCriticalComponents();
    
    // Generate or retrieve user ID for analytics
    let userId = localStorage.getItem('wedai_user_id');
    if (!userId) {
      userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem('wedai_user_id', userId);
    }
    
    // Identify user in PostHog
    posthogService.identify(userId, {
      timestamp: Date.now(),
      source: 'app_load',
      userAgent: navigator.userAgent,
      screenWidth: window.screen.width,
      screenHeight: window.screen.height,
      devicePixelRatio: window.devicePixelRatio,
      language: navigator.language,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    });
  }, []);

  // Show success page if payment was successful
  if (showSuccessPage) {
    return (
      <SuccessPage
        sessionId={successSessionId}
        onComplete={() => {
          setShowSuccessPage(false);
          setSuccessSessionId(null);
          // Force refresh auth state and credits
          window.location.reload();
        }}
      />
    );
  }

  // Return mobile app experience for mobile devices - moved after all hooks
  if (isMobile && !appReady) {
    return (
      <SplashScreen
        onComplete={handleSplashComplete}
        minDuration={2000}
        showProgress={true}
      />
    );
  }

  if (isMobile && appReady) {
    return (
      <MobileApp 
        navigate={navigate}
        // Shared state
        sourceImageFile={sourceImageFile}
        sourceImageUrl={sourceImageUrl}
        generatedContents={generatedContents}
        isLoading={isLoading}
        error={error}
        customPrompt={customPrompt}
        currentGenerationId={currentGenerationId}
        photoType={photoType}
        familyMemberCount={familyMemberCount}
        showLimitModal={showLimitModal}
        showLoginModal={showLoginModal}
        showProfileModal={showProfileModal}
        loginMode={loginMode}
        // Shared handlers
        handleImageUpload={handleImageUpload}
        handleGenerate={handleGenerate}
        handleCustomPromptChange={handleCustomPromptChange}
        setPhotoType={setPhotoType}
        setFamilyMemberCount={setFamilyMemberCount}
        setShowLimitModal={setShowLimitModal}
        setShowLoginModal={setShowLoginModal}
        setShowProfileModal={setShowProfileModal}
        setLoginMode={setLoginMode}
        // Mobile-specific props
        stylesToGenerate={currentStyles}
        generationProgress={generationProgress}
        resetState={resetState}
      />
    );
  }

  




  const getMainClasses = () => {
    if (isMobile) {
      return "container mx-auto p-2 pb-8";
    }
    return "container mx-auto p-4 md:p-8";
  };

  return (
    <div className="bg-slate-50 dark:bg-gray-900 min-h-screen text-gray-900 dark:text-white font-sans flex flex-col transition-colors duration-300"
         data-theme={theme}>
      {/* Mobile Network Status Indicator */}
      <NetworkStatus />
      
      {/* Simple Clean Header */}
      <SimpleHeader 
        onLogin={handleLogin}
        onProfile={() => setShowProfileModal(true)}
        onHelp={() => setShowHelpModal(true)}
        onSettings={() => setShowSettingsModal(true)}
      />
      
      <main className={getMainClasses()}>
        <div className={isMobile ? "space-y-4" : "space-y-8"}>
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
          
          <SuspenseImageUploader 
            onImageUpload={handleImageUpload} 
            sourceImageUrl={sourceImageUrl} 
          />

          {sourceImageUrl && (
            <div>
              
              {/* Use Enhanced or Legacy Prompt Input */}
              {useEnhancedComponents && enhancedSystemReady ? (
                <EnhancedComponentErrorBoundary
                  componentName="EnhancedPromptInput"
                  fallback={
                    <SuspensePromptInput 
                      onSubmit={handleGenerate} 
                      isLoading={isLoading}
                      customPrompt={customPrompt}
                      onCustomPromptChange={handleCustomPromptChange}
                    />
                  }
                  onError={(error) => {
                    console.warn('Enhanced prompt input failed, falling back to legacy:', error);
                    setUseEnhancedComponents(false);
                  }}
                >
                  <EnhancedPromptInput
                    onSubmit={handleEnhancedGenerate}
                    isLoading={isLoading}
                    customPrompt={customPrompt}
                    onCustomPromptChange={handleCustomPromptChange}
                  />
                </EnhancedComponentErrorBoundary>
              ) : (
                <SuspensePromptInput 
                  onSubmit={handleGenerate} 
                  isLoading={isLoading}
                  customPrompt={customPrompt}
                  onCustomPromptChange={handleCustomPromptChange}
                />
              )}
            </div>
          )}

          {isLoading && (
            <Loader 
              message={
                isSlowConnection && isMobile 
                  ? "Creating portraits one by one for better performance..." 
                  : "Our AI is crafting 3 unique wedding portraits from 10 amazing styles..."
              } 
            />
          )}

          {error && (
            <div className={`
              text-center p-4 rounded-lg mx-auto transition-colors duration-300
              ${isMobile ? 'max-w-full' : 'max-w-2xl'}
              ${error.includes('Daily API limit') || error.includes('quota') || error.includes('popular today') 
                ? 'bg-amber-50 dark:bg-amber-900/20 border border-amber-300 dark:border-amber-700 text-amber-800 dark:text-amber-200'
                : 'bg-red-50 dark:bg-red-900 border border-red-300 dark:border-red-700 text-red-800 dark:text-red-300'
              }
            `}>
              <div className="flex items-center justify-center gap-2 mb-2">
                {error.includes('Daily API limit') || error.includes('quota') || error.includes('popular today') ? (
                  <>
                    <span className="text-lg">⏰</span>
                    <strong>High Demand Alert</strong>
                  </>
                ) : (
                  <>
                    <span className="text-lg">⚠️</span>
                    <strong>Generation Issue</strong>
                  </>
                )}
              </div>
              
              {error.includes('Some portrait styles could not be generated') ? (
                <div>
                  <p className={`${isMobile ? 'text-sm' : ''} mb-2`}>
                    Some wedding styles hit our daily limits, but others succeeded! 
                  </p>
                  <p className={`text-xs ${isMobile ? 'text-xs' : 'text-sm'} opacity-75`}>
                    💡 <strong>What you can do:</strong> Download the successful portraits above, or try again tomorrow when limits reset.
                  </p>
                </div>
              ) : (
                <p className={isMobile ? 'text-sm mt-1' : ''}>{error}</p>
              )}
              
              {!isOnline && (
                <p className="text-xs mt-2 opacity-75">
                  📡 Check your internet connection and try again.
                </p>
              )}
              
              {(error.includes('Daily API limit') || error.includes('quota')) && (
                <div className="mt-3 text-xs opacity-75">
                  <p>🔄 Limits reset daily at midnight PT</p>
                  <p>🚀 Your app's popularity is growing fast!</p>
                </div>
              )}
            </div>
          )}

          {generatedContents && (
            <div>
              {/* Use Enhanced or Legacy Image Display */}
              {useEnhancedComponents && enhancedSystemReady ? (
                <EnhancedComponentErrorBoundary
                  componentName="EnhancedImageDisplay"
                  fallback={
                    <SuspenseImageDisplay 
                      contents={generatedContents} 
                      generationId={currentGenerationId}
                      photoType={photoType}
                      familyMemberCount={familyMemberCount}
                    />
                  }
                  onError={(error) => {
                    console.warn('Enhanced image display failed, falling back to legacy:', error);
                    // Don't disable enhanced components globally for display issues
                  }}
                >
                  <EnhancedImageDisplay
                    contents={generatedContents}
                    generationId={currentGenerationId}
                    photoType={photoType}
                    familyMemberCount={familyMemberCount}
                    generationProgress={generationProgress}
                  />
                </EnhancedComponentErrorBoundary>
              ) : (
                <SuspenseImageDisplay 
                  contents={generatedContents} 
                  generationId={currentGenerationId}
                  photoType={photoType}
                  familyMemberCount={familyMemberCount}
                />
              )}
            </div>
          )}

          {/* Upgrade Prompt or How it works - only show when no image uploaded */}
          {!sourceImageUrl && !isLoading && (() => {
            const usageStats = rateLimiter.getUsageStats();
            
            // Show upgrade prompt if user has used 5+ portraits
            if (usageStats.used >= 5) {
              return (
                <div className="max-w-2xl mx-auto mt-12">
                  <UpgradePrompt 
                    variant="card"
                    onJoinWaitlist={() => setShowLimitModal(true)}
                    onShowPricing={() => setShowPricingModal(true)}
                  />
                </div>
              );
            }
            
            // Show how it works for new users
            return (
              <div className="max-w-4xl mx-auto mt-12 p-8 bg-white/60 dark:bg-gray-800/40 rounded-3xl border border-gray-200/50 dark:border-gray-700/50 backdrop-blur-sm shadow-xl transition-colors duration-300">
                <h3 className="text-2xl font-bold text-center mb-8 text-gray-900 dark:text-white transition-colors duration-300">How It Works</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="text-center">
                  <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-teal-500 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                    <span className="text-2xl">📸</span>
                  </div>
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-3 text-lg transition-colors duration-300">1. Upload Photo</h4>
                  <p className="text-gray-600 dark:text-gray-300 transition-colors duration-300">Upload a clear photo of you and your partner together</p>
                </div>
                <div className="text-center">
                  <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-teal-500 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                    <span className="text-2xl">✨</span>
                  </div>
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-3 text-lg transition-colors duration-300">2. AI Magic</h4>
                  <p className="text-gray-600 dark:text-gray-300 transition-colors duration-300">Our AI generates 3 unique wedding portraits from 12 beautiful styles</p>
                </div>
                <div className="text-center">
                  <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-teal-500 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                    <span className="text-2xl">💕</span>
                  </div>
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-3 text-lg transition-colors duration-300">3. Download & Share</h4>
                  <p className="text-gray-600 dark:text-gray-300 transition-colors duration-300">Save your magical portraits and share them with loved ones</p>
                </div>
              </div>
              
              {/* Theme Examples */}
              <div className="mt-8 pt-8 border-t border-gray-200/50 dark:border-gray-700/50">
                <h4 className="font-semibold text-center text-gray-900 dark:text-white mb-4 transition-colors duration-300">12 Amazing Wedding Themes</h4>
                <div className="flex flex-wrap justify-center gap-2 text-sm">
                  <span className="px-3 py-1 bg-gradient-to-r from-blue-500/10 to-teal-500/10 text-gray-700 dark:text-gray-300 rounded-full">Classic & Timeless</span>
                  <span className="px-3 py-1 bg-gradient-to-r from-blue-500/10 to-teal-500/10 text-gray-700 dark:text-gray-300 rounded-full">Rustic Barn</span>
                  <span className="px-3 py-1 bg-gradient-to-r from-blue-500/10 to-teal-500/10 text-gray-700 dark:text-gray-300 rounded-full">Bohemian Beach</span>
                  <span className="px-3 py-1 bg-gradient-to-r from-blue-500/10 to-teal-500/10 text-gray-700 dark:text-gray-300 rounded-full">Vintage Victorian</span>
                  <span className="px-3 py-1 bg-gradient-to-r from-blue-500/10 to-teal-500/10 text-gray-700 dark:text-gray-300 rounded-full">Modern Minimalist</span>
                  <span className="px-3 py-1 bg-gradient-to-r from-blue-500/10 to-teal-500/10 text-gray-700 dark:text-gray-300 rounded-full">Fairytale Castle</span>
                  <span className="px-3 py-1 bg-gradient-to-r from-blue-500/10 to-teal-500/10 text-gray-700 dark:text-gray-300 rounded-full">Enchanted Forest</span>
                  <span className="px-3 py-1 bg-gradient-to-r from-blue-500/10 to-teal-500/10 text-gray-700 dark:text-gray-300 rounded-full">Disco 70s Glam</span>
                  <span className="px-3 py-1 bg-gradient-to-r from-blue-500/10 to-teal-500/10 text-gray-700 dark:text-gray-300 rounded-full">Tropical Paradise</span>
                  <span className="px-3 py-1 bg-gradient-to-r from-blue-500/10 to-teal-500/10 text-gray-700 dark:text-gray-300 rounded-full">Hollywood Red Carpet</span>
                  <span className="px-3 py-1 bg-gradient-to-r from-blue-500/10 to-teal-500/10 text-gray-700 dark:text-gray-300 rounded-full">Japanese Cherry Blossom</span>
                  <span className="px-3 py-1 bg-gradient-to-r from-blue-500/10 to-teal-500/10 text-gray-700 dark:text-gray-300 rounded-full">Steampunk Victorian</span>
                </div>
              </div>
            </div>
            );
          })()}

          {/* Buy More Credits - Show for authenticated users at bottom */}
          {isAuthenticated && user && (
            <div className="mt-12 max-w-3xl mx-auto">
              <UpgradePrompt 
                variant="banner"
                onJoinWaitlist={() => setShowLimitModal(true)}
                onShowPricing={() => setShowPricingModal(true)}
              />
            </div>
          )}
        </div>
      </main>
      
      {/* Simple Clean Footer */}
      <SimpleFooter navigate={navigate} />
      
      {/* PWA Install Prompt */}
      <PWAInstallPrompt />
      
      {/* Rate Limit Toast */}
      <RateLimitToast />
      
      {/* Performance Monitor (debug mode only) */}
      <PerformanceMonitor />
      
      {/* Maintenance Mode - Overlay when active */}
      <MaintenanceBanner variant="overlay" />
      
      {/* Maintenance Toggle - Admin control */}
      <MaintenanceToggle />
      
      {/* Rate Limit Modal */}
      <LimitReachedModal 
        isOpen={showLimitModal}
        onClose={() => setShowLimitModal(false)}
        onPurchase={handlePurchase}
        onShowLoginModal={(mode) => {
          setLoginMode(mode);
          setShowLoginModal(true);
        }}
      />
      
      {/* Upgrade Prompt Modal */}
      {showUpgradePrompt && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-40 p-4 animate-in fade-in duration-200"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowUpgradePrompt(false);
            }
          }}
        >
          <div 
            className="max-w-md w-full animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <UpgradePrompt 
              variant="card"
              showClose={true}
              onClose={() => setShowUpgradePrompt(false)}
              onJoinWaitlist={() => setShowLimitModal(true)}
              onShowPricing={() => setShowPricingModal(true)}
            />
          </div>
        </div>
      )}
      
      {/* Login Modal */}
      <LoginModal 
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        onSuccess={handleLoginSuccess}
        defaultMode={loginMode}
        title={loginMode === 'signup' ? 'Create Account' : undefined}
        subtitle={loginMode === 'signup' ? 'Join to unlock unlimited portraits' : undefined}
      />
      
      {/* User Profile Modal */}
      {user && (
        <UserProfile
          isOpen={showProfileModal}
          onClose={() => setShowProfileModal(false)}
          user={user}
          onSignOut={handleSignOut}
        />
      )}

      {/* Pricing Modal */}
      <PricingModal
        isOpen={showPricingModal}
        onClose={() => setShowPricingModal(false)}
        onPurchase={handlePurchase}
        user={user}
        isAuthenticated={isAuthenticated}
      />

      {/* Help & Support Modal */}
      <HelpSupportModal
        isOpen={showHelpModal}
        onClose={() => setShowHelpModal(false)}
      />

      {/* Settings Modal */}
      <SettingsModal
        isOpen={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
      />
    </div>
  );
}

export default App;