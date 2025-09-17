/**
 * Template Cache
 * Caching system for compiled templates to improve performance
 */

import {
  CompiledTemplate,
  CacheSettings,
  TemplateEngineConfig
} from './types';

interface CacheEntry {
  data: CompiledTemplate;
  timestamp: number;
  ttl: number;
  hits: number;
  lastAccessed: number;
}

interface CacheStats {
  size: number;
  hitRate: number;
  totalRequests: number;
  totalHits: number;
  memoryUsage: number;
}

export class TemplateCache {
  private cache: Map<string, CacheEntry> = new Map();
  private config: TemplateEngineConfig;
  private stats: {
    totalRequests: number;
    totalHits: number;
    memoryUsage: number;
  } = {
    totalRequests: 0,
    totalHits: 0,
    memoryUsage: 0
  };

  // Cleanup interval for expired entries
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor(config: TemplateEngineConfig) {
    this.config = config;
    
    if (config.enableCaching) {
      this.startCleanupScheduler();
    }
  }

  /**
   * Get cached template compilation result
   */
  async get(key: string): Promise<CompiledTemplate | null> {
    this.stats.totalRequests++;

    if (!this.config.enableCaching) {
      return null;
    }

    const entry = this.cache.get(key);
    
    if (!entry) {
      return null;
    }

    // Check if entry has expired
    const now = Date.now();
    if (now > entry.timestamp + (entry.ttl * 1000)) {
      this.cache.delete(key);
      this.updateMemoryUsage();
      return null;
    }

    // Update access statistics
    entry.hits++;
    entry.lastAccessed = now;
    this.stats.totalHits++;

    // Return a copy to prevent mutation
    return {
      ...entry.data,
      metadata: {
        ...entry.data.metadata,
        cacheHit: true
      }
    };
  }

  /**
   * Set cached template compilation result
   */
  async set(
    key: string, 
    data: CompiledTemplate, 
    cacheSettings?: CacheSettings
  ): Promise<void> {
    if (!this.config.enableCaching) {
      return;
    }

    const ttl = cacheSettings?.ttl || 3600; // Default 1 hour
    const now = Date.now();

    const entry: CacheEntry = {
      data: { 
        ...data,
        metadata: {
          ...data.metadata,
          cacheHit: false
        }
      },
      timestamp: now,
      ttl,
      hits: 0,
      lastAccessed: now
    };

    this.cache.set(key, entry);
    this.updateMemoryUsage();

    // Implement cache size limit
    await this.enforCacheSizeLimit();
  }

  /**
   * Check if a key exists in cache and is not expired
   */
  has(key: string): boolean {
    if (!this.config.enableCaching) {
      return false;
    }

    const entry = this.cache.get(key);
    if (!entry) {
      return false;
    }

    const now = Date.now();
    const isExpired = now > entry.timestamp + (entry.ttl * 1000);
    
    if (isExpired) {
      this.cache.delete(key);
      this.updateMemoryUsage();
      return false;
    }

    return true;
  }

  /**
   * Delete specific cache entry
   */
  async delete(key: string): Promise<boolean> {
    const deleted = this.cache.delete(key);
    if (deleted) {
      this.updateMemoryUsage();
    }
    return deleted;
  }

  /**
   * Clear all cache entries
   */
  async clear(): Promise<void> {
    this.cache.clear();
    this.stats.memoryUsage = 0;
    this.stats.totalRequests = 0;
    this.stats.totalHits = 0;
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<CacheStats> {
    const hitRate = this.stats.totalRequests > 0 
      ? (this.stats.totalHits / this.stats.totalRequests) * 100 
      : 0;

    return {
      size: this.cache.size,
      hitRate: Math.round(hitRate * 100) / 100,
      totalRequests: this.stats.totalRequests,
      totalHits: this.stats.totalHits,
      memoryUsage: this.stats.memoryUsage
    };
  }

  /**
   * Invalidate cache entries based on patterns
   */
  async invalidate(pattern?: string | RegExp): Promise<number> {
    let deletedCount = 0;

    if (!pattern) {
      // Clear all cache
      const size = this.cache.size;
      await this.clear();
      return size;
    }

    const keysToDelete: string[] = [];

    for (const key of this.cache.keys()) {
      let shouldDelete = false;

      if (typeof pattern === 'string') {
        shouldDelete = key.includes(pattern);
      } else if (pattern instanceof RegExp) {
        shouldDelete = pattern.test(key);
      }

      if (shouldDelete) {
        keysToDelete.push(key);
      }
    }

    for (const key of keysToDelete) {
      await this.delete(key);
      deletedCount++;
    }

    return deletedCount;
  }

  /**
   * Get cache entries for debugging
   */
  async debug(): Promise<Array<{
    key: string;
    size: number;
    age: number;
    hits: number;
    lastAccessed: number;
    ttl: number;
  }>> {
    const now = Date.now();
    const entries: Array<any> = [];

    for (const [key, entry] of this.cache.entries()) {
      const dataSize = this.calculateDataSize(entry.data);
      const age = now - entry.timestamp;

      entries.push({
        key,
        size: dataSize,
        age,
        hits: entry.hits,
        lastAccessed: entry.lastAccessed,
        ttl: entry.ttl
      });
    }

    return entries.sort((a, b) => b.hits - a.hits);
  }

  /**
   * Preload cache with commonly used templates
   */
  async preload(preloadData: Array<{
    key: string;
    data: CompiledTemplate;
    ttl?: number;
  }>): Promise<void> {
    for (const item of preloadData) {
      await this.set(item.key, item.data, { 
        enabled: true, 
        ttl: item.ttl || 7200, // 2 hours default for preloaded
        invalidateOnVariableChange: false
      });
    }
  }

  /**
   * Start cleanup scheduler to remove expired entries
   */
  private startCleanupScheduler(): void {
    // Run cleanup every 5 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanupExpiredEntries();
    }, 5 * 60 * 1000);
  }

  /**
   * Stop cleanup scheduler
   */
  stopCleanupScheduler(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }

  /**
   * Remove expired entries
   */
  private cleanupExpiredEntries(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];

    for (const [key, entry] of this.cache.entries()) {
      const isExpired = now > entry.timestamp + (entry.ttl * 1000);
      if (isExpired) {
        keysToDelete.push(key);
      }
    }

    for (const key of keysToDelete) {
      this.cache.delete(key);
    }

    if (keysToDelete.length > 0) {
      this.updateMemoryUsage();
      
      if (this.config.enableDebugMode) {
        console.log(`[TemplateCache] Cleaned up ${keysToDelete.length} expired entries`);
      }
    }
  }

  /**
   * Enforce cache size limit using LRU eviction
   */
  private async enforCacheSizeLimit(): Promise<void> {
    const maxEntries = 1000; // Configure based on memory constraints
    
    if (this.cache.size <= maxEntries) {
      return;
    }

    // Sort by least recently used (LRU)
    const entries = Array.from(this.cache.entries()).sort((a, b) => {
      return a[1].lastAccessed - b[1].lastAccessed;
    });

    // Remove oldest entries until we're under the limit
    const entriesToRemove = this.cache.size - maxEntries;
    
    for (let i = 0; i < entriesToRemove; i++) {
      const [key] = entries[i];
      this.cache.delete(key);
    }

    this.updateMemoryUsage();

    if (this.config.enableDebugMode) {
      console.log(`[TemplateCache] Evicted ${entriesToRemove} entries due to size limit`);
    }
  }

  /**
   * Update memory usage statistics
   */
  private updateMemoryUsage(): void {
    let totalSize = 0;

    for (const entry of this.cache.values()) {
      totalSize += this.calculateDataSize(entry.data);
      totalSize += this.calculateEntryOverhead(entry);
    }

    this.stats.memoryUsage = totalSize;
  }

  /**
   * Calculate approximate size of cached data
   */
  private calculateDataSize(data: CompiledTemplate): number {
    // Rough estimation of memory usage
    let size = 0;
    
    // Prompt string size
    size += data.prompt.length * 2; // UTF-16 encoding
    
    // Metadata size
    size += JSON.stringify(data.metadata).length * 2;
    
    // Warnings and errors arrays
    if (data.warnings) {
      size += data.warnings.join('').length * 2;
    }
    
    if (data.errors) {
      size += data.errors.join('').length * 2;
    }
    
    return size;
  }

  /**
   * Calculate overhead of cache entry structure
   */
  private calculateEntryOverhead(entry: CacheEntry): number {
    // Approximate overhead for entry metadata
    return 100; // Fixed overhead per entry
  }

  /**
   * Warmup cache with popular templates
   */
  async warmup(templateIds: string[]): Promise<void> {
    // This would typically be implemented to pre-compile
    // and cache popular templates on application startup
    if (this.config.enableDebugMode) {
      console.log(`[TemplateCache] Warming up cache for ${templateIds.length} templates`);
    }
  }

  /**
   * Export cache data for backup/restore
   */
  async export(): Promise<string> {
    const exportData = {
      timestamp: Date.now(),
      stats: this.stats,
      entries: Array.from(this.cache.entries()).map(([key, entry]) => ({
        key,
        data: entry.data,
        timestamp: entry.timestamp,
        ttl: entry.ttl,
        hits: entry.hits
      }))
    };

    return JSON.stringify(exportData, null, 2);
  }

  /**
   * Import cache data from backup
   */
  async import(exportData: string): Promise<void> {
    try {
      const parsed = JSON.parse(exportData);
      
      // Clear existing cache
      await this.clear();
      
      // Import entries
      for (const item of parsed.entries) {
        const entry: CacheEntry = {
          data: item.data,
          timestamp: item.timestamp,
          ttl: item.ttl,
          hits: item.hits,
          lastAccessed: Date.now()
        };
        
        this.cache.set(item.key, entry);
      }
      
      this.updateMemoryUsage();
      
      if (this.config.enableDebugMode) {
        console.log(`[TemplateCache] Imported ${parsed.entries.length} cache entries`);
      }
    } catch (error) {
      throw new Error(`Failed to import cache data: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Cleanup and destroy cache instance
   */
  destroy(): void {
    this.stopCleanupScheduler();
    this.cache.clear();
    this.stats = {
      totalRequests: 0,
      totalHits: 0,
      memoryUsage: 0
    };
  }
}

export default TemplateCache;