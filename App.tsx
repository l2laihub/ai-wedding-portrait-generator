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
  preloadCriticalComponents
} from './components/LazyComponents';
import { editImageWithNanoBanana } from './services/geminiService';
import { GeneratedContent } from './types';
import { useViewport } from './hooks/useViewport';
import { useNetworkStatus } from './hooks/useNetworkStatus';

const ALL_WEDDING_STYLES = [
  "Classic & Timeless Wedding",
  "Rustic Barn Wedding", 
  "Bohemian Beach Wedding",
  "Vintage Victorian Wedding",
  "Modern Minimalist Wedding",
  "Fairytale Castle Wedding"
];

// Function to get 3 random wedding styles for each generation
const getRandomWeddingStyles = () => {
  const shuffled = [...ALL_WEDDING_STYLES].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, 3);
};

function App() {
  const [sourceImageFile, setSourceImageFile] = useState<File | null>(null);
  const [sourceImageUrl, setSourceImageUrl] = useState<string | null>(null);
  const [generatedContents, setGeneratedContents] = useState<GeneratedContent[] | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [customPrompt, setCustomPrompt] = useState<string>('');
  
  const { isMobile } = useViewport();
  const { isSlowConnection, isOnline } = useNetworkStatus();
  const { theme } = useTheme();

  // Preload critical components on app mount
  useEffect(() => {
    preloadCriticalComponents();
  }, []);

  const handleImageUpload = (file: File) => {
    setSourceImageFile(file);
    setSourceImageUrl(URL.createObjectURL(file));
    setGeneratedContents(null); // Clear previous results
    setError(null);
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

    try {
      // Get 3 random wedding styles for this generation
      const stylesToGenerate = getRandomWeddingStyles();
      
      // Adjust generation strategy for slow connections
      const generateSequentially = isSlowConnection && isMobile;
      
      if (generateSequentially) {
        // Generate one at a time to reduce network load
        const finalContents: GeneratedContent[] = [];
        
        for (let i = 0; i < stylesToGenerate.length; i++) {
          const style = stylesToGenerate[i];
          const prompt = `Transform the couple in the image into a beautiful wedding portrait with a "${style}" theme. ${customPrompt}. Make them look like they are dressed for a wedding in that style.`;
          
          try {
            const content = await editImageWithNanoBanana(sourceImageFile, prompt);
            finalContents.push({ ...content, style });
          } catch (err) {
            console.error(`Error generating style "${style}":`, err);
            finalContents.push({
              imageUrl: null,
              text: err instanceof Error ? err.message : 'An unknown error occurred.',
              style,
            });
          }
          
          // Update UI with partial results for better UX
          setGeneratedContents([...finalContents]);
        }
      } else {
        // Generate all styles concurrently (original behavior)
        const generationPromises = stylesToGenerate.map(style => {
          const prompt = `Transform the couple in the image into a beautiful wedding portrait with a "${style}" theme. ${customPrompt}. Make them look like they are dressed for a wedding in that style.`;
          return editImageWithNanoBanana(sourceImageFile, prompt)
                   .then(content => ({ ...content, style }));
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

        if (results.some(r => r.status === 'rejected')) {
          setError("Some portrait styles could not be generated. Please check the console for details.");
        }
      }

    } catch (err) {
      // This outer catch is for logic errors, not the API calls themselves
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("An unexpected error occurred during the generation process.");
      }
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
          <SuspenseImageUploader 
            onImageUpload={handleImageUpload} 
            sourceImageUrl={sourceImageUrl} 
          />

          {sourceImageUrl && (
            <SuspensePromptInput 
              onSubmit={handleGenerate} 
              isLoading={isLoading}
              customPrompt={customPrompt}
              onCustomPromptChange={setCustomPrompt}
            />
          )}

          {isLoading && (
            <Loader 
              message={
                isSlowConnection && isMobile 
                  ? "Creating portraits one by one for better performance..." 
                  : "Our AI is crafting 3 unique wedding portraits from 6 amazing styles..."
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
            <SuspenseImageDisplay contents={generatedContents} />
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
                  <p className="text-gray-600 dark:text-gray-300 transition-colors duration-300">Our AI generates 3 unique wedding portraits from 6 beautiful styles</p>
                </div>
                <div className="text-center">
                  <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-teal-500 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                    <span className="text-2xl">💕</span>
                  </div>
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-3 text-lg transition-colors duration-300">3. Download & Share</h4>
                  <p className="text-gray-600 dark:text-gray-300 transition-colors duration-300">Save your magical portraits and share them with loved ones</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
      
      {/* Simple Clean Footer */}
      <SimpleFooter />
      
      {/* PWA Install Prompt */}
      <PWAInstallPrompt />
      
      {/* Performance Monitor (debug mode only) */}
      <PerformanceMonitor />
    </div>
  );
}

export default App;