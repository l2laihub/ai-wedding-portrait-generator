import React from 'react';
import Icon from '../../../components/Icon';

interface MetricCardProps {
  title: string;
  value: string | number;
  change?: {
    value: number;
    isPositive: boolean;
  };
  iconPath: string;
  iconColor?: string;
  loading?: boolean;
}

const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  change,
  iconPath,
  iconColor = 'text-purple-500',
  loading = false
}) => {
  return (
    <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-gray-400 text-sm font-medium">{title}</p>
          {loading ? (
            <div className="mt-2 h-8 w-24 bg-gray-700 rounded animate-pulse" />
          ) : (
            <p className="mt-2 text-3xl font-semibold text-white">{value}</p>
          )}
          {change && !loading && (
            <div className="mt-2 flex items-center text-sm">
              <span className={change.isPositive ? 'text-green-500' : 'text-red-500'}>
                {change.isPositive ? '+' : ''}{change.value}%
              </span>
              <span className="text-gray-500 ml-2">from last month</span>
            </div>
          )}
        </div>
        <div className={`p-3 rounded-lg bg-gray-700 ${iconColor}`}>
          <Icon path={iconPath} className="w-6 h-6" />
        </div>
      </div>
    </div>
  );
};

export default MetricCard;