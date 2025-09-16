import React, { useEffect, useState } from 'react';
import authService from '../../../services/authService';
import Loader from '../../../components/Loader';

interface AdminProtectedRouteProps {
  children: React.ReactNode;
}

const AdminProtectedRoute: React.FC<AdminProtectedRouteProps> = ({ children }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const checkAdminAccess = async () => {
      try {
        // First check if we have a session
        await authService.getStoredSession();
        
        // Check if user is authenticated
        const authenticated = authService.isAuthenticated();
        setIsAuthenticated(authenticated);
        
        if (authenticated) {
          // Refresh user profile to ensure we have the latest role
          await authService.refreshUserProfile();
          
          // Check if user is admin
          const adminStatus = authService.isAdmin();
          setIsAdmin(adminStatus);
          console.log('Admin check:', authService.getCurrentUser()?.email, 'isAdmin:', adminStatus);
        }
      } catch (error) {
        console.error('Error checking admin access:', error);
      } finally {
        setIsLoading(false);
      }
    };

    checkAdminAccess();
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <Loader message="Checking admin access..." />
      </div>
    );
  }

  if (!isAuthenticated) {
    // Redirect to home page if not authenticated
    window.location.href = '/';
    return null;
  }

  if (!isAdmin) {
    // Show access denied page if authenticated but not admin
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center max-w-md px-6">
          <div className="w-16 h-16 bg-red-900 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Access Denied</h1>
          <p className="text-gray-400 mb-6">
            You don't have permission to access the admin dashboard. 
            Please contact an administrator if you believe this is an error.
          </p>
          <button
            onClick={() => window.location.href = '/'}
            className="bg-purple-600 text-white px-6 py-2 rounded-lg hover:bg-purple-700 transition-colors"
          >
            Return to Home
          </button>
        </div>
      </div>
    );
  }

  // User is authenticated and is admin, render children
  return <>{children}</>;
};

export default AdminProtectedRoute;