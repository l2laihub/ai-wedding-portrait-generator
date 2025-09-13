# Generation Counter Implementation

## Overview
The portrait generation counter tracks successful generation requests across the application, providing both immediate local storage persistence and PostHog analytics integration.

## Architecture

### Counter Service (`services/counterService.ts`)
- **Singleton Pattern**: Ensures single source of truth for counter data
- **Local Storage**: Immediate persistence for counter values
- **PostHog Integration**: Tracks events for future aggregated analytics
- **Reactive Updates**: Supports UI subscriptions for real-time updates

### Key Features
1. **Total Generation Counter**: Tracks all-time generation count
2. **Daily Counter**: Auto-resets at midnight (local time)
3. **Generation History**: Maintains last 100 generation records
4. **Success Rate Tracking**: Monitors style generation success rates
5. **Photo Type Distribution**: Tracks single/couple/family portrait ratios

### Integration Points

#### App.tsx
```typescript
// After successful generation completion
counterService.incrementCounter(
  generationId, 
  successfulStyles.length, 
  stylesToGenerate.length,
  photoType
);
```

#### PostHog Events
- `GENERATION_COUNTER_INCREMENTED`: Fired on each increment with detailed metrics
- Includes: generationId, totalGenerations, dailyGenerations, successRate, photoType

#### React Hook (`hooks/useGenerationCounter.ts`)
```typescript
const { totalGenerations, formattedCounter } = useGenerationCounter();
// Use in UI: <span>{formattedCounter}</span>
```

## Data Storage

### localStorage Keys
- `wedai_total_generations`: Total count
- `wedai_daily_generations`: Today's count
- `wedai_last_reset_date`: Date of last daily reset
- `wedai_generation_history`: JSON array of last 100 generations

### Metrics Structure
```typescript
interface CounterMetrics {
  totalGenerations: number;
  dailyGenerations: number;
  generationHistory: GenerationHistoryEntry[];
  lastResetDate: string;
}
```

## Future Enhancements

### PostHog API Integration
Currently, the service includes placeholder methods for future PostHog API integration:
- `getAggregatedMetricsFromPostHog()`: Will fetch server-side aggregated data
- `posthogService.getAggregatedMetrics()`: Will query PostHog analytics API

These require server-side implementation with PostHog personal API keys.

## Testing
Manual test suite available at `services/__tests__/counterService.test.ts`

Run in browser console:
```javascript
import('./services/__tests__/counterService.test.ts').then(m => m.testCounterService());
```

## Usage Examples

### Display Counter in UI
```typescript
import { useFormattedCounter } from './hooks/useGenerationCounter';

function MyComponent() {
  const formattedCounter = useFormattedCounter();
  return <div>{formattedCounter}</div>;
  // Shows: "123 portraits generated", "1.2k+ dreams created", etc.
}
```

### Access Detailed Statistics
```typescript
const stats = counterService.getStatistics();
console.log(stats);
// {
//   total: 1234,
//   today: 45,
//   last24Hours: 67,
//   last7Days: 890,
//   averageSuccessRate: 0.85,
//   photoTypeDistribution: { couple: 800, single: 300, family: 134 }
// }
```