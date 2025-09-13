import React, { useState, useEffect } from 'react';
import App from '../App';
import PrivacyPolicy from './PrivacyPolicy';
import TermsOfService from './TermsOfService';

type Route = 'home' | 'privacy' | 'terms';

const Router: React.FC = () => {
  const [currentRoute, setCurrentRoute] = useState<Route>('home');

  useEffect(() => {
    // Simple hash-based routing
    const handleHashChange = () => {
      const hash = window.location.hash.slice(1);
      switch (hash) {
        case 'privacy':
          setCurrentRoute('privacy');
          break;
        case 'terms':
          setCurrentRoute('terms');
          break;
        default:
          setCurrentRoute('home');
      }
    };

    // Check initial hash
    handleHashChange();

    // Listen for hash changes
    window.addEventListener('hashchange', handleHashChange);

    return () => {
      window.removeEventListener('hashchange', handleHashChange);
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
    default:
      return <App navigate={navigate} />;
  }
};

export default Router;