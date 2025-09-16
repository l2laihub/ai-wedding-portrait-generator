import { PasswordStrength, AuthCallbackParams } from '../types/auth';

/**
 * Calculate password strength based on various criteria
 */
export const calculatePasswordStrength = (password: string): PasswordStrength => {
  const strength: PasswordStrength = {
    length: password.length >= 8,
    lowercase: /[a-z]/.test(password),
    uppercase: /[A-Z]/.test(password),
    number: /\d/.test(password),
    special: /[!@#$%^&*(),.?":{}|<>]/.test(password),
    score: 0
  };

  // Calculate score (0-4)
  const criteria = [strength.length, strength.lowercase, strength.uppercase, strength.number, strength.special];
  strength.score = criteria.filter(Boolean).length;

  return strength;
};

/**
 * Get password strength label
 */
export const getPasswordStrengthLabel = (score: number): string => {
  switch (score) {
    case 0:
    case 1:
      return 'Very Weak';
    case 2:
      return 'Weak';
    case 3:
      return 'Fair';
    case 4:
      return 'Good';
    case 5:
      return 'Strong';
    default:
      return 'Unknown';
  }
};

/**
 * Get password strength color class
 */
export const getPasswordStrengthColor = (score: number): string => {
  switch (score) {
    case 0:
    case 1:
      return 'text-red-600 dark:text-red-400';
    case 2:
      return 'text-orange-600 dark:text-orange-400';
    case 3:
      return 'text-yellow-600 dark:text-yellow-400';
    case 4:
      return 'text-blue-600 dark:text-blue-400';
    case 5:
      return 'text-green-600 dark:text-green-400';
    default:
      return 'text-gray-600 dark:text-gray-400';
  }
};

/**
 * Parse auth callback parameters from URL hash
 */
export const parseAuthCallback = (): AuthCallbackParams => {
  const hash = window.location.hash.substring(1);
  const params = new URLSearchParams(hash);
  
  return {
    access_token: params.get('access_token') || undefined,
    expires_in: params.get('expires_in') || undefined,
    refresh_token: params.get('refresh_token') || undefined,
    token_type: params.get('token_type') || undefined,
    type: (params.get('type') as AuthCallbackParams['type']) || undefined,
    error: params.get('error') || undefined,
    error_description: params.get('error_description') || undefined,
  };
};

/**
 * Clear auth callback parameters from URL
 */
export const clearAuthCallback = (): void => {
  window.history.replaceState({}, document.title, window.location.pathname + window.location.search);
};

/**
 * Validate email format
 */
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Generate secure random string for state parameter
 */
export const generateSecureRandom = (length: number = 32): string => {
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
};

/**
 * Format auth error messages for user display
 */
export const formatAuthError = (error: string): string => {
  const errorMap: Record<string, string> = {
    'Invalid login credentials': 'Invalid email or password. Please check your credentials and try again.',
    'Email not confirmed': 'Please check your email and click the confirmation link before signing in.',
    'User not found': 'No account found with this email address.',
    'Too many requests': 'Too many sign-in attempts. Please wait a few minutes before trying again.',
    'Invalid email': 'Please enter a valid email address.',
    'Weak password': 'Password is too weak. Please choose a stronger password.',
    'Password too short': 'Password must be at least 8 characters long.',
    'Email already registered': 'An account with this email already exists. Try signing in instead.',
    'Invalid token': 'This reset link has expired or is invalid. Please request a new one.',
    'Token expired': 'This reset link has expired. Please request a new one.',
  };

  return errorMap[error] || error;
};

/**
 * Check if running in development mode
 */
export const isDevelopment = (): boolean => {
  return process.env.NODE_ENV === 'development';
};

/**
 * Get redirect URL for OAuth flows
 */
export const getRedirectUrl = (path: string = ''): string => {
  const base = isDevelopment() 
    ? 'http://localhost:5173' 
    : window.location.origin;
  
  return `${base}${path}`;
};

/**
 * Debounce function for form validation
 */
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: NodeJS.Timeout;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

/**
 * Check if user agent is a mobile device
 */
export const isMobileDevice = (): boolean => {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  );
};

/**
 * Storage utilities for auth state
 */
export const authStorage = {
  setItem: (key: string, value: string): void => {
    try {
      localStorage.setItem(`wedai_auth_${key}`, value);
    } catch (error) {
      console.warn('Failed to store auth data:', error);
    }
  },
  
  getItem: (key: string): string | null => {
    try {
      return localStorage.getItem(`wedai_auth_${key}`);
    } catch (error) {
      console.warn('Failed to retrieve auth data:', error);
      return null;
    }
  },
  
  removeItem: (key: string): void => {
    try {
      localStorage.removeItem(`wedai_auth_${key}`);
    } catch (error) {
      console.warn('Failed to remove auth data:', error);
    }
  },
  
  clear: (): void => {
    try {
      const keys = Object.keys(localStorage).filter(key => key.startsWith('wedai_auth_'));
      keys.forEach(key => localStorage.removeItem(key));
    } catch (error) {
      console.warn('Failed to clear auth data:', error);
    }
  }
};