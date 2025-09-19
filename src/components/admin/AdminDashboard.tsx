import React, { useState, useEffect } from 'react';
import AdminLayoutSimple from './AdminLayoutSimple';
import DashboardSimple from '../../pages/admin/DashboardSimple';
import UserManagement from '../../pages/admin/UserManagement';
import Alerts from '../../pages/admin/Alerts';
import CreditsManagement from '../../pages/admin/CreditsManagement';
import PromptManagement from '../../pages/admin/PromptManagement';
import ThemeManagement from '../../pages/admin/ThemeManagement';
import PackageManagement from '../../pages/admin/PackageManagement';

type AdminRoute = 'dashboard' | 'users' | 'alerts' | 'generations' | 'credits' | 'packages' | 'prompts' | 'themes' | 'activity' | 'settings';

const AdminDashboard: React.FC = () => {
  const [currentRoute, setCurrentRoute] = useState<AdminRoute>(() => {
    // Initialize route based on current URL
    const path = window.location.pathname;
    if (path === '/admin/packages') return 'packages';
    if (path === '/admin/themes') return 'themes';
    if (path === '/admin/prompts') return 'prompts';
    if (path === '/admin/credits') return 'credits';
    if (path === '/admin/users') return 'users';
    if (path === '/admin/alerts') return 'alerts';
    return 'dashboard';
  });

  // Listen for URL changes and update route accordingly
  useEffect(() => {
    const handleUrlChange = () => {
      const path = window.location.pathname;
      if (path === '/admin/packages' && currentRoute !== 'packages') setCurrentRoute('packages');
      else if (path === '/admin/themes' && currentRoute !== 'themes') setCurrentRoute('themes');
      else if (path === '/admin/prompts' && currentRoute !== 'prompts') setCurrentRoute('prompts');
      else if (path === '/admin/credits' && currentRoute !== 'credits') setCurrentRoute('credits');
      else if (path === '/admin/users' && currentRoute !== 'users') setCurrentRoute('users');
      else if (path === '/admin/alerts' && currentRoute !== 'alerts') setCurrentRoute('alerts');
      else if (path === '/admin' && currentRoute !== 'dashboard') setCurrentRoute('dashboard');
    };

    window.addEventListener('popstate', handleUrlChange);
    return () => window.removeEventListener('popstate', handleUrlChange);
  }, [currentRoute]);

  // Update URL when route changes via navigation
  const handleRouteChange = (route: AdminRoute) => {
    const path = route === 'dashboard' ? '/admin' : `/admin/${route}`;
    if (window.location.pathname !== path) {
      window.history.pushState(null, '', path);
    }
    setCurrentRoute(route);
  };

  const renderContent = () => {
    switch (currentRoute) {
      case 'dashboard':
        return <DashboardSimple />;
      case 'users':
        return <UserManagement />;
      case 'alerts':
        return <Alerts />;
      case 'generations':
        return (
          <div className="p-6">
            <h1 className="text-3xl font-bold text-white">Photo Shoots Management</h1>
            <p className="text-gray-400 mt-2">Monitor and manage photo shoot generations...</p>
          </div>
        );
      case 'credits':
        return <CreditsManagement />; // Note: This manages photo shoots (credits)
      case 'packages':
        return <PackageManagement />;
      case 'prompts':
        return <PromptManagement />;
      case 'themes':
        return <ThemeManagement />;
      case 'activity':
        return (
          <div className="p-6">
            <h1 className="text-3xl font-bold text-white">Activity Log</h1>
            <p className="text-gray-400 mt-2">Coming soon...</p>
          </div>
        );
      case 'settings':
        return (
          <div className="p-6">
            <h1 className="text-3xl font-bold text-white">Settings</h1>
            <p className="text-gray-400 mt-2">Coming soon...</p>
          </div>
        );
      default:
        return <DashboardSimple />;
    }
  };

  return <AdminLayoutSimple currentRoute={currentRoute} onRouteChange={handleRouteChange}>{renderContent()}</AdminLayoutSimple>;
};

export default AdminDashboard;