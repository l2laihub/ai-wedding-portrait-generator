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
      console.error('Error fetching pricing tier:', error);
      throw new Error('Failed to fetch pricing tier');
    }

    // Transform data for UI compatibility
    return {
      ...data,
      display_name: data.name,
      price_amount_cents: data.price_cents,
      currency: 'USD',
      is_popular: data.badge === 'MOST POPULAR',
      included_generations: data.shoots_count
    };
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
    const { data, error } = await supabase.rpc('check_package_rate_limit', {
      p_user_identifier: userIdentifier,
      p_package_id: packageId,
      p_user_type: userType
    });

    if (error) {
      console.error('Error checking package rate limit:', error);
      throw new Error('Failed to check rate limit');
    }

    return data as RateLimitCheck;
  }

  /**
   * Increment package usage counters
   */
  static async incrementPackageUsage(
    userIdentifier: string,
    packageId: string,
    increment: number = 1
  ): Promise<boolean> {
    const { data, error } = await supabase.rpc('increment_package_usage', {
      p_user_identifier: userIdentifier,
      p_package_id: packageId,
      p_increment: increment
    });

    if (error) {
      console.error('Error incrementing package usage:', error);
      throw new Error('Failed to increment package usage');
    }

    return data;
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
    const { data, error } = await supabase.rpc('process_package_usage', {
      p_user_id: userId,
      p_package_id: packageId,
      p_tier_id: tierId,
      p_session_id: sessionId,
      p_themes_used: themesUsed,
      p_upload_type: uploadType
    });

    if (error) {
      console.error('Error processing package usage:', error);
      throw new Error('Failed to process package usage');
    }

    return data as PackageProcessingResult;
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
    const { data, error } = await supabase.rpc('complete_package_usage', {
      p_usage_id: usageId,
      p_status: status,
      p_processing_time: processingTime,
      p_quality_score: qualityScore,
      p_error_message: errorMessage
    });

    if (error) {
      console.error('Error completing package usage:', error);
      throw new Error('Failed to complete package usage');
    }

    return data;
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