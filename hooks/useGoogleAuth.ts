import { useState, useCallback, useRef } from 'react';
import { authService } from '../services/authService';
import { GoogleUser, GoogleSignInResponse } from '../types/auth';
import { formatAuthError } from '../utils/authUtils';

interface UseGoogleAuthOptions {
  onSuccess?: (user?: GoogleUser) => void;
  onError?: (error: string) => void;
  autoRedirect?: boolean;
}

interface UseGoogleAuthReturn {
  signIn: () => Promise<void>;
  isLoading: boolean;
  error: string | null;
  clearError: () => void;
}

/**
 * Hook for managing Google OAuth authentication
 * Provides a clean interface for Google Sign-In functionality
 */
export const useGoogleAuth = ({
  onSuccess,
  onError,
  autoRedirect = true
}: UseGoogleAuthOptions = {}): UseGoogleAuthReturn => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const signIn = useCallback(async () => {
    // Prevent multiple simultaneous requests
    if (isLoading) return;
    
    // Cancel any previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    // Create new abort controller for this request
    const abortController = new AbortController();
    abortControllerRef.current = abortController;
    
    setIsLoading(true);
    setError(null);

    try {
      // Check if request was aborted
      if (abortController.signal.aborted) {
        return;
      }

      const result = await authService.signInWithGoogle();
      
      // Check if request was aborted after API call
      if (abortController.signal.aborted) {
        return;
      }

      if (result.success) {
        // For OAuth flows, success usually means redirect initiated
        onSuccess?.();
      } else {
        const errorMessage = formatAuthError(result.error || 'Google sign in failed');
        setError(errorMessage);
        onError?.(errorMessage);
      }
    } catch (err) {
      // Check if request was aborted
      if (abortController.signal.aborted) {
        return;
      }
      
      const errorMessage = err instanceof Error 
        ? formatAuthError(err.message) 
        : 'An unexpected error occurred during Google sign in';
      
      setError(errorMessage);
      onError?.(errorMessage);
    } finally {
      // Only update loading state if request wasn't aborted
      if (!abortController.signal.aborted) {
        setIsLoading(false);
      }
    }
  }, [isLoading, onSuccess, onError]);

  return {
    signIn,
    isLoading,
    error,
    clearError
  };
};

export default useGoogleAuth;