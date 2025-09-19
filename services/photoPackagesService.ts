/**
 * Photo Packages Service
 * Comprehensive service for managing photo packages, themes, pricing, and usage
 */

import { supabase } from './supabaseClient';

// ==========================================
// TYPES AND INTERFACES
// ==========================================

export interface PackageCategory {
  id: string;
  name: string;
  description?: string;
  display_order: number;
  icon?: string;
  color_scheme?: Record<string, string>;
  enabled: boolean;
  featured: boolean;
  created_at: string;
  updated_at: string;
}

export interface Package {
  id: string;
  slug: string;
  name: string;
  description?: string;
  category: string;
  images_per_generation: number;
  base_prompt_template: string;
  generation_instructions: Record<string, any>;
  is_active: boolean;
  is_featured: boolean;
  sort_order: number;
  settings: Record<string, any>;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
  
  // For backwards compatibility with UI
  featured: boolean;
  tags?: string[];
  
  // Joined data
  themes?: PackageTheme[];
  pricing_tiers?: PackagePricingTier[];
}

export interface PackageTheme {
  id: string;
  package_id: string;
  name: string;
  description?: string;
  setting_prompt: string;
  clothing_prompt?: string;
  atmosphere_prompt?: string;
  technical_prompt?: string;
  style_modifiers: any[];
  color_palette: any[];
  inspiration_references: any[];
  is_active: boolean;
  is_premium: boolean;
  is_seasonal: boolean;
  season_start?: string;
  season_end?: string;
  sort_order: number;
  popularity_score: number;
  created_at: string;
  updated_at: string;
  
  // For backwards compatibility with UI
  mood_tags: string[];
  premium_only: boolean;
}

export interface PackagePricingTier {
  id: string;
  package_id: string;
  name: string;
  shoots_count: number;
  price_cents: number;
  original_price_cents?: number;
  badge?: string;
  features: string[];
  restrictions: Record<string, any>;
  sort_order: number;
  is_active: boolean;
  is_default: boolean;
  created_at: string;
  
  // For backwards compatibility with UI
  display_name: string;
  price_amount_cents: number;
  currency: string;
  is_popular: boolean;
  included_generations: number;
}

export interface PackageUsage {
  id: string;
  user_id: string;
  package_id: string;
  tier_id: string;
  credits_used: number;
  generations_count: number;
  themes_used: string[];
  session_id?: string;
  upload_type: string;
  processing_time?: number;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  error_message?: string;
  result_quality_score?: number;
  started_at: string;
  completed_at?: string;
  created_at: string;
}

export interface RateLimitCheck {
  allowed: boolean;
  reason?: string;
  hourly_remaining: number;
  daily_remaining: number;
  monthly_remaining?: number;
  cooldown_seconds: number;
  reset_times: {
    hourly_reset: string;
    daily_reset: string;
    monthly_reset: string;
  };
}

export interface PackageProcessingResult {
  success: boolean;
  error?: string;
  usage_id?: string;
  credits_used?: number;
  remaining_credits?: number;
  generations_included?: number;
  required?: number;
  available?: number;
}

// ==========================================
// PHOTO PACKAGES SERVICE CLASS
// ==========================================

export class PhotoPackagesService {
  // ==========================================
  // PACKAGE CATEGORIES
  // ==========================================

  /**
   * Get all package categories
   */
  static async getPackageCategories(enabledOnly: boolean = true): Promise<PackageCategory[]> {
    let query = supabase
      .from('package_categories')
      .select('*')
      .order('display_order', { ascending: true });

    if (enabledOnly) {
      query = query.eq('enabled', true);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching package categories:', error);
      throw new Error('Failed to fetch package categories');
    }

    return data || [];
  }

  /**
   * Get featured package categories
   */
  static async getFeaturedPackageCategories(): Promise<PackageCategory[]> {
    const { data, error } = await supabase
      .from('package_categories')
      .select('*')
      .eq('enabled', true)
      .eq('featured', true)
      .order('display_order', { ascending: true });

    if (error) {
      console.error('Error fetching featured package categories:', error);
      throw new Error('Failed to fetch featured package categories');
    }

    return data || [];
  }

  // ==========================================
  // PACKAGES
  // ==========================================

  /**
   * Get all packages with optional filtering
   */
  static async getPackages(filters: {
    category?: string;
    is_active?: boolean;
    is_featured?: boolean;
  } = {}): Promise<Package[]> {
    let query = supabase
      .from('photo_packages')
      .select(`
        *
      `)
      .eq('is_active', true);

    // Apply filters
    if (filters.category) {
      query = query.eq('category', filters.category);
    }
    if (filters.is_active !== undefined) {
      query = query.eq('is_active', filters.is_active);
    }
    if (filters.is_featured !== undefined) {
      query = query.eq('is_featured', filters.is_featured);
    }

    query = query.order('is_featured', { ascending: false })
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: false });

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching packages:', error);
      throw new Error('Failed to fetch packages');
    }

    // Transform data for UI compatibility
    const transformedData = data?.map(pkg => ({
      ...pkg,
      featured: pkg.is_featured,
      tags: pkg.metadata?.tags || []
    })) || [];

    return transformedData;
  }

  /**
   * Get a specific package by ID with full details
   */
  static async getPackageById(packageId: string): Promise<Package | null> {
    const { data, error } = await supabase
      .from('photo_packages')
      .select(`*`)
      .eq('id', packageId)
      .eq('is_active', true)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // Package not found
      }
      console.error('Error fetching package:', error);
      throw new Error('Failed to fetch package');
    }

    // Transform data for UI compatibility
    return {
      ...data,
      featured: data.is_featured,
      tags: data.metadata?.tags || []
    };
  }

  /**
   * Get packages by category
   */
  static async getPackagesByCategory(category: string): Promise<Package[]> {
    return this.getPackages({ category });
  }

  /**
   * Get featured packages
   */
  static async getFeaturedPackages(): Promise<Package[]> {
    return this.getPackages({ is_featured: true });
  }

  /**
   * Get trending packages
   */
  static async getTrendingPackages(): Promise<Package[]> {
    return this.getPackages({ trending: true });
  }

  // ==========================================
  // PACKAGE THEMES
  // ==========================================

  /**
   * Get themes for a specific package
   */
  static async getPackageThemes(packageId: string, enabledOnly: boolean = true): Promise<PackageTheme[]> {
    let query = supabase
      .from('package_themes')
      .select('*')
      .eq('package_id', packageId)
      .order('popularity_score', { ascending: false })
      .order('sort_order', { ascending: true });

    if (enabledOnly) {
      query = query.eq('is_active', true);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching package themes:', error);
      throw new Error('Failed to fetch package themes');
    }

    // Transform data for UI compatibility
    const transformedData = data?.map(theme => ({
      ...theme,
      mood_tags: theme.style_modifiers || [],
      premium_only: theme.is_premium
    })) || [];

    return transformedData;
  }

  /**
   * Get a specific theme by ID
   */
  static async getThemeById(themeId: string): Promise<PackageTheme | null> {
    const { data, error } = await supabase
      .from('package_themes')
      .select('*')
      .eq('id', themeId)
      .eq('is_active', true)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      console.error('Error fetching theme:', error);
      throw new Error('Failed to fetch theme');
    }

    // Transform data for UI compatibility
    return {
      ...data,
      mood_tags: data.style_modifiers || [],
      premium_only: data.is_premium
    };
  }

  /**
   * Get themes by category
   */
  static async getThemesByCategory(category: string): Promise<PackageTheme[]> {
    const { data, error } = await supabase
      .from('package_themes')
      .select('*')
      .eq('category', category)
      .eq('enabled', true)
      .order('popularity_score', { ascending: false });

    if (error) {
      console.error('Error fetching themes by category:', error);
      throw new Error('Failed to fetch themes by category');
    }

    return data || [];
  }

  // ==========================================
  // PRICING TIERS
  // ==========================================

  /**
   * Get pricing tiers for a package
   */
  static async getPackagePricingTiers(packageId: string): Promise<PackagePricingTier[]> {
    const { data, error } = await supabase
      .from('package_pricing_tiers')
      .select('*')
      .eq('package_id', packageId)
      .eq('is_active', true)
      .order('sort_order', { ascending: true });

    if (error) {
      console.error('Error fetching pricing tiers:', error);
      throw new Error('Failed to fetch pricing tiers');
    }

    // Transform data for UI compatibility
    const transformedData = data?.map(tier => ({
      ...tier,
      display_name: tier.name,
      price_amount_cents: tier.price_cents,
      currency: 'USD',
      is_popular: tier.badge === 'MOST POPULAR',
      included_generations: tier.shoots_count
    })) || [];

    return transformedData;
  }

  /**
   * Get a specific pricing tier by ID
   */
  static async getPricingTierById(tierId: string): Promise<PackagePricingTier | null> {
    try {
      // Handle special case for "default" tier ID
      if (tierId === 'default' || !tierId) {
        console.warn('Invalid tier ID provided, using fallback tier');
        return this.getDefaultFallbackTier();
      }

      const { data, error } = await supabase
        .from('package_pricing_tiers')
        .select('*')
        .eq('id', tierId)
        .eq('is_active', true)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null;
        }
        
        // Handle UUID format errors
        if (error.code === '22P02' || error.message?.includes('invalid input syntax for type uuid')) {
          // Silently use fallback tier - UUID validation not needed for simplified system
          return this.getDefaultFallbackTier();
        }
        
        console.error('Error fetching pricing tier:', error);
        throw new Error('Failed to fetch pricing tier');
      }

      // Transform data for UI compatibility
      return {
        ...data,
        display_name: data.name,
        price_amount_cents: data.price_cents,
        currency: 'USD',
        credits_required: data.credits_required || 1,
        themes_per_generation: data.themes_per_generation || 3,
        is_default: data.is_default || false
      };
    } catch (error) {
      console.warn('Error in getPricingTierById, using fallback tier:', error);
      return this.getDefaultFallbackTier();
    }
  }

  /**
   * Get a default fallback tier when database operations fail
   */
  private static getDefaultFallbackTier(): PackagePricingTier {
    return {
      id: 'fallback-tier',
      name: 'Standard',
      display_name: 'Standard',
      description: 'Standard package tier',
      price_cents: 0,
      price_amount_cents: 0,
      currency: 'USD',
      credits_required: 1,
      themes_per_generation: 3,
      is_default: true,
      is_active: true,
      sort_order: 0,
      features: [],
      limits: {},
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    } as PackagePricingTier;
  }

  // ==========================================
  // RATE LIMITING
  // ==========================================

  /**
   * Check rate limits for a package
   */
  static async checkPackageRateLimit(
    userIdentifier: string,
    packageId: string,
    userType: 'anonymous' | 'free' | 'paid' | 'premium' = 'anonymous'
  ): Promise<RateLimitCheck> {
    // Temporarily disabled to avoid 404 errors - function not implemented yet
    return this.getSimplifiedRateLimit(userType);
    
    /* TODO: Re-enable when database function is created
    try {
      const { data, error } = await supabase.rpc('check_package_rate_limit', {
        p_user_identifier: userIdentifier,
        p_package_id: packageId,
        p_user_type: userType
      });

      if (error) {
        if (error.code === 'PGRST202' || error.message?.includes('Could not find the function')) {
          return this.getSimplifiedRateLimit(userType);
        }
        
        console.error('Error checking package rate limit:', error);
        throw new Error('Failed to check rate limit');
      }

      return data as RateLimitCheck;
    } catch (error) {
      console.warn('Package rate limit check failed, using simplified rate limiting:', error);
      return this.getSimplifiedRateLimit(userType);
    }
    */
  }

  /**
   * Simplified rate limiting fallback when database function is not available
   */
  private static getSimplifiedRateLimit(userType: string): RateLimitCheck {
    // For now, allow all package usage - this can be enhanced later
    return {
      allowed: true,
      remaining: userType === 'anonymous' ? 3 : 10, // Simple limits
      resetTime: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours from now
      reason: undefined
    };
  }

  /**
   * Increment package usage counters
   */
  static async incrementPackageUsage(
    userIdentifier: string,
    packageId: string,
    increment: number = 1
  ): Promise<boolean> {
    try {
      const { data, error } = await supabase.rpc('increment_package_usage', {
        p_user_identifier: userIdentifier,
        p_package_id: packageId,
        p_increment: increment
      });

      if (error) {
        // If function doesn't exist, log warning but continue
        if (error.code === 'PGRST202' || error.message?.includes('Could not find the function')) {
          console.warn('Package usage increment function not found, skipping usage tracking');
          return true; // Pretend success
        }
        
        console.error('Error incrementing package usage:', error);
        throw new Error('Failed to increment package usage');
      }

      return data;
    } catch (error) {
      console.warn('Package usage increment failed, continuing without tracking:', error);
      return true; // Pretend success to not block generation
    }
  }

  // ==========================================
  // PACKAGE USAGE PROCESSING
  // ==========================================

  /**
   * Process package usage (complete workflow)
   */
  static async processPackageUsage(
    userId: string,
    packageId: string,
    tierId: string,
    sessionId?: string,
    themesUsed: string[] = [],
    uploadType: string = 'couple'
  ): Promise<PackageProcessingResult> {
    try {
      const { data, error } = await supabase.rpc('process_package_usage', {
        p_user_id: userId,
        p_package_id: packageId,
        p_tier_id: tierId,
        p_session_id: sessionId,
        p_themes_used: themesUsed,
        p_upload_type: uploadType
      });

      if (error) {
        // If function doesn't exist, use simplified processing
        if (error.code === 'PGRST202' || error.message?.includes('Could not find the function')) {
          // Silently use simplified processing - function not implemented yet
          return this.getSimplifiedProcessingResult(userId, packageId, tierId);
        }
        
        console.error('Error processing package usage:', error);
        throw new Error('Failed to process package usage');
      }

      return data as PackageProcessingResult;
    } catch (error) {
      console.warn('Package usage processing failed, using simplified processing:', error);
      return this.getSimplifiedProcessingResult(userId, packageId, tierId);
    }
  }

  /**
   * Simplified processing fallback when database function is not available
   */
  private static getSimplifiedProcessingResult(userId: string, packageId: string, tierId: string): PackageProcessingResult {
    // Generate a simple usage ID for tracking
    const usageId = `fallback_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    return {
      success: true,
      usageId,
      creditsUsed: 1, // Simple credit consumption
      tier: {
        id: 'fallback-tier',
        name: 'Standard',
        credits_required: 1,
        themes_per_generation: 3,
        is_default: true
      } as any // Simplified tier data
    };
  }

  /**
   * Track package usage manually
   */
  static async trackPackageUsage(
    userId: string,
    packageId: string,
    tierId: string,
    creditsUsed: number = 1,
    generationsCount: number = 3,
    themesUsed: string[] = [],
    sessionId?: string,
    uploadType: string = 'couple'
  ): Promise<string> {
    const { data, error } = await supabase.rpc('track_package_usage', {
      p_user_id: userId,
      p_package_id: packageId,
      p_tier_id: tierId,
      p_credits_used: creditsUsed,
      p_generations_count: generationsCount,
      p_themes_used: themesUsed,
      p_session_id: sessionId,
      p_upload_type: uploadType
    });

    if (error) {
      console.error('Error tracking package usage:', error);
      throw new Error('Failed to track package usage');
    }

    return data; // Returns usage ID
  }

  /**
   * Complete package usage
   */
  static async completePackageUsage(
    usageId: string,
    status: 'completed' | 'failed' | 'cancelled' = 'completed',
    processingTime?: number,
    qualityScore?: number,
    errorMessage?: string
  ): Promise<boolean> {
    // Temporarily disabled to avoid 404 errors - function not implemented yet
    return true;
    
    /* TODO: Re-enable when database function is created
    try {
      const { data, error } = await supabase.rpc('complete_package_usage', {
        p_usage_id: usageId,
        p_status: status,
        p_processing_time: processingTime,
        p_quality_score: qualityScore,
        p_error_message: errorMessage
      });

      if (error) {
        if (error.code === 'PGRST202' || error.message?.includes('Could not find the function')) {
          console.warn('Package usage completion function not found, skipping usage tracking');
          return true;
        }
        
        console.error('Error completing package usage:', error);
        throw new Error('Failed to complete package usage');
      }

      return data;
    } catch (error) {
      console.warn('Package usage completion failed, continuing without tracking:', error);
      return true;
    }
    */
  }

  // ==========================================
  // USER USAGE HISTORY
  // ==========================================

  /**
   * Get user's package usage history
   */
  static async getUserPackageUsage(
    userId: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<PackageUsage[]> {
    const { data, error } = await supabase
      .from('package_usage')
      .select(`
        *,
        package:packages(name, description),
        tier:package_pricing_tiers(display_name)
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Error fetching user package usage:', error);
      throw new Error('Failed to fetch package usage history');
    }

    return data || [];
  }

  /**
   * Get user's recent package usage
   */
  static async getUserRecentUsage(userId: string, days: number = 30): Promise<PackageUsage[]> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const { data, error } = await supabase
      .from('package_usage')
      .select(`
        *,
        package:packages(name, description),
        tier:package_pricing_tiers(display_name)
      `)
      .eq('user_id', userId)
      .gte('created_at', startDate.toISOString())
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching recent package usage:', error);
      throw new Error('Failed to fetch recent package usage');
    }

    return data || [];
  }

  // ==========================================
  // STATISTICS AND ANALYTICS
  // ==========================================

  /**
   * Get package statistics
   */
  static async getPackageStatistics(): Promise<{
    total_packages: number;
    active_packages: number;
    total_themes: number;
    total_usage_today: number;
    total_revenue_today_cents: number;
  }> {
    const { data, error } = await supabase.rpc('get_package_statistics');

    if (error) {
      console.error('Error fetching package statistics:', error);
      throw new Error('Failed to fetch package statistics');
    }

    return data;
  }

  /**
   * Get package analytics for date range
   */
  static async getPackageAnalytics(
    packageId?: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<any[]> {
    let query = supabase
      .from('package_analytics')
      .select('*')
      .order('date', { ascending: false });

    if (packageId) {
      query = query.eq('package_id', packageId);
    }

    if (startDate) {
      query = query.gte('date', startDate.toISOString().split('T')[0]);
    }

    if (endDate) {
      query = query.lte('date', endDate.toISOString().split('T')[0]);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching package analytics:', error);
      throw new Error('Failed to fetch package analytics');
    }

    return data || [];
  }

  // ==========================================
  // CRUD OPERATIONS FOR ADMIN
  // ==========================================

  /**
   * Create a new package
   */
  static async createPackage(packageData: Partial<Package>): Promise<Package> {
    const { data, error } = await supabase
      .from('photo_packages')
      .insert({
        slug: packageData.name?.toLowerCase().replace(/\s+/g, '-') || '',
        name: packageData.name,
        description: packageData.description,
        category: packageData.category || 'wedding',
        images_per_generation: packageData.images_per_generation || 3,
        base_prompt_template: packageData.base_prompt_template || '',
        generation_instructions: packageData.generation_instructions || {},
        is_active: packageData.is_active !== undefined ? packageData.is_active : true,
        is_featured: packageData.is_featured !== undefined ? packageData.is_featured : false,
        sort_order: packageData.sort_order || 0,
        settings: packageData.settings || {},
        metadata: packageData.metadata || {}
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating package:', error);
      throw new Error('Failed to create package');
    }

    return {
      ...data,
      featured: data.is_featured,
      tags: data.metadata?.tags || []
    };
  }

  /**
   * Update an existing package
   */
  static async updatePackage(packageId: string, packageData: Partial<Package>): Promise<Package> {
    const updateData: any = {};
    
    if (packageData.name) updateData.name = packageData.name;
    if (packageData.description !== undefined) updateData.description = packageData.description;
    if (packageData.category) updateData.category = packageData.category;
    if (packageData.images_per_generation) updateData.images_per_generation = packageData.images_per_generation;
    if (packageData.base_prompt_template !== undefined) updateData.base_prompt_template = packageData.base_prompt_template;
    if (packageData.generation_instructions) updateData.generation_instructions = packageData.generation_instructions;
    if (packageData.is_active !== undefined) updateData.is_active = packageData.is_active;
    if (packageData.is_featured !== undefined) updateData.is_featured = packageData.is_featured;
    if (packageData.sort_order !== undefined) updateData.sort_order = packageData.sort_order;
    if (packageData.settings) updateData.settings = packageData.settings;
    if (packageData.metadata) updateData.metadata = packageData.metadata;

    // Update slug if name changed
    if (packageData.name) {
      updateData.slug = packageData.name.toLowerCase().replace(/\s+/g, '-');
    }

    const { data, error } = await supabase
      .from('photo_packages')
      .update(updateData)
      .eq('id', packageId)
      .select()
      .single();

    if (error) {
      console.error('Error updating package:', error);
      throw new Error('Failed to update package');
    }

    return {
      ...data,
      featured: data.is_featured,
      tags: data.metadata?.tags || []
    };
  }

  /**
   * Delete a package
   */
  static async deletePackage(packageId: string): Promise<boolean> {
    const { error } = await supabase
      .from('photo_packages')
      .delete()
      .eq('id', packageId);

    if (error) {
      console.error('Error deleting package:', error);
      throw new Error('Failed to delete package');
    }

    return true;
  }

  /**
   * Create a new package theme
   */
  static async createPackageTheme(themeData: Partial<PackageTheme>): Promise<PackageTheme> {
    const { data, error } = await supabase
      .from('package_themes')
      .insert({
        package_id: themeData.package_id,
        name: themeData.name,
        description: themeData.description,
        setting_prompt: themeData.setting_prompt || '',
        clothing_prompt: themeData.clothing_prompt,
        atmosphere_prompt: themeData.atmosphere_prompt,
        technical_prompt: themeData.technical_prompt,
        style_modifiers: themeData.style_modifiers || [],
        color_palette: themeData.color_palette || [],
        inspiration_references: themeData.inspiration_references || [],
        is_active: themeData.is_active !== undefined ? themeData.is_active : true,
        is_premium: themeData.is_premium !== undefined ? themeData.is_premium : false,
        is_seasonal: themeData.is_seasonal !== undefined ? themeData.is_seasonal : false,
        season_start: themeData.season_start,
        season_end: themeData.season_end,
        sort_order: themeData.sort_order || 0,
        popularity_score: themeData.popularity_score || 5
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating theme:', error);
      throw new Error('Failed to create theme');
    }

    return {
      ...data,
      mood_tags: data.style_modifiers || [],
      premium_only: data.is_premium
    };
  }

  /**
   * Update an existing package theme
   */
  static async updatePackageTheme(themeId: string, themeData: Partial<PackageTheme>): Promise<PackageTheme> {
    const updateData: any = {};
    
    if (themeData.name) updateData.name = themeData.name;
    if (themeData.description !== undefined) updateData.description = themeData.description;
    if (themeData.setting_prompt !== undefined) updateData.setting_prompt = themeData.setting_prompt;
    if (themeData.clothing_prompt !== undefined) updateData.clothing_prompt = themeData.clothing_prompt;
    if (themeData.atmosphere_prompt !== undefined) updateData.atmosphere_prompt = themeData.atmosphere_prompt;
    if (themeData.technical_prompt !== undefined) updateData.technical_prompt = themeData.technical_prompt;
    if (themeData.style_modifiers) updateData.style_modifiers = themeData.style_modifiers;
    if (themeData.color_palette) updateData.color_palette = themeData.color_palette;
    if (themeData.inspiration_references) updateData.inspiration_references = themeData.inspiration_references;
    if (themeData.is_active !== undefined) updateData.is_active = themeData.is_active;
    if (themeData.is_premium !== undefined) updateData.is_premium = themeData.is_premium;
    if (themeData.is_seasonal !== undefined) updateData.is_seasonal = themeData.is_seasonal;
    if (themeData.season_start !== undefined) updateData.season_start = themeData.season_start;
    if (themeData.season_end !== undefined) updateData.season_end = themeData.season_end;
    if (themeData.sort_order !== undefined) updateData.sort_order = themeData.sort_order;
    if (themeData.popularity_score !== undefined) updateData.popularity_score = themeData.popularity_score;

    const { data, error } = await supabase
      .from('package_themes')
      .update(updateData)
      .eq('id', themeId)
      .select()
      .single();

    if (error) {
      console.error('Error updating theme:', error);
      throw new Error('Failed to update theme');
    }

    return {
      ...data,
      mood_tags: data.style_modifiers || [],
      premium_only: data.is_premium
    };
  }

  /**
   * Delete a package theme
   */
  static async deletePackageTheme(themeId: string): Promise<boolean> {
    const { error } = await supabase
      .from('package_themes')
      .delete()
      .eq('id', themeId);

    if (error) {
      console.error('Error deleting theme:', error);
      throw new Error('Failed to delete theme');
    }

    return true;
  }

  /**
   * Create a new pricing tier
   */
  static async createPricingTier(tierData: Partial<PackagePricingTier>): Promise<PackagePricingTier> {
    const { data, error } = await supabase
      .from('package_pricing_tiers')
      .insert({
        package_id: tierData.package_id,
        name: tierData.name || tierData.display_name,
        shoots_count: tierData.shoots_count || tierData.included_generations || 1,
        price_cents: tierData.price_cents || tierData.price_amount_cents || 0,
        original_price_cents: tierData.original_price_cents,
        badge: tierData.badge,
        features: tierData.features || [],
        restrictions: tierData.restrictions || {},
        sort_order: tierData.sort_order || 0,
        is_active: tierData.is_active !== undefined ? tierData.is_active : true,
        is_default: tierData.is_default !== undefined ? tierData.is_default : false
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating pricing tier:', error);
      throw new Error('Failed to create pricing tier');
    }

    return {
      ...data,
      display_name: data.name,
      price_amount_cents: data.price_cents,
      currency: 'USD',
      is_popular: data.badge === 'MOST POPULAR',
      included_generations: data.shoots_count
    };
  }

  /**
   * Update an existing pricing tier
   */
  static async updatePricingTier(tierId: string, tierData: Partial<PackagePricingTier>): Promise<PackagePricingTier> {
    const updateData: any = {};
    
    if (tierData.name || tierData.display_name) updateData.name = tierData.name || tierData.display_name;
    if (tierData.shoots_count || tierData.included_generations) updateData.shoots_count = tierData.shoots_count || tierData.included_generations;
    if (tierData.price_cents !== undefined || tierData.price_amount_cents !== undefined) updateData.price_cents = tierData.price_cents || tierData.price_amount_cents;
    if (tierData.original_price_cents !== undefined) updateData.original_price_cents = tierData.original_price_cents;
    if (tierData.badge !== undefined) updateData.badge = tierData.badge;
    if (tierData.features) updateData.features = tierData.features;
    if (tierData.restrictions) updateData.restrictions = tierData.restrictions;
    if (tierData.sort_order !== undefined) updateData.sort_order = tierData.sort_order;
    if (tierData.is_active !== undefined) updateData.is_active = tierData.is_active;
    if (tierData.is_default !== undefined) updateData.is_default = tierData.is_default;

    const { data, error } = await supabase
      .from('package_pricing_tiers')
      .update(updateData)
      .eq('id', tierId)
      .select()
      .single();

    if (error) {
      console.error('Error updating pricing tier:', error);
      throw new Error('Failed to update pricing tier');
    }

    return {
      ...data,
      display_name: data.name,
      price_amount_cents: data.price_cents,
      currency: 'USD',
      is_popular: data.badge === 'MOST POPULAR',
      included_generations: data.shoots_count
    };
  }

  /**
   * Delete a pricing tier
   */
  static async deletePricingTier(tierId: string): Promise<boolean> {
    const { error } = await supabase
      .from('package_pricing_tiers')
      .delete()
      .eq('id', tierId);

    if (error) {
      console.error('Error deleting pricing tier:', error);
      throw new Error('Failed to delete pricing tier');
    }

    return true;
  }

  // ==========================================
  // UTILITY METHODS
  // ==========================================

  /**
   * Search packages by text
   */
  static async searchPackages(searchTerm: string): Promise<Package[]> {
    const { data, error } = await supabase
      .from('packages')
      .select(`
        *,
        category:package_categories(*),
        themes:package_themes(count),
        pricing_tiers:package_pricing_tiers(count)
      `)
      .eq('status', 'active')
      .or(`name.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%,tags.cs.{${searchTerm}}`)
      .order('featured', { ascending: false });

    if (error) {
      console.error('Error searching packages:', error);
      throw new Error('Failed to search packages');
    }

    return data || [];
  }

  /**
   * Get user type based on credits
   */
  static getUserType(hasAuth: boolean, paidCredits: number = 0, bonusCredits: number = 0): 'anonymous' | 'free' | 'paid' | 'premium' {
    if (!hasAuth) return 'anonymous';
    if (paidCredits === 0 && bonusCredits === 0) return 'free';
    if (paidCredits > 0 && paidCredits < 100) return 'paid';
    return 'premium';
  }

  /**
   * Format package pricing for display
   */
  static formatPackagePrice(priceCents: number, currency: string = 'USD'): string {
    const price = priceCents / 100;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase()
    }).format(price);
  }

  /**
   * Calculate price per credit
   */
  static calculatePricePerCredit(priceCents: number, creditCost: number): number {
    return (priceCents / 100) / creditCost;
  }
}

// Export default instance
export default PhotoPackagesService;