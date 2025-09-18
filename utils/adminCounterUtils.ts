/**
 * Admin utilities for counter management
 * These functions help debug and manage the counter system
 */

import { counterService, refreshCounterFromDatabase, addHistoricalPortraits } from '../services/counterService';
import { databaseService } from '../services/databaseService';
import { supabase, isSupabaseConfigured } from '../services/supabaseClient';

/**
 * Debug counter state - shows all counter information
 */
export async function debugCounterState(): Promise<void> {
  console.group('🔍 Counter Debug Information');
  
  try {
    // Current counter values
    const metrics = counterService.getMetrics();
    console.log('📊 Current Counter Metrics:', metrics);
    
    // Database configuration
    console.log('🔧 Database configured:', isSupabaseConfigured());
    
    // Database stats
    if (isSupabaseConfigured()) {
      console.log('📈 Fetching database stats...');
      
      // Try admin_stats view first
      try {
        const { data: adminStats, error } = await supabase
          .from('admin_stats')
          .select('*')
          .single();
          
        if (error) {
          console.warn('❌ Admin stats query failed:', error);
        } else {
          console.log('🏛️ Admin Stats View:', adminStats);
        }
      } catch (err) {
        console.warn('❌ Admin stats access failed:', err);
      }
      
      // Try database service
      try {
        const summary = await databaseService.getAnalyticsSummary();
        console.log('📋 Database Service Summary:', summary);
      } catch (err) {
        console.warn('❌ Database service failed:', err);
      }
      
      // Check raw usage_analytics table
      try {
        const { count: totalCount } = await supabase
          .from('usage_analytics')
          .select('*', { count: 'exact', head: true });
          
        const today = new Date().toISOString().split('T')[0];
        const { count: todayCount } = await supabase
          .from('usage_analytics')
          .select('*', { count: 'exact', head: true })
          .gte('timestamp', `${today}T00:00:00`);
          
        console.log('📊 Raw Usage Analytics:', {
          total: totalCount,
          today: todayCount
        });
      } catch (err) {
        console.warn('❌ Raw analytics query failed:', err);
      }
    }
    
    // localStorage info
    const localStorage = window.localStorage;
    console.log('💾 localStorage Counter Data:', {
      total: localStorage.getItem('wedai_total_generations'),
      daily: localStorage.getItem('wedai_daily_generations'),
      lastReset: localStorage.getItem('wedai_last_reset_date'),
      lastDbRefresh: localStorage.getItem('wedai_last_db_refresh'),
    });
    
  } catch (error) {
    console.error('❌ Error in counter debug:', error);
  }
  
  console.groupEnd();
}

/**
 * Force refresh counter from database and show results
 */
export async function forceRefreshCounter(): Promise<void> {
  console.group('🔄 Force Counter Refresh');
  
  try {
    const beforeMetrics = counterService.getMetrics();
    console.log('📊 Before refresh:', {
      total: beforeMetrics.totalGenerations,
      daily: beforeMetrics.dailyGenerations
    });
    
    await refreshCounterFromDatabase();
    
    const afterMetrics = counterService.getMetrics();
    console.log('📊 After refresh:', {
      total: afterMetrics.totalGenerations,
      daily: afterMetrics.dailyGenerations
    });
    
    const changed = beforeMetrics.totalGenerations !== afterMetrics.totalGenerations || 
                   beforeMetrics.dailyGenerations !== afterMetrics.dailyGenerations;
    
    if (changed) {
      console.log('✅ Counter updated from database!');
    } else {
      console.log('ℹ️ Counter values unchanged (already up to date)');
    }
    
  } catch (error) {
    console.error('❌ Error refreshing counter:', error);
  }
  
  console.groupEnd();
}

/**
 * Reset local counter (for testing)
 */
export function resetLocalCounter(): void {
  console.group('🗑️ Reset Local Counter');
  
  try {
    const keys = [
      'wedai_total_generations',
      'wedai_daily_generations', 
      'wedai_last_reset_date',
      'wedai_generation_history',
      'wedai_last_db_refresh'
    ];
    
    keys.forEach(key => {
      localStorage.removeItem(key);
      console.log(`🗑️ Removed: ${key}`);
    });
    
    console.log('✅ Local counter data cleared');
    console.log('🔄 Reload the page to see fresh counter values');
    
  } catch (error) {
    console.error('❌ Error resetting local counter:', error);
  }
  
  console.groupEnd();
}

/**
 * Show counter comparison between local and database
 */
export async function compareCounterSources(): Promise<void> {
  console.group('🔍 Counter Sources Comparison');
  
  try {
    const localMetrics = counterService.getMetrics();
    
    let dbTotal = 0;
    let dbDaily = 0;
    
    if (isSupabaseConfigured()) {
      try {
        const summary = await databaseService.getAnalyticsSummary();
        dbTotal = summary.totalGenerations;
        dbDaily = summary.todayGenerations;
      } catch (err) {
        console.warn('Database query failed:', err);
      }
    }
    
    console.table({
      'Local (localStorage)': {
        Total: localMetrics.totalGenerations,
        Daily: localMetrics.dailyGenerations
      },
      'Database': {
        Total: dbTotal,
        Daily: dbDaily
      },
      'Difference': {
        Total: dbTotal - localMetrics.totalGenerations,
        Daily: dbDaily - localMetrics.dailyGenerations
      }
    });
    
    const needsSync = dbTotal > localMetrics.totalGenerations || dbDaily > localMetrics.dailyGenerations;
    if (needsSync) {
      console.log('⚠️ Local counter is behind database. Consider running forceRefreshCounter()');
    } else {
      console.log('✅ Local counter is in sync with database');
    }
    
  } catch (error) {
    console.error('❌ Error comparing counter sources:', error);
  }
  
  console.groupEnd();
}

/**
 * Add historical portraits count (one-time admin function)
 * Adds 3500 portraits to account for pre-tracking period
 */
export async function addHistoricalPortraitsCount(): Promise<number> {
  console.group('🏛️ Add Historical Portraits');
  
  try {
    const beforeTotal = counterService.getTotalGenerations();
    console.log(`📊 Current total before: ${beforeTotal}`);
    
    const newTotal = await addHistoricalPortraits();
    
    console.log(`📊 New total after: ${newTotal}`);
    console.log(`➕ Added: ${newTotal - beforeTotal} historical portraits`);
    console.log('✅ Historical portraits added successfully!');
    console.log('💾 Historical count persisted to database for all users');
    console.log('📊 Created 3500 actual database entries to ensure accurate counts across all views');
    console.log('💡 This adjustment accounts for portraits generated before tracking was implemented');
    console.log('🔄 Other browser windows will update within 5 minutes, or force refresh with adminCounterUtils.refresh()');
    console.log('🌐 All new users will see the updated total count immediately');
    
    return newTotal;
  } catch (error) {
    console.error('❌ Error adding historical portraits:', error);
    throw error;
  } finally {
    console.groupEnd();
  }
}

// Make functions available in browser console for admin use
if (typeof window !== 'undefined') {
  (window as any).adminCounterUtils = {
    debug: debugCounterState,
    refresh: forceRefreshCounter,
    reset: resetLocalCounter,
    compare: compareCounterSources,
    addHistorical: addHistoricalPortraitsCount,
  };
  
  console.log('🛠️ Admin counter utils available at: window.adminCounterUtils');
  console.log('   - debug(): Show detailed counter information');
  console.log('   - refresh(): Force refresh from database'); 
  console.log('   - reset(): Clear local counter data');
  console.log('   - compare(): Compare local vs database values');
  console.log('   - addHistorical(): Add 3500 historical portraits (one-time use)');
}