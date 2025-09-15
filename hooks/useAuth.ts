import { useState, useEffect } from 'react';
import { authService, AuthUser } from '../services/authService';

export interface UseAuthReturn {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

export const useAuth = (): UseAuthReturn => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshUser = async () => {
    try {
      // Get the current user from auth service
      const currentUser = authService.getCurrentUser();
      setUser(currentUser);
    } catch (error) {
      console.error('Failed to refresh user:', error);
      setUser(null);
    }
  };

  const signOut = async () => {
    try {
      await authService.signOut();
      setUser(null);
    } catch (error) {
      console.error('Sign out failed:', error);
    }
  };

  useEffect(() => {
    let mounted = true;

    const initializeAuth = async () => {
      try {
        setIsLoading(true);
        
        // Check for existing session with better error handling
        const session = await authService.getStoredSession();
        
        if (mounted) {
          if (session?.user) {
            // Try to get current user from auth service
            const currentUser = authService.getCurrentUser();
            if (currentUser) {
              console.log('Auth initialized successfully with user:', currentUser.email);
              setUser(currentUser);
            } else {
              // If authService doesn't have the user yet, create a fallback user from session
              // This prevents infinite loading when profile loading fails
              console.log('AuthService user not ready, using session data as fallback');
              const fallbackUser = {
                id: session.user.id,
                email: session.user.email || '',
                displayName: session.user.user_metadata?.display_name || '',
                createdAt: session.user.created_at || new Date().toISOString(),
                referralCode: undefined
              };
              setUser(fallbackUser);
            }
          } else {
            setUser(null);
          }
        }
        
      } catch (error) {
        console.error('Auth initialization error:', error);
        if (mounted) {
          setUser(null);
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    initializeAuth();

    return () => {
      mounted = false;
    };
  }, []); // Only run once on mount

  // Separate effect for auth state changes after initial load
  useEffect(() => {
    if (isLoading) return; // Don't set up listener until initial load is complete
    
    let mounted = true;
    
    // Simple polling to detect auth state changes
    // This handles sign in/out events after the initial load
    const interval = setInterval(() => {
      if (mounted) {
        const currentUser = authService.getCurrentUser();
        if (currentUser?.id !== user?.id) {
          setUser(currentUser);
        }
      }
    }, 1000); // Check every 1 second (more responsive)

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [isLoading, user?.id]);

  // Handle OAuth callback on component mount
  useEffect(() => {
    const handleOAuthCallback = async () => {
      // Check if this is an OAuth callback (has code or token in URL)
      const urlParams = new URLSearchParams(window.location.search);
      const hasAuthParams = urlParams.has('code') || urlParams.has('access_token') || urlParams.has('token');
      
      if (hasAuthParams) {
        try {
          const result = await authService.handleOAuthCallback();
          if (result.success && result.user) {
            setUser(result.user);
            // Clean up URL parameters
            window.history.replaceState({}, document.title, window.location.pathname);
          }
        } catch (error) {
          console.error('OAuth callback failed:', error);
        }
      }
    };

    handleOAuthCallback();
  }, []);

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    signOut,
    refreshUser
  };
};

export default useAuth;