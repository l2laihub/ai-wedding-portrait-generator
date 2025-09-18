/**
 * Backward Compatibility Service
 * Ensures smooth transition between legacy, enhanced, and package systems
 */

import { secureGeminiService } from './secureGeminiService';
import { unifiedThemeService } from './unifiedThemeService';
import { rateLimiter } from '../utils/rateLimiter';
import { creditsService } from './creditsService';
import { PhotoPackagesService } from './photoPackagesService';
import { userIdentificationService } from './userIdentificationService';

export interface CompatibilityOptions {
  packageId?: string;
  tierId?: string;
  fallbackToLegacy?: boolean;
  enablePackageFeatures?: boolean;
}

export interface GenerationCompatibilityResult {
  success: boolean;
  usingPackageSystem: boolean;
  usingEnhancedThemes: boolean;
  usingLegacyFallback: boolean;
  systemsUsed: string[];
  error?: string;
  results?: any[];
}

class BackwardCompatibilityService {
  /**
   * Detect which systems are available and functional
   */
  async detectAvailableSystems(packageId?: string): Promise<{
    legacy: boolean;
    enhanced: boolean;
    package: boolean;
    database: boolean;
    rateLimiting: boolean;
    credits: boolean;
  }> {
    const results = {
      legacy: true, // Always available
      enhanced: false,
      package: false,
      database: false,
      rateLimiting: true, // localStorage-based always works
      credits: false
    };

    try {
      // Test database connectivity
      const dbStatus = await unifiedThemeService.isDatabaseAvailable();
      results.database = dbStatus;
      results.enhanced = dbStatus;

      // Test package system if packageId provided
      if (packageId) {
        try {
          const packageData = await PhotoPackagesService.getPackageById(packageId);
          results.package = !!packageData;
        } catch (error) {
          console.warn('Package system not available:', error);
        }
      }

      // Test credits system (requires authentication)
      try {
        const user = await userIdentificationService.getCurrentIdentification();
        if (user.userType !== 'anonymous') {
          await creditsService.getBalance();
          results.credits = true;
        }
      } catch (error) {
        console.warn('Credits system not available:', error);
      }

    } catch (error) {
      console.warn('Error detecting systems:', error);
    }

    return results;
  }

  /**
   * Generate themes with automatic fallback
   */
  async generateThemesWithFallback(
    count: number = 3,
    options: CompatibilityOptions = {}
  ): Promise<{
    themes: any[];
    source: 'package' | 'enhanced' | 'legacy';
    systemUsed: string;
  }> {
    const { packageId, fallbackToLegacy = true } = options;

    // Try package themes first if packageId provided
    if (packageId) {
      try {
        const packageThemes = await unifiedThemeService.getPackageThemes(packageId);
        if (packageThemes.length > 0) {
          const selectedThemes = packageThemes
            .sort(() => 0.5 - Math.random())
            .slice(0, count);
          
          return {
            themes: selectedThemes,
            source: 'package',
            systemUsed: 'PhotoPackagesService + UnifiedThemeService'
          };
        }
      } catch (error) {
        console.warn('Package themes failed, trying fallback:', error);
      }
    }

    // Try enhanced themes
    try {
      unifiedThemeService.setEnhancedMode(true);
      const enhancedThemes = await unifiedThemeService.getRandomThemes(count);
      if (enhancedThemes.length > 0 && enhancedThemes[0].source === 'database') {
        return {
          themes: enhancedThemes,
          source: 'enhanced',
          systemUsed: 'Enhanced Database Themes'
        };
      }
    } catch (error) {
      console.warn('Enhanced themes failed, trying legacy:', error);
    }

    // Fallback to legacy
    if (fallbackToLegacy) {
      try {
        unifiedThemeService.setEnhancedMode(false);
        unifiedThemeService.setPackageMode(false);
        const legacyThemes = await unifiedThemeService.getRandomThemes(count);
        
        return {
          themes: legacyThemes,
          source: 'legacy',
          systemUsed: 'Legacy Theme System'
        };
      } catch (error) {
        console.error('All theme systems failed:', error);
        throw new Error('No theme system available');
      }
    }

    throw new Error('No suitable theme system found');
  }

  /**
   * Check rate limits with progressive fallback
   */
  async checkRateLimitsWithFallback(
    options: CompatibilityOptions = {}
  ): Promise<{
    canProceed: boolean;
    systemUsed: string;
    remaining: number;
    resetTime: Date;
    reason?: string;
  }> {
    const { packageId } = options;

    try {
      const identification = await userIdentificationService.getCurrentIdentification();
      const userType = PhotoPackagesService.getUserType(
        identification.userType !== 'anonymous',
        0, // TODO: Get actual credits
        0
      );

      // Try package-aware rate limiting first
      if (packageId) {
        try {
          const packageResult = await rateLimiter.canProceedWithPackage(
            identification.userId,
            packageId,
            userType
          );

          return {
            canProceed: packageResult.canProceed,
            systemUsed: 'Package Rate Limiting',
            remaining: packageResult.traditionalCheck.remaining,
            resetTime: packageResult.traditionalCheck.resetsAt,
            reason: packageResult.reason
          };
        } catch (error) {
          console.warn('Package rate limiting failed, using traditional:', error);
        }
      }

      // Fallback to traditional rate limiting
      const traditionalResult = rateLimiter.checkLimit();
      return {
        canProceed: traditionalResult.canProceed,
        systemUsed: 'Traditional Rate Limiting',
        remaining: traditionalResult.remaining,
        resetTime: traditionalResult.resetsAt,
        reason: traditionalResult.isAtLimit ? 'Daily limit reached' : undefined
      };

    } catch (error) {
      console.error('All rate limiting systems failed:', error);
      return {
        canProceed: false,
        systemUsed: 'Emergency Fallback',
        remaining: 0,
        resetTime: new Date(),
        reason: 'Rate limiting system unavailable'
      };
    }
  }

  /**
   * Generate portraits with comprehensive fallback handling
   */
  async generatePortraitsWithFallback(
    imageFile: File,
    customPrompt: string = '',
    photoType: string = 'couple',
    familyMemberCount: number = 3,
    options: CompatibilityOptions = {},
    onProgressUpdate?: (style: string, status: 'in_progress' | 'completed' | 'failed') => void
  ): Promise<GenerationCompatibilityResult> {
    const systemsUsed: string[] = [];
    const { packageId, tierId, fallbackToLegacy = true } = options;

    try {
      // Step 1: Check rate limits
      const rateLimitCheck = await this.checkRateLimitsWithFallback(options);
      systemsUsed.push(rateLimitCheck.systemUsed);

      if (!rateLimitCheck.canProceed) {
        return {
          success: false,
          usingPackageSystem: false,
          usingEnhancedThemes: false,
          usingLegacyFallback: false,
          systemsUsed,
          error: rateLimitCheck.reason || 'Rate limit exceeded'
        };
      }

      // Step 2: Generate themes
      const themeResult = await this.generateThemesWithFallback(3, options);
      systemsUsed.push(themeResult.systemUsed);

      const styles = themeResult.themes.map(theme => theme.name || theme.id);

      // Step 3: Generate portraits
      let generationResult;

      if (packageId && tierId && themeResult.source === 'package') {
        // Use package system
        try {
          generationResult = await secureGeminiService.generateMultiplePortraits(
            imageFile,
            styles,
            customPrompt,
            photoType,
            familyMemberCount,
            onProgressUpdate,
            {
              packageId,
              tierId,
              themes: themeResult.themes
            }
          );
          systemsUsed.push('Package Generation System');
        } catch (error) {
          console.warn('Package generation failed, falling back:', error);
          if (!fallbackToLegacy) throw error;
        }
      }

      // Fallback to standard generation
      if (!generationResult) {
        generationResult = await secureGeminiService.generateMultiplePortraits(
          imageFile,
          styles,
          customPrompt,
          photoType,
          familyMemberCount,
          onProgressUpdate
        );
        systemsUsed.push('Standard Generation System');
      }

      return {
        success: generationResult.successful > 0,
        usingPackageSystem: packageId && tierId ? true : false,
        usingEnhancedThemes: themeResult.source === 'enhanced',
        usingLegacyFallback: themeResult.source === 'legacy',
        systemsUsed,
        results: generationResult.results
      };

    } catch (error) {
      console.error('Portrait generation failed completely:', error);
      return {
        success: false,
        usingPackageSystem: false,
        usingEnhancedThemes: false,
        usingLegacyFallback: false,
        systemsUsed,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get system health status
   */
  async getSystemHealthStatus(packageId?: string): Promise<{
    overall: 'healthy' | 'degraded' | 'critical';
    systems: {
      name: string;
      status: 'online' | 'offline' | 'degraded';
      lastChecked: Date;
      error?: string;
    }[];
    recommendation: string;
  }> {
    const systems = await this.detectAvailableSystems(packageId);
    const systemStatus = [];
    let healthyCount = 0;
    const totalSystems = Object.keys(systems).length;

    for (const [name, isAvailable] of Object.entries(systems)) {
      systemStatus.push({
        name: name.charAt(0).toUpperCase() + name.slice(1),
        status: isAvailable ? 'online' : 'offline' as const,
        lastChecked: new Date()
      });
      if (isAvailable) healthyCount++;
    }

    let overall: 'healthy' | 'degraded' | 'critical';
    let recommendation: string;

    if (healthyCount === totalSystems) {
      overall = 'healthy';
      recommendation = 'All systems operational. Full functionality available.';
    } else if (healthyCount >= totalSystems * 0.5) {
      overall = 'degraded';
      recommendation = 'Some systems unavailable. Fallback mechanisms active.';
    } else {
      overall = 'critical';
      recommendation = 'Multiple system failures. Limited functionality available.';
    }

    return {
      overall,
      systems: systemStatus,
      recommendation
    };
  }

  /**
   * Migrate user from legacy to package system
   */
  async migrateToPackageSystem(packageId: string, tierId: string): Promise<{
    success: boolean;
    newSystemStatus: any;
    error?: string;
  }> {
    try {
      // Enable package mode
      unifiedThemeService.setPackageMode(true);
      
      // Verify package availability
      const packageData = await PhotoPackagesService.getPackageById(packageId);
      if (!packageData) {
        throw new Error('Package not found');
      }

      // Verify tier availability
      const tierData = await PhotoPackagesService.getPricingTierById(tierId);
      if (!tierData) {
        throw new Error('Pricing tier not found');
      }

      // Get new system status
      const newSystemStatus = await unifiedThemeService.getSystemStatus(packageId);

      return {
        success: true,
        newSystemStatus
      };
    } catch (error) {
      console.error('Migration to package system failed:', error);
      return {
        success: false,
        newSystemStatus: null,
        error: error instanceof Error ? error.message : 'Migration failed'
      };
    }
  }
}

// Export singleton instance
export const backwardCompatibilityService = new BackwardCompatibilityService();
export default backwardCompatibilityService;