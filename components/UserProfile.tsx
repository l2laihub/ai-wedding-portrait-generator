import React, { useState, useEffect } from 'react';
import Icon from './Icon';
import { authService, AuthUser } from '../services/authService';
import { rateLimiter } from '../utils/rateLimiter';
import { creditsService, CreditBalance } from '../services/creditsService';

interface UserProfileProps {
  isOpen: boolean;
  onClose: () => void;
  user: AuthUser;
  onSignOut?: () => void;
}

const UserProfile: React.FC<UserProfileProps> = ({
  isOpen,
  onClose,
  user,
  onSignOut
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [displayName, setDisplayName] = useState(user.displayName || '');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [usageStats, setUsageStats] = useState({
    used: 0,
    remaining: 0,
    total: 0,
    percentage: 0
  });
  const [creditBalance, setCreditBalance] = useState<CreditBalance | null>(null);

  useEffect(() => {
    if (isOpen) {
      // Update usage stats when modal opens
      setUsageStats(rateLimiter.getUsageStats());
      
      // Load comprehensive credit balance
      loadCreditBalance();
    }
  }, [isOpen]);

  const loadCreditBalance = async () => {
    try {
      const balance = await creditsService.getBalance();
      setCreditBalance(balance);
    } catch (error) {
      console.error('Failed to load credit balance:', error);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setIsLoading(true);

    try {
      const result = await authService.updateProfile({
        displayName: displayName.trim() || undefined
      });

      if (result.success) {
        setSuccess('Profile updated successfully!');
        setIsEditing(false);
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(result.error || 'Failed to update profile');
      }
    } catch (err) {
      setError('Failed to update profile');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignOut = async () => {
    setIsLoading(true);
    try {
      await authService.signOut();
      onSignOut?.();
      onClose();
    } catch (err) {
      setError('Failed to sign out');
    } finally {
      setIsLoading(false);
    }
  };

  const copyReferralLink = () => {
    if (user.referralCode) {
      const referralUrl = `${window.location.origin}?ref=${user.referralCode}`;
      navigator.clipboard.writeText(referralUrl);
      setSuccess('Referral link copied!');
      setTimeout(() => setSuccess(''), 3000);
    }
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

  // Add escape key listener and prevent background scroll
  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleEscapeKey);
      document.body.style.overflow = 'hidden';
      return () => {
        document.removeEventListener('keydown', handleEscapeKey);
        document.body.style.overflow = 'unset';
      };
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center z-50 p-4 animate-in fade-in duration-200 overflow-y-auto"
      onClick={handleBackdropClick}
      style={{ paddingTop: 'max(2rem, env(safe-area-inset-top))' }}
    >
      <div 
        className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-md w-full mx-4 my-8 animate-in zoom-in-95 duration-200 flex flex-col"
        onClick={(e) => e.stopPropagation()}
        style={{ maxHeight: 'calc(100vh - 4rem)' }}
      >
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            Account Profile
          </h2>
          <button
            onClick={onClose}
            className="flex items-center justify-center w-10 h-10 text-gray-700 dark:text-gray-200 hover:text-gray-900 dark:hover:text-white bg-gray-100 dark:bg-gray-600 hover:bg-gray-200 dark:hover:bg-gray-500 border-2 border-gray-300 dark:border-gray-500 rounded-full transition-all duration-200 shadow-sm hover:shadow-md"
            aria-label="Close modal"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1">
          {/* Success Message */}
          {success && (
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-300 dark:border-green-700 rounded-lg p-3">
              <div className="flex items-center gap-2">
                <Icon path="M5 13l4 4L19 7" className="w-5 h-5 text-green-600 dark:text-green-400" />
                <span className="text-green-800 dark:text-green-200 text-sm">{success}</span>
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-300 dark:border-red-700 rounded-lg p-3">
              <div className="flex items-center gap-2">
                <Icon path="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5l-6.928-12c-.77-.833-2.694-.833-3.464 0L3.34 16.5C2.57 18.333 3.532 20 5.072 20z" className="w-5 h-5 text-red-600 dark:text-red-400" />
                <span className="text-red-800 dark:text-red-200 text-sm">{error}</span>
              </div>
            </div>
          )}

          {/* Profile Info */}
          <div className="bg-gradient-to-br from-blue-50 to-teal-50 dark:from-blue-900/20 dark:to-teal-900/20 rounded-lg p-4">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-teal-500 rounded-full flex items-center justify-center">
                <span className="text-2xl text-white font-bold">
                  {(user.displayName || user.email).charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 dark:text-white">
                  {user.displayName || 'Anonymous User'}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">{user.email}</p>
                <p className="text-xs text-gray-500 dark:text-gray-500">
                  Joined {new Date(user.createdAt).toLocaleDateString()}
                </p>
              </div>
            </div>

            {/* Edit Profile */}
            {isEditing ? (
              <form onSubmit={handleUpdateProfile} className="space-y-3">
                <div>
                  <label htmlFor="displayName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Display Name
                  </label>
                  <input
                    type="text"
                    id="displayName"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="Enter your name"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg text-sm transition-colors"
                  >
                    {isLoading ? 'Saving...' : 'Save'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    className="bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 dark:hover:bg-gray-500 text-gray-700 dark:text-gray-300 px-4 py-2 rounded-lg text-sm transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <button
                onClick={() => setIsEditing(true)}
                className="text-blue-600 dark:text-blue-400 hover:underline text-sm"
              >
                Edit Profile
              </button>
            )}
          </div>

          {/* Credit Balance & Usage */}
          <div className="bg-white dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 p-4">
            <div className="flex justify-between items-center mb-3">
              <h4 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <Icon path="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                Credits & Usage
              </h4>
              <button
                onClick={loadCreditBalance}
                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-lg transition-colors"
                title="Refresh credit balance"
              >
                <Icon path="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" className="w-4 h-4 text-gray-500 dark:text-gray-400" />
              </button>
            </div>
            
            {creditBalance ? (
              <div className="space-y-3">
                {/* Total Available Credits */}
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Total Available</span>
                  <span className="text-lg font-bold text-blue-600 dark:text-blue-400">
                    {creditBalance.totalAvailable} credits
                  </span>
                </div>
                
                {/* Credit Breakdown */}
                <div className="space-y-2 pt-2 border-t border-gray-200 dark:border-gray-600">
                  {creditBalance.freeRemaining > 0 && (
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-600 dark:text-gray-400">Free daily</span>
                      <span className="font-medium text-green-600 dark:text-green-400">
                        {creditBalance.freeRemaining}
                      </span>
                    </div>
                  )}
                  
                  {creditBalance.paidCredits > 0 && (
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-600 dark:text-gray-400">Purchased</span>
                      <span className="font-medium text-blue-600 dark:text-blue-400">
                        {creditBalance.paidCredits}
                      </span>
                    </div>
                  )}
                  
                  {creditBalance.bonusCredits > 0 && (
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-600 dark:text-gray-400">Bonus</span>
                      <span className="font-medium text-purple-600 dark:text-purple-400">
                        {creditBalance.bonusCredits}
                      </span>
                    </div>
                  )}
                </div>

                {/* Daily Usage Progress */}
                {creditBalance.freeCreditsUsedToday > 0 && (
                  <div className="pt-2 border-t border-gray-200 dark:border-gray-600">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-xs text-gray-500 dark:text-gray-400">Today's free usage</span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {creditBalance.freeCreditsUsedToday}/5
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-1.5">
                      <div 
                        className="bg-gradient-to-r from-green-400 to-blue-500 h-1.5 rounded-full transition-all duration-300"
                        style={{ width: `${(creditBalance.freeCreditsUsedToday / 5) * 100}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Status Message */}
                <div className="pt-2">
                  {creditBalance.totalAvailable === 0 ? (
                    <p className="text-xs text-amber-600 dark:text-amber-400">
                      No credits remaining. Purchase more to continue creating!
                    </p>
                  ) : creditBalance.totalAvailable <= 5 ? (
                    <p className="text-xs text-amber-600 dark:text-amber-400">
                      Running low on credits. Consider purchasing more.
                    </p>
                  ) : (
                    <p className="text-xs text-green-600 dark:text-green-400">
                      Ready to create amazing portraits!
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center py-4">
                <div className="animate-spin w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full"></div>
                <span className="ml-2 text-sm text-gray-500 dark:text-gray-400">Loading credits...</span>
              </div>
            )}
          </div>

          {/* Referral Section */}
          {user.referralCode && (
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-lg p-4">
              <h4 className="font-semibold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                <Icon path="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" className="w-4 h-4 text-green-600 dark:text-green-400" />
                Refer Friends
              </h4>
              <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">
                Share your referral link and earn credits when friends join!
              </p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={`${window.location.origin}?ref=${user.referralCode}`}
                  readOnly
                  className="flex-1 px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-sm"
                />
                <button
                  onClick={copyReferralLink}
                  className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm transition-colors"
                >
                  Copy
                </button>
              </div>
            </div>
          )}

          {/* Account Actions */}
          <div className="border-t border-gray-200 dark:border-gray-700 pt-4 space-y-2">
            <button
              onClick={handleSignOut}
              disabled={isLoading}
              className="w-full bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white font-medium py-3 px-4 rounded-lg transition-colors"
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <Icon path="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" className="w-4 h-4 animate-spin" />
                  Signing out...
                </span>
              ) : (
                'Sign Out'
              )}
            </button>
            
            <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
              Premium plans coming soon with unlimited portraits!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserProfile;