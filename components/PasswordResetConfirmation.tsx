import React, { useState, useEffect } from 'react';
import { usePasswordReset } from '../hooks/usePasswordReset';
import { calculatePasswordStrength } from '../utils/authUtils';
import Icon from './Icon';

interface PasswordResetConfirmationProps {
  onSuccess?: () => void;
  onCancel?: () => void;
  className?: string;
  standalone?: boolean;
}

const PasswordResetConfirmation: React.FC<PasswordResetConfirmationProps> = ({
  onSuccess,
  onCancel,
  className = '',
  standalone = false
}) => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const {
    confirmReset,
    confirmLoading,
    confirmError,
    confirmSuccess,
    isValidToken
  } = usePasswordReset({ onSuccess });

  // Calculate password strength
  const passwordStrength = calculatePasswordStrength(newPassword);

  // Token validation is handled by the hook

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (newPassword.length < 8) {
      return; // Error will be shown in UI
    }

    if (newPassword !== confirmPassword) {
      return; // Error will be shown in UI
    }

    // Check password strength
    if (passwordStrength.score < 3) {
      return; // Error will be shown in UI
    }

    await confirmReset(newPassword);
  };

  // Show loading state while checking token
  if (isValidToken === null) {
    return (
      <div className={`${standalone ? 'bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6' : ''} ${className}`}>
        <div className="text-center py-8">
          <Icon 
            path="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" 
            className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" 
          />
          <p className="text-gray-600 dark:text-gray-400">Verifying reset link...</p>
        </div>
      </div>
    );
  }

  // Show error state for invalid token
  if (isValidToken === false) {
    return (
      <div className={`${standalone ? 'bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6' : ''} ${className}`}>
        <div className="text-center">
          <div className="w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <Icon 
              path="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5l-6.928-12c-.77-.833-2.694-.833-3.464 0L3.34 16.5C2.57 18.333 3.532 20 5.072 20z" 
              className="w-8 h-8 text-red-600 dark:text-red-400" 
            />
          </div>
          
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            Reset Link Invalid
          </h3>
          
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            {confirmError || 'Invalid or expired reset link. Please request a new password reset.'}
          </p>
          
          {onCancel && (
            <button
              onClick={onCancel}
              className="bg-gradient-to-r from-blue-600 to-teal-600 hover:from-blue-700 hover:to-teal-700 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-300 transform hover:scale-[1.02]"
            >
              Request New Reset Link
            </button>
          )}
        </div>
      </div>
    );
  }

  // Show success state
  if (confirmSuccess) {
    return (
      <div className={`${standalone ? 'bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6' : ''} ${className}`}>
        <div className="text-center">
          <div className="w-16 h-16 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <Icon 
              path="M5 13l4 4L19 7" 
              className="w-8 h-8 text-green-600 dark:text-green-400" 
            />
          </div>
          
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            Password Updated!
          </h3>
          
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            {confirmSuccess}
          </p>
          
          {onSuccess && (
            <button
              onClick={onSuccess}
              className="bg-gradient-to-r from-blue-600 to-teal-600 hover:from-blue-700 hover:to-teal-700 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-300 transform hover:scale-[1.02]"
            >
              Continue to Sign In
            </button>
          )}
        </div>
      </div>
    );
  }

  const getStrengthColor = (condition: boolean) => {
    return condition ? 'text-green-600 dark:text-green-400' : 'text-gray-400 dark:text-gray-500';
  };

  const getStrengthIcon = (condition: boolean) => {
    return condition ? 'M5 13l4 4L19 7' : 'M6 18L18 6M6 6l12 12';
  };

  return (
    <div className={`${standalone ? 'bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6' : ''} ${className}`}>
      {standalone && (
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Set New Password
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Choose a strong password for your account
          </p>
        </div>
      )}

      {/* Error Message */}
      {confirmError && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-300 dark:border-red-700 rounded-lg p-3 mb-4">
          <div className="flex items-center gap-2">
            <Icon 
              path="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5l-6.928-12c-.77-.833-2.694-.833-3.464 0L3.34 16.5C2.57 18.333 3.532 20 5.072 20z" 
              className="w-5 h-5 text-red-600 dark:text-red-400" 
            />
            <span className="text-red-800 dark:text-red-200 text-sm">{confirmError}</span>
          </div>
        </div>
      )}
      
      {/* Validation Errors */}
      {newPassword && newPassword.length < 8 && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-300 dark:border-red-700 rounded-lg p-3 mb-4">
          <div className="flex items-center gap-2">
            <Icon 
              path="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5l-6.928-12c-.77-.833-2.694-.833-3.464 0L3.34 16.5C2.57 18.333 3.532 20 5.072 20z" 
              className="w-5 h-5 text-red-600 dark:text-red-400" 
            />
            <span className="text-red-800 dark:text-red-200 text-sm">Password must be at least 8 characters long</span>
          </div>
        </div>
      )}
      
      {confirmPassword && newPassword !== confirmPassword && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-300 dark:border-red-700 rounded-lg p-3 mb-4">
          <div className="flex items-center gap-2">
            <Icon 
              path="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5l-6.928-12c-.77-.833-2.694-.833-3.464 0L3.34 16.5C2.57 18.333 3.532 20 5.072 20z" 
              className="w-5 h-5 text-red-600 dark:text-red-400" 
            />
            <span className="text-red-800 dark:text-red-200 text-sm">Passwords do not match</span>
          </div>
        </div>
      )}
      
      {newPassword && passwordStrength.score < 3 && passwordStrength.score > 0 && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-300 dark:border-yellow-700 rounded-lg p-3 mb-4">
          <div className="flex items-center gap-2">
            <Icon 
              path="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5l-6.928-12c-.77-.833-2.694-.833-3.464 0L3.34 16.5C2.57 18.333 3.532 20 5.072 20z" 
              className="w-5 h-5 text-yellow-600 dark:text-yellow-400" 
            />
            <span className="text-yellow-800 dark:text-yellow-200 text-sm">Password should include a mix of uppercase, lowercase, numbers, and special characters</span>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* New Password */}
        <div>
          <label htmlFor="new-password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            New Password
          </label>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              id="new-password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full px-4 py-3 pr-12 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              placeholder="Enter your new password"
              required
              disabled={confirmLoading}
              minLength={8}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <Icon 
                path={showPassword ? "M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21m-2.122-2.122a10.054 10.054 0 01-5.756 1.822m0 0a10.05 10.05 0 01-9.543-7.029m15.086 0a7.988 7.988 0 00-.856-1.958m0 0l-2.122-2.122" : "M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z M15 12a3 3 0 11-6 0 3 3 0 016 0z"} 
                className="w-5 h-5" 
              />
            </button>
          </div>
        </div>

        {/* Password Strength Indicators */}
        {newPassword && (
          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Password Requirements:</p>
            <div className="grid grid-cols-1 gap-2 text-sm">
              <div className={`flex items-center gap-2 ${getStrengthColor(passwordStrength.length)}`}>
                <Icon path={getStrengthIcon(passwordStrength.length)} className="w-4 h-4" />
                <span>At least 8 characters</span>
              </div>
              <div className={`flex items-center gap-2 ${getStrengthColor(passwordStrength.lowercase)}`}>
                <Icon path={getStrengthIcon(passwordStrength.lowercase)} className="w-4 h-4" />
                <span>Lowercase letter</span>
              </div>
              <div className={`flex items-center gap-2 ${getStrengthColor(passwordStrength.uppercase)}`}>
                <Icon path={getStrengthIcon(passwordStrength.uppercase)} className="w-4 h-4" />
                <span>Uppercase letter</span>
              </div>
              <div className={`flex items-center gap-2 ${getStrengthColor(passwordStrength.number)}`}>
                <Icon path={getStrengthIcon(passwordStrength.number)} className="w-4 h-4" />
                <span>Number</span>
              </div>
              <div className={`flex items-center gap-2 ${getStrengthColor(passwordStrength.special)}`}>
                <Icon path={getStrengthIcon(passwordStrength.special)} className="w-4 h-4" />
                <span>Special character</span>
              </div>
            </div>
          </div>
        )}

        {/* Confirm Password */}
        <div>
          <label htmlFor="confirm-password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Confirm New Password
          </label>
          <div className="relative">
            <input
              type={showConfirmPassword ? 'text' : 'password'}
              id="confirm-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-4 py-3 pr-12 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              placeholder="Confirm your new password"
              required
              disabled={confirmLoading}
              minLength={8}
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <Icon 
                path={showConfirmPassword ? "M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21m-2.122-2.122a10.054 10.054 0 01-5.756 1.822m0 0a10.05 10.05 0 01-9.543-7.029m15.086 0a7.988 7.988 0 00-.856-1.958m0 0l-2.122-2.122" : "M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z M15 12a3 3 0 11-6 0 3 3 0 016 0z"} 
                className="w-5 h-5" 
              />
            </button>
          </div>
          {confirmPassword && newPassword !== confirmPassword && (
            <p className="text-sm text-red-600 dark:text-red-400 mt-1">
              Passwords do not match
            </p>
          )}
        </div>

        <button
          type="submit"
          disabled={confirmLoading || !newPassword || !confirmPassword || newPassword !== confirmPassword || passwordStrength.score < 3}
          className="w-full bg-gradient-to-r from-blue-600 to-teal-600 hover:from-blue-700 hover:to-teal-700 disabled:from-gray-400 disabled:to-gray-500 text-white font-semibold py-3 px-4 rounded-lg transition-all duration-300 transform hover:scale-[1.02] disabled:scale-100 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-gray-800"
        >
          {confirmLoading ? (
            <span className="flex items-center justify-center gap-2">
              <Icon 
                path="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" 
                className="w-5 h-5 animate-spin" 
              />
              Updating Password...
            </span>
          ) : (
            'Update Password'
          )}
        </button>

        {onCancel && (
          <div className="text-center">
            <button
              type="button"
              onClick={onCancel}
              className="text-blue-600 dark:text-blue-400 hover:underline font-medium text-sm"
            >
              Cancel
            </button>
          </div>
        )}
      </form>
    </div>
  );
};

export default PasswordResetConfirmation;