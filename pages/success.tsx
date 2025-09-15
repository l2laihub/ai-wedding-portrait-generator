import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../hooks/useAuth';

const SuccessPage: React.FC = () => {
  const router = useRouter();
  const { user } = useAuth();
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const { session_id } = router.query;
    if (session_id && typeof session_id === 'string') {
      setSessionId(session_id);
      setIsLoading(false);
    }
  }, [router.query]);

  const handleContinue = () => {
    router.push('/');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 text-center">
        {/* Success Icon */}
        <div className="w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg className="w-8 h-8 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>

        {/* Success Message */}
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Payment Successful!
        </h1>
        
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          Thank you for your purchase! Your credits have been added to your account and you can start creating beautiful wedding portraits right away.
        </p>

        {/* Session Info */}
        {sessionId && (
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 mb-6">
            <p className="text-sm text-gray-500 dark:text-gray-400">Order ID:</p>
            <p className="text-sm font-mono text-gray-700 dark:text-gray-300 break-all">
              {sessionId}
            </p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="space-y-3">
          <button
            onClick={handleContinue}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg transition-colors"
          >
            Start Creating Portraits
          </button>
          
          <p className="text-xs text-gray-500 dark:text-gray-400">
            You should receive a confirmation email shortly
          </p>
        </div>

        {/* Additional Info */}
        <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
            Need help getting started?
          </p>
          <div className="flex justify-center space-x-4 text-sm">
            <button 
              onClick={() => router.push('/help')}
              className="text-blue-600 dark:text-blue-400 hover:underline"
            >
              View Guide
            </button>
            <button 
              onClick={() => router.push('/contact')}
              className="text-blue-600 dark:text-blue-400 hover:underline"
            >
              Contact Support
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SuccessPage;