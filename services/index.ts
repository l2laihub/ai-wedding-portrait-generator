// Central export for all services
export { posthogService, EventName } from './posthogService';
export { counterService } from './counterService';
export { editImageWithNanoBanana } from './geminiService';
export { secureGeminiService } from './secureGeminiService';
export { userIdentificationService } from './userIdentificationService';
export { promptService } from './promptService';

// Export types
export type { 
  PostHogConfig,
  ImageUploadProperties,
  GenerationProperties,
  GenerationCompleteProperties,
  StyleGeneratedProperties,
  UserIdentificationProperties 
} from './posthogService';

export type { 
  CounterMetrics,
  GenerationHistoryEntry 
} from './counterService';

export type {
  GenerationOptions,
  GenerationResult,
  RateLimitStatus
} from './secureGeminiService';

export type {
  UserIdentification,
  DeviceFingerprint
} from './userIdentificationService';