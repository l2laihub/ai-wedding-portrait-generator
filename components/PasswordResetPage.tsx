import React from 'react';
import PasswordResetConfirmation from './PasswordResetConfirmation';
import SimpleHeader from './SimpleHeader';
import SimpleFooter from './SimpleFooter';

interface PasswordResetPageProps {
  navigate: (route: 'home' | 'privacy' | 'terms') => void;
  onComplete?: () => void;
}

const PasswordResetPage: React.FC<PasswordResetPageProps> = ({
  navigate,
  onComplete
}) => {
  const handleSuccess = () => {
    // Redirect to home page or show success message
    onComplete?.();
    navigate('home');
  };

  const handleCancel = () => {
    navigate('home');
  };

  return (
    <div className="bg-slate-50 dark:bg-gray-900 min-h-screen text-gray-900 dark:text-white font-sans flex flex-col transition-colors duration-300">
      {/* Header */}
      <SimpleHeader 
        onLogin={() => navigate('home')}
        onProfile={() => navigate('home')}
        onHelp={() => navigate('home')}
        onSettings={() => navigate('home')}
        hideAuthButtons={true}
      />
      
      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <PasswordResetConfirmation
            onSuccess={handleSuccess}
            onCancel={handleCancel}
            standalone={true}
          />
        </div>
      </main>
      
      {/* Footer */}
      <SimpleFooter navigate={navigate} />
    </div>
  );
};

export default PasswordResetPage;