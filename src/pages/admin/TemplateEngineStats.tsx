import React, { useState, useEffect } from 'react';
import Icon from '../../../components/Icon';
import { supabase } from '../../../services/supabaseClient';

// Icon paths
const iconPaths = {
  template: "M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z",
  palette: "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10c1.1 0 2-.9 2-2 0-.55-.22-1.05-.59-1.41-.36-.36-.91-.59-1.41-.59H10c-1.1 0-2-.9-2-2v-1.17c0-.83.67-1.5 1.5-1.5s1.5.67 1.5 1.5V16h2v-1.17C13 13.24 14.24 12 15.83 12c.83 0 1.5-.67 1.5-1.5S16.66 9 15.83 9H15c-.55 0-1-.45-1-1s.45-1 1-1h.83c.83 0 1.5-.67 1.5-1.5S16.66 4.5 15.83 4.5C14.24 4.5 13 3.24 13 1.67 13 .74 12.26 0 11.33 0 5.48 0 1 4.48 1 12s4.48 12 10 12z",
  cache: "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z",
  settings: "M12 15.5A3.5 3.5 0 0 1 8.5 12A3.5 3.5 0 0 1 12 8.5a3.5 3.5 0 0 1 3.5 3.5a3.5 3.5 0 0 1-3.5 3.5m7.43-2.53c.04-.32.07-.64.07-.97c0-.33-.03-.66-.07-1l2.11-1.63c.19-.15.24-.42.12-.64l-2-3.46c-.12-.22-.39-.31-.61-.22l-2.49 1c-.52-.39-1.06-.73-1.69-.98l-.37-2.65A.506.506 0 0 0 14 2h-4c-.25 0-.46.18-.5.42l-.37 2.65c-.63.25-1.17.59-1.69.98l-2.49-1c-.22-.09-.49 0-.61.22l-2 3.46c-.13.22-.07.49.12.64L4.57 11c-.04.34-.07.67-.07 1c0 .33.03.65.07.97l-2.11 1.66c-.19.15-.25.42-.12.64l2 3.46c.12.22.39.3.61.22l2.49-1.01c.52.4 1.06.74 1.69.99l.37 2.65c.04.24.25.42.5.42h4c.25 0 .46-.18.5-.42l.37-2.65c.63-.26 1.17-.59 1.69-.99l2.49 1.01c.22.08.49 0 .61-.22l2-3.46c.12-.22.07-.49-.12-.64l-2.11-1.66Z",
  refresh: "M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z",
  chart: "M3.5 18.49l6-6.01 4 4L22 6.92l-1.41-1.41-7.09 7.97-4-4L2 16.99z",
  database: "M12 3C7.58 3 4 4.79 4 7s3.58 4 8 4 8-1.79 8-4-3.58-4-8-4zM4 9v3c0 2.21 3.58 4 8 4s8-1.79 8-4V9c0 2.21-3.58 4-8 4s-8-1.79-8-4zm0 5v3c0 2.21 3.58 4 8 4s8-1.79 8-4v-3c0 2.21-3.58 4-8 4s-8-1.79-8-4z"
};

interface TemplateEngineMetrics {
  total_templates: number;
  enhanced_templates: number;
  total_styles: number;
  custom_themes: number;
  cache_entries: number;
  cache_hit_rate: number;
}

interface TemplateEngineOverview {
  metric_type: string;
  metric_name: string;
  value: string;
}

interface ConfigurationItem {
  key: string;
  value: any;
  description: string;
  updated_at: string;
}

const TemplateEngineStats: React.FC = () => {
  const [metrics, setMetrics] = useState<TemplateEngineMetrics | null>(null);
  const [overview, setOverview] = useState<TemplateEngineOverview[]>([]);
  const [config, setConfig] = useState<ConfigurationItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      // Load metrics
      const { data: metricsData, error: metricsError } = await supabase.rpc('get_template_engine_stats');
      if (metricsError) throw metricsError;
      setMetrics(metricsData[0] || null);

      // Load overview
      const { data: overviewData, error: overviewError } = await supabase
        .from('template_engine_overview')
        .select('*');
      if (overviewError) throw overviewError;
      setOverview(overviewData || []);

      // Load configuration
      const { data: configData, error: configError } = await supabase
        .from('template_engine_config')
        .select('key, value, description, updated_at')
        .order('key');
      if (configError) throw configError;
      setConfig(configData || []);

    } catch (error: any) {
      console.error('Failed to load template engine stats:', error);
      setError(error.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const clearCache = async () => {
    try {
      setLoading(true);
      const { error } = await supabase.rpc('cleanup_expired_cache');
      if (error) throw error;
      
      setSuccess('Cache cleared successfully');
      await loadData();
      setTimeout(() => setSuccess(null), 3000);
    } catch (error: any) {
      console.error('Failed to clear cache:', error);
      setError(error.message || 'Failed to clear cache');
    } finally {
      setLoading(false);
    }
  };

  const updateConfiguration = async (key: string, newValue: any) => {
    try {
      const { error } = await supabase
        .from('template_engine_config')
        .update({ 
          value: newValue, 
          updated_at: new Date().toISOString() 
        })
        .eq('key', key);

      if (error) throw error;
      
      setSuccess(`Configuration '${key}' updated successfully`);
      await loadData();
      setTimeout(() => setSuccess(null), 3000);
    } catch (error: any) {
      console.error('Failed to update configuration:', error);
      setError(error.message || 'Failed to update configuration');
    }
  };

  const groupOverviewByType = () => {
    const grouped = overview.reduce((acc, item) => {
      if (!acc[item.metric_type]) {
        acc[item.metric_type] = [];
      }
      acc[item.metric_type].push(item);
      return acc;
    }, {} as Record<string, TemplateEngineOverview[]>);
    return grouped;
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Template Engine Statistics</h1>
          <p className="text-gray-400 mt-2">Monitor performance and configuration of the enhanced template engine</p>
        </div>
        <div className="flex space-x-3 mt-4 md:mt-0">
          <button
            onClick={clearCache}
            disabled={loading}
            className="bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 disabled:opacity-50 text-sm flex items-center"
          >
            <Icon path={iconPaths.cache} className="w-4 h-4 mr-2" />
            Clear Cache
          </button>
          <button
            onClick={loadData}
            disabled={loading}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm flex items-center"
          >
            <Icon path={iconPaths.refresh} className="w-4 h-4 mr-2" />
            Refresh
          </button>
        </div>
      </div>

      {/* Messages */}
      {error && (
        <div className="bg-red-900/50 border border-red-500 rounded-lg p-4 flex items-center justify-between">
          <span className="text-red-200">{error}</span>
          <button onClick={() => setError(null)} className="text-red-400 hover:text-red-300">✕</button>
        </div>
      )}

      {success && (
        <div className="bg-green-900/50 border border-green-500 rounded-lg p-4 flex items-center justify-between">
          <span className="text-green-200">{success}</span>
          <button onClick={() => setSuccess(null)} className="text-green-400 hover:text-green-300">✕</button>
        </div>
      )}

      {/* Main Metrics */}
      {metrics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
          <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-purple-400">{metrics.total_templates}</div>
                <div className="text-sm text-gray-400">Total Templates</div>
              </div>
              <Icon path={iconPaths.template} className="w-8 h-8 text-purple-400" />
            </div>
          </div>
          
          <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-blue-400">{metrics.enhanced_templates}</div>
                <div className="text-sm text-gray-400">Enhanced Templates</div>
              </div>
              <Icon path={iconPaths.settings} className="w-8 h-8 text-blue-400" />
            </div>
          </div>
          
          <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-green-400">{metrics.total_styles}</div>
                <div className="text-sm text-gray-400">Wedding Styles</div>
              </div>
              <Icon path={iconPaths.palette} className="w-8 h-8 text-green-400" />
            </div>
          </div>
          
          <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-yellow-400">{metrics.custom_themes}</div>
                <div className="text-sm text-gray-400">Custom Themes</div>
              </div>
              <Icon path={iconPaths.palette} className="w-8 h-8 text-yellow-400" />
            </div>
          </div>
          
          <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-cyan-400">{metrics.cache_entries}</div>
                <div className="text-sm text-gray-400">Cache Entries</div>
              </div>
              <Icon path={iconPaths.cache} className="w-8 h-8 text-cyan-400" />
            </div>
          </div>
          
          <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-orange-400">{Math.round(metrics.cache_hit_rate * 100)}%</div>
                <div className="text-sm text-gray-400">Cache Hit Rate</div>
              </div>
              <Icon path={iconPaths.chart} className="w-8 h-8 text-orange-400" />
            </div>
          </div>
        </div>
      )}

      {/* Detailed Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
            <Icon path={iconPaths.chart} className="w-5 h-5 mr-2" />
            System Overview
          </h3>
          
          {Object.entries(groupOverviewByType()).map(([type, items]) => (
            <div key={type} className="mb-4">
              <h4 className="text-sm font-medium text-gray-300 uppercase tracking-wide mb-2">{type}</h4>
              <div className="space-y-2">
                {items.map((item, idx) => (
                  <div key={idx} className="flex justify-between items-center p-2 bg-gray-900 rounded">
                    <span className="text-sm text-gray-400">{item.metric_name}</span>
                    <span className="text-sm font-medium text-white">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Configuration Panel */}
        <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
            <Icon path={iconPaths.settings} className="w-5 h-5 mr-2" />
            Engine Configuration
          </h3>
          
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {config.map((item, idx) => (
              <div key={idx} className="p-3 bg-gray-900 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-medium text-white">{item.key}</h4>
                  <span className="text-xs text-gray-400">
                    {new Date(item.updated_at).toLocaleDateString()}
                  </span>
                </div>
                <p className="text-xs text-gray-400 mb-2">{item.description}</p>
                
                {item.key === 'engine_settings' && (
                  <div className="space-y-2">
                    {Object.entries(item.value).map(([key, value]) => (
                      <div key={key} className="flex justify-between items-center text-sm">
                        <span className="text-gray-300">{key}:</span>
                        <span className="text-white font-mono">
                          {typeof value === 'boolean' ? (value ? 'true' : 'false') : String(value)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {item.key === 'cache_settings' && (
                  <div className="space-y-2">
                    {Object.entries(item.value).map(([key, value]) => (
                      <div key={key} className="flex justify-between items-center text-sm">
                        <span className="text-gray-300">{key}:</span>
                        <span className="text-white font-mono">{String(value)}</span>
                      </div>
                    ))}
                  </div>
                )}

                {item.key === 'migration_status' && (
                  <div className="space-y-2">
                    {Object.entries(item.value).map(([key, value]) => (
                      <div key={key} className="flex justify-between items-center text-sm">
                        <span className="text-gray-300">{key}:</span>
                        <span className={`font-mono ${
                          key === 'migrationRequired' && value === false 
                            ? 'text-green-400' 
                            : 'text-white'
                        }`}>
                          {typeof value === 'boolean' ? (value ? 'true' : 'false') : String(value)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Performance Analysis */}
      <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
          <Icon path={iconPaths.database} className="w-5 h-5 mr-2" />
          Performance Analysis
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-gray-300">Template Health</h4>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-400">Enhanced Adoption:</span>
                <span className="text-sm text-white">
                  {metrics ? Math.round((metrics.enhanced_templates / metrics.total_templates) * 100) : 0}%
                </span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-2">
                <div 
                  className="bg-blue-500 h-2 rounded-full" 
                  style={{ 
                    width: `${metrics ? (metrics.enhanced_templates / metrics.total_templates) * 100 : 0}%` 
                  }}
                />
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="text-sm font-medium text-gray-300">Cache Performance</h4>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-400">Hit Rate:</span>
                <span className="text-sm text-white">
                  {metrics ? Math.round(metrics.cache_hit_rate * 100) : 0}%
                </span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-2">
                <div 
                  className="bg-green-500 h-2 rounded-full" 
                  style={{ 
                    width: `${metrics ? metrics.cache_hit_rate * 100 : 0}%` 
                  }}
                />
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="text-sm font-medium text-gray-300">System Status</h4>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span className="text-sm text-green-400">Template Engine Online</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span className="text-sm text-green-400">Database Connected</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span className="text-sm text-green-400">Cache Operational</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TemplateEngineStats;