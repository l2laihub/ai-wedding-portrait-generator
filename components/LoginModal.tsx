import React, { useState } from 'react';
import Icon from './Icon';
import GoogleSignInButton from './GoogleSignInButton';
import PasswordResetForm from './PasswordResetForm';
import { authService, SignInData, SignUpData } from '../services/authService';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (user: any) => void;
  defaultMode?: 'signin' | 'signup';
  title?: string;
  subtitle?: string;
}

const LoginModal: React.FC<LoginModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  defaultMode = 'signin',
  title,
  subtitle
}) => {
  const [mode, setMode] = useState<'signin' | 'signup' | 'reset'>(defaultMode);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Update internal mode when defaultMode prop changes
  React.useEffect(() => {
    if (isOpen) {
      setMode(defaultMode);
      resetForm(); // Clear form when mode changes
    }
  }, [defaultMode, isOpen]);

  // Form data
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [displayName, setDisplayName] = useState('');

  const resetForm = () => {
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setDisplayName('');
    setError('');
    setSuccess('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setIsLoading(true);

    try {
      if (mode === 'reset') {
        const result = await authService.resetPassword(email);
        if (result.success) {
          setSuccess('Password reset link sent to your email');
          setTimeout(() => setMode('signin'), 2000);
        } else {
          setError(result.error || 'Failed to send reset email');
        }
      } else if (mode === 'signup') {
        // Validation
        if (password.length < 6) {
          setError('Password must be at least 6 characters');
          return;
        }
        if (password !== confirmPassword) {
          setError('Passwords do not match');
          return;
        }

        const signUpData: SignUpData = {
          email,
          password,
          displayName: displayName.trim() || undefined
        };

        const result = await authService.signUp(signUpData);
        if (result.success) {
          if (result.user) {
            setSuccess('Account created successfully!');
            onSuccess?.(result.user);
            setTimeout(onClose, 1000);
          } else {
            setSuccess('Please check your email to verify your account');
            setTimeout(() => setMode('signin'), 3000);
          }
        } else {
          setError(result.error || 'Sign up failed');
        }
      } else {
        // Sign in with timeout protection
        const signInData: SignInData = { email, password };
        
        // Direct sign-in without timeout race condition
        const result = await authService.signIn(signInData);
        
        if (result.success && result.user) {
          console.log('Login modal: Sign in successful, calling onSuccess callback');
          setSuccess('Signed in successfully!');
          onSuccess?.(result.user);
          setTimeout(() => {
            console.log('Login modal: Closing modal after successful sign in');
            onClose();
          }, 1000);
        } else {
          console.error('Login modal: Sign in failed:', result.error);
          setError(result.error || 'Sign in failed. Please check your credentials and try again.');
        }
      }
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = () => {
    // GoogleSignInButton will handle the loading state and errors
    setError('');
  };

  const switchMode = (newMode: typeof mode) => {
    setMode(newMode);
    setError('');
    setSuccess('');
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleEscapeKey = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    }
  };

  // Add escape key listener
  React.useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleEscapeKey);
      document.body.style.overflow = 'hidden'; // Prevent background scroll
      return () => {
        document.removeEventListener('keydown', handleEscapeKey);
        document.body.style.overflow = 'unset';
      };
    }
  }, [isOpen]);

  console.log('🔍 LoginModal render - isOpen:', isOpen, 'mode:', mode);
  if (!isOpen) return null;

  const getTitle = () => {
    if (title) return title;
    switch (mode) {
      case 'signup': return 'Create Account';
      case 'reset': return 'Reset Password';
      default: return 'Sign In';
    }
  };

  const getSubtitle = () => {
    if (subtitle && mode === 'signin') return subtitle;
    switch (mode) {
      case 'signup': return 'Join to unlock unlimited portraits';
      case 'reset': return 'Enter your email to reset your password';
      default: return 'Access your account and credits';
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50"
      style={{ zIndex: 9999 }}
      onClick={handleBackdropClick}
    >
      {/* Mobile-optimized modal */}
      <div 
        className="bg-white rounded-lg shadow-xl w-11/12 max-w-md text-black flex flex-col"
        onClick={(e) => e.stopPropagation()}
        style={{ 
          position: 'absolute',
          top: '60px',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 10001,
          maxHeight: 'calc(100vh - 120px)',
          height: 'auto'
        }}
      >
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b border-gray-200 flex-shrink-0">
          <div>
            <h2 className="text-lg font-bold text-gray-900">
              {getTitle()}
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              {getSubtitle()}
            </p>
          </div>
          <button
            onClick={onClose}
            className="flex items-center justify-center w-8 h-8 text-gray-400 hover:text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-full transition-all duration-200"
            aria-label="Close modal"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-4 overflow-y-auto flex-1">
          {/* Success Message */}
          {success && (
            <div className="bg-green-50 border border-green-300 rounded-lg p-3 mb-4">
              <div className="flex items-center gap-2">
                <Icon path="M5 13l4 4L19 7" className="w-5 h-5 text-green-600" />
                <span className="text-green-800 text-sm">{success}</span>
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-300 rounded-lg p-3 mb-4">
              <div className="flex items-center gap-2">
                <Icon path="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5l-6.928-12c-.77-.833-2.694-.833-3.464 0L3.34 16.5C2.57 18.333 3.532 20 5.072 20z" className="w-5 h-5 text-red-600" />
                <span className="text-red-800 text-sm">{error}</span>
              </div>
            </div>
          )}

          {/* Google Sign In */}
          {mode !== 'reset' && (
            <GoogleSignInButton
              onSuccess={() => {
                onSuccess?.(null); // Will be handled by auth state listener
                setTimeout(onClose, 1000);
              }}
              onError={(error) => setError(error)}
              disabled={isLoading}
              className="mb-4"
              size="md"
              variant="secondary"
            />
          )}

          {/* Divider */}
          {mode !== 'reset' && (
            <div className="relative mb-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">
                  or continue with email
                </span>
              </div>
            </div>
          )}

          {/* Password Reset Form */}
          {mode === 'reset' ? (
            <PasswordResetForm
              onSuccess={() => switchMode('signin')}
              onCancel={() => switchMode('signin')}
            />
          ) : (
            /* Form */
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Email */}
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                  Email address
                </label>
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg bg-white text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base"
                  placeholder="Enter your email"
                  required
                />
              </div>

              {/* Display Name (Sign up only) */}
              {mode === 'signup' && (
                <div>
                  <label htmlFor="displayName" className="block text-sm font-medium text-gray-700 mb-1">
                    Display name (optional)
                  </label>
                  <input
                    type="text"
                    id="displayName"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg bg-white text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base"
                    placeholder="Your name"
                  />
                </div>
              )}

              {/* Password */}
              {mode !== 'reset' && (
                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                    Password
                  </label>
                  <input
                    type="password"
                    id="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg bg-white text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base"
                    placeholder="Enter your password"
                    required
                    minLength={6}
                  />
                </div>
              )}

              {/* Confirm Password (Sign up only) */}
              {mode === 'signup' && (
                <div>
                  <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
                    Confirm password
                  </label>
                  <input
                    type="password"
                    id="confirmPassword"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg bg-white text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base"
                    placeholder="Confirm your password"
                    required
                    minLength={6}
                  />
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-blue-600 to-teal-600 hover:from-blue-700 hover:to-teal-700 disabled:from-gray-400 disabled:to-gray-500 text-white font-medium py-3 px-4 rounded-lg transition-all duration-300 transform hover:scale-[1.02] disabled:scale-100 disabled:cursor-not-allowed text-base"
              >
                {isLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <Icon path="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" className="w-4 h-4 animate-spin" />
                    {mode === 'signup' ? 'Creating Account...' : mode === 'reset' ? 'Sending...' : 'Signing In...'}
                  </span>
                ) : (
                  mode === 'signup' ? 'Create Account' : mode === 'reset' ? 'Send Reset Link' : 'Sign In'
                )}
              </button>
            </form>
          )}

          {/* Mode Switch */}
          <div className="mt-4 text-center space-y-2">
            {mode === 'signin' && (
              <>
                <button
                  onClick={() => switchMode('reset')}
                  className="text-sm text-blue-600 hover:underline"
                >
                  Forgot your password?
                </button>
                <div className="text-sm text-gray-600">
                  Don't have an account?{' '}
                  <button
                    onClick={() => switchMode('signup')}
                    className="text-blue-600 hover:underline font-medium"
                  >
                    Sign up
                  </button>
                </div>
              </>
            )}
            
            {mode === 'signup' && (
              <div className="text-sm text-gray-600">
                Already have an account?{' '}
                <button
                  onClick={() => switchMode('signin')}
                  className="text-blue-600 hover:underline font-medium"
                >
                  Sign in
                </button>
              </div>
            )}
            
            {mode === 'reset' && (
              <button
                onClick={() => switchMode('signin')}
                className="text-sm text-blue-600 hover:underline"
              >
                Back to sign in
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginModal;