import React, { useState, useEffect } from 'react';
import Icon from '../../../components/Icon';
import MetricCard from '../../components/admin/MetricCard';
import { adminService, DashboardMetrics, ChartData, RecentActivity, SystemStatus } from '../../services/adminService';

// Icon paths
const iconPaths = {
  users: "M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z",
  activity: "M13.5.67s.74 2.65.74 4.8c0 2.06-1.35 3.73-3.41 3.73-2.07 0-3.63-1.67-3.63-3.73l.03-.36C5.21 7.51 4 10.62 4 14c0 4.42 3.58 8 8 8s8-3.58 8-8C20 8.61 17.41 3.8 13.5.67zM11.71 19c-1.78 0-3.22-1.4-3.22-3.14 0-1.62 1.05-2.76 2.81-3.12 1.77-.36 3.6-1.21 4.62-2.58.39 1.29.59 2.65.59 4.04 0 2.65-2.15 4.8-4.8 4.8z",
  image: "M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z",
  dollarSign: "M7 15h2c0 1.08 1.37 2 3 2s3-.92 3-2c0-1.1-1.04-1.5-3.24-2.03C9.64 12.44 7 11.78 7 9c0-1.79 1.47-4 5-4s5 2.21 5 4h-2c0-1.08-1.37-2-3-2s-3 .92-3 2c0 1.1 1.04 1.5 3.24 2.03C14.36 11.56 17 12.22 17 15c0 1.79-1.47 4-5 4s-5-2.21-5-4z",
  trendingUp: "M16 6l2.29 2.29-4.88 4.88-4-4L2 16.59 3.41 18l6-6 4 4 6.3-6.29L22 12V6z",
  creditCard: "M20 4H4c-1.11 0-1.99.89-1.99 2L2 18c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V6c0-1.11-.89-2-2-2zm0 14H4v-6h16v6zm0-10H4V6h16v2z"
};

const DashboardSimple: React.FC = () => {
  const [metrics, setMetrics] = useState<DashboardMetrics & { loading: boolean }>({
    totalUsers: 0,
    activeUsers: 0,
    totalGenerations: 0,
    totalRevenue: 0,
    conversionRate: 0,
    loading: true
  });

  const [chartData, setChartData] = useState<ChartData>({
    daily: [],
    styleDistribution: [],
    userActivity: []
  });

  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [systemStatus, setSystemStatus] = useState<SystemStatus>({
    apiStatus: 'unknown',
    databaseStatus: 'unknown',
    aiProcessingQueue: 0,
    totalApiCalls: 0,
    lastUpdate: new Date().toISOString()
  });

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        console.log('🔍 Loading dashboard data...');
        
        // Load metrics first (this will cache all the data)
        const metricsData = await adminService.getDashboardMetrics();
        setMetrics({ ...metricsData, loading: false });
        
        // Load chart data (will use cached data)
        const chartData = await adminService.getChartData();
        setChartData(chartData);
        
        // Load recent activity (will use cached data)
        const activity = await adminService.getRecentActivity();
        setRecentActivity(activity);
        
        // Load system status (will use cached data)
        const status = await adminService.getSystemStatus();
        setSystemStatus(status);
        
        console.log('🔍 Dashboard data loaded successfully');
      } catch (error) {
        console.error('Failed to load dashboard data:', error);
        setMetrics(prev => ({ ...prev, loading: false }));
      }
    };

    loadDashboardData();

    // Set up real-time updates
    const unsubscribe = adminService.subscribeToMetrics((newMetrics) => {
      setMetrics({ ...newMetrics, loading: false });
    });

    return unsubscribe;
  }, []);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white">Admin Dashboard</h1>
        <p className="text-gray-400 mt-2">Welcome back! Here's what's happening with your platform.</p>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Total Users"
          value={metrics.totalUsers.toLocaleString()}
          change={{ value: 12.5, isPositive: true }}
          iconPath={iconPaths.users}
          iconColor="text-blue-500"
          loading={metrics.loading}
        />
        <MetricCard
          title="Active Users"
          value={metrics.activeUsers.toLocaleString()}
          change={{ value: 8.3, isPositive: true }}
          iconPath={iconPaths.activity}
          iconColor="text-green-500"
          loading={metrics.loading}
        />
        <MetricCard
          title="Total Photo Shoots"
          value={metrics.totalGenerations.toLocaleString()}
          change={{ value: 23.1, isPositive: true }}
          iconPath={iconPaths.image}
          iconColor="text-purple-500"
          loading={metrics.loading}
        />
        <MetricCard
          title="Revenue"
          value={`$${metrics.totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          change={{ value: 15.2, isPositive: true }}
          iconPath={iconPaths.dollarSign}
          iconColor="text-yellow-500"
          loading={metrics.loading}
        />
      </div>

      {/* Secondary Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm font-medium">Conversion Rate</p>
              <p className="text-2xl font-semibold text-white mt-2">{metrics.conversionRate.toFixed(1)}%</p>
            </div>
            <Icon path={iconPaths.trendingUp} className="w-8 h-8 text-green-500" />
          </div>
        </div>
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm font-medium">Avg Revenue Per User</p>
              <p className="text-2xl font-semibold text-white mt-2">
                ${(metrics.totalRevenue / (metrics.totalUsers || 1)).toFixed(2)}
              </p>
            </div>
            <Icon path={iconPaths.dollarSign} className="w-8 h-8 text-yellow-500" />
          </div>
        </div>
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm font-medium">Avg Photo Shoots Per User</p>
              <p className="text-2xl font-semibold text-white mt-2">
                {(metrics.totalGenerations / (metrics.totalUsers || 1)).toFixed(1)}
              </p>
            </div>
            <Icon path={iconPaths.image} className="w-8 h-8 text-purple-500" />
          </div>
        </div>
      </div>

      {/* Charts with Real Data */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
          <h3 className="text-lg font-semibold text-white mb-4">Daily Trends (Last 30 Days)</h3>
          <div className="h-80">
            {chartData.daily.length > 0 ? (
              <div className="h-full">
                {/* Simple text-based chart for daily trends */}
                <div className="space-y-2 text-sm">
                  <div className="grid grid-cols-4 gap-4 text-gray-400 font-medium">
                    <span>Date</span>
                    <span>Users</span>
                    <span>Photo Shoots</span>
                    <span>Revenue</span>
                  </div>
                  <div className="max-h-64 overflow-y-auto space-y-1">
                    {chartData.daily.slice(-10).map((day, index) => (
                      <div key={index} className="grid grid-cols-4 gap-4 text-white text-sm py-1">
                        <span>{day.date}</span>
                        <span className="text-blue-400">{day.users}</span>
                        <span className="text-purple-400">{day.generations}</span>
                        <span className="text-green-400">${day.revenue.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="mt-4 text-xs text-gray-400">
                  Showing last 10 days • Total: {chartData.daily.reduce((sum, d) => sum + d.users, 0)} users, {chartData.daily.reduce((sum, d) => sum + d.generations, 0)} photo shoots
                </div>
              </div>
            ) : (
              <div className="h-full flex items-center justify-center text-gray-400">
                <div className="text-center">
                  <div className="w-16 h-16 bg-gray-700 rounded-lg flex items-center justify-center mx-auto mb-4">
                    <Icon path={iconPaths.trendingUp} className="w-8 h-8 text-purple-500" />
                  </div>
                  <p>Loading daily trends...</p>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
          <h3 className="text-lg font-semibold text-white mb-4">Style Distribution</h3>
          <div className="h-80">
            {chartData.styleDistribution.length > 0 ? (
              <div className="space-y-3">
                {chartData.styleDistribution.map((style, index) => {
                  const total = chartData.styleDistribution.reduce((sum, s) => sum + s.value, 0);
                  const percentage = total > 0 ? (style.value / total * 100).toFixed(1) : '0';
                  return (
                    <div key={index} className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div 
                          className="w-4 h-4 rounded-full" 
                          style={{ backgroundColor: style.color }}
                        ></div>
                        <span className="text-white text-sm">{style.name}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-gray-400 text-sm">{style.value}</span>
                        <span className="text-purple-400 text-sm font-medium">{percentage}%</span>
                      </div>
                    </div>
                  );
                })}
                <div className="mt-4 pt-4 border-t border-gray-700">
                  <div className="text-xs text-gray-400">
                    Total photo shoots: {chartData.styleDistribution.reduce((sum, s) => sum + s.value, 0)}
                  </div>
                </div>
              </div>
            ) : (
              <div className="h-full flex items-center justify-center text-gray-400">
                <div className="text-center">
                  <div className="w-16 h-16 bg-gray-700 rounded-lg flex items-center justify-center mx-auto mb-4">
                    <Icon path={iconPaths.image} className="w-8 h-8 text-purple-500" />
                  </div>
                  <p>Loading style distribution...</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
        <h3 className="text-lg font-semibold text-white mb-4">Recent Activity</h3>
        <div className="space-y-4">
          {recentActivity.length > 0 ? (
            recentActivity.map((activity, index) => (
              <div key={index} className="flex items-center justify-between py-3 border-b border-gray-700 last:border-0">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-purple-600 rounded-full flex items-center justify-center">
                    <span className="text-white font-medium text-sm">
                      {activity.user.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <p className="text-white text-sm">{activity.action}</p>
                    <p className="text-gray-400 text-xs">
                      {activity.user} • {activity.style} • {activity.time}
                    </p>
                  </div>
                </div>
                <div className={`flex items-center text-sm ${
                  activity.credits > 0 ? 'text-green-500' : 
                  activity.credits < 0 ? 'text-red-500' : 'text-gray-400'
                }`}>
                  <Icon path={iconPaths.creditCard} className="w-4 h-4 mr-1" />
                  <span>{activity.credits > 0 ? '+' : ''}{activity.credits} credits</span>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center text-gray-400 py-8">
              <div className="w-16 h-16 bg-gray-700 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Icon path={iconPaths.activity} className="w-8 h-8 text-purple-500" />
              </div>
              <p>No recent activity</p>
              <p className="text-sm mt-1">Activity from the last 24 hours will appear here</p>
            </div>
          )}
        </div>
      </div>

      {/* System Status */}
      <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
        <h3 className="text-lg font-semibold text-white mb-4">System Status</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex items-center space-x-3">
            <div className={`w-3 h-3 rounded-full ${
              systemStatus.apiStatus === 'operational' ? 'bg-green-500' : 
              systemStatus.apiStatus === 'degraded' ? 'bg-yellow-500' : 'bg-red-500'
            }`}></div>
            <div>
              <p className="text-white text-sm font-medium">API Status</p>
              <p className="text-gray-400 text-xs">
                {systemStatus.apiStatus === 'operational' ? 'All systems operational' :
                 systemStatus.apiStatus === 'degraded' ? 'Performance issues' : 
                 'Service disruption'}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <div className={`w-3 h-3 rounded-full ${
              systemStatus.databaseStatus === 'healthy' ? 'bg-green-500' : 
              systemStatus.databaseStatus === 'slow' ? 'bg-yellow-500' : 'bg-red-500'
            }`}></div>
            <div>
              <p className="text-white text-sm font-medium">Database</p>
              <p className="text-gray-400 text-xs">
                {systemStatus.databaseStatus === 'healthy' ? 'Connected and healthy' :
                 systemStatus.databaseStatus === 'slow' ? 'Slow response times' : 
                 'Connection issues'}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <div className={`w-3 h-3 rounded-full ${
              systemStatus.aiProcessingQueue === 0 ? 'bg-green-500' : 
              systemStatus.aiProcessingQueue < 5 ? 'bg-yellow-500' : 'bg-red-500'
            }`}></div>
            <div>
              <p className="text-white text-sm font-medium">AI Processing</p>
              <p className="text-gray-400 text-xs">
                Queue: {systemStatus.aiProcessingQueue} pending requests
              </p>
            </div>
          </div>
        </div>
        <div className="mt-4 pt-4 border-t border-gray-700 text-xs text-gray-400">
          Total API calls: {systemStatus.totalApiCalls.toLocaleString()} • 
          Last updated: {new Date(systemStatus.lastUpdate).toLocaleTimeString()}
        </div>
      </div>
    </div>
  );
};

export default DashboardSimple;