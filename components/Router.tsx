import React, { useState, useEffect } from 'react';
import App from '../App';
import PrivacyPolicy from './PrivacyPolicy';
import TermsOfService from './TermsOfService';
import SuccessPage from './SuccessPage';

type Route = 'home' | 'privacy' | 'terms' | 'success';

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
    default:
      return <App navigate={navigate} />;
  }
};

export default Router;