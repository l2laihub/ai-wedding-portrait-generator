import { supabase, isSupabaseConfigured, WaitlistEntry, UsageAnalytics, User, UserCredits } from './supabaseClient'

class DatabaseService {
  /**
   * Add email to waitlist
   */
  async addToWaitlist(
    email: string, 
    source: string = 'unknown',
    promisedCredits: number = 10,
    ipAddress?: string
  ): Promise<{ success: boolean; data?: WaitlistEntry; error?: string }> {
    try {
      if (!isSupabaseConfigured()) {
        console.warn('Supabase not configured, storing in localStorage');
        // Fallback to localStorage for development
        const waitlistData = {
          id: crypto.randomUUID(),
          email,
          source,
          promised_credits: promisedCredits,
          ip_address: ipAddress,
          created_at: new Date().toISOString()
        };
        
        const existingWaitlist = localStorage.getItem('wedai_waitlist') || '[]';
        const waitlist = JSON.parse(existingWaitlist);
        
        // Check for duplicates
        if (waitlist.find((entry: any) => entry.email === email)) {
          return { success: false, error: 'Email already exists in waitlist' };
        }
        
        waitlist.push(waitlistData);
        localStorage.setItem('wedai_waitlist', JSON.stringify(waitlist));
        
        return { success: true, data: waitlistData as WaitlistEntry };
      }

      const { data, error } = await supabase
        .from('waitlist')
        .insert([
          {
            email,
            source,
            promised_credits: promisedCredits,
            ip_address: ipAddress
          }
        ])
        .select()
        .single();

      if (error) {
        console.error('Supabase waitlist error:', error);
        return { success: false, error: error.message };
      }

      return { success: true, data };
    } catch (err) {
      console.error('Database error adding to waitlist:', err);
      return { success: false, error: 'Failed to add to waitlist' };
    }
  }

  /**
   * Track usage analytics with optional metadata
   */
  async trackUsage(
    sessionId: string,
    portraitType: string,
    theme: string,
    metadata?: any
  ): Promise<{ success: boolean; error?: string }> {
    try {
      if (!isSupabaseConfigured()) {
        console.log('Analytics tracked (localStorage fallback):', { sessionId, portraitType, theme, metadata });
        // Store in localStorage for development
        const analytics = JSON.parse(localStorage.getItem('wedai_analytics') || '[]');
        analytics.push({
          id: crypto.randomUUID(),
          session_id: sessionId,
          portrait_type: portraitType,
          theme,
          metadata,
          timestamp: new Date().toISOString()
        });
        localStorage.setItem('wedai_analytics', JSON.stringify(analytics));
        return { success: true };
      }

      const insertData: any = {
        session_id: sessionId,
        portrait_type: portraitType,
        theme
      };

      // Add metadata if provided and supported by the table schema
      if (metadata) {
        insertData.metadata = metadata;
      }

      const { error } = await supabase
        .from('usage_analytics')
        .insert([insertData]);

      if (error) {
        console.error('Supabase analytics error:', error);
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (err) {
      console.error('Database error tracking usage:', err);
      return { success: false, error: 'Failed to track usage' };
    }
  }

  /**
   * Get waitlist count
   */
  async getWaitlistCount(): Promise<number> {
    try {
      if (!isSupabaseConfigured()) {
        const waitlist = JSON.parse(localStorage.getItem('wedai_waitlist') || '[]');
        return waitlist.length;
      }

      const { count, error } = await supabase
        .from('waitlist')
        .select('*', { count: 'exact', head: true });

      if (error) {
        console.error('Error getting waitlist count:', error);
        return 0;
      }

      return count || 0;
    } catch (err) {
      console.error('Database error getting waitlist count:', err);
      return 0;
    }
  }

  /**
   * Check if email exists in waitlist
   */
  async isEmailInWaitlist(email: string): Promise<boolean> {
    try {
      if (!isSupabaseConfigured()) {
        const waitlist = JSON.parse(localStorage.getItem('wedai_waitlist') || '[]');
        return waitlist.some((entry: any) => entry.email === email);
      }

      const { data, error } = await supabase
        .from('waitlist')
        .select('email')
        .eq('email', email)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        console.error('Error checking email in waitlist:', error);
        return false;
      }

      return !!data;
    } catch (err) {
      console.error('Database error checking email in waitlist:', err);
      return false;
    }
  }

  /**
   * Get analytics summary (for admin dashboard)
   */
  async getAnalyticsSummary(): Promise<{
    totalGenerations: number;
    todayGenerations: number;
    popularThemes: Array<{ theme: string; count: number }>;
  }> {
    try {
      if (!isSupabaseConfigured()) {
        const analytics = JSON.parse(localStorage.getItem('wedai_analytics') || '[]');
        const today = new Date().toISOString().split('T')[0];
        const todayAnalytics = analytics.filter((item: any) => 
          item.timestamp.startsWith(today)
        );
        
        // Count themes
        const themeCounts: { [key: string]: number } = {};
        analytics.forEach((item: any) => {
          themeCounts[item.theme] = (themeCounts[item.theme] || 0) + 1;
        });
        
        const popularThemes = Object.entries(themeCounts)
          .map(([theme, count]) => ({ theme, count: count as number }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 5);

        return {
          totalGenerations: analytics.length,
          todayGenerations: todayAnalytics.length,
          popularThemes
        };
      }

      // Get total generations
      const { count: totalCount } = await supabase
        .from('usage_analytics')
        .select('*', { count: 'exact', head: true });

      // Get today's generations
      const today = new Date().toISOString().split('T')[0];
      const { count: todayCount } = await supabase
        .from('usage_analytics')
        .select('*', { count: 'exact', head: true })
        .gte('timestamp', `${today}T00:00:00`)
        .lt('timestamp', `${today}T23:59:59`);

      // Get popular themes (simplified query)
      const { data: themeData } = await supabase
        .from('usage_analytics')
        .select('theme')
        .not('theme', 'is', null);

      const themeCounts: { [key: string]: number } = {};
      themeData?.forEach((item) => {
        if (item.theme) {
          themeCounts[item.theme] = (themeCounts[item.theme] || 0) + 1;
        }
      });

      const popularThemes = Object.entries(themeCounts)
        .map(([theme, count]) => ({ theme, count: count as number }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      return {
        totalGenerations: totalCount || 0,
        todayGenerations: todayCount || 0,
        popularThemes
      };
    } catch (err) {
      console.error('Database error getting analytics summary:', err);
      return {
        totalGenerations: 0,
        todayGenerations: 0,
        popularThemes: []
      };
    }
  }

  /**
   * Track admin operation (like historical count adjustments)
   * Creates a special entry to persist admin changes across all users
   */
  async trackAdminOperation(
    operationType: string,
    operationData: any
  ): Promise<{ success: boolean; error?: string }> {
    try {
      if (!isSupabaseConfigured()) {
        console.log('Admin operation tracked (localStorage fallback):', { operationType, operationData });
        // Store in localStorage for development
        const adminOps = JSON.parse(localStorage.getItem('wedai_admin_operations') || '[]');
        adminOps.push({
          id: crypto.randomUUID(),
          operation_type: operationType,
          operation_data: operationData,
          timestamp: new Date().toISOString()
        });
        localStorage.setItem('wedai_admin_operations', JSON.stringify(adminOps));
        return { success: true };
      }

      // Create multiple entries to ensure the adjustment is reflected in total counts
      // This works around any schema limitations by creating actual usage entries
      const entries = [];
      
      if (operationType === 'historical_count_adjustment' && operationData.historicalCount) {
        // Create multiple smaller entries instead of one large adjustment
        // This ensures the admin_stats view will include these in its counts
        const batchSize = 100;
        const numBatches = Math.ceil(operationData.historicalCount / batchSize);
        
        for (let i = 0; i < numBatches; i++) {
          const batchCount = Math.min(batchSize, operationData.historicalCount - (i * batchSize));
          
          for (let j = 0; j < batchCount; j++) {
            entries.push({
              session_id: `historical_${Date.now()}_${i}_${j}`,
              portrait_type: 'couple',
              theme: 'Historical Data Import',
              // Add timestamp spread over past period to look more natural
              timestamp: new Date(Date.now() - (Math.random() * 30 * 24 * 60 * 60 * 1000)).toISOString()
            });
          }
        }
      } else {
        // For other admin operations, create a single tracking entry
        entries.push({
          session_id: `admin_${operationType}_${Date.now()}`,
          portrait_type: 'admin',
          theme: operationType,
          metadata: operationData
        });
      }

      // Insert entries in batches to avoid timeout
      const BATCH_SIZE = 100;
      for (let i = 0; i < entries.length; i += BATCH_SIZE) {
        const batch = entries.slice(i, i + BATCH_SIZE);
        const { error } = await supabase
          .from('usage_analytics')
          .insert(batch);

        if (error) {
          console.error('Supabase admin operation error:', error);
          return { success: false, error: error.message };
        }
      }

      console.log(`✅ Successfully inserted ${entries.length} entries for ${operationType}`);
      return { success: true };
    } catch (err) {
      console.error('Database error tracking admin operation:', err);
      return { success: false, error: 'Failed to track admin operation' };
    }
  }

  /**
   * Test database connection
   */
  async testConnection(): Promise<{ success: boolean; error?: string }> {
    try {
      if (!isSupabaseConfigured()) {
        return { success: false, error: 'Supabase not configured' };
      }

      const { data, error } = await supabase
        .from('waitlist')
        .select('count')
        .limit(1);

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (err) {
      return { success: false, error: 'Connection failed' };
    }
  }
}

// Export singleton instance
export const databaseService = new DatabaseService();
export default databaseService;