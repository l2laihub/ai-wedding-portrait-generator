/**
 * Admin Authentication Hook
 * 
 * Provides secure admin authentication and authorization
 * with proper role checking and session management
 */

import { useState, useEffect } from 'react';
import { authService } from '../services/authService';
import { supabase } from '../services/supabaseClient';

interface AdminAuthState {
  isAdmin: boolean;
  isSuperAdmin: boolean;
  loading: boolean;
  error: string | null;
  checkAdminAccess: () => Promise<boolean>;
}

export function useAdminAuth(): AdminAuthState {
  const [isAdmin, setIsAdmin] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const checkAdminAccess = async (): Promise<boolean> => {
    try {
      const user = authService.getCurrentUser();
      if (!user) {
        setIsAdmin(false);
        setIsSuperAdmin(false);
        setError('Not authenticated');
        return false;
      }

      // Check user role from database
      const { data, error: roleError } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single();

      if (roleError || !data) {
        console.error('Error checking admin role:', roleError);
        setIsAdmin(false);
        setIsSuperAdmin(false);
        setError('Failed to verify admin access');
        return false;
      }

      const userIsAdmin = data.role === 'admin' || data.role === 'super_admin';
      const userIsSuperAdmin = data.role === 'super_admin';

      setIsAdmin(userIsAdmin);
      setIsSuperAdmin(userIsSuperAdmin);
      setError(null);

      // Log admin access attempt
      if (userIsAdmin) {
        await logAdminAccess(user.id, 'admin_check', { 
          role: data.role,
          timestamp: new Date().toISOString()
        });
      }

      return userIsAdmin;
    } catch (err) {
      console.error('Admin auth check failed:', err);
      setIsAdmin(false);
      setIsSuperAdmin(false);
      setError('Admin authentication failed');
      return false;
    }
  };

  useEffect(() => {
    let mounted = true;

    const initAdminAuth = async () => {
      if (!mounted) return;
      
      setLoading(true);
      await checkAdminAccess();
      
      if (mounted) {
        setLoading(false);
      }
    };

    initAdminAuth();

    // Set up auth state change listener
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event) => {
      if (!mounted) return;
      
      if (event === 'SIGNED_OUT') {
        setIsAdmin(false);
        setIsSuperAdmin(false);
        setError(null);
      } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        await checkAdminAccess();
      }
    });

    return () => {
      mounted = false;
      authListener?.subscription.unsubscribe();
    };
  }, []);

  return {
    isAdmin,
    isSuperAdmin,
    loading,
    error,
    checkAdminAccess
  };
}

/**
 * Log admin access attempts for security auditing
 */
async function logAdminAccess(
  userId: string, 
  action: string, 
  details: Record<string, any>
): Promise<void> {
  try {
    // Get user's IP and user agent (in production, get from request headers)
    const ipAddress = 'localhost'; // In production, get from request
    const userAgent = navigator.userAgent;

    await supabase
      .from('admin_actions')
      .insert({
        admin_user_id: userId,
        action_type: action,
        action_details: details,
        ip_address: ipAddress,
        user_agent: userAgent
      });
  } catch (error) {
    console.error('Failed to log admin action:', error);
    // Don't throw - logging failure shouldn't block admin actions
  }
}