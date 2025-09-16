import React from 'react';
import Icon from '../../../components/Icon';

// Icon paths
const iconPaths = {
  alertCircle: "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z",
  checkCircle: "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z",
  xCircle: "M12 2C6.47 2 2 6.47 2 12s4.47 10 10 10 10-4.47 10-10S17.53 2 12 2zm5 13.59L15.59 17 12 13.41 8.41 17 7 15.59 10.59 12 7 8.41 8.41 7 12 10.59 15.59 7 17 8.41 13.41 12 17 15.59z",
  info: "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z",
  close: "M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"
};

export type AlertType = 'success' | 'error' | 'warning' | 'info';

interface AlertNotificationProps {
  type: AlertType;
  title: string;
  message: string;
  onClose?: () => void;
  autoClose?: boolean;
  autoCloseDelay?: number;
}

const AlertNotification: React.FC<AlertNotificationProps> = ({
  type,
  title,
  message,
  onClose,
  autoClose = false,
  autoCloseDelay = 5000
}) => {
  const iconMap = {
    success: iconPaths.checkCircle,
    error: iconPaths.xCircle,
    warning: iconPaths.alertCircle,
    info: iconPaths.info
  };

  const styles = {
    success: 'bg-green-900 border-green-700 text-green-300',
    error: 'bg-red-900 border-red-700 text-red-300',
    warning: 'bg-yellow-900 border-yellow-700 text-yellow-300',
    info: 'bg-blue-900 border-blue-700 text-blue-300'
  };

  const iconPath = iconMap[type];

  React.useEffect(() => {
    if (autoClose && onClose) {
      const timer = setTimeout(onClose, autoCloseDelay);
      return () => clearTimeout(timer);
    }
  }, [autoClose, autoCloseDelay, onClose]);

  return (
    <div className={`border rounded-lg p-4 ${styles[type]}`}>
      <div className="flex">
        <div className="flex-shrink-0">
          <Icon path={iconPath} className="h-5 w-5" />
        </div>
        <div className="ml-3 flex-1">
          <h3 className="text-sm font-medium">{title}</h3>
          <div className="mt-1 text-sm opacity-90">{message}</div>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="ml-4 flex-shrink-0 rounded-lg p-1 hover:bg-black hover:bg-opacity-20 transition-colors"
          >
            <Icon path={iconPaths.close} className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
};

export default AlertNotification;