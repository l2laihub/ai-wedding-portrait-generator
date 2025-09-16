import React, { useState } from 'react';
import GoogleSignInButton from './GoogleSignInButton';
import PasswordResetForm from './PasswordResetForm';
import PasswordResetConfirmation from './PasswordResetConfirmation';
import LoginModal from './LoginModal';

/**
 * Demo component showcasing all authentication components
 * This is for development/testing purposes only
 */
const AuthDemo: React.FC = () => {
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showResetForm, setShowResetForm] = useState(false);
  const [showResetConfirmation, setShowResetConfirmation] = useState(false);
  const [notifications, setNotifications] = useState<Array<{ type: 'success' | 'error'; message: string; id: number }>>([]);

  const addNotification = (type: 'success' | 'error', message: string) => {
    const id = Date.now();
    setNotifications(prev => [...prev, { type, message, id }]);
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 5000);
  };

  const handleSuccess = (message: string = 'Operation completed successfully!') => {
    addNotification('success', message);
  };

  const handleError = (message: string) => {
    addNotification('error', message);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-teal-50 dark:from-gray-900 dark:to-gray-800 p-8">
      {/* Notifications */}
      {notifications.length > 0 && (
        <div className="fixed top-4 right-4 z-50 space-y-2">
          {notifications.map(notification => (
            <div
              key={notification.id}
              className={`
                px-4 py-3 rounded-lg shadow-lg max-w-sm animate-in slide-in-from-right duration-300
                ${
                  notification.type === 'success'
                    ? 'bg-green-100 dark:bg-green-900/30 border border-green-300 dark:border-green-700 text-green-800 dark:text-green-200'
                    : 'bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700 text-red-800 dark:text-red-200'
                }
              `}
            >
              <div className="flex items-center gap-2">
                {notification.type === 'success' ? '✅' : '❌'}
                <span className="text-sm font-medium">{notification.message}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Authentication Components Demo
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400">
            Interactive showcase of Google Sign-In and Password Reset components
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Google Sign-In Buttons */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-6">
              Google Sign-In Buttons
            </h2>
            
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Primary Large Button
                </h3>
                <GoogleSignInButton
                  size="lg"
                  variant="primary"
                  onSuccess={() => handleSuccess('Google Sign-In successful!')}
                  onError={handleError}
                />
              </div>
              
              <div>
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Secondary Medium Button
                </h3>
                <GoogleSignInButton
                  size="md"
                  variant="secondary"
                  onSuccess={() => handleSuccess('Google Sign-In successful!')}
                  onError={handleError}
                />
              </div>
              
              <div>
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Small Button (Not Full Width)
                </h3>
                <GoogleSignInButton
                  size="sm"
                  variant="secondary"
                  fullWidth={false}
                  onSuccess={() => handleSuccess('Google Sign-In successful!')}
                  onError={handleError}
                />
              </div>
              
              <div>
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Disabled Button
                </h3>
                <GoogleSignInButton
                  disabled={true}
                  onSuccess={() => handleSuccess('Google Sign-In successful!')}
                  onError={handleError}
                />
              </div>
            </div>
          </div>

          {/* Password Reset Form */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-6">
              Password Reset Form
            </h2>
            
            <PasswordResetForm
              onSuccess={() => handleSuccess('Password reset email sent!')}
              onCancel={() => setShowResetForm(false)}
            />
          </div>

          {/* Password Reset Confirmation */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-6">
              Password Reset Confirmation
            </h2>
            
            <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <p className="text-sm text-blue-800 dark:text-blue-200">
                📝 <strong>Note:</strong> This component normally validates reset tokens from the URL.
                For demo purposes, it shows the form directly.
              </p>
            </div>
            
            <PasswordResetConfirmation
              onSuccess={() => handleSuccess('Password updated successfully!')}
              onCancel={() => setShowResetConfirmation(false)}
            />
          </div>

          {/* Modal Triggers */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-6">
              Modal Components
            </h2>
            
            <div className="space-y-4">
              <button
                onClick={() => setShowLoginModal(true)}
                className="w-full bg-gradient-to-r from-blue-600 to-teal-600 hover:from-blue-700 hover:to-teal-700 text-white font-semibold py-3 px-4 rounded-lg transition-all duration-300 transform hover:scale-[1.02]"
              >
                Open Login Modal
              </button>
              
              <button
                onClick={() => setShowResetForm(true)}
                className="w-full bg-gray-600 hover:bg-gray-700 text-white font-semibold py-3 px-4 rounded-lg transition-all duration-300"
              >
                Open Reset Form Modal
              </button>
              
              <button
                onClick={() => setShowResetConfirmation(true)}
                className="w-full bg-teal-600 hover:bg-teal-700 text-white font-semibold py-3 px-4 rounded-lg transition-all duration-300"
              >
                Open Reset Confirmation Modal
              </button>
            </div>
            
            <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-3">
                Integration Features
              </h3>
              <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-2">
                <li>🔐 Google OAuth2 Integration</li>
                <li>📧 Email-based Password Reset</li>
                <li>💪 Password Strength Validation</li>
                <li>🎨 Dark Mode Support</li>
                <li>📱 Responsive Design</li>
                <li>♿ Accessibility Features</li>
                <li>⚡ TypeScript Type Safety</li>
                <li>🔄 Loading States & Error Handling</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Login Modal */}
      <LoginModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        onSuccess={() => {
          handleSuccess('Login successful!');
          setShowLoginModal(false);
        }}
        defaultMode="signin"
      />

      {/* Reset Form Modal */}
      {showResetForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 overflow-y-auto animate-in fade-in duration-200">
          <div className="min-h-screen flex items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-md w-full animate-in zoom-in-95 duration-200">
              <div className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                    Reset Password
                  </h2>
                  <button
                    onClick={() => setShowResetForm(false)}
                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  >
                    ✕
                  </button>
                </div>
                
                <PasswordResetForm
                  onSuccess={() => {
                    handleSuccess('Password reset email sent!');
                    setShowResetForm(false);
                  }}
                  onCancel={() => setShowResetForm(false)}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reset Confirmation Modal */}
      {showResetConfirmation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 overflow-y-auto animate-in fade-in duration-200">
          <div className="min-h-screen flex items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-md w-full animate-in zoom-in-95 duration-200">
              <div className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                    Set New Password
                  </h2>
                  <button
                    onClick={() => setShowResetConfirmation(false)}
                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  >
                    ✕
                  </button>
                </div>
                
                <PasswordResetConfirmation
                  onSuccess={() => {
                    handleSuccess('Password updated successfully!');
                    setShowResetConfirmation(false);
                  }}
                  onCancel={() => setShowResetConfirmation(false)}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AuthDemo;