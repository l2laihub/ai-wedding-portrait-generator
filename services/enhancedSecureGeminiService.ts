/**
 * Enhanced Secure Gemini Service with Template Engine Integration
 * 
 * Extends the existing secureGeminiService with advanced theme management
 * and template engine capabilities while maintaining backward compatibility
 */

import { GeneratedContent } from '../types'
import { userIdentificationService } from './userIdentificationService'
import { supabase } from './supabaseClient'
import { enhancedPromptService } from './enhancedPromptService'

// Dynamic loading helper for enhanced prompt service
let enhancedPromptServiceCache: any = null;
const getEnhancedPromptService = async () => {
  if (enhancedPromptServiceCache) {
    return enhancedPromptServiceCache;
  }

  try {
    // Try to dynamically import the TypeScript version first
    const tsModule = await import('./enhancedPromptService');
    if (tsModule?.enhancedPromptService) {
      enhancedPromptServiceCache = tsModule.enhancedPromptService;
      return enhancedPromptServiceCache;
    }
  } catch (tsError) {
    console.warn('Failed to load TS enhanced prompt service:', tsError);
  }

  try {
    // Fallback to JavaScript version
    const jsModule = await import('./enhancedPromptService.js');
    if (jsModule?.enhancedPromptService) {
      enhancedPromptServiceCache = jsModule.enhancedPromptService;
      return enhancedPromptServiceCache;
    }
  } catch (jsError) {
    console.warn('Failed to load JS enhanced prompt service:', jsError);
  }

  throw new Error('Enhanced prompt service not available');
};
import { ThemeManager } from '../src/config/themes.config.js'
import { ThemeSelector } from '../src/utils/themeUtils.js'

export interface EnhancedGenerationOptions {
  imageFile: File
  prompt?: string
  style?: string
  themes?: any[] // Array of theme objects
  useThemeEngine?: boolean
  userPreferences?: any
  retryCount?: number
  customPrompt?: string
  portraitType?: 'single' | 'couple' | 'family'
  familyMemberCount?: number
}

export interface EnhancedGenerationResult {
  success: boolean
  data?: GeneratedContent & { 
    style: string
    theme?: any
    promptUsed?: string
  }
  error?: string
  rateLimitInfo?: {
    hourly_remaining: number
    daily_remaining: number
    reset_at: string
  }
  processing_time_ms?: number
  theme?: any
}

export interface ThemeGenerationSummary {
  results: (EnhancedGenerationResult & { style: string })[]
  successful: number
  failed: number
  themesUsed: any[]
  generationTime: number
  averageProcessingTime: number
}

class EnhancedSecureGeminiService {
  private readonly edgeFunctionUrl: string
  private readonly maxRetries = 2
  private useEnhancedByDefault = true

  constructor() {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || ''
    this.edgeFunctionUrl = `${supabaseUrl}/functions/v1/portrait-generation-simple`
  }

  /**
   * Convert file to base64 for API transmission
   */
  private async fileToBase64(file: File): Promise<{ base64: string; mimeType: string }> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.readAsDataURL(file)
      reader.onload = () => {
        const result = reader.result as string
        const [header, data] = result.split(',')
        const mimeType = header.match(/:(.*?);/)?.[1] || 'application/octet-stream'
        resolve({ base64: data, mimeType })
      }
      reader.onerror = error => reject(error)
    })
  }

  /**
   * Get authentication headers for API calls
   */
  private async getAuthHeaders(): Promise<Record<string, string>> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    }

    // Try to get authenticated user session
    const { data: { session } } = await supabase.auth.getSession()
    
    if (session?.access_token) {
      headers['Authorization'] = `Bearer ${session.access_token}`
    }

    return headers
  }

  /**
   * Make API call to secure backend
   */
  private async callBackendAPI(requestData: any): Promise<EnhancedGenerationResult> {
    const headers = await this.getAuthHeaders()
    
    const response = await fetch(this.edgeFunctionUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(requestData)
    })

    const responseData = await response.json()

    if (!response.ok) {
      if (response.status === 429) {
        return {
          success: false,
          error: responseData.error || 'Rate limit exceeded',
          rateLimitInfo: responseData.rateLimitInfo
        }
      }
      
      return {
        success: false,
        error: responseData.error || `HTTP ${response.status}: ${response.statusText}`
      }
    }

    return {
      success: true,
      data: responseData.data,
      rateLimitInfo: responseData.rateLimitInfo,
      processing_time_ms: responseData.processing_time_ms
    }
  }

  /**
   * Enhanced portrait generation with theme support
   */
  public async generateEnhancedPortrait(options: EnhancedGenerationOptions): Promise<EnhancedGenerationResult> {
    const {
      imageFile,
      prompt,
      style,
      themes = [],
      useThemeEngine = this.useEnhancedByDefault,
      customPrompt = '',
      portraitType = 'couple',
      familyMemberCount = 3,
      retryCount = 0
    } = options

    const startTime = Date.now()

    try {
      // Prepare image data
      const { base64, mimeType } = await this.fileToBase64(imageFile)

      let finalPrompt: string
      let selectedTheme: any = null

      if (useThemeEngine && themes.length > 0) {
        // Use first theme if multiple provided
        selectedTheme = themes[0]
        console.log('[EnhancedSecureGeminiService] Using theme engine with theme:', selectedTheme.name)

        finalPrompt = await enhancedPromptService.generatePromptWithTheme(
          portraitType,
          selectedTheme,
          customPrompt,
          familyMemberCount
        )
      } else if (useThemeEngine && style) {
        // Try to match style to theme
        selectedTheme = ThemeManager.getThemeByName(style) || 
                       ThemeManager.getThemeById(style)

        if (selectedTheme) {
          console.log('[EnhancedSecureGeminiService] Using theme engine with matched theme:', selectedTheme.name)
          finalPrompt = await enhancedPromptService.generatePromptWithTheme(
            portraitType,
            selectedTheme,
            customPrompt,
            familyMemberCount
          )
        } else {
          // Fallback to enhanced prompt service with style
          console.log('[EnhancedSecureGeminiService] Using enhanced prompt service with style')
          finalPrompt = await enhancedPromptService.generateEnhancedPrompt(
            portraitType,
            style || 'Classic Wedding',
            customPrompt,
            familyMemberCount
          )
        }
      } else if (prompt) {
        // Use provided prompt directly
        finalPrompt = prompt
        if (process.env.NODE_ENV === 'development') console.log('[EnhancedSecureGeminiService] Using provided prompt')
      } else {
        // Fallback to enhanced prompt service
        if (process.env.NODE_ENV === 'development') console.log('[EnhancedSecureGeminiService] Using fallback enhanced prompt generation')
        finalPrompt = await enhancedPromptService.generateEnhancedPrompt(
          portraitType,
          style || 'Classic Wedding',
          customPrompt,
          familyMemberCount,
          { fallbackToLegacy: true }
        )
      }

      // Add user identification for rate limiting
      const userInfo = userIdentificationService.getUserInfo()

      const requestData = {
        image: base64,
        mimeType,
        prompt: finalPrompt,
        user_fingerprint: userInfo.fingerprint,
        user_agent: userInfo.userAgent,
        request_id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      }

      // Prompt logging removed for production security

      const result = await this.callBackendAPI(requestData)

      // Add theme info and timing to result
      if (result.success && result.data) {
        result.data.style = selectedTheme?.name || style || 'Unknown'
        result.theme = selectedTheme
        result.data.promptUsed = finalPrompt
      }

      result.processing_time_ms = Date.now() - startTime

      return result

    } catch (error) {
      console.error('[EnhancedSecureGeminiService] Generation error:', error)
      
      // Retry logic
      if (retryCount < this.maxRetries) {
        console.log(`[EnhancedSecureGeminiService] Retrying... (${retryCount + 1}/${this.maxRetries})`)
        return this.generateEnhancedPortrait({
          ...options,
          retryCount: retryCount + 1
        })
      }

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        processing_time_ms: Date.now() - startTime
      }
    }
  }

  /**
   * Generate multiple portraits with enhanced theme support
   */
  public async generateMultipleEnhancedPortraits(
    imageFile: File,
    options: {
      themes?: any[]
      styles?: string[]
      userPreferences?: any
      customPrompt?: string
      portraitType?: 'single' | 'couple' | 'family'
      familyMemberCount?: number
      useRecommendations?: boolean
      count?: number
    } = {},
    onProgressUpdate?: (identifier: string, status: 'in_progress' | 'completed' | 'failed', theme?: any) => void
  ): Promise<ThemeGenerationSummary> {
    const {
      themes,
      styles = [],
      userPreferences = {},
      customPrompt = '',
      portraitType = 'couple',
      familyMemberCount = 3,
      useRecommendations = false,
      count = 3
    } = options

    const startTime = Date.now()
    const results: (EnhancedGenerationResult & { style: string })[] = []
    let themesToUse: any[] = []

    // Determine themes to use
    if (themes && themes.length > 0) {
      themesToUse = themes
      console.log('[EnhancedSecureGeminiService] Using provided themes:', themesToUse.length)
    } else if (useRecommendations) {
      themesToUse = ThemeSelector.getRecommendedThemes(userPreferences, count)
      console.log('[EnhancedSecureGeminiService] Using recommended themes:', themesToUse.length)
    } else if (styles.length > 0) {
      // Convert styles to themes where possible
      themesToUse = styles.map(style => 
        ThemeManager.getThemeByName(style) || 
        ThemeManager.getThemeById(style) ||
        { name: style, id: style.toLowerCase().replace(/\s+/g, '_') }
      )
      console.log('[EnhancedSecureGeminiService] Using style-based themes:', themesToUse.length)
    } else {
      themesToUse = ThemeManager.getRandomThemes(count)
      console.log('[EnhancedSecureGeminiService] Using random themes:', themesToUse.length)
    }

    // Generate portraits for each theme
    const generateThemePortrait = async (theme: any) => {
      const identifier = theme.id || theme.name
      
      try {
        // Notify that generation is starting
        onProgressUpdate?.(identifier, 'in_progress', theme)
        
        const result = await this.generateEnhancedPortrait({
          imageFile,
          themes: [theme],
          useThemeEngine: true,
          customPrompt,
          portraitType,
          familyMemberCount
        })
        
        // Notify completion status
        if (result.success) {
          onProgressUpdate?.(identifier, 'completed', theme)
        } else {
          onProgressUpdate?.(identifier, 'failed', theme)
        }
        
        return { 
          ...result, 
          style: theme.name || theme.id || 'Unknown',
          theme 
        }
        
      } catch (error) {
        console.error(`Failed to generate theme portrait for "${identifier}":`, error)
        
        // Notify failure
        onProgressUpdate?.(identifier, 'failed', theme)
        
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          style: theme.name || theme.id || 'Unknown',
          theme
        }
      }
    }

    // Start all generations in parallel
    const generationPromises = themesToUse.map(theme => generateThemePortrait(theme))
    
    // Wait for all to complete
    const allResults = await Promise.allSettled(generationPromises)
    
    // Process results
    allResults.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        results.push(result.value)
      } else {
        console.error(`Generation ${index} failed:`, result.reason)
        results.push({
          success: false,
          error: result.reason?.message || 'Generation failed',
          style: themesToUse[index]?.name || 'Unknown',
          theme: themesToUse[index]
        })
      }
    })

    const successful = results.filter(r => r.success).length
    const failed = results.length - successful
    const totalTime = Date.now() - startTime
    const averageProcessingTime = results.reduce((sum, r) => 
      sum + (r.processing_time_ms || 0), 0) / results.length

    console.log(`[EnhancedSecureGeminiService] Generated ${successful}/${results.length} portraits in ${totalTime}ms`)

    return {
      results,
      successful,
      failed,
      themesUsed: themesToUse,
      generationTime: totalTime,
      averageProcessingTime
    }
  }

  /**
   * Backward compatibility method - generates using legacy style approach
   */
  public async generateMultiplePortraitsLegacy(
    imageFile: File,
    styles: string[],
    customPrompt: string = '',
    photoType: string = 'couple',
    familyMemberCount: number = 3,
    onProgressUpdate?: (style: string, status: 'in_progress' | 'completed' | 'failed') => void
  ): Promise<{
    results: (EnhancedGenerationResult & { style: string })[]
    successful: number
    failed: number
  }> {
    console.log('[EnhancedSecureGeminiService] Using legacy compatibility mode')

    const summary = await this.generateMultipleEnhancedPortraits(
      imageFile,
      {
        styles,
        customPrompt,
        portraitType: photoType as 'single' | 'couple' | 'family',
        familyMemberCount,
        count: styles.length
      },
      onProgressUpdate
    )

    return {
      results: summary.results,
      successful: summary.successful,
      failed: summary.failed
    }
  }

  /**
   * Get smart theme recommendations for a user
   */
  public getThemeRecommendations(
    userPreferences: any = {},
    count: number = 3
  ): any[] {
    return ThemeSelector.getRecommendedThemes(userPreferences, count)
  }

  /**
   * Get seasonal theme recommendations
   */
  public getSeasonalThemes(season?: string, count: number = 3): any[] {
    if (!season) {
      const month = new Date().getMonth()
      const seasons = ['winter', 'winter', 'spring', 'spring', 'spring', 
                      'summer', 'summer', 'summer', 'fall', 'fall', 'fall', 'winter']
      season = seasons[month]
    }

    return ThemeSelector.getSeasonalThemes(season, count)
  }

  /**
   * Configure the enhanced service
   */
  public configure(options: {
    useEnhancedByDefault?: boolean
  }) {
    if (options.useEnhancedByDefault !== undefined) {
      this.useEnhancedByDefault = options.useEnhancedByDefault
    }
    return this
  }

  /**
   * Get service statistics
   */
  public getServiceStats() {
    return {
      enhancedMode: this.useEnhancedByDefault,
      availableThemes: ThemeManager.getEnabledThemes().length,
      promptServiceStats: enhancedPromptService.getServiceStats()
    }
  }
}

// Export singleton instance
export const enhancedSecureGeminiService = new EnhancedSecureGeminiService()
export default enhancedSecureGeminiService