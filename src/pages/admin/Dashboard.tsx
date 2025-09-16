import React, { useState, useEffect } from 'react';
import Icon from '../../../components/Icon';
import MetricCard from '../../components/admin/MetricCard';
import { 
  LineChart, 
  Line, 
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart, 
  Pie, 
  Cell,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend,
  ResponsiveContainer 
} from 'recharts';
import { adminService, DashboardMetrics, ChartData } from '../../services/adminService';

// Icon paths
const iconPaths = {
  users: "M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z",
  activity: "M13.5.67s.74 2.65.74 4.8c0 2.06-1.35 3.73-3.41 3.73-2.07 0-3.63-1.67-3.63-3.73l.03-.36C5.21 7.51 4 10.62 4 14c0 4.42 3.58 8 8 8s8-3.58 8-8C20 8.61 17.41 3.8 13.5.67zM11.71 19c-1.78 0-3.22-1.4-3.22-3.14 0-1.62 1.05-2.76 2.81-3.12 1.77-.36 3.6-1.21 4.62-2.58.39 1.29.59 2.65.59 4.04 0 2.65-2.15 4.8-4.8 4.8z",
  image: "M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z",
  dollarSign: "M7 15h2c0 1.08 1.37 2 3 2s3-.92 3-2c0-1.1-1.04-1.5-3.24-2.03C9.64 12.44 7 11.78 7 9c0-1.79 1.47-4 5-4s5 2.21 5 4h-2c0-1.08-1.37-2-3-2s-3 .92-3 2c0 1.1 1.04 1.5 3.24 2.03C14.36 11.56 17 12.22 17 15c0 1.79-1.47 4-5 4s-5-2.21-5-4z",
  trendingUp: "M16 6l2.29 2.29-4.88 4.88-4-4L2 16.59 3.41 18l6-6 4 4 6.3-6.29L22 12V6z",
  creditCard: "M20 4H4c-1.11 0-1.99.89-1.99 2L2 18c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V6c0-1.11-.89-2-2-2zm0 14H4v-6h16v6zm0-10H4V6h16v2z"
};

const Dashboard: React.FC = () => {
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

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        const [metricsData, chartsData] = await Promise.all([
          adminService.getDashboardMetrics(),
          adminService.getChartData()
        ]);
        
        setMetrics({ ...metricsData, loading: false });
        setChartData(chartsData);
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
          title="Total Generations"
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
              <p className="text-gray-400 text-sm font-medium">Avg Generations Per User</p>
              <p className="text-2xl font-semibold text-white mt-2">
                {(metrics.totalGenerations / (metrics.totalUsers || 1)).toFixed(1)}
              </p>
            </div>
            <Icon path={iconPaths.image} className="w-8 h-8 text-purple-500" />
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily Trends */}
        <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
          <h3 className="text-lg font-semibold text-white mb-4">Daily Trends (30 Days)</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData.daily}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis 
                  dataKey="date" 
                  stroke="#9CA3AF"
                  tick={{ fill: '#9CA3AF', fontSize: 12 }}
                />
                <YAxis 
                  stroke="#9CA3AF"
                  tick={{ fill: '#9CA3AF', fontSize: 12 }}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1F2937', 
                    border: 'none', 
                    borderRadius: '0.5rem',
                    color: '#F3F4F6'
                  }}
                  labelStyle={{ color: '#F3F4F6' }}
                />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="users" 
                  stroke="#3B82F6" 
                  name="New Users"
                  strokeWidth={2}
                  dot={{ fill: '#3B82F6', strokeWidth: 2 }}
                />
                <Line 
                  type="monotone" 
                  dataKey="generations" 
                  stroke="#8B5CF6" 
                  name="Generations"
                  strokeWidth={2}
                  dot={{ fill: '#8B5CF6', strokeWidth: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Style Distribution */}
        <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
          <h3 className="text-lg font-semibold text-white mb-4">Style Popularity</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData.styleDistribution}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {chartData.styleDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1F2937', 
                    border: 'none', 
                    borderRadius: '0.5rem',
                    color: '#F3F4F6'
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Revenue Chart */}
        <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
          <h3 className="text-lg font-semibold text-white mb-4">Revenue Trend</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData.daily}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis 
                  dataKey="date" 
                  stroke="#9CA3AF"
                  tick={{ fill: '#9CA3AF', fontSize: 12 }}
                />
                <YAxis 
                  stroke="#9CA3AF"
                  tick={{ fill: '#9CA3AF', fontSize: 12 }}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1F2937', 
                    border: 'none', 
                    borderRadius: '0.5rem',
                    color: '#F3F4F6'
                  }}
                  formatter={(value) => [`$${value}`, 'Revenue']}
                />
                <Area 
                  type="monotone" 
                  dataKey="revenue" 
                  stroke="#10B981" 
                  fill="#10B981" 
                  fillOpacity={0.3}
                  name="Revenue ($)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* User Activity */}
        <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
          <h3 className="text-lg font-semibold text-white mb-4">Hourly Activity Pattern</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData.userActivity}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis 
                  dataKey="hour" 
                  stroke="#9CA3AF"
                  tick={{ fill: '#9CA3AF', fontSize: 11 }}
                />
                <YAxis 
                  stroke="#9CA3AF"
                  tick={{ fill: '#9CA3AF', fontSize: 12 }}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1F2937', 
                    border: 'none', 
                    borderRadius: '0.5rem',
                    color: '#F3F4F6'
                  }}
                />
                <Bar 
                  dataKey="activity" 
                  fill="#F59E0B"
                  name="Active Users"
                  radius={[2, 2, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
        <h3 className="text-lg font-semibold text-white mb-4">Recent Activity</h3>
        <div className="space-y-4">
          {[
            { user: 'user@example.com', action: 'Generated wedding portrait', style: 'Classic & Timeless', time: '2 minutes ago', credits: -1 },
            { user: 'bride2024@gmail.com', action: 'Purchased credits', style: '20 credits', time: '5 minutes ago', credits: +20 },
            { user: 'john.doe@email.com', action: 'Generated wedding portrait', style: 'Rustic Barn', time: '8 minutes ago', credits: -1 },
            { user: 'sarah.smith@mail.com', action: 'Generated wedding portrait', style: 'Bohemian Beach', time: '12 minutes ago', credits: -1 },
            { user: 'couple123@domain.com', action: 'Joined waitlist', style: 'Early adopter', time: '15 minutes ago', credits: 0 }
          ].map((activity, index) => (
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
          ))}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;