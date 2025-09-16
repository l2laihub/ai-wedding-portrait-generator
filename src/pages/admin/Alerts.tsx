import React, { useState } from 'react';
import Icon from '../../../components/Icon';
import AlertNotification from '../../components/admin/AlertNotification';
import { format } from 'date-fns';

// Icon paths
const iconPaths = {
  bell: "M12 22c1.1 0 2-.9 2-2h-4c0 1.1.89 2 2 2zm6-6v-5c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z",
  alertCircle: "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z",
  checkCircle: "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z",
  info: "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z",
  xCircle: "M12 2C6.47 2 2 6.47 2 12s4.47 10 10 10 10-4.47 10-10S17.53 2 12 2zm5 13.59L15.59 17 12 13.41 8.41 17 7 15.59 10.59 12 7 8.41 8.41 7 12 10.59 15.59 7 17 8.41 13.41 12 17 15.59z",
  filter: "M10 18h4v-2h-4v2zM3 6v2h18V6H3zm3 7h12v-2H6v2z"
};

interface SystemAlert {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  category: 'system' | 'user' | 'payment' | 'generation';
}

const Alerts: React.FC = () => {
  const [alerts, setAlerts] = useState<SystemAlert[]>([
    {
      id: '1',
      type: 'error',
      title: 'API Rate Limit Exceeded',
      message: 'Gemini API rate limit reached. Some generation requests may fail.',
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
      read: false,
      category: 'system'
    },
    {
      id: '2',
      type: 'warning',
      title: 'High Generation Volume',
      message: 'Generation requests increased by 45% in the last hour.',
      timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000),
      read: false,
      category: 'generation'
    },
    {
      id: '3',
      type: 'success',
      title: 'Payment Processed',
      message: 'Successfully processed 23 payments totaling $456.78',
      timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000),
      read: true,
      category: 'payment'
    },
    {
      id: '4',
      type: 'info',
      title: 'New User Milestone',
      message: 'Congratulations! You\'ve reached 1,000 registered users.',
      timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000),
      read: true,
      category: 'user'
    }
  ]);

  const [filterCategory, setFilterCategory] = useState<'all' | SystemAlert['category']>('all');
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);
  const [showNotification, setShowNotification] = useState(false);

  const filteredAlerts = alerts.filter(alert => {
    const categoryMatch = filterCategory === 'all' || alert.category === filterCategory;
    const unreadMatch = !showUnreadOnly || !alert.read;
    return categoryMatch && unreadMatch;
  });

  const markAsRead = (alertId: string) => {
    setAlerts(prev => 
      prev.map(alert => 
        alert.id === alertId ? { ...alert, read: true } : alert
      )
    );
  };

  const markAllAsRead = () => {
    setAlerts(prev => 
      prev.map(alert => ({ ...alert, read: true }))
    );
  };

  const deleteAlert = (alertId: string) => {
    setAlerts(prev => prev.filter(alert => alert.id !== alertId));
  };

  const getIconPath = (type: SystemAlert['type']) => {
    switch (type) {
      case 'success': return iconPaths.checkCircle;
      case 'error': return iconPaths.xCircle;
      case 'warning': return iconPaths.alertCircle;
      case 'info': return iconPaths.info;
    }
  };

  const getIconColor = (type: SystemAlert['type']) => {
    switch (type) {
      case 'success': return 'text-green-500';
      case 'error': return 'text-red-500';
      case 'warning': return 'text-yellow-500';
      case 'info': return 'text-blue-500';
    }
  };

  const getCategoryBadge = (category: SystemAlert['category']) => {
    const styles = {
      system: 'bg-purple-900 text-purple-300',
      user: 'bg-blue-900 text-blue-300',
      payment: 'bg-green-900 text-green-300',
      generation: 'bg-orange-900 text-orange-300'
    };
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${styles[category]}`}>
        {category}
      </span>
    );
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">System Alerts</h1>
          <p className="text-gray-400 mt-2">Monitor system notifications and alerts</p>
        </div>
        <div className="mt-4 md:mt-0 flex space-x-2">
          <button
            onClick={() => setShowNotification(true)}
            className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors"
          >
            Test Alert
          </button>
          <button
            onClick={markAllAsRead}
            className="bg-gray-700 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition-colors"
          >
            Mark All Read
          </button>
        </div>
      </div>

      {/* Demo notification */}
      {showNotification && (
        <AlertNotification
          type="info"
          title="Test Alert"
          message="This is a demo alert notification. It will auto-close in 5 seconds."
          onClose={() => setShowNotification(false)}
          autoClose={true}
        />
      )}

      {/* Filters */}
      <div className="bg-gray-800 rounded-lg border border-gray-700 p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex items-center space-x-2">
            <Icon path={iconPaths.filter} className="w-5 h-5 text-gray-400" />
            <span className="text-gray-400">Category:</span>
            <div className="flex space-x-2">
              {['all', 'system', 'user', 'payment', 'generation'].map((category) => (
                <button
                  key={category}
                  onClick={() => setFilterCategory(category as any)}
                  className={`px-3 py-1 rounded-lg text-sm ${
                    filterCategory === category
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  } transition-colors`}
                >
                  {category.charAt(0).toUpperCase() + category.slice(1)}
                </button>
              ))}
            </div>
          </div>
          <label className="flex items-center space-x-2 text-gray-400 cursor-pointer">
            <input
              type="checkbox"
              checked={showUnreadOnly}
              onChange={(e) => setShowUnreadOnly(e.target.checked)}
              className="w-4 h-4 text-purple-600 bg-gray-600 border-gray-500 rounded focus:ring-purple-500"
            />
            <span>Unread only</span>
          </label>
        </div>
      </div>

      {/* Alerts List */}
      <div className="space-y-4">
        {filteredAlerts.length === 0 ? (
          <div className="bg-gray-800 rounded-lg border border-gray-700 p-12 text-center">
            <Icon path={iconPaths.bell} className="w-12 h-12 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400">No alerts found</p>
          </div>
        ) : (
          filteredAlerts.map((alert) => {
            const iconPath = getIconPath(alert.type);
            return (
              <div
                key={alert.id}
                className={`bg-gray-800 rounded-lg border ${
                  alert.read ? 'border-gray-700' : 'border-purple-600'
                } p-4 transition-all`}
              >
                <div className="flex items-start space-x-4">
                  <div className={`p-2 rounded-lg bg-gray-700 ${getIconColor(alert.type)}`}>
                    <Icon path={iconPath} className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center space-x-2 mb-1">
                          <h3 className={`text-lg font-medium ${
                            alert.read ? 'text-gray-300' : 'text-white'
                          }`}>
                            {alert.title}
                          </h3>
                          {getCategoryBadge(alert.category)}
                        </div>
                        <p className="text-gray-400">{alert.message}</p>
                        <p className="text-sm text-gray-500 mt-2">
                          {format(alert.timestamp, 'MMM dd, yyyy HH:mm')}
                        </p>
                      </div>
                      <div className="flex space-x-2 ml-4">
                        {!alert.read && (
                          <button
                            onClick={() => markAsRead(alert.id)}
                            className="text-purple-500 hover:text-purple-400 text-sm"
                          >
                            Mark as read
                          </button>
                        )}
                        <button
                          onClick={() => deleteAlert(alert.id)}
                          className="text-red-500 hover:text-red-400 text-sm"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default Alerts;