import React, { useState } from 'react';
import Header from './components/Header';
import ImageUploader from './components/ImageUploader';
import PromptInput from './components/PromptInput';
import ImageDisplay from './components/ImageDisplay';
import Loader from './components/Loader';
import { editImageWithNanoBanana } from './services/geminiService';
import { GeneratedContent } from './types';

const STYLES_TO_GENERATE = [
  "Classic & Timeless Wedding",
  "Rustic Barn Wedding",
  "Bohemian Beach Wedding",
];

function App() {
  const [sourceImageFile, setSourceImageFile] = useState<File | null>(null);
  const [sourceImageUrl, setSourceImageUrl] = useState<string | null>(null);
  const [generatedContents, setGeneratedContents] = useState<GeneratedContent[] | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [customPrompt, setCustomPrompt] = useState<string>('');

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

    setIsLoading(true);
    setError(null);
    setGeneratedContents(null);

    try {
      const generationPromises = STYLES_TO_GENERATE.map(style => {
        const prompt = `Transform the couple in the image into a beautiful wedding portrait with a "${style}" theme. ${customPrompt}. Make them look like they are dressed for a wedding in that style.`;
        return editImageWithNanoBanana(sourceImageFile, prompt)
                 .then(content => ({ ...content, style }));
      });
      
      const results = await Promise.allSettled(generationPromises);

      const finalContents = results.map((result, index) => {
        if (result.status === 'fulfilled') {
          return result.value;
        } else {
          console.error(`Error generating style "${STYLES_TO_GENERATE[index]}":`, result.reason);
          return {
            imageUrl: null,
            text: result.reason instanceof Error ? result.reason.message : 'An unknown error occurred.',
            style: STYLES_TO_GENERATE[index],
          };
        }
      });
      
      setGeneratedContents(finalContents);

      if (results.some(r => r.status === 'rejected')) {
        setError("Some portrait styles could not be generated. Please check the console for details.");
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

  return (
    <div className="bg-gray-900 min-h-screen text-white font-sans">
      <Header />
      <main className="container mx-auto p-4 md:p-8">
        <div className="space-y-8">
          <ImageUploader onImageUpload={handleImageUpload} sourceImageUrl={sourceImageUrl} />

          {sourceImageUrl && (
            <PromptInput 
              onSubmit={handleGenerate} 
              isLoading={isLoading}
              customPrompt={customPrompt}
              onCustomPromptChange={setCustomPrompt}
            />
          )}

          {isLoading && <Loader message="Our AI is crafting three magical portraits..." />}

          {error && (
            <div className="text-center p-4 bg-red-900 border border-red-700 text-red-300 rounded-lg max-w-2xl mx-auto">
              <p><strong>Oops! Something went wrong.</strong></p>
              <p>{error}</p>
            </div>
          )}

          {generatedContents && <ImageDisplay contents={generatedContents} />}
        </div>
      </main>
      <footer className="text-center p-4 mt-8 text-gray-500 text-sm">
        <p>Powered by Google Gemini. For entertainment purposes only.</p>
      </footer>
    </div>
  );
}

export default App;