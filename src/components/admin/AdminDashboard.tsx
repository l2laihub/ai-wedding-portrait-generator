import React, { useState } from 'react';
import AdminLayoutSimple from './AdminLayoutSimple';
import DashboardSimple from '../../pages/admin/DashboardSimple';
import UserManagement from '../../pages/admin/UserManagement';
import Alerts from '../../pages/admin/Alerts';
import CreditsManagement from '../../pages/admin/CreditsManagement';
import PromptManagement from '../../pages/admin/PromptManagement';
import ThemeManagement from '../../pages/admin/ThemeManagement';

type AdminRoute = 'dashboard' | 'users' | 'alerts' | 'generations' | 'credits' | 'prompts' | 'themes' | 'activity' | 'settings';

const AdminDashboard: React.FC = () => {
  const [currentRoute, setCurrentRoute] = useState<AdminRoute>('dashboard');

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

  return <AdminLayoutSimple currentRoute={currentRoute} onRouteChange={setCurrentRoute}>{renderContent()}</AdminLayoutSimple>;
};

export default AdminDashboard;