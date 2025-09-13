import React, { useState, useEffect } from 'react';
import SimpleHeader from './components/SimpleHeader';
import SimpleFooter from './components/SimpleFooter';
import Loader from './components/Loader';
import PWAInstallPrompt from './components/PWAInstallPrompt';
import { NetworkStatus, PerformanceMonitor } from './components/MobileEnhancements';
import { useTheme } from './hooks/useTheme';
import { 
  SuspenseImageUploader, 
  SuspenseImageDisplay, 
  SuspensePromptInput,
  SuspensePhotoTypeSelector,
  preloadCriticalComponents
} from './components/LazyComponents';
import { editImageWithNanoBanana } from './services/geminiService';
import { GeneratedContent } from './types';
import { useViewport } from './hooks/useViewport';
import { useNetworkStatus } from './hooks/useNetworkStatus';
import { posthogService } from './services/posthogService';
import { counterService } from './services/counterService';
// import { useAppFeatureFlags, FEATURE_FLAGS } from './hooks/useFeatureFlags';

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
  "Winter Wonderland Wedding",
  "Gothic Romance Wedding",
  "Starry Night Galaxy Wedding",
  "Japanese Cherry Blossom Wedding",
  "Mediterranean Villa Wedding",
  "Steampunk Victorian Wedding",
  "Disco 70s Glam Wedding",
  "Hollywood Red Carpet Wedding",
  "Underwater Mermaid Wedding",
  "Desert Oasis Wedding",
  "Harry Potter Wizarding Wedding"
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
    "Gatsby Art Deco Wedding": "glamorous 1920s pose, jazz hands, flapper dress with pearls, champagne glass",
    "Tropical Paradise Wedding": "playful pose with tropical flowers, vibrant colors, beach resort background",
    // "Winter Wonderland Wedding": "elegant pose in faux fur wrap, snowy backdrop, ice queen stance",
    // "Gothic Romance Wedding": "dramatic pose with dark elegance, cathedral background, mysterious allure",
    // "Starry Night Galaxy Wedding": "dreamy pose under stars, cosmic dress effects, celestial goddess stance",
    // "Japanese Cherry Blossom Wedding": "graceful pose under sakura trees, traditional elements, serene expression",
    // "Mediterranean Villa Wedding": "romantic pose on terrace, flowing dress, sunset golden hour lighting",
    // "Steampunk Victorian Wedding": "adventurous pose with gears and goggles, corset dress, vintage machinery",
    // "Disco 70s Glam Wedding": "dancing pose with platform shoes, bell sleeves, groovy peace sign gesture",
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
  const [familyMemberCount, setFamilyMemberCount] = useState<number>(4);
  
  const { isMobile } = useViewport();
  const { isSlowConnection, isOnline } = useNetworkStatus();
  const { theme } = useTheme();
  // Temporarily disable feature flags to prevent race conditions
  // const { flags: featureFlags } = useAppFeatureFlags();
  const featureFlags = { enable_sequential_generation: false };

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

  const handleGenerate = async () => {
    if (!sourceImageFile) {
      setError("Please upload an image first.");
      return;
    }

    if (!isOnline) {
      setError("Please check your internet connection and try again.");
      return;
    }

    setIsLoading(true);
    setError(null);
    setGeneratedContents(null);

    // Generate unique ID for this generation session
    const generationId = `gen_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    setCurrentGenerationId(generationId);

    try {
      // Get 3 random wedding styles for this generation
      const stylesToGenerate = getRandomWeddingStyles();
      
      // Track generation started
      posthogService.trackGenerationStarted(generationId, {
        styles: stylesToGenerate,
        customPrompt: customPrompt || undefined,
        generationId,
        timestamp: Date.now(),
        photoType,
        familyMemberCount: photoType === 'family' ? familyMemberCount : undefined,
      });
      
      // Adjust generation strategy for slow connections or feature flag
      const generateSequentially = (isSlowConnection && isMobile) || featureFlags.enable_sequential_generation;
      
      if (generateSequentially) {
        // Generate one at a time to reduce network load
        const finalContents: GeneratedContent[] = [];
        for (let i = 0; i < stylesToGenerate.length; i++) {
          const style = stylesToGenerate[i];
          // image prompts are long, so we track each style generation separately
          const prompt = photoType === 'single'
            ? `Transform the person into a FULL BODY wedding portrait with a "${style}" theme. Create a professional bridal/groom portrait showing them in ${getStylePose(style)}. Keep their face EXACTLY identical to the original - preserve ALL facial features, expressions, and complete likeness. Show the complete wedding outfit from head to toe, including dress/suit details, shoes, and accessories. The subject should be in a flattering, professional modeling pose appropriate for the wedding style. ${customPrompt}. Ensure their face remains perfectly consistent and unchanged from the original photo while creating a stunning full-length portrait.`
            : photoType === 'couple' 
            ? `Transform the couple in the image into a beautiful wedding portrait with a "${style}" theme. Keep their faces EXACTLY identical to the original - preserve their facial features, expressions, and likeness completely. Maintain the subjects' identity while transforming only their clothing and background to match the wedding style. ${customPrompt}. Make them look like they are dressed for a wedding in that style, but ensure their faces remain perfectly consistent and unchanged from the original photo.`
            : `${numberToWord(familyMemberCount)} people family photo: Transform this family into a beautiful wedding portrait with a "${style}" theme. Crucially, preserve the exact likeness of EACH and EVERY family member's face and unique facial features. Only transform their clothing and the environment. Ensure all ${numberToWord(familyMemberCount)} individuals from the original photo are present and their identity is clearly recognizable. ${customPrompt}`;
          
          try {
            const styleStartTime = Date.now();
            const content = await editImageWithNanoBanana(sourceImageFile, prompt);
            const styleDuration = Date.now() - styleStartTime;
            
            // Track successful style generation
            posthogService.trackStyleGenerated({
              style,
              generationId,
              duration: styleDuration,
              success: true,
            });
            
            finalContents.push({ ...content, style });
          } catch (err) {
            const styleDuration = Date.now() - (Date.now() - 1000); // Approximate
            console.error(`Error generating style "${style}":`, err);
            
            // Track failed style generation
            posthogService.trackStyleGenerated({
              style,
              generationId,
              duration: styleDuration,
              success: false,
              error: err instanceof Error ? err.message : 'Unknown error',
            });
            
            finalContents.push({
              imageUrl: null,
              text: err instanceof Error ? err.message : 'An unknown error occurred.',
              style,
            });
          }
          
          // Update UI with partial results for better UX
          setGeneratedContents([...finalContents]);
        }
        
        // Track generation completed for sequential mode
        const successfulStyles = finalContents.filter(c => c.imageUrl !== null).map(c => c.style);
        const failedStyles = finalContents.filter(c => c.imageUrl === null).map(c => c.style);
        posthogService.trackGenerationCompleted(generationId, successfulStyles, failedStyles);
        
        // Increment counter for successful generation
        counterService.incrementCounter(
          generationId, 
          successfulStyles.length, 
          stylesToGenerate.length,
          photoType
        );
      } else {
        // Generate all styles concurrently (original behavior)
        const generationPromises = stylesToGenerate.map(style => {
          const styleStartTime = Date.now();
          const prompt = photoType === 'single'
            ? `Transform the person into a FULL BODY wedding portrait with a "${style}" theme. Create a professional bridal/groom portrait showing them in ${getStylePose(style)}. Keep their face EXACTLY identical to the original - preserve ALL facial features, expressions, and complete likeness. Show the complete wedding outfit from head to toe, including dress/suit details, shoes, and accessories. The subject should be in a flattering, professional modeling pose appropriate for the wedding style. ${customPrompt}. Ensure their face remains perfectly consistent and unchanged from the original photo while creating a stunning full-length portrait.`
            : photoType === 'couple' 
            ? `Transform the couple in the image into a beautiful wedding portrait with a "${style}" theme. Keep their faces EXACTLY identical to the original - preserve their facial features, expressions, and likeness completely. Maintain the subjects' identity while transforming only their clothing and background to match the wedding style. ${customPrompt}. Make them look like they are dressed for a wedding in that style, but ensure their faces remain perfectly consistent and unchanged from the original photo.`
            : `${numberToWord(familyMemberCount)} people family photo: Transform this family into a beautiful wedding portrait with a "${style}" theme. Crucially, preserve the exact likeness of EACH and EVERY family member's face and unique facial features. Only transform their clothing and the environment. Ensure all ${numberToWord(familyMemberCount)} individuals from the original photo are present and their identity is clearly recognizable. ${customPrompt}`;
          
          return editImageWithNanoBanana(sourceImageFile, prompt)
            .then(content => {
              const styleDuration = Date.now() - styleStartTime;
              
              // Track successful style generation
              posthogService.trackStyleGenerated({
                style,
                generationId,
                duration: styleDuration,
                success: true,
              });
              
              return { ...content, style };
            })
            .catch(err => {
              const styleDuration = Date.now() - styleStartTime;
              
              // Track failed style generation
              posthogService.trackStyleGenerated({
                style,
                generationId,
                duration: styleDuration,
                success: false,
                error: err instanceof Error ? err.message : 'Unknown error',
              });
              
              throw err;
            });
        });
        
        const results = await Promise.allSettled(generationPromises);

        const finalContents = results.map((result, index) => {
          if (result.status === 'fulfilled') {
            return result.value;
          } else {
            console.error(`Error generating style "${stylesToGenerate[index]}":`, result.reason);
            return {
              imageUrl: null,
              text: result.reason instanceof Error ? result.reason.message : 'An unknown error occurred.',
              style: stylesToGenerate[index],
            };
          }
        });
        
        setGeneratedContents(finalContents);
        
        // Track generation completed for concurrent mode
        const successfulStyles = results
          .filter((result, index) => result.status === 'fulfilled')
          .map((_, index) => stylesToGenerate[index]);
        const failedStyles = results
          .filter((result, index) => result.status === 'rejected')
          .map((_, index) => stylesToGenerate[index]);
        posthogService.trackGenerationCompleted(generationId, successfulStyles, failedStyles);
        
        // Increment counter for successful generation
        counterService.incrementCounter(
          generationId, 
          successfulStyles.length, 
          stylesToGenerate.length,
          photoType
        );

        if (results.some(r => r.status === 'rejected')) {
          setError("Some portrait styles could not be generated. Please check the console for details.");
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
      <SimpleHeader />
      
      <main className={getMainClasses()}>
        <div className={isMobile ? "space-y-4" : "space-y-8"}>
          <SuspensePhotoTypeSelector
            photoType={photoType}
            onPhotoTypeChange={setPhotoType}
            familyMemberCount={familyMemberCount}
            onFamilyMemberCountChange={setFamilyMemberCount}
          />
          
          <SuspenseImageUploader 
            onImageUpload={handleImageUpload} 
            sourceImageUrl={sourceImageUrl} 
          />

          {sourceImageUrl && (
            <SuspensePromptInput 
              onSubmit={handleGenerate} 
              isLoading={isLoading}
              customPrompt={customPrompt}
              onCustomPromptChange={handleCustomPromptChange}
            />
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
              text-center p-4 bg-red-50 dark:bg-red-900 border border-red-300 dark:border-red-700 
              text-red-800 dark:text-red-300 rounded-lg mx-auto transition-colors duration-300
              ${isMobile ? 'max-w-full' : 'max-w-2xl'}
            `}>
              <p><strong>Oops! Something went wrong.</strong></p>
              <p className={isMobile ? 'text-sm mt-1' : ''}>{error}</p>
              {!isOnline && (
                <p className="text-xs mt-2 opacity-75">
                  Check your internet connection and try again.
                </p>
              )}
            </div>
          )}

          {generatedContents && (
            <SuspenseImageDisplay contents={generatedContents} generationId={currentGenerationId} />
          )}

          {/* How it works - only show when no image uploaded */}
          {!sourceImageUrl && !isLoading && (
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
                  <p className="text-gray-600 dark:text-gray-300 transition-colors duration-300">Our AI generates 3 unique wedding portraits from 10 beautiful styles</p>
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
                <h4 className="font-semibold text-center text-gray-900 dark:text-white mb-4 transition-colors duration-300">10 Amazing Wedding Themes</h4>
                <div className="flex flex-wrap justify-center gap-2 text-sm">
                  <span className="px-3 py-1 bg-gradient-to-r from-blue-500/10 to-teal-500/10 text-gray-700 dark:text-gray-300 rounded-full">Classic & Timeless</span>
                  <span className="px-3 py-1 bg-gradient-to-r from-blue-500/10 to-teal-500/10 text-gray-700 dark:text-gray-300 rounded-full">Rustic Barn</span>
                  <span className="px-3 py-1 bg-gradient-to-r from-blue-500/10 to-teal-500/10 text-gray-700 dark:text-gray-300 rounded-full">Bohemian Beach</span>
                  <span className="px-3 py-1 bg-gradient-to-r from-blue-500/10 to-teal-500/10 text-gray-700 dark:text-gray-300 rounded-full">Vintage Victorian</span>
                  <span className="px-3 py-1 bg-gradient-to-r from-blue-500/10 to-teal-500/10 text-gray-700 dark:text-gray-300 rounded-full">Modern Minimalist</span>
                  <span className="px-3 py-1 bg-gradient-to-r from-blue-500/10 to-teal-500/10 text-gray-700 dark:text-gray-300 rounded-full">Fairytale Castle</span>
                  <span className="px-3 py-1 bg-gradient-to-r from-blue-500/10 to-teal-500/10 text-gray-700 dark:text-gray-300 rounded-full">Enchanted Forest</span>
                  <span className="px-3 py-1 bg-gradient-to-r from-blue-500/10 to-teal-500/10 text-gray-700 dark:text-gray-300 rounded-full">Gatsby Art Deco</span>
                  <span className="px-3 py-1 bg-gradient-to-r from-blue-500/10 to-teal-500/10 text-gray-700 dark:text-gray-300 rounded-full">Tropical Paradise</span>
                  <span className="px-3 py-1 bg-gradient-to-r from-blue-500/10 to-teal-500/10 text-gray-700 dark:text-gray-300 rounded-full">Hollywood Red Carpet</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
      
      {/* Simple Clean Footer */}
      <SimpleFooter navigate={navigate} />
      
      {/* PWA Install Prompt */}
      <PWAInstallPrompt />
      
      {/* Performance Monitor (debug mode only) */}
      <PerformanceMonitor />
    </div>
  );
}

export default App;