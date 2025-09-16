import React, { useState, useEffect } from 'react';
import Icon from '../../../components/Icon';
import SearchInput from '../../components/admin/SearchInput';
import { adminService, User } from '../../services/adminService';
import { format } from 'date-fns';

// Icon paths
const iconPaths = {
  search: "M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z",
  filter: "M10 18h4v-2h-4v2zM3 6v2h18V6H3zm3 7h12v-2H6v2z",
  plus: "M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z",
  minus: "M19 13H5v-2h14v2z",
  download: "M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z",
  creditCard: "M20 4H4c-1.11 0-1.99.89-1.99 2L2 18c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V6c0-1.11-.89-2-2-2zm0 14H4v-6h16v6zm0-10H4V6h16v2z",
  dollarSign: "M7 15h2c0 1.08 1.37 2 3 2s3-.92 3-2c0-1.1-1.04-1.5-3.24-2.03C9.64 12.44 7 11.78 7 9c0-1.79 1.47-4 5-4s5 2.21 5 4h-2c0-1.08-1.37-2-3-2s-3 .92-3 2c0 1.1 1.04 1.5 3.24 2.03C14.36 11.56 17 12.22 17 15c0 1.79-1.47 4-5 4s-5-2.21-5-4z",
  trendingUp: "M16 6l2.29 2.29-4.88 4.88-4-4L2 16.59 3.41 18l6-6 4 4 6.3-6.29L22 12V6z",
  trendingDown: "M16 18l2.29-2.29-4.88-4.88-4 4L2 7.41 3.41 6l6 6 4-4 6.3 6.29L22 12v6z",
  refreshCw: "M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"
};

interface CreditTransaction {
  id: string;
  user_id: string;
  type: 'purchase' | 'usage' | 'bonus' | 'refund';
  amount: number;
  balance_after: number;
  description: string;
  created_at: string;
  stripe_payment_id?: string;
  user?: {
    email: string;
    display_name?: string;
  };
}

interface CreditsStats {
  totalPaidCredits: number;
  totalBonusCredits: number;
  totalUsedCredits: number;
  totalRevenue: number;
  averageCreditsPerUser: number;
  conversionRate: number;
}

interface UserCreditsInfo extends User {
  paidCredits: number;
  bonusCredits: number;
  totalCredits: number;
  creditsUsedToday: number;
  lastActivity: Date;
}

const CreditsManagement: React.FC = () => {
  const [users, setUsers] = useState<UserCreditsInfo[]>([]);
  const [transactions, setTransactions] = useState<CreditTransaction[]>([]);
  const [stats, setStats] = useState<CreditsStats>({
    totalPaidCredits: 0,
    totalBonusCredits: 0,
    totalUsedCredits: 0,
    totalRevenue: 0,
    averageCreditsPerUser: 0,
    conversionRate: 0
  });
  
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTab, setSelectedTab] = useState<'users' | 'transactions' | 'bulk'>('users');
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  
  // Modal states
  const [showGrantModal, setShowGrantModal] = useState(false);
  const [showDeductModal, setShowDeductModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserCreditsInfo | null>(null);
  const [actionAmount, setActionAmount] = useState('');
  const [actionReason, setActionReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(20);

  const loadCreditsData = async () => {
    setLoading(true);
    setError(null);
    try {
      console.log('🔍 Loading real credits data...');
      
      // Use the new comprehensive credits data method
      const creditsData = await adminService.getCreditsData();
      
      console.log('🔍 Received credits data:', creditsData);
      
      setUsers(creditsData.users);
      setTransactions(creditsData.transactions);
      setStats(creditsData.stats);

    } catch (error) {
      console.error('Failed to load credits data:', error);
      setError(error instanceof Error ? error.message : 'Failed to load credits data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCreditsData();
  }, []);

  const handleGrantCredits = async () => {
    if (!selectedUser || !actionAmount || !actionReason) return;

    setActionLoading(true);
    setError(null);
    try {
      await adminService.grantCredits(selectedUser.id, parseInt(actionAmount), actionReason);
      
      // Reload all credits data to get fresh state
      await loadCreditsData();

      setShowGrantModal(false);
      setActionAmount('');
      setActionReason('');
      setSelectedUser(null);
    } catch (error) {
      console.error('Failed to grant credits:', error);
      setError(error instanceof Error ? error.message : 'Failed to grant credits');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeductCredits = async () => {
    if (!selectedUser || !actionAmount || !actionReason) return;

    setActionLoading(true);
    setError(null);
    try {
      await adminService.deductCredits(selectedUser.id, parseInt(actionAmount), actionReason);
      
      // Reload all credits data to get fresh state
      await loadCreditsData();

      setShowDeductModal(false);
      setActionAmount('');
      setActionReason('');
      setSelectedUser(null);
    } catch (error) {
      console.error('Failed to deduct credits:', error);
      setError(error instanceof Error ? error.message : 'Failed to deduct credits');
    } finally {
      setActionLoading(false);
    }
  };

  const filteredUsers = users.filter(user => 
    user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const paginatedUsers = filteredUsers.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Credits Management</h1>
          <p className="text-gray-400 mt-2">Manage user credits, transactions, and billing</p>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-900/50 border border-red-500 rounded-lg p-4 flex items-center space-x-3">
          <div className="w-5 h-5 text-red-400">⚠️</div>
          <div>
            <p className="text-red-300 font-medium">Error</p>
            <p className="text-red-200 text-sm">{error}</p>
          </div>
          <button 
            onClick={() => setError(null)}
            className="ml-auto text-red-400 hover:text-red-300"
          >
            ✕
          </button>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex justify-end">
        <button 
          onClick={loadCreditsData}
          disabled={loading}
          className="bg-gray-700 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition-colors flex items-center disabled:opacity-50"
        >
          <Icon path={iconPaths.refreshCw} className="w-5 h-5 mr-2" />
          Refresh
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm font-medium">Total Paid Credits</p>
              <p className="text-2xl font-semibold text-white mt-2">{stats.totalPaidCredits.toLocaleString()}</p>
            </div>
            <Icon path={iconPaths.creditCard} className="w-8 h-8 text-green-500" />
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm font-medium">Total Bonus Credits</p>
              <p className="text-2xl font-semibold text-white mt-2">{stats.totalBonusCredits.toLocaleString()}</p>
            </div>
            <Icon path={iconPaths.plus} className="w-8 h-8 text-blue-500" />
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm font-medium">Credits Used Today</p>
              <p className="text-2xl font-semibold text-white mt-2">{stats.totalUsedCredits.toLocaleString()}</p>
            </div>
            <Icon path={iconPaths.trendingDown} className="w-8 h-8 text-red-500" />
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm font-medium">Total Revenue</p>
              <p className="text-2xl font-semibold text-white mt-2">${stats.totalRevenue.toFixed(2)}</p>
            </div>
            <Icon path={iconPaths.dollarSign} className="w-8 h-8 text-yellow-500" />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-700">
        <nav className="flex space-x-8">
          {[
            { id: 'users', label: 'User Credits', count: users.length },
            { id: 'transactions', label: 'Transactions', count: transactions.length },
            { id: 'bulk', label: 'Bulk Operations', count: selectedUsers.length }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setSelectedTab(tab.id as any)}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                selectedTab === tab.id
                  ? 'border-purple-500 text-purple-400'
                  : 'border-transparent text-gray-400 hover:text-gray-300'
              }`}
            >
              {tab.label}
              {tab.count > 0 && (
                <span className="ml-2 bg-gray-700 text-gray-300 py-1 px-2 rounded-full text-xs">
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Content based on selected tab */}
      {selectedTab === 'users' && (
        <div className="space-y-6">
          {/* Search and Filters */}
          <div className="bg-gray-800 rounded-lg border border-gray-700 p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <SearchInput
                  value={searchTerm}
                  onChange={setSearchTerm}
                  placeholder="Search by name or email..."
                />
              </div>
            </div>
          </div>

          {/* Users Table */}
          <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      User
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Paid Credits
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Bonus Credits
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Used Today
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Last Activity
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center">
                        <div className="flex justify-center items-center space-x-2">
                          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-500"></div>
                          <span className="text-gray-400">Loading credits data...</span>
                        </div>
                      </td>
                    </tr>
                  ) : paginatedUsers.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-gray-400">
                        No users found
                      </td>
                    </tr>
                  ) : (
                    paginatedUsers.map((user) => (
                      <tr key={user.id} className="hover:bg-gray-750 transition-colors">
                        <td className="px-6 py-4">
                          <div>
                            <div className="text-sm font-medium text-white">{user.name}</div>
                            <div className="text-sm text-gray-400">{user.email}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm text-green-400 font-medium">{user.paidCredits}</span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm text-blue-400 font-medium">{user.bonusCredits}</span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm text-red-400">{user.creditsUsedToday}</span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-300">
                          {format(user.lastActivity, 'MMM dd, yyyy')}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center space-x-2">
                            <button 
                              onClick={() => {
                                setSelectedUser(user);
                                setShowGrantModal(true);
                              }}
                              className="text-green-400 hover:text-green-300 p-1 rounded"
                              title="Grant credits"
                            >
                              <Icon path={iconPaths.plus} className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={() => {
                                setSelectedUser(user);
                                setShowDeductModal(true);
                              }}
                              className="text-red-400 hover:text-red-300 p-1 rounded"
                              title="Deduct credits"
                            >
                              <Icon path={iconPaths.minus} className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="px-6 py-3 bg-gray-700 border-t border-gray-600 flex items-center justify-between">
                <div className="text-sm text-gray-400">
                  Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredUsers.length)} of {filteredUsers.length} users
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-1 rounded-lg hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-gray-400"
                  >
                    Previous
                  </button>
                  
                  <div className="flex space-x-1">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum;
                      if (totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (currentPage <= 3) {
                        pageNum = i + 1;
                      } else if (currentPage >= totalPages - 2) {
                        pageNum = totalPages - 4 + i;
                      } else {
                        pageNum = currentPage - 2 + i;
                      }

                      return (
                        <button
                          key={pageNum}
                          onClick={() => setCurrentPage(pageNum)}
                          className={`px-3 py-1 rounded-lg text-sm ${
                            currentPage === pageNum
                              ? 'bg-purple-600 text-white'
                              : 'text-gray-400 hover:bg-gray-600'
                          } transition-colors`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                  </div>

                  <button
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1 rounded-lg hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-gray-400"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {selectedTab === 'transactions' && (
        <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
          <div className="p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Recent Transactions</h3>
            <div className="space-y-4">
              {transactions.slice(0, 20).map((transaction) => (
                <div key={transaction.id} className="flex items-center justify-between py-3 border-b border-gray-700 last:border-0">
                  <div className="flex items-center space-x-4">
                    <div className={`w-3 h-3 rounded-full ${
                      transaction.type === 'purchase' ? 'bg-green-500' :
                      transaction.type === 'usage' ? 'bg-red-500' :
                      transaction.type === 'bonus' ? 'bg-blue-500' : 'bg-yellow-500'
                    }`}></div>
                    <div>
                      <p className="text-white text-sm font-medium">{transaction.description}</p>
                      <p className="text-gray-400 text-xs">
                        {transaction.user?.email} • {format(new Date(transaction.created_at), 'MMM dd, yyyy HH:mm')}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-medium ${
                      transaction.amount > 0 ? 'text-green-400' : 'text-red-400'
                    }`}>
                      {transaction.amount > 0 ? '+' : ''}{transaction.amount} credits
                    </p>
                    <p className="text-xs text-gray-400">Balance: {transaction.balance_after}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {selectedTab === 'bulk' && (
        <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Bulk Operations</h3>
          <p className="text-gray-400 mb-6">Coming soon: Bulk credit operations, mass refunds, and batch processing.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="p-4 border border-gray-600 rounded-lg">
              <h4 className="text-white font-medium mb-2">Bulk Grant Credits</h4>
              <p className="text-gray-400 text-sm">Grant credits to multiple users at once</p>
            </div>
            <div className="p-4 border border-gray-600 rounded-lg">
              <h4 className="text-white font-medium mb-2">Mass Refunds</h4>
              <p className="text-gray-400 text-sm">Process refunds for multiple transactions</p>
            </div>
            <div className="p-4 border border-gray-600 rounded-lg">
              <h4 className="text-white font-medium mb-2">Credit Expiry</h4>
              <p className="text-gray-400 text-sm">Manage credit expiration policies</p>
            </div>
          </div>
        </div>
      )}

      {/* Grant Credits Modal */}
      {showGrantModal && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md border border-gray-700">
            <h3 className="text-lg font-semibold text-white mb-4">Grant Credits</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">User</label>
                <p className="text-white">{selectedUser.name} ({selectedUser.email})</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Amount</label>
                <input
                  type="number"
                  value={actionAmount}
                  onChange={(e) => setActionAmount(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                  placeholder="Enter credits amount"
                  min="1"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Reason</label>
                <input
                  type="text"
                  value={actionReason}
                  onChange={(e) => setActionReason(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                  placeholder="Enter reason for granting credits"
                />
              </div>
              <div className="flex space-x-3">
                <button
                  onClick={handleGrantCredits}
                  disabled={actionLoading || !actionAmount || !actionReason}
                  className="flex-1 bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {actionLoading ? 'Processing...' : 'Grant Credits'}
                </button>
                <button
                  onClick={() => {
                    setShowGrantModal(false);
                    setActionAmount('');
                    setActionReason('');
                    setSelectedUser(null);
                  }}
                  className="flex-1 bg-gray-600 text-white py-2 px-4 rounded-lg hover:bg-gray-700"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Deduct Credits Modal */}
      {showDeductModal && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md border border-gray-700">
            <h3 className="text-lg font-semibold text-white mb-4">Deduct Credits</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">User</label>
                <p className="text-white">{selectedUser.name} ({selectedUser.email})</p>
                <p className="text-sm text-gray-400">Current balance: {selectedUser.totalCredits} credits</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Amount</label>
                <input
                  type="number"
                  value={actionAmount}
                  onChange={(e) => setActionAmount(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                  placeholder="Enter credits amount"
                  min="1"
                  max={selectedUser.totalCredits}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Reason</label>
                <input
                  type="text"
                  value={actionReason}
                  onChange={(e) => setActionReason(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                  placeholder="Enter reason for deducting credits"
                />
              </div>
              <div className="flex space-x-3">
                <button
                  onClick={handleDeductCredits}
                  disabled={actionLoading || !actionAmount || !actionReason}
                  className="flex-1 bg-red-600 text-white py-2 px-4 rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {actionLoading ? 'Processing...' : 'Deduct Credits'}
                </button>
                <button
                  onClick={() => {
                    setShowDeductModal(false);
                    setActionAmount('');
                    setActionReason('');
                    setSelectedUser(null);
                  }}
                  className="flex-1 bg-gray-600 text-white py-2 px-4 rounded-lg hover:bg-gray-700"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CreditsManagement;