
import { GoogleGenAI, Modality, GenerateContentResponse } from "@google/genai";
import { GeneratedContent } from '../types';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });

const fileToBase64 = (file: File): Promise<{ base64: string; mimeType: string }> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      const [header, data] = result.split(',');
      const mimeType = header.match(/:(.*?);/)?.[1] || 'application/octet-stream';
      resolve({ base64: data, mimeType });
    };
    reader.onerror = error => reject(error);
  });
};

export const editImageWithNanoBanana = async (
  imageFile: File,
  prompt: string,
  retryCount: number = 0
): Promise<GeneratedContent> => {
  const maxRetries = 2;
  
  try {
    const { base64, mimeType } = await fileToBase64(imageFile);

    const imagePart = {
      inlineData: {
        data: base64,
        mimeType: mimeType,
      },
    };

    const textPart = {
      text: prompt,
    };

    const response: GenerateContentResponse = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image-preview',
      contents: {
        parts: [imagePart, textPart],
      },
      config: {
        responseModalities: [Modality.IMAGE, Modality.TEXT],
      },
    });

    const generatedContent: GeneratedContent = {
      imageUrl: null,
      text: null,
    };

    if (response.candidates && response.candidates.length > 0) {
      for (const part of response.candidates[0].content.parts) {
        if (part.text) {
          generatedContent.text = part.text;
        } else if (part.inlineData) {
          const base64ImageBytes: string = part.inlineData.data;
          generatedContent.imageUrl = `data:${part.inlineData.mimeType};base64,${base64ImageBytes}`;
        }
      }
    }
    
    if (!generatedContent.imageUrl) {
        throw new Error("API did not return an image. It may have considered the prompt unsafe.");
    }

    return generatedContent;
  } catch (error: any) {
    console.error(`Error editing image (attempt ${retryCount + 1}):`, error);
    
    // Extract error details for better handling
    let errorCode = null;
    let errorMessage = '';
    
    // Handle structured API error responses
    if (error.error) {
      errorCode = error.error.code;
      errorMessage = error.error.message || '';
    } else if (error.message) {
      errorMessage = error.message;
    }
    
    const lowerErrorMessage = errorMessage.toLowerCase();
    
    // Handle different types of errors
    if (errorCode === 429 || lowerErrorMessage.includes('quota') || lowerErrorMessage.includes('rate limit')) {
      throw new Error("⏰ Daily API limit reached! Our service is very popular today. Please try again tomorrow or check back later.");
    }
    
    if (lowerErrorMessage.includes('unsafe') || lowerErrorMessage.includes('blocked')) {
      throw new Error("🛡️ Content safety check: Please try with a different photo or ensure it shows people clearly.");
    }
    
    // Handle 500 Internal Server Errors with retry logic
    if (errorCode === 500 || lowerErrorMessage.includes('internal error')) {
      if (retryCount < maxRetries) {
        console.log(`Retrying due to internal server error (attempt ${retryCount + 1}/${maxRetries})`);
        // Wait briefly before retry (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, retryCount) * 1000));
        return editImageWithNanoBanana(imageFile, prompt, retryCount + 1);
      } else {
        throw new Error("🔄 Server temporarily unavailable. The AI service is experiencing high demand. Please try again in a few moments.");
      }
    }
    
    // Network/connection issues
    if (lowerErrorMessage.includes('network') || lowerErrorMessage.includes('timeout') || lowerErrorMessage.includes('connection')) {
      if (retryCount < maxRetries) {
        console.log(`Retrying due to network issue (attempt ${retryCount + 1}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, 2000)); // 2 second delay
        return editImageWithNanoBanana(imageFile, prompt, retryCount + 1);
      } else {
        throw new Error("🌐 Connection issue: Please check your internet and try again.");
      }
    }
    
    // For other errors, provide more informative message
    if (error instanceof Error) {
      throw new Error(`Failed to generate image: ${error.message}`);
    }
    
    throw new Error("An unknown error occurred during image generation.");
  }
};
