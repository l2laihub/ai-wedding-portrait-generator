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
      resetForm();
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
        // Sign in
        const signInData: SignInData = { email, password };
        const result = await authService.signIn(signInData);
        
        if (result.success && result.user) {
          setSuccess('Signed in successfully!');
          onSuccess?.(result.user);
          setTimeout(() => {
            onClose();
          }, 1000);
        } else {
          setError(result.error || 'Sign in failed. Please check your credentials and try again.');
        }
      }
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const switchMode = (newMode: typeof mode) => {
    setMode(newMode);
    setError('');
    setSuccess('');
  };

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

  // Simple full-screen modal for mobile, centered for desktop
  return (
    <div className="fixed inset-0 z-[9999] bg-white sm:bg-black sm:bg-opacity-50 sm:flex sm:items-center sm:justify-center">
      {/* Mobile: Full screen, Desktop: Centered card */}
      <div className="h-full w-full sm:h-auto sm:w-auto sm:max-w-md bg-white sm:rounded-lg sm:shadow-xl flex flex-col">
        {/* Header - Always visible with safe area padding */}
        <div className="flex items-center justify-between p-4 border-b bg-white sticky top-0 z-10" style={{ paddingTop: 'max(1rem, env(safe-area-inset-top))' }}>
          <div>
            <h2 className="text-xl font-bold">{getTitle()}</h2>
            <p className="text-sm text-gray-600">{getSubtitle()}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full border border-gray-300"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content - Scrollable */}
        <div className="flex-1 p-4 overflow-y-auto">
          {/* Messages */}
          {success && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
              <p className="text-green-800 text-sm">{success}</p>
            </div>
          )}
          
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
              <p className="text-red-800 text-sm">{error}</p>
            </div>
          )}

          {/* Google Sign In */}
          {mode !== 'reset' && (
            <>
              <GoogleSignInButton
                onSuccess={() => {
                  onSuccess?.(null);
                  setTimeout(onClose, 1000);
                }}
                onError={(error) => setError(error)}
                disabled={isLoading}
                className="w-full mb-4"
              />
              
              <div className="text-center text-gray-500 text-sm mb-4">or</div>
            </>
          )}

          {/* Form */}
          {mode === 'reset' ? (
            <PasswordResetForm
              onSuccess={() => switchMode('signin')}
              onCancel={() => switchMode('signin')}
            />
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter your email"
                  required
                />
              </div>

              {mode === 'signup' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Display name (optional)
                  </label>
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Your name"
                  />
                </div>
              )}

              {mode !== 'reset' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Password
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter your password"
                    required
                    minLength={6}
                  />
                </div>
              )}

              {mode === 'signup' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Confirm password
                  </label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Confirm your password"
                    required
                    minLength={6}
                  />
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 rounded-lg disabled:bg-gray-400"
              >
                {isLoading ? 'Loading...' : (
                  mode === 'signup' ? 'Create Account' : 
                  mode === 'reset' ? 'Send Reset Link' : 
                  'Sign In'
                )}
              </button>
            </form>
          )}

          {/* Mode switches */}
          <div className="mt-6 text-center text-sm">
            {mode === 'signin' && (
              <>
                <button
                  onClick={() => switchMode('reset')}
                  className="text-blue-600 hover:underline block mb-2"
                >
                  Forgot password?
                </button>
                <span className="text-gray-600">
                  Don't have an account?{' '}
                  <button
                    onClick={() => switchMode('signup')}
                    className="text-blue-600 hover:underline"
                  >
                    Sign up
                  </button>
                </span>
              </>
            )}
            
            {mode === 'signup' && (
              <span className="text-gray-600">
                Already have an account?{' '}
                <button
                  onClick={() => switchMode('signin')}
                  className="text-blue-600 hover:underline"
                >
                  Sign in
                </button>
              </span>
            )}
            
            {mode === 'reset' && (
              <button
                onClick={() => switchMode('signin')}
                className="text-blue-600 hover:underline"
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