// Admin Service - Real Supabase implementation
import { supabase } from '../../services/supabaseClient';

export interface DashboardMetrics {
  totalUsers: number;
  activeUsers: number;
  totalGenerations: number;
  totalRevenue: number;
  conversionRate: number;
}

export interface User {
  id: string;
  email: string;
  name: string;
  credits: number;
  generations: number;
  joinedAt: Date;
  lastActive: Date;
  status: 'active' | 'inactive' | 'suspended';
  role?: string;
}

export interface ChartData {
  daily: Array<{
    date: string;
    users: number;
    generations: number;
    revenue: number;
  }>;
  styleDistribution: Array<{
    name: string;
    value: number;
    color: string;
  }>;
  userActivity: Array<{
    hour: string;
    activity: number;
  }>;
}

export interface RecentActivity {
  user: string;
  action: string;
  style: string;
  time: string;
  credits: number;
}

export interface SystemStatus {
  apiStatus: string;
  databaseStatus: string;
  aiProcessingQueue: number;
  totalApiCalls: number;
  lastUpdate: string;
}

class AdminService {
  private async isAdmin(): Promise<boolean> {
    console.log('🔍 isAdmin: checking auth user...');
    const { data: { user }, error } = await supabase.auth.getUser();
    console.log('🔍 isAdmin: user =', user?.email, 'error =', error);
    
    if (!user) {
      console.log('🔍 isAdmin: no user found');
      return false;
    }

    // Temporary: Check if user is admin@huybuilds.app directly
    // TODO: Replace with proper admin_users table lookup once migration is applied
    if (user.email === 'admin@huybuilds.app') {
      console.log('🔍 isAdmin: admin email match = true');
      return true;
    }

    try {
      const { data: adminUser } = await supabase
        .from('admin_users')
        .select('role')
        .eq('user_id', user.id)
        .single();

      return adminUser?.role ? ['admin', 'super_admin'].includes(adminUser.role) : false;
    } catch (error) {
      // If admin_users table doesn't exist yet, fall back to email check
      console.warn('Admin users table not available, using email-based check');
      return user.email === 'admin@huybuilds.app';
    }
  }

  async getDashboardMetrics(): Promise<DashboardMetrics> {
    console.log('🔍 getDashboardMetrics called');
    
    const isAdminUser = await this.isAdmin();
    console.log('🔍 isAdmin result:', isAdminUser);
    
    if (!isAdminUser) {
      throw new Error('Unauthorized: Admin access required');
    }

    try {
      // Get current session for auth header
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('No valid session found');
      }

      // Call comprehensive admin dashboard function
      const response = await fetch(`${supabase.supabaseUrl}/functions/v1/admin-dashboard-simple`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch dashboard data');
      }

      const dashboardData = await response.json();
      console.log('🔍 Received dashboard data:', dashboardData);
      
      // Store the comprehensive data for other methods to use
      this.cachedDashboardData = dashboardData;
      
      return dashboardData.metrics;
    } catch (error) {
      console.error('Error fetching dashboard metrics:', error);
      throw error;
    }
  }

  // Add cached dashboard data property
  private cachedDashboardData: any = null;

  async getUsers(filters?: {
    search?: string;
    status?: User['status'] | 'all';
    limit?: number;
    offset?: number;
  }): Promise<{ users: User[]; total: number }> {
    const isAdminUser = await this.isAdmin();
    if (!isAdminUser) {
      throw new Error('Unauthorized: Admin access required');
    }

    try {
      let query = supabase
        .from('users')
        .select(`
          id,
          email,
          display_name,
          created_at,
          last_login,
          user_credits (
            paid_credits,
            bonus_credits,
            free_credits_used_today
          )
        `);

      // Apply search filter
      if (filters?.search) {
        query = query.or(`email.ilike.%${filters.search}%,display_name.ilike.%${filters.search}%`);
      }

      // Get total count for pagination
      const { count: total } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true });

      // Apply pagination
      if (filters?.limit) {
        query = query.range(filters.offset || 0, (filters.offset || 0) + filters.limit - 1);
      }

      const { data: userData, error } = await query;
      if (error) throw error;

      // Get generation counts for each user
      const userIds = userData?.map(u => u.id) || [];
      
      // Note: usage_analytics might not have user_id field, so we'll use session-based counting
      // This is a limitation of the current schema - generations aren't directly tied to users
      let generationCountsMap: Record<string, number> = {};
      
      try {
        const { data: generationCounts } = await supabase
          .from('usage_analytics')
          .select('session_id')
          .not('session_id', 'is', null);

        // For now, we can't accurately count per user since usage_analytics doesn't have user_id
        // We'll show 0 generations per user until this is fixed in the schema
        console.warn('Cannot count generations per user: usage_analytics table missing user_id field');
      } catch (error) {
        console.warn('Error fetching generation counts:', error);
      }

      const users: User[] = userData?.map(user => ({
        id: user.id,
        email: user.email,
        name: user.display_name || user.email.split('@')[0],
        credits: (user.user_credits?.paid_credits || 0) + (user.user_credits?.bonus_credits || 0),
        generations: generationCountsMap[user.id] || 0,
        joinedAt: new Date(user.created_at),
        lastActive: user.last_login ? new Date(user.last_login) : new Date(user.created_at),
        status: user.last_login && new Date(user.last_login) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) 
          ? 'active' 
          : 'inactive'
      })) || [];

      // Apply status filter after mapping
      let filteredUsers = users;
      if (filters?.status && filters.status !== 'all') {
        filteredUsers = users.filter(u => u.status === filters.status);
      }

      return {
        users: filteredUsers,
        total: total || 0
      };
    } catch (error) {
      console.error('Error fetching users:', error);
      throw error;
    }
  }

  async getChartData(): Promise<ChartData> {
    const isAdminUser = await this.isAdmin();
    if (!isAdminUser) {
      throw new Error('Unauthorized: Admin access required');
    }

    try {
      // If we have cached dashboard data, use it
      if (this.cachedDashboardData?.chartData) {
        console.log('🔍 Using cached chart data');
        return this.cachedDashboardData.chartData;
      }

      // Otherwise, fetch fresh data by calling getDashboardMetrics first
      await this.getDashboardMetrics();
      
      if (this.cachedDashboardData?.chartData) {
        return this.cachedDashboardData.chartData;
      }

      // Fallback: return empty data
      return {
        daily: [],
        styleDistribution: [],
        userActivity: []
      };
    } catch (error) {
      console.error('Error fetching chart data:', error);
      throw error;
    }
  }

  async grantCredits(userId: string, amount: number, reason: string): Promise<boolean> {
    const isAdminUser = await this.isAdmin();
    if (!isAdminUser) {
      throw new Error('Unauthorized: Admin access required');
    }

    try {
      // Create an edge function call for admin operations to bypass RLS
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('No valid session found');
      }

      const response = await fetch(`${supabase.supabaseUrl}/functions/v1/admin-credits`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'grant',
          user_id: userId,
          amount: amount,
          reason: reason
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to grant credits');
      }

      return true;
    } catch (error) {
      console.error('Error granting credits:', error);
      throw error;
    }
  }

  async deductCredits(userId: string, amount: number, reason: string): Promise<boolean> {
    const isAdminUser = await this.isAdmin();
    if (!isAdminUser) {
      throw new Error('Unauthorized: Admin access required');
    }

    try {
      // Create an edge function call for admin operations to bypass RLS
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('No valid session found');
      }

      const response = await fetch(`${supabase.supabaseUrl}/functions/v1/admin-credits`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'deduct',
          user_id: userId,
          amount: amount,
          reason: reason
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to deduct credits');
      }

      return true;
    } catch (error) {
      console.error('Error deducting credits:', error);
      throw error;
    }
  }

  async updateUserStatus(userId: string, status: User['status']): Promise<boolean> {
    const isAdminUser = await this.isAdmin();
    if (!isAdminUser) {
      throw new Error('Unauthorized: Admin access required');
    }

    try {
      // For now, we'll log this action since there's no direct status field
      // In a real implementation, you might want to add a status field to the users table
      const { error } = await supabase
        .from('user_activity_logs')
        .insert({
          user_id: userId,
          activity_type: 'admin_status_change',
          activity_data: { new_status: status, changed_by: 'admin' }
        });

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error updating user status:', error);
      throw error;
    }
  }

  async processRefund(paymentId: string, amount: number): Promise<boolean> {
    const isAdminUser = await this.isAdmin();
    if (!isAdminUser) {
      throw new Error('Unauthorized: Admin access required');
    }

    try {
      // Find the payment log
      const { data: payment } = await supabase
        .from('payment_logs')
        .select('*')
        .eq('stripe_payment_id', paymentId)
        .single();

      if (!payment || !payment.user_id) {
        throw new Error('Payment not found or no associated user');
      }

      // Call the refund function (this would typically trigger a Stripe refund)
      const { error } = await supabase.rpc('process_refund', {
        p_user_id: payment.user_id,
        p_credits: Math.floor(amount * 10), // Assuming $1 = 10 credits
        p_stripe_payment_id: paymentId,
        p_description: `Admin refund: $${amount}`
      });

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error processing refund:', error);
      throw error;
    }
  }

  async exportUserData(userIds: string[], format: 'csv' | 'json' = 'csv'): Promise<Blob> {
    const isAdminUser = await this.isAdmin();
    if (!isAdminUser) {
      throw new Error('Unauthorized: Admin access required');
    }

    try {
      const { data: users } = await supabase
        .from('users')
        .select(`
          id,
          email,
          display_name,
          created_at,
          last_login,
          user_credits (
            paid_credits,
            bonus_credits,
            free_credits_used_today
          )
        `)
        .in('id', userIds);

      if (!users) throw new Error('No users found');

      if (format === 'csv') {
        const headers = ['ID', 'Name', 'Email', 'Credits', 'Status', 'Joined Date'];
        const rows = users.map(u => [
          u.id,
          u.display_name || u.email.split('@')[0],
          u.email,
          (u.user_credits?.paid_credits || 0) + (u.user_credits?.bonus_credits || 0),
          u.last_login ? 'Active' : 'Inactive',
          u.created_at.split('T')[0]
        ]);
        
        const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
        return new Blob([csv], { type: 'text/csv' });
      } else {
        const json = JSON.stringify(users, null, 2);
        return new Blob([json], { type: 'application/json' });
      }
    } catch (error) {
      console.error('Error exporting user data:', error);
      throw error;
    }
  }

  async getRecentActivity(): Promise<RecentActivity[]> {
    const isAdminUser = await this.isAdmin();
    if (!isAdminUser) {
      throw new Error('Unauthorized: Admin access required');
    }

    try {
      // If we have cached dashboard data, use it
      if (this.cachedDashboardData?.recentActivity) {
        console.log('🔍 Using cached recent activity');
        return this.cachedDashboardData.recentActivity;
      }

      // Otherwise, fetch fresh data by calling getDashboardMetrics first
      await this.getDashboardMetrics();
      
      return this.cachedDashboardData?.recentActivity || [];
    } catch (error) {
      console.error('Error fetching recent activity:', error);
      throw error;
    }
  }

  async getSystemStatus(): Promise<SystemStatus> {
    const isAdminUser = await this.isAdmin();
    if (!isAdminUser) {
      throw new Error('Unauthorized: Admin access required');
    }

    try {
      // If we have cached dashboard data, use it
      if (this.cachedDashboardData?.systemStatus) {
        console.log('🔍 Using cached system status');
        return this.cachedDashboardData.systemStatus;
      }

      // Otherwise, fetch fresh data by calling getDashboardMetrics first
      await this.getDashboardMetrics();
      
      return this.cachedDashboardData?.systemStatus || {
        apiStatus: 'unknown',
        databaseStatus: 'unknown',
        aiProcessingQueue: 0,
        totalApiCalls: 0,
        lastUpdate: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error fetching system status:', error);
      throw error;
    }
  }

  // Real-time updates using Supabase subscriptions
  subscribeToMetrics(callback: (metrics: DashboardMetrics) => void) {
    // Set up real-time subscription to dashboard metrics
    const interval = setInterval(async () => {
      try {
        const metrics = await this.getDashboardMetrics();
        callback(metrics);
      } catch (error) {
        console.error('Error in metrics subscription:', error);
      }
    }, 30000); // Update every 30 seconds

    return () => clearInterval(interval);
  }

  // Credits Management Methods
  async getCreditsData(): Promise<{
    users: Array<User & {
      paidCredits: number;
      bonusCredits: number;
      totalCredits: number;
      creditsUsedToday: number;
      lastActivity: Date;
    }>;
    transactions: Array<{
      id: string;
      user_id: string;
      type: 'purchase' | 'usage' | 'bonus' | 'refund';
      amount: number;
      balance_after: number;
      description: string;
      created_at: string;
      user?: { email: string; display_name?: string; };
    }>;
    stats: {
      totalPaidCredits: number;
      totalBonusCredits: number;
      totalUsedCredits: number;
      totalRevenue: number;
      averageCreditsPerUser: number;
      conversionRate: number;
    };
  }> {
    const isAdminUser = await this.isAdmin();
    if (!isAdminUser) {
      throw new Error('Unauthorized: Admin access required');
    }

    try {
      // Get all users with their credits
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select(`
          id,
          email,
          display_name,
          created_at,
          last_login,
          user_credits (
            paid_credits,
            bonus_credits,
            free_credits_used_today
          )
        `)
        .order('created_at', { ascending: false });

      if (usersError) throw usersError;

      console.log('🔍 Raw users data:', JSON.stringify(usersData, null, 2));

      // Get user credits separately to debug
      const { data: allCredits, error: creditsError } = await supabase
        .from('user_credits')
        .select('*');
      
      console.log('🔍 All user_credits records:', JSON.stringify(allCredits, null, 2));
      if (creditsError) console.error('🔍 Credits error:', creditsError);

      // Get all credit transactions
      const { data: transactionsData, error: transactionsError } = await supabase
        .from('credit_transactions')
        .select(`
          id,
          user_id,
          type,
          amount,
          balance_after,
          description,
          created_at
        `)
        .order('created_at', { ascending: false })
        .limit(100);

      if (transactionsError) throw transactionsError;

      console.log('🔍 Raw transactions data:', transactionsData);

      // Get today's usage for each user
      const today = new Date().toISOString().split('T')[0];
      const { data: todayUsage, error: usageError } = await supabase
        .from('credit_transactions')
        .select('user_id, amount')
        .eq('type', 'usage')
        .gte('created_at', `${today}T00:00:00.000Z`)
        .lt('created_at', `${today}T23:59:59.999Z`);

      if (usageError) console.warn('Error fetching today usage:', usageError);

      // Create usage map for quick lookup
      const todayUsageMap = (todayUsage || []).reduce((acc, usage) => {
        acc[usage.user_id] = (acc[usage.user_id] || 0) + Math.abs(usage.amount);
        return acc;
      }, {} as Record<string, number>);

      // Get credits for each user using the same function as creditsService
      const usersWithCredits = await Promise.all((usersData || []).map(async (user) => {
        let credits = { paid_credits: 0, bonus_credits: 0, free_credits_used_today: 0 };
        
        try {
          // Use the same database function that creditsService uses
          const { data: creditsData, error: creditsError } = await supabase.rpc(
            'get_user_credits_with_reset',
            { p_user_id: user.id }
          );
          
          if (!creditsError && creditsData && creditsData.length > 0) {
            const userCredits = creditsData[0];
            credits = {
              paid_credits: userCredits.ret_paid_credits || 0,
              bonus_credits: userCredits.ret_bonus_credits || 0,
              free_credits_used_today: userCredits.ret_free_credits_used_today || 0
            };
          }
        } catch (error) {
          console.warn(`Failed to get credits for user ${user.email}:`, error);
        }
        
        console.log(`🔍 User ${user.email} credits from RPC:`, credits);
        
        return {
          id: user.id,
          email: user.email,
          name: user.display_name || user.email.split('@')[0],
          credits: credits.paid_credits + credits.bonus_credits,
          generations: 0, // Will be calculated separately if needed
          joinedAt: new Date(user.created_at),
          lastActive: user.last_login ? new Date(user.last_login) : new Date(user.created_at),
          status: (user.last_login && new Date(user.last_login) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) 
            ? 'active' 
            : 'inactive') as 'active' | 'inactive' | 'suspended',
          paidCredits: credits.paid_credits || 0,
          bonusCredits: credits.bonus_credits || 0,
          totalCredits: (credits.paid_credits || 0) + (credits.bonus_credits || 0),
          creditsUsedToday: todayUsageMap[user.id] || 0,
          lastActivity: user.last_login ? new Date(user.last_login) : new Date(user.created_at)
        };
      }));

      const users = usersWithCredits;

      // Create user lookup map for transactions
      const userMap = new Map(users.map(u => [u.id, u]));

      // Transform transactions data
      const transactions = (transactionsData || []).map(tx => {
        const user = userMap.get(tx.user_id);
        return {
          id: tx.id,
          user_id: tx.user_id,
          type: tx.type as 'purchase' | 'usage' | 'bonus' | 'refund',
          amount: tx.amount,
          balance_after: tx.balance_after,
          description: tx.description,
          created_at: tx.created_at,
          user: {
            email: user?.email || 'Unknown',
            display_name: user?.name
          }
        };
      });

      // Calculate stats
      const totalPaidCredits = users.reduce((sum, u) => sum + u.paidCredits, 0);
      const totalBonusCredits = users.reduce((sum, u) => sum + u.bonusCredits, 0);
      const totalUsedCredits = users.reduce((sum, u) => sum + u.creditsUsedToday, 0);
      const payingUsers = users.filter(u => u.paidCredits > 0).length;

      // Calculate revenue from purchase transactions
      const totalRevenue = transactions
        .filter(tx => tx.type === 'purchase')
        .reduce((sum, tx) => sum + (tx.amount * 0.1), 0); // Assuming $0.10 per credit

      const stats = {
        totalPaidCredits,
        totalBonusCredits,
        totalUsedCredits,
        totalRevenue,
        averageCreditsPerUser: users.length > 0 ? totalPaidCredits / users.length : 0,
        conversionRate: users.length > 0 ? (payingUsers / users.length) * 100 : 0
      };

      console.log('🔍 Final stats:', stats);
      console.log('🔍 Users count:', users.length);
      console.log('🔍 Transactions count:', transactions.length);

      return {
        users,
        transactions,
        stats
      };
    } catch (error) {
      console.error('Error fetching credits data:', error);
      throw error;
    }
  }
}

export const adminService = new AdminService();