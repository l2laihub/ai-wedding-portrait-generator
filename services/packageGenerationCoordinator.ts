/**
 * Package Generation Coordinator Service
 * Orchestrates the complete package-aware generation flow with fallbacks
 */

import { secureGeminiService } from './secureGeminiService';
import { unifiedThemeService } from './unifiedThemeService';
import { promptService } from './promptService';
import { creditsService } from './creditsService';
import { rateLimiter } from '../utils/rateLimiter';
import { backwardCompatibilityService } from './backwardCompatibilityService';
import { PhotoPackagesService, type Package, type PackageTheme, type PackagePricingTier } from './photoPackagesService';
import { userIdentificationService } from './userIdentificationService';
import type { GeneratedContent } from '../types';

export interface PackageGenerationOptions {
  // Core generation parameters
  imageFile: File;
  customPrompt?: string;
  photoType: 'single' | 'couple' | 'family';
  familyMemberCount?: number;
  
  // Package configuration
  packageId?: string;
  tierId?: string;
  selectedThemes?: PackageTheme[];
  themeCount?: number;
  
  // Fallback options
  enablePackageFeatures?: boolean;
  fallbackToLegacy?: boolean;
  
  // Progress tracking
  onProgressUpdate?: (style: string, status: 'in_progress' | 'completed' | 'failed') => void;
  onSystemUpdate?: (system: string, status: string) => void;
}

export interface PackageGenerationResult {
  success: boolean;
  results: (GeneratedContent & { style: string })[];
  successful: number;
  failed: number;
  
  // Package-specific information
  packageUsed?: Package;
  tierUsed?: PackagePricingTier;
  themesUsed: PackageTheme[];
  creditsUsed: number;
  usageId?: string;
  
  // System information
  systemsUsed: string[];
  fallbacksTriggered: string[];
  
  // Performance metrics
  totalProcessingTime: number;
  averageGenerationTime: number;
  
  // Error handling
  error?: string;
  warnings: string[];
}

class PackageGenerationCoordinator {
  /**
   * Main coordination method for package-aware generation
   */
  async coordinateGeneration(options: PackageGenerationOptions): Promise<PackageGenerationResult> {
    const startTime = Date.now();
    const systemsUsed: string[] = [];
    const fallbacksTriggered: string[] = [];
    const warnings: string[] = [];

    const result: PackageGenerationResult = {
      success: false,
      results: [],
      successful: 0,
      failed: 0,
      themesUsed: [],
      creditsUsed: 0,
      systemsUsed,
      fallbacksTriggered,
      totalProcessingTime: 0,
      averageGenerationTime: 0,
      warnings
    };

    try {
      options.onSystemUpdate?.('coordinator', 'Starting package generation coordination');

      // Step 1: Validate and prepare package configuration
      const packageConfig = await this.preparePackageConfiguration(options);
      systemsUsed.push('Package Configuration');

      if (!packageConfig.isValid) {
        warnings.push(...packageConfig.warnings);
        if (!options.fallbackToLegacy) {
          result.error = packageConfig.error || 'Package configuration invalid';
          return result;
        }
        fallbacksTriggered.push('Package Configuration -> Fallback Mode');
      }

      // Step 2: Pre-flight checks (rate limiting, credits, availability)
      const preflightResult = await this.performPreflightChecks(options, packageConfig);
      systemsUsed.push('Preflight Checks');

      if (!preflightResult.canProceed) {
        result.error = preflightResult.error || 'Preflight checks failed';
        return result;
      }

      // Step 3: Select and prepare themes
      const themeResult = await this.selectAndPrepareThemes(options, packageConfig);
      systemsUsed.push('Theme Selection');
      result.themesUsed = themeResult.themes;

      if (themeResult.themes.length === 0) {
        if (!options.fallbackToLegacy) {
          result.error = 'No themes available for generation';
          return result;
        }
        fallbacksTriggered.push('Theme Selection -> Legacy Themes');
      }

      // Step 4: Process credits/usage before generation
      if (packageConfig.package && packageConfig.tier) {
        const creditResult = await this.processCreditsAndUsage(
          packageConfig.package,
          packageConfig.tier,
          result.themesUsed,
          options
        );
        systemsUsed.push('Credit Processing');
        
        if (!creditResult.success) {
          result.error = creditResult.error || 'Credit processing failed';
          return result;
        }
        
        result.creditsUsed = creditResult.creditsUsed;
        result.usageId = creditResult.usageId;
        result.packageUsed = packageConfig.package;
        result.tierUsed = packageConfig.tier;
      }

      // Step 5: Execute generation with package integration
      options.onSystemUpdate?.('coordinator', 'Starting AI generation');
      const generationResult = await this.executeGeneration(options, packageConfig, themeResult);
      systemsUsed.push('AI Generation');

      // Step 6: Process results and update usage tracking
      result.results = generationResult.results;
      result.successful = generationResult.successful;
      result.failed = generationResult.failed;
      result.success = generationResult.successful > 0;

      // Complete usage tracking if applicable
      if (result.usageId) {
        await this.completeUsageTracking(
          result.usageId, 
          result.success ? 'completed' : 'failed',
          Date.now() - startTime,
          result.success ? undefined : 'Generation failed'
        );
        systemsUsed.push('Usage Completion');
      }

      // Step 7: Calculate metrics
      result.totalProcessingTime = Date.now() - startTime;
      result.averageGenerationTime = result.successful > 0 
        ? result.totalProcessingTime / result.successful 
        : 0;

      options.onSystemUpdate?.('coordinator', `Generation completed: ${result.successful}/${result.successful + result.failed} successful`);

      return result;

    } catch (error) {
      console.error('Package generation coordination failed:', error);
      
      // Mark usage as failed if we started tracking
      if (result.usageId) {
        await this.completeUsageTracking(
          result.usageId,
          'failed',
          Date.now() - startTime,
          error instanceof Error ? error.message : 'Unknown error'
        );
      }

      result.error = error instanceof Error ? error.message : 'Unknown error occurred';
      result.totalProcessingTime = Date.now() - startTime;
      
      return result;
    }
  }

  /**
   * Prepare and validate package configuration
   */
  private async preparePackageConfiguration(options: PackageGenerationOptions): Promise<{
    isValid: boolean;
    package?: Package;
    tier?: PackagePricingTier;
    usePackageSystem: boolean;
    error?: string;
    warnings: string[];
  }> {
    const warnings: string[] = [];

    if (!options.packageId || !options.tierId) {
      return {
        isValid: false,
        usePackageSystem: false,
        warnings: ['No package configuration provided, using legacy system'],
        error: 'Package ID and Tier ID required for package system'
      };
    }

    try {
      // Get package information
      const packageData = await PhotoPackagesService.getPackageById(options.packageId);
      if (!packageData) {
        return {
          isValid: false,
          usePackageSystem: false,
          warnings: ['Package not found'],
          error: `Package ${options.packageId} not found`
        };
      }

      // Get tier information
      const tierData = await PhotoPackagesService.getPricingTierById(options.tierId);
      if (!tierData) {
        return {
          isValid: false,
          usePackageSystem: false,
          warnings: ['Pricing tier not found'],
          error: `Pricing tier ${options.tierId} not found`
        };
      }

      // Validate tier belongs to package
      if (tierData.package_id !== packageData.id) {
        return {
          isValid: false,
          usePackageSystem: false,
          warnings: ['Tier does not belong to specified package'],
          error: 'Invalid package-tier combination'
        };
      }

      return {
        isValid: true,
        package: packageData,
        tier: tierData,
        usePackageSystem: true,
        warnings
      };

    } catch (error) {
      console.error('Package configuration preparation failed:', error);
      return {
        isValid: false,
        usePackageSystem: false,
        warnings: ['Package system unavailable'],
        error: error instanceof Error ? error.message : 'Package system error'
      };
    }
  }

  /**
   * Perform preflight checks before generation
   */
  private async performPreflightChecks(
    options: PackageGenerationOptions,
    packageConfig: any
  ): Promise<{
    canProceed: boolean;
    error?: string;
    rateLimitInfo?: any;
  }> {
    try {
      const identification = await userIdentificationService.getCurrentIdentification();
      
      // Check rate limits
      let rateLimitResult;
      if (packageConfig.usePackageSystem && options.packageId) {
        // Package-aware rate limiting
        rateLimitResult = await rateLimiter.canProceedWithPackage(
          identification.userId,
          options.packageId,
          PhotoPackagesService.getUserType(
            identification.userType !== 'anonymous',
            0, // TODO: Get actual credits
            0
          )
        );
      } else {
        // Traditional rate limiting
        const traditional = rateLimiter.checkLimit();
        rateLimitResult = {
          canProceed: traditional.canProceed,
          reason: traditional.isAtLimit ? 'Daily limit reached' : undefined
        };
      }

      if (!rateLimitResult.canProceed) {
        return {
          canProceed: false,
          error: rateLimitResult.reason || 'Rate limit exceeded',
          rateLimitInfo: rateLimitResult
        };
      }

      // Check credits if using package system
      if (packageConfig.usePackageSystem && packageConfig.package && packageConfig.tier) {
        const affordability = await creditsService.canAffordPackage(
          packageConfig.package.id,
          packageConfig.tier.id
        );

        if (!affordability.canAfford) {
          return {
            canProceed: false,
            error: `Insufficient credits. Need ${affordability.creditsNeeded}, have ${affordability.creditsAvailable}`
          };
        }
      }

      return { canProceed: true };

    } catch (error) {
      console.error('Preflight checks failed:', error);
      return {
        canProceed: false,
        error: error instanceof Error ? error.message : 'Preflight check failed'
      };
    }
  }

  /**
   * Select and prepare themes for generation
   */
  private async selectAndPrepareThemes(
    options: PackageGenerationOptions,
    packageConfig: any
  ): Promise<{
    themes: PackageTheme[];
    source: 'package' | 'enhanced' | 'legacy';
  }> {
    const themeCount = options.themeCount || 3;

    // If specific themes are provided, use those
    if (options.selectedThemes && options.selectedThemes.length > 0) {
      return {
        themes: options.selectedThemes.slice(0, themeCount),
        source: 'package'
      };
    }

    // Try package themes first
    if (packageConfig.usePackageSystem && options.packageId) {
      try {
        const packageThemes = await PhotoPackagesService.getPackageThemes(options.packageId, true);
        if (packageThemes.length > 0) {
          const selectedThemes = packageThemes
            .sort(() => 0.5 - Math.random())
            .slice(0, themeCount);
          
          return {
            themes: selectedThemes,
            source: 'package'
          };
        }
      } catch (error) {
        console.warn('Failed to load package themes, using fallback:', error);
      }
    }

    // Fallback to enhanced/legacy themes via backward compatibility service
    try {
      const fallbackResult = await backwardCompatibilityService.generateThemesWithFallback(
        themeCount,
        { packageId: options.packageId, fallbackToLegacy: options.fallbackToLegacy }
      );

      // Convert to PackageTheme format for consistency
      const convertedThemes: PackageTheme[] = fallbackResult.themes.map((theme, index) => ({
        id: theme.id || `fallback_${index}`,
        package_id: options.packageId || '',
        name: theme.name || theme.style || theme.id,
        description: theme.description || '',
        base_style_id: undefined,
        style_overrides: {},
        prompt_template: '', // Will use legacy prompt generation
        prompt_variables: {},
        conditional_sections: [],
        preview_image: theme.preview_image,
        color_palette: theme.color_palette || [],
        mood_tags: theme.mood || [],
        category: theme.category || 'wedding',
        subcategory: undefined,
        style_complexity: 'standard' as const,
        enabled: theme.enabled,
        premium_only: theme.premium_only || false,
        beta_feature: false,
        seasonal: theme.seasonal || false,
        season_tags: undefined,
        generation_time_estimate: theme.generation_time_estimate || 30000,
        quality_score: theme.quality_score || 5,
        popularity_score: theme.popularity || 5,
        created_at: theme.created_at,
        updated_at: theme.updated_at
      }));

      return {
        themes: convertedThemes,
        source: fallbackResult.source as 'enhanced' | 'legacy'
      };
    } catch (error) {
      console.error('All theme selection methods failed:', error);
      return {
        themes: [],
        source: 'legacy'
      };
    }
  }

  /**
   * Process credits and usage tracking
   */
  private async processCreditsAndUsage(
    packageData: Package,
    tierData: PackagePricingTier,
    themes: PackageTheme[],
    options: PackageGenerationOptions
  ): Promise<{
    success: boolean;
    creditsUsed: number;
    usageId?: string;
    error?: string;
  }> {
    try {
      const identification = await userIdentificationService.getCurrentIdentification();
      
      const result = await creditsService.consumePackageCredits(
        packageData.id,
        tierData.id,
        themes.map(t => t.id),
        identification.sessionId,
        options.photoType
      );

      if (!result.success) {
        return {
          success: false,
          creditsUsed: 0,
          error: result.error || 'Failed to consume credits'
        };
      }

      return {
        success: true,
        creditsUsed: result.creditsUsed,
        usageId: result.usageId
      };

    } catch (error) {
      console.error('Credit processing failed:', error);
      return {
        success: false,
        creditsUsed: 0,
        error: error instanceof Error ? error.message : 'Credit processing failed'
      };
    }
  }

  /**
   * Execute the actual generation process
   */
  private async executeGeneration(
    options: PackageGenerationOptions,
    packageConfig: any,
    themeResult: any
  ): Promise<{
    results: (GeneratedContent & { style: string })[];
    successful: number;
    failed: number;
  }> {
    const styles = themeResult.themes.map((theme: PackageTheme) => theme.name);

    if (packageConfig.usePackageSystem && packageConfig.package && packageConfig.tier) {
      // Use package-aware generation
      return await secureGeminiService.generateMultiplePortraits(
        options.imageFile,
        styles,
        options.customPrompt || '',
        options.photoType,
        options.familyMemberCount || 3,
        options.onProgressUpdate,
        {
          packageId: packageConfig.package.id,
          tierId: packageConfig.tier.id,
          themes: themeResult.themes
        }
      );
    } else {
      // Use traditional generation
      return await secureGeminiService.generateMultiplePortraits(
        options.imageFile,
        styles,
        options.customPrompt || '',
        options.photoType,
        options.familyMemberCount || 3,
        options.onProgressUpdate
      );
    }
  }

  /**
   * Complete usage tracking
   */
  private async completeUsageTracking(
    usageId: string,
    status: 'completed' | 'failed' | 'cancelled',
    processingTime: number,
    errorMessage?: string
  ): Promise<void> {
    try {
      await PhotoPackagesService.completePackageUsage(
        usageId,
        status,
        processingTime,
        undefined, // quality score
        errorMessage
      );
    } catch (error) {
      console.error('Failed to complete usage tracking:', error);
      // Non-critical error, don't throw
    }
  }

  /**
   * Get recommended package for user
   */
  async getRecommendedPackage(
    photoType: 'single' | 'couple' | 'family'
  ): Promise<{
    package?: Package;
    tier?: PackagePricingTier;
    reason: string;
  }> {
    try {
      // Get all available packages
      const packages = await PhotoPackagesService.getPackages({ status: 'active' });
      
      // Filter packages suitable for photo type
      const suitablePackages = packages.filter(pkg => {
        return pkg.tags?.includes(photoType) || pkg.use_cases?.includes(photoType);
      });

      if (suitablePackages.length === 0) {
        return {
          reason: 'No suitable packages found for photo type'
        };
      }

      // Prioritize featured packages
      const featuredPackage = suitablePackages.find(pkg => pkg.featured);
      const selectedPackage = featuredPackage || suitablePackages[0];

      // Get default tier for selected package
      const tiers = await PhotoPackagesService.getPackagePricingTiers(selectedPackage.id);
      const defaultTier = tiers.find(tier => tier.is_default) || tiers[0];

      return {
        package: selectedPackage,
        tier: defaultTier,
        reason: featuredPackage ? 'Featured package for your photo type' : 'Best available package for your photo type'
      };

    } catch (error) {
      console.error('Failed to get recommended package:', error);
      return {
        reason: 'Unable to determine recommended package'
      };
    }
  }
}

// Export singleton instance
export const packageGenerationCoordinator = new PackageGenerationCoordinator();
export default packageGenerationCoordinator;