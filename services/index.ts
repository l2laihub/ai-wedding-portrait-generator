// Central export for all services
export { posthogService, EventName } from './posthogService';
export { counterService } from './counterService';
export { editImageWithNanoBanana } from './geminiService';

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