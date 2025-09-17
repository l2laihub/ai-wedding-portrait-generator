/**
 * ES Module wrapper for enhancedPromptService
 * Provides compatibility between CommonJS and ES modules
 */

// Dynamic import wrapper for the CommonJS module
let enhancedPromptServiceInstance = null;

const loadEnhancedPromptService = async () => {
  if (enhancedPromptServiceInstance) {
    return enhancedPromptServiceInstance;
  }

  try {
    // Try to load the JavaScript version first
    const jsModule = await import('./enhancedPromptService.js');
    if (jsModule && jsModule.enhancedPromptService) {
      enhancedPromptServiceInstance = jsModule.enhancedPromptService;
      return enhancedPromptServiceInstance;
    }
  } catch (jsError) {
    console.warn('Failed to load JS enhanced prompt service:', jsError);
  }

  try {
    // Fall back to TypeScript version
    const tsModule = await import('./enhancedPromptService');
    if (tsModule && tsModule.enhancedPromptService) {
      enhancedPromptServiceInstance = tsModule.enhancedPromptService;
      return enhancedPromptServiceInstance;
    }
  } catch (tsError) {
    console.warn('Failed to load TS enhanced prompt service:', tsError);
  }

  throw new Error('Enhanced prompt service not available');
};

// Export a proxy object that loads the service on demand
export const enhancedPromptService = new Proxy({}, {
  get(target, prop) {
    if (prop === 'then') {
      // Handle await calls
      return undefined;
    }

    return async (...args) => {
      const service = await loadEnhancedPromptService();
      const method = service[prop];
      
      if (typeof method === 'function') {
        return method.apply(service, args);
      }
      
      return method;
    };
  }
});

// Also export a function to get the service instance
export const getEnhancedPromptService = loadEnhancedPromptService;

// Export a compatibility wrapper
export default enhancedPromptService;