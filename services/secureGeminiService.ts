/**
 * Secure Gemini Service
 * Handles portrait generation through secure backend with rate limiting
 */

import { GeneratedContent } from '../types'
import { userIdentificationService } from './userIdentificationService'
import { supabase } from './supabaseClient'
import { promptService } from './promptService'

export interface GenerationOptions {
  imageFile: File
  prompt: string
  style: string
  retryCount?: number
}

export interface GenerationResult {
  success: boolean
  data?: GeneratedContent & { style: string }
  error?: string
  rateLimitInfo?: {
    hourly_remaining: number
    daily_remaining: number
    reset_at: string
  }
  processing_time_ms?: number
}

export interface RateLimitStatus {
  canProceed: boolean
  hourlyRemaining: number
  dailyRemaining: number
  resetAt: Date
  userType: 'anonymous' | 'authenticated' | 'premium'
}

class SecureGeminiService {
  private readonly edgeFunctionUrl: string
  private readonly maxRetries = 2

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
  private async callBackendAPI(requestData: any): Promise<GenerationResult> {
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
          rateLimitInfo: responseData.rate_limit
        }
      }
      
      throw new Error(responseData.error || `API error: ${response.status}`)
    }

    return {
      success: true,
      data: responseData.data ? { ...responseData.data, style: requestData.style } : undefined,
      rateLimitInfo: responseData.rate_limit,
      processing_time_ms: responseData.processing_time_ms
    }
  }

  /**
   * Check current rate limit status
   */
  public async checkRateLimit(): Promise<RateLimitStatus> {
    try {
      const identification = await userIdentificationService.getCurrentIdentification()
      const rateLimitId = await userIdentificationService.getRateLimitIdentifier()
      
      // Make a test call to get rate limit status
      const testRequest = {
        imageData: '', // Empty for rate limit check
        imageType: 'image/jpeg',
        prompt: 'test',
        style: 'test',
        userId: identification.userId,
        sessionId: identification.sessionId,
        checkOnly: true // Special flag for rate limit checking
      }

      const response = await fetch(this.edgeFunctionUrl, {
        method: 'POST',
        headers: await this.getAuthHeaders(),
        body: JSON.stringify(testRequest)
      })

      const data = await response.json()
      
      if (data.rate_limit) {
        return {
          canProceed: response.ok,
          hourlyRemaining: data.rate_limit.hourly_remaining || 0,
          dailyRemaining: data.rate_limit.daily_remaining || 0,
          resetAt: new Date(data.rate_limit.reset_at),
          userType: identification.userType
        }
      }

      // Fallback for when rate limit info isn't available
      return {
        canProceed: true,
        hourlyRemaining: identification.userType === 'anonymous' ? 5 : 30,
        dailyRemaining: identification.userType === 'anonymous' ? 10 : 100,
        resetAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour from now
        userType: identification.userType
      }

    } catch (error) {
      console.warn('Failed to check rate limit:', error)
      return {
        canProceed: false,
        hourlyRemaining: 0,
        dailyRemaining: 0,
        resetAt: new Date(),
        userType: 'anonymous'
      }
    }
  }

  /**
   * Generate portrait with secure backend
   */
  public async generatePortrait(options: GenerationOptions): Promise<GenerationResult> {
    const { imageFile, prompt, style, retryCount = 0 } = options

    try {
      // Get user identification
      const identification = await userIdentificationService.getCurrentIdentification()
      
      // Convert image to base64
      const { base64, mimeType } = await this.fileToBase64(imageFile)

      // Prepare request data
      const requestData = {
        imageData: base64,
        imageType: mimeType,
        prompt,
        style,
        userId: identification.userId,
        sessionId: identification.sessionId
      }

      // Make API call
      const result = await this.callBackendAPI(requestData)

      if (result.success && result.data) {
        // Track successful generation
        await userIdentificationService.trackActivity('portrait_generated', {
          style,
          processing_time: result.processing_time_ms
        })

        return result
      }

      return result

    } catch (error: any) {
      console.error(`Error generating portrait (attempt ${retryCount + 1}):`, error)
      
      // Extract error details
      let errorMessage = ''
      
      if (error.message) {
        errorMessage = error.message
      } else if (typeof error === 'string') {
        errorMessage = error
      } else {
        errorMessage = 'Unknown error occurred'
      }
      
      const lowerErrorMessage = errorMessage.toLowerCase()
      
      // Handle different types of errors with user-friendly messages
      if (lowerErrorMessage.includes('rate limit') || lowerErrorMessage.includes('429')) {
        return {
          success: false,
          error: "⏰ You've reached your generation limit! Please wait before trying again or upgrade for more generations."
        }
      }
      
      if (lowerErrorMessage.includes('unsafe') || lowerErrorMessage.includes('blocked')) {
        return {
          success: false,
          error: "🛡️ Content safety check: Please try with a different photo or ensure it shows people clearly."
        }
      }
      
      // Handle 500 Internal Server Errors with retry logic
      if (lowerErrorMessage.includes('internal') || lowerErrorMessage.includes('500')) {
        if (retryCount < this.maxRetries) {
          if (process.env.NODE_ENV === 'development') console.log(`Retrying due to server error (attempt ${retryCount + 1}/${this.maxRetries})`)
          // Wait briefly before retry (exponential backoff)
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, retryCount) * 1000))
          return this.generatePortrait({ ...options, retryCount: retryCount + 1 })
        } else {
          return {
            success: false,
            error: "🔄 Server temporarily unavailable. The AI service is experiencing high demand. Please try again in a few moments."
          }
        }
      }
      
      // Network/connection issues
      if (lowerErrorMessage.includes('network') || lowerErrorMessage.includes('timeout') || lowerErrorMessage.includes('fetch')) {
        if (retryCount < this.maxRetries) {
          if (process.env.NODE_ENV === 'development') console.log(`Retrying due to network issue (attempt ${retryCount + 1}/${this.maxRetries})`)
          await new Promise(resolve => setTimeout(resolve, 2000)) // 2 second delay
          return this.generatePortrait({ ...options, retryCount: retryCount + 1 })
        } else {
          return {
            success: false,
            error: "🌐 Connection issue: Please check your internet and try again."
          }
        }
      }
      
      // Default error message
      return {
        success: false,
        error: `Failed to generate portrait: ${errorMessage}`
      }
    }
  }

  /**
   * Generate multiple portrait styles
   */
  public async generateMultiplePortraits(
    imageFile: File,
    styles: string[],
    customPrompt: string = '',
    photoType: string = 'couple',
    familyMemberCount: number = 3,
    onProgressUpdate?: (style: string, status: 'in_progress' | 'completed' | 'failed') => void
  ): Promise<{
    results: (GenerationResult & { style: string })[]
    successful: number
    failed: number
  }> {
    const results: (GenerationResult & { style: string })[] = []
    
    // Generate prompts for each style using the prompt service
    const generatePrompt = async (style: string): Promise<string> => {
      try {
        // Try async version first for fresh database data
        const generatedPrompt = await promptService.generatePrompt(
          photoType as 'single' | 'couple' | 'family',
          style,
          customPrompt,
          familyMemberCount
        );
        if (import.meta.env.DEV) console.log(`[PromptService] Generated prompt for ${photoType} ${style} from database:`, generatedPrompt.substring(0, 100) + '...');
        return generatedPrompt;
      } catch (error) {
        console.warn('Failed to generate prompt from database, trying localStorage:', error);
        
        try {
          // Fallback to sync version (localStorage)
          const generatedPrompt = promptService.generatePromptSync(
            photoType as 'single' | 'couple' | 'family',
            style,
            customPrompt,
            familyMemberCount
          );
          if (import.meta.env.DEV) console.log(`[PromptService] Generated prompt for ${photoType} ${style} from localStorage:`, generatedPrompt.substring(0, 100) + '...');
          return generatedPrompt;
        } catch (syncError) {
          console.warn('Failed to generate prompt from localStorage, using hardcoded fallback:', syncError);
          
          // Final fallback to hardcoded prompts
          const basePrompts = {
            single: `Transform the SINGLE PERSON in this image into a FULL BODY wedding portrait with a "${style}" theme. This is a SINGLE PERSON portrait - NOT a couple. Create a professional bridal/groom portrait showing them ALONE. Keep their face EXACTLY identical to the original - preserve ALL facial features, expressions, and complete likeness. Show the complete wedding outfit from head to toe, including dress/suit details, shoes, and accessories. ${customPrompt}. Ensure their face remains perfectly consistent and unchanged from the original photo while creating a stunning full-length INDIVIDUAL portrait.`,
            couple: `Transform the TWO PEOPLE (couple) in this image into a beautiful wedding portrait with a "${style}" theme. This is a COUPLE portrait - there should be TWO people in the result. Keep BOTH their faces EXACTLY identical to the original - preserve their facial features, expressions, and likeness completely. Maintain BOTH subjects' identity while transforming only their clothing and background to match the wedding style. ${customPrompt}. Make them look like they are dressed for a wedding in that style, but ensure BOTH faces remain perfectly consistent and unchanged from the original photo.`,
            family: `Transform this family of ${familyMemberCount} people into a beautiful wedding portrait with a "${style}" theme. Crucially, preserve the exact likeness of EACH and EVERY family member's face and unique facial features. Only transform their clothing and the environment. Ensure all ${familyMemberCount} individuals from the original photo are present and their identity is clearly recognizable. ${customPrompt}.`
          }
          
          return basePrompts[photoType as keyof typeof basePrompts] || basePrompts.couple;
        }
      }
    }

    // Generate portraits in parallel for better performance
    const generateStylePortrait = async (style: string) => {
      const prompt = await generatePrompt(style)
      
      // Prompt logging removed for production security
      
      try {
        // Notify that generation is starting
        onProgressUpdate?.(style, 'in_progress')
        
        const result = await this.generatePortrait({
          imageFile,
          prompt,
          style
        })
        
        // Notify completion status
        if (result.success) {
          onProgressUpdate?.(style, 'completed')
        } else {
          onProgressUpdate?.(style, 'failed')
        }
        
        return { ...result, style }
        
      } catch (error) {
        console.error(`Failed to generate style "${style}":`, error)
        
        // Notify failure
        onProgressUpdate?.(style, 'failed')
        
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          style
        }
      }
    }

    // Start all generations in parallel
    const generationPromises = styles.map(style => generateStylePortrait(style))
    
    // Wait for all to complete
    const allResults = await Promise.allSettled(generationPromises)
    
    // Process results
    for (const result of allResults) {
      if (result.status === 'fulfilled') {
        results.push(result.value)
      } else {
        // Handle rejected promises
        results.push({
          success: false,
          error: result.reason instanceof Error ? result.reason.message : 'Generation failed',
          style: 'unknown'
        })
      }
    }

    const successful = results.filter(r => r.success).length
    const failed = results.filter(r => !r.success).length

    return {
      results,
      successful,
      failed
    }
  }

  /**
   * Check if the service is available
   */
  public async checkServiceHealth(): Promise<{
    available: boolean
    latency?: number
    error?: string
  }> {
    try {
      const startTime = Date.now()
      
      const response = await fetch(this.edgeFunctionUrl, {
        method: 'OPTIONS' // Simple health check
      })
      
      const latency = Date.now() - startTime
      
      return {
        available: response.ok,
        latency
      }
      
    } catch (error) {
      return {
        available: false,
        error: error instanceof Error ? error.message : 'Service unavailable'
      }
    }
  }
}

// Export singleton instance
export const secureGeminiService = new SecureGeminiService()

// Export the class for testing
export default SecureGeminiService