import React, { useState, useEffect } from 'react';
import { supabase } from '../../services/supabaseClient';
import Icon from '../Icon';

interface WaitlistStats {
  totalWaitlist: number;
  totalConverted: number;
  bonusesGranted: number;
  pendingBonuses: number;
  totalPromisedCredits: number;
  totalGrantedCredits: number;
  avgHoursToConvert: number;
}

interface WaitlistEntry {
  id: string;
  email: string;
  source: string;
  promised_credits: number;
  created_at: string;
  converted_user_id: string | null;
  converted_at: string | null;
  bonus_granted: boolean;
  bonus_granted_at: string | null;
}

const WaitlistDashboard: React.FC = () => {
  const [stats, setStats] = useState<WaitlistStats | null>(null);
  const [entries, setEntries] = useState<WaitlistEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [granting, setGranting] = useState(false);

  useEffect(() => {
    loadWaitlistData();
  }, []);

  const loadWaitlistData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load analytics view
      const { data: analyticsData, error: analyticsError } = await supabase
        .from('waitlist_analytics')
        .select('*')
        .single();

      if (analyticsError) {
        throw analyticsError;
      }

      setStats(analyticsData);

      // Load waitlist entries
      const { data: waitlistData, error: waitlistError } = await supabase
        .from('waitlist')
        .select('*')
        .order('created_at', { ascending: false });

      if (waitlistError) {
        throw waitlistError;
      }

      setEntries(waitlistData || []);
    } catch (err) {
      console.error('Error loading waitlist data:', err);
      setError('Failed to load waitlist data');
    } finally {
      setLoading(false);
    }
  };

  const grantPendingBonuses = async () => {
    if (!confirm('Are you sure you want to grant all pending bonuses? This action cannot be undone.')) {
      return;
    }

    try {
      setGranting(true);
      setError(null);

      // Call the grant function
      const { data, error } = await supabase
        .rpc('grant_pending_waitlist_bonuses');

      if (error) {
        throw error;
      }

      alert(`Successfully granted bonuses to ${data?.length || 0} users!`);
      
      // Reload data
      await loadWaitlistData();
    } catch (err) {
      console.error('Error granting bonuses:', err);
      setError('Failed to grant bonuses');
    } finally {
      setGranting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">
        Waitlist Dashboard
      </h1>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6">
          <p className="text-red-800 dark:text-red-200">{error}</p>
        </div>
      )}

      {/* Stats Overview */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Waitlist</h3>
            <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">
              {stats.totalWaitlist}
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Converted Users</h3>
            <p className="text-3xl font-bold text-blue-600 dark:text-blue-400 mt-2">
              {stats.totalConverted}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {stats.totalWaitlist > 0 
                ? `${((stats.totalConverted / stats.totalWaitlist) * 100).toFixed(1)}% conversion`
                : '0% conversion'
              }
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Pending Bonuses</h3>
            <p className="text-3xl font-bold text-amber-600 dark:text-amber-400 mt-2">
              {stats.pendingBonuses}
            </p>
            {stats.pendingBonuses > 0 && (
              <button
                onClick={grantPendingBonuses}
                disabled={granting}
                className="mt-3 text-sm bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-3 py-1 rounded-lg transition-colors"
              >
                {granting ? 'Granting...' : 'Grant Bonuses'}
              </button>
            )}
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Credits Granted</h3>
            <p className="text-3xl font-bold text-green-600 dark:text-green-400 mt-2">
              {stats.totalGrantedCredits}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              of {stats.totalPromisedCredits} promised
            </p>
          </div>
        </div>
      )}

      {/* Recent Entries */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Recent Waitlist Entries
          </h2>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-700">
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Source
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Joined
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Credits
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {entries.map((entry) => (
                <tr key={entry.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                      {entry.email}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {entry.source || 'unknown'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {new Date(entry.created_at).toLocaleDateString()}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {entry.converted_user_id ? (
                      entry.bonus_granted ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                          <Icon path="M5 13l4 4L19 7" className="w-3 h-3 mr-1" />
                          Granted
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">
                          <Icon path="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" className="w-3 h-3 mr-1" />
                          Pending
                        </span>
                      )
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400">
                        Waiting
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      {entry.promised_credits}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default WaitlistDashboard;