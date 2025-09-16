import React, { useState, useEffect } from 'react';
import App from '../App';
import PrivacyPolicy from './PrivacyPolicy';
import TermsOfService from './TermsOfService';
import SuccessPage from './SuccessPage';
import PasswordResetPage from './PasswordResetPage';
import AdminDashboard from '../src/components/admin/AdminDashboard';
import AdminProtectedRoute from '../src/components/admin/AdminProtectedRoute';

type Route = 'home' | 'privacy' | 'terms' | 'success' | 'reset-password' | 'admin' | 'admin/users' | 'admin/alerts';

const Router: React.FC = () => {
  const [currentRoute, setCurrentRoute] = useState<Route>('home');
  const [sessionId, setSessionId] = useState<string | undefined>();

  useEffect(() => {
    // Simple hash-based routing with query parameter support
    const handleRouteChange = () => {
      const hash = window.location.hash.slice(1);
      const params = new URLSearchParams(window.location.search);
      
      // Check for success route from query parameter
      if (window.location.pathname === '/success' || params.get('success') === 'true') {
        setCurrentRoute('success');
        setSessionId(params.get('session_id') || undefined);
        return;
      }
      
      // Check for password reset route from pathname
      if (window.location.pathname === '/reset-password' || hash.includes('type=recovery')) {
        setCurrentRoute('reset-password');
        return;
      }
      
      // Check for admin routes from pathname
      if (window.location.pathname === '/admin') {
        setCurrentRoute('admin');
        return;
      } else if (window.location.pathname === '/admin/users') {
        setCurrentRoute('admin/users');
        return;
      } else if (window.location.pathname === '/admin/alerts') {
        setCurrentRoute('admin/alerts');
        return;
      }
      
      switch (hash) {
        case 'privacy':
          setCurrentRoute('privacy');
          break;
        case 'terms':
          setCurrentRoute('terms');
          break;
        case 'success':
          setCurrentRoute('success');
          setSessionId(params.get('session_id') || undefined);
          break;
        case 'reset-password':
          setCurrentRoute('reset-password');
          break;
        case 'admin':
          setCurrentRoute('admin');
          break;
        case 'admin/users':
          setCurrentRoute('admin/users');
          break;
        case 'admin/alerts':
          setCurrentRoute('admin/alerts');
          break;
        default:
          setCurrentRoute('home');
      }
    };

    // Check initial route
    handleRouteChange();

    // Listen for hash changes
    window.addEventListener('hashchange', handleRouteChange);
    window.addEventListener('popstate', handleRouteChange);

    return () => {
      window.removeEventListener('hashchange', handleRouteChange);
      window.removeEventListener('popstate', handleRouteChange);
    };
  }, []);

  const navigate = (route: Route) => {
    const hash = route === 'home' ? '' : route;
    window.location.hash = hash;
    setCurrentRoute(route);
  };

  // Navigation component for legal pages
  const Navigation: React.FC = () => (
    <div className="fixed top-4 left-4 z-50">
      <button
        onClick={() => navigate('home')}
        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg shadow-lg transition-colors duration-200 flex items-center gap-2"
      >
        <span>←</span>
        Back to App
      </button>
    </div>
  );

  // Admin routes need special handling
  if (currentRoute === 'admin' || currentRoute.startsWith('admin/')) {
    return (
      <AdminProtectedRoute>
        <AdminDashboard />
      </AdminProtectedRoute>
    );
  }

  switch (currentRoute) {
    case 'privacy':
      return (
        <>
          <Navigation />
          <PrivacyPolicy />
        </>
      );
    case 'terms':
      return (
        <>
          <Navigation />
          <TermsOfService />
        </>
      );
    case 'success':
      return <SuccessPage sessionId={sessionId} />;
    case 'reset-password':
      return <PasswordResetPage navigate={navigate} />;
    default:
      return <App navigate={navigate} />;
  }
};

export default Router;