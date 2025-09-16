import React, { useState } from 'react';
import { usePasswordReset } from '../hooks/usePasswordReset';
import Icon from './Icon';

interface PasswordResetFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
  className?: string;
  standalone?: boolean;
}

const PasswordResetForm: React.FC<PasswordResetFormProps> = ({
  onSuccess,
  onCancel,
  className = '',
  standalone = false
}) => {
  const [email, setEmail] = useState('');
  const [emailSent, setEmailSent] = useState(false);
  
  const {
    requestReset,
    requestLoading,
    requestError,
    requestSuccess,
    clearMessages
  } = usePasswordReset({
    onSuccess: () => {
      setEmailSent(true);
      setTimeout(() => {
        onSuccess?.();
      }, 3000);
    }
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      return;
    }

    await requestReset(email.trim());
  };

  const handleResend = async () => {
    if (!email.trim() || requestLoading) return;
    
    clearMessages();
    await requestReset(email.trim());
  };

  if (emailSent && requestSuccess) {
    return (
      <div className={`${standalone ? 'bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6' : ''} ${className}`}>
        {/* Success State */}
        <div className="text-center">
          <div className="w-16 h-16 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <Icon 
              path="M5 13l4 4L19 7" 
              className="w-8 h-8 text-green-600 dark:text-green-400" 
            />
          </div>
          
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            Check Your Email
          </h3>
          
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            We've sent a password reset link to <strong>{email}</strong>
          </p>
          
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
            <p className="text-sm text-blue-800 dark:text-blue-200">
              💡 <strong>What's next:</strong>
            </p>
            <ul className="text-sm text-blue-700 dark:text-blue-300 mt-2 space-y-1 text-left">
              <li>• Check your inbox (and spam folder)</li>
              <li>• Click the reset link in the email</li>
              <li>• Create your new password</li>
            </ul>
          </div>
          
          <div className="space-y-3">
            <button
              onClick={handleResend}
              disabled={requestLoading}
              className="w-full bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 font-medium py-2.5 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {requestLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <Icon path="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" className="w-4 h-4 animate-spin" />
                  Sending...
                </span>
              ) : (
                'Resend Email'
              )}
            </button>
            
            {onCancel && (
              <button
                onClick={onCancel}
                className="w-full text-blue-600 dark:text-blue-400 hover:underline font-medium"
              >
                Back to sign in
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`${standalone ? 'bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6' : ''} ${className}`}>
      {standalone && (
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Reset Your Password
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Enter your email address and we'll send you a link to reset your password
          </p>
        </div>
      )}

      {/* Error Message */}
      {requestError && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-300 dark:border-red-700 rounded-lg p-3 mb-4">
          <div className="flex items-center gap-2">
            <Icon 
              path="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5l-6.928-12c-.77-.833-2.694-.833-3.464 0L3.34 16.5C2.57 18.333 3.532 20 5.072 20z" 
              className="w-5 h-5 text-red-600 dark:text-red-400" 
            />
            <span className="text-red-800 dark:text-red-200 text-sm">{requestError}</span>
          </div>
        </div>
      )}

      {/* Success Message */}
      {requestSuccess && !emailSent && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-300 dark:border-green-700 rounded-lg p-3 mb-4">
          <div className="flex items-center gap-2">
            <Icon 
              path="M5 13l4 4L19 7" 
              className="w-5 h-5 text-green-600 dark:text-green-400" 
            />
            <span className="text-green-800 dark:text-green-200 text-sm">{requestSuccess}</span>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="reset-email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Email address
          </label>
          <input
            type="email"
            id="reset-email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            placeholder="Enter your email address"
            required
            disabled={requestLoading}
          />
        </div>

        <button
          type="submit"
          disabled={requestLoading || !email.trim()}
          className="w-full bg-gradient-to-r from-blue-600 to-teal-600 hover:from-blue-700 hover:to-teal-700 disabled:from-gray-400 disabled:to-gray-500 text-white font-semibold py-3 px-4 rounded-lg transition-all duration-300 transform hover:scale-[1.02] disabled:scale-100 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-gray-800"
        >
          {requestLoading ? (
            <span className="flex items-center justify-center gap-2">
              <Icon 
                path="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" 
                className="w-5 h-5 animate-spin" 
              />
              Sending Reset Link...
            </span>
          ) : (
            'Send Reset Link'
          )}
        </button>

        {onCancel && (
          <div className="text-center">
            <button
              type="button"
              onClick={onCancel}
              className="text-blue-600 dark:text-blue-400 hover:underline font-medium text-sm"
            >
              Back to sign in
            </button>
          </div>
        )}
      </form>

      {standalone && (
        <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700 text-center">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Remember your password?{' '}
            <button
              onClick={onCancel}
              className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
            >
              Sign in instead
            </button>
          </p>
        </div>
      )}
    </div>
  );
};

export default PasswordResetForm;