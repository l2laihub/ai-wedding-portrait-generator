import { useState, useCallback, useEffect } from 'react';
import { authService } from '../services/authService';
import { parseAuthCallback, clearAuthCallback, formatAuthError } from '../utils/authUtils';

interface UsePasswordResetOptions {
  onSuccess?: () => void;
  onError?: (error: string) => void;
  redirectDelay?: number;
}

interface UsePasswordResetReturn {
  // Request reset
  requestReset: (email: string) => Promise<void>;
  requestLoading: boolean;
  requestError: string | null;
  requestSuccess: string | null;
  
  // Confirm reset
  confirmReset: (newPassword: string) => Promise<void>;
  confirmLoading: boolean;
  confirmError: string | null;
  confirmSuccess: string | null;
  
  // Token validation
  isValidToken: boolean | null;
  
  // Utils
  clearErrors: () => void;
  clearMessages: () => void;
}

/**
 * Hook for managing password reset flow
 * Handles both requesting reset emails and confirming new passwords
 */
export const usePasswordReset = ({
  onSuccess,
  onError,
  redirectDelay = 2000
}: UsePasswordResetOptions = {}): UsePasswordResetReturn => {
  // Request reset state
  const [requestLoading, setRequestLoading] = useState(false);
  const [requestError, setRequestError] = useState<string | null>(null);
  const [requestSuccess, setRequestSuccess] = useState<string | null>(null);
  
  // Confirm reset state
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const [confirmSuccess, setConfirmSuccess] = useState<string | null>(null);
  
  // Token validation
  const [isValidToken, setIsValidToken] = useState<boolean | null>(null);

  // Check for valid reset token on mount
  useEffect(() => {
    const checkToken = async () => {
      try {
        const callback = parseAuthCallback();
        
        if (callback.type === 'recovery' && callback.access_token) {
          setIsValidToken(true);
        } else if (callback.error) {
          setIsValidToken(false);
          const errorMessage = formatAuthError(callback.error_description || callback.error);
          setConfirmError(errorMessage);
          onError?.(errorMessage);
        } else {
          // Check if we're on a reset page but don't have valid tokens
          const isResetPage = window.location.pathname.includes('reset') || 
                             window.location.hash.includes('reset');
          
          if (isResetPage) {
            setIsValidToken(false);
            setConfirmError('Invalid or expired reset link. Please request a new password reset.');
          }
        }
      } catch (err) {
        setIsValidToken(false);
        setConfirmError('Unable to verify reset link. Please try again.');
      }
    };

    checkToken();
  }, [onError]);

  const requestReset = useCallback(async (email: string) => {
    setRequestLoading(true);
    setRequestError(null);
    setRequestSuccess(null);

    try {
      const result = await authService.resetPassword(email.trim());
      
      if (result.success) {
        setRequestSuccess('Password reset link sent to your email');
        setTimeout(() => {
          onSuccess?.();
        }, redirectDelay);
      } else {
        const errorMessage = formatAuthError(result.error || 'Failed to send reset email');
        setRequestError(errorMessage);
        onError?.(errorMessage);
      }
    } catch (err) {
      const errorMessage = err instanceof Error 
        ? formatAuthError(err.message)
        : 'An unexpected error occurred';
      
      setRequestError(errorMessage);
      onError?.(errorMessage);
    } finally {
      setRequestLoading(false);
    }
  }, [onSuccess, onError, redirectDelay]);

  const confirmReset = useCallback(async (newPassword: string) => {
    setConfirmLoading(true);
    setConfirmError(null);
    setConfirmSuccess(null);

    try {
      const result = await authService.updatePassword(newPassword);
      
      if (result.success) {
        setConfirmSuccess('Password updated successfully! You can now sign in with your new password.');
        
        // Clear URL tokens
        clearAuthCallback();
        
        setTimeout(() => {
          onSuccess?.();
        }, redirectDelay);
      } else {
        const errorMessage = formatAuthError(result.error || 'Failed to update password');
        setConfirmError(errorMessage);
        onError?.(errorMessage);
      }
    } catch (err) {
      const errorMessage = err instanceof Error 
        ? formatAuthError(err.message)
        : 'An unexpected error occurred';
      
      setConfirmError(errorMessage);
      onError?.(errorMessage);
    } finally {
      setConfirmLoading(false);
    }
  }, [onSuccess, onError, redirectDelay]);

  const clearErrors = useCallback(() => {
    setRequestError(null);
    setConfirmError(null);
  }, []);

  const clearMessages = useCallback(() => {
    setRequestError(null);
    setRequestSuccess(null);
    setConfirmError(null);
    setConfirmSuccess(null);
  }, []);

  return {
    // Request reset
    requestReset,
    requestLoading,
    requestError,
    requestSuccess,
    
    // Confirm reset
    confirmReset,
    confirmLoading,
    confirmError,
    confirmSuccess,
    
    // Token validation
    isValidToken,
    
    // Utils
    clearErrors,
    clearMessages
  };
};

export default usePasswordReset;