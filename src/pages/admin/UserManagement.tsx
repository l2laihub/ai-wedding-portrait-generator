import React, { useState, useEffect } from 'react';
import Icon from '../../../components/Icon';
import { format } from 'date-fns';
import { adminService, User } from '../../services/adminService';
import SearchInput from '../../components/admin/SearchInput';

// Icon paths
const iconPaths = {
  search: "M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z",
  filter: "M10 18h4v-2h-4v2zM3 6v2h18V6H3zm3 7h12v-2H6v2z",
  download: "M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z",
  moreVertical: "M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z",
  chevronLeft: "M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z",
  chevronRight: "M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z",
  userPlus: "M15 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm-9-2V8c0-.55-.45-1-1-1s-1 .45-1 1v2H2c-.55 0-1 .45-1 1s.45 1 1 1h2v2c0 .55.45 1 1 1s1-.45 1-1v-2h2c.55 0 1-.45 1-1s-.45-1-1-1H6zm9 4c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z",
  edit: "M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z",
  refreshCw: "M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"
};

const UserManagement: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive' | 'suspended'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [totalUsers, setTotalUsers] = useState(0);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const itemsPerPage = 10;

  const loadUsers = async () => {
    setLoading(true);
    try {
      const { users: userData, total } = await adminService.getUsers({
        search: searchTerm,
        status: statusFilter,
        limit: itemsPerPage,
        offset: (currentPage - 1) * itemsPerPage
      });
      
      setUsers(userData);
      setTotalUsers(total);
    } catch (error) {
      console.error('Failed to load users:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, [searchTerm, statusFilter, currentPage]);

  const totalPages = Math.ceil(totalUsers / itemsPerPage);

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedUsers(users.map(user => user.id));
    } else {
      setSelectedUsers([]);
    }
  };

  const handleSelectUser = (userId: string) => {
    setSelectedUsers(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const exportUsers = async () => {
    try {
      setActionLoading('export');
      const usersToExport = selectedUsers.length > 0 ? selectedUsers : users.map(u => u.id);
      const blob = await adminService.exportUserData(usersToExport, 'csv');
      
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `users-${format(new Date(), 'yyyy-MM-dd')}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to export users:', error);
    } finally {
      setActionLoading(null);
    }
  };

  const handleStatusChange = async (userId: string, newStatus: User['status']) => {
    try {
      setActionLoading(userId);
      await adminService.updateUserStatus(userId, newStatus);
      
      // Update local state
      setUsers(prev => 
        prev.map(user => 
          user.id === userId ? { ...user, status: newStatus } : user
        )
      );
    } catch (error) {
      console.error('Failed to update user status:', error);
    } finally {
      setActionLoading(null);
    }
  };

  const getStatusBadge = (status: User['status']) => {
    const styles = {
      active: 'bg-green-900 text-green-300 border-green-700',
      inactive: 'bg-yellow-900 text-yellow-300 border-yellow-700',
      suspended: 'bg-red-900 text-red-300 border-red-700'
    };
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full border ${styles[status]}`}>
        {status}
      </span>
    );
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">User Management</h1>
          <p className="text-gray-400 mt-2">Manage and monitor all users on your platform</p>
        </div>
        <div className="mt-4 md:mt-0 flex space-x-2">
          <button 
            onClick={loadUsers}
            disabled={loading}
            className="bg-gray-700 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition-colors flex items-center disabled:opacity-50"
          >
            <Icon path={iconPaths.refreshCw} className="w-5 h-5 mr-2" />
            Refresh
          </button>
          <button className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors flex items-center">
            <Icon path={iconPaths.userPlus} className="w-5 h-5 mr-2" />
            Add User
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
          <p className="text-gray-400 text-sm">Total Users</p>
          <p className="text-2xl font-semibold text-white">{totalUsers.toLocaleString()}</p>
        </div>
        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
          <p className="text-gray-400 text-sm">Active Users</p>
          <p className="text-2xl font-semibold text-green-400">
            {users.filter(u => u.status === 'active').length.toLocaleString()}
          </p>
        </div>
        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
          <p className="text-gray-400 text-sm">Total Generations</p>
          <p className="text-2xl font-semibold text-blue-400">
            {users.reduce((sum, u) => sum + u.generations, 0).toLocaleString()}
          </p>
        </div>
        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
          <p className="text-gray-400 text-sm">Suspended</p>
          <p className="text-2xl font-semibold text-red-400">
            {users.filter(u => u.status === 'suspended').length.toLocaleString()}
          </p>
        </div>
        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
          <p className="text-gray-400 text-sm">Selected</p>
          <p className="text-2xl font-semibold text-purple-400">{selectedUsers.length}</p>
        </div>
      </div>

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
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white hover:bg-gray-600 transition-colors flex items-center"
          >
            <Icon path={iconPaths.filter} className="w-5 h-5 mr-2" />
            Filters
          </button>
          <button
            onClick={exportUsers}
            disabled={actionLoading === 'export'}
            className="px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white hover:bg-gray-600 transition-colors flex items-center disabled:opacity-50"
          >
            {actionLoading === 'export' ? (
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
            ) : (
              <Icon path={iconPaths.download} className="w-5 h-5 mr-2" />
            )}
            Export {selectedUsers.length > 0 && `(${selectedUsers.length})`}
          </button>
        </div>
        
        {showFilters && (
          <div className="mt-4 pt-4 border-t border-gray-700">
            <div className="flex flex-wrap gap-2">
              <span className="text-gray-400">Status:</span>
              {['all', 'active', 'inactive', 'suspended'].map((status) => (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status as any)}
                  className={`px-3 py-1 rounded-lg text-sm ${
                    statusFilter === status
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  } transition-colors`}
                >
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Users Table */}
      <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left">
                  <input
                    type="checkbox"
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    checked={selectedUsers.length === users.length && users.length > 0}
                    className="w-4 h-4 text-purple-600 bg-gray-600 border-gray-500 rounded focus:ring-purple-500"
                  />
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Credits
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Generations
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Joined
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Last Active
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center">
                    <div className="flex justify-center items-center space-x-2">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-500"></div>
                      <span className="text-gray-400">Loading users...</span>
                    </div>
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-gray-400">
                    No users found
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-750 transition-colors">
                    <td className="px-6 py-4">
                      <input
                        type="checkbox"
                        checked={selectedUsers.includes(user.id)}
                        onChange={() => handleSelectUser(user.id)}
                        className="w-4 h-4 text-purple-600 bg-gray-600 border-gray-500 rounded focus:ring-purple-500"
                      />
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <div className="text-sm font-medium text-white">{user.name}</div>
                        <div className="text-sm text-gray-400">{user.email}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-300 font-medium">{user.credits}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <span className={`text-sm font-medium ${user.generations > 0 ? 'text-green-400' : 'text-gray-400'}`}>
                          {user.generations.toLocaleString()}
                        </span>
                        {user.generations === 0 && (
                          <span className="ml-2 text-xs text-gray-500">(No generations)</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-300">
                      {format(user.joinedAt, 'MMM dd, yyyy')}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-300">
                      {format(user.lastActive, 'MMM dd, yyyy')}
                    </td>
                    <td className="px-6 py-4">
                      {getStatusBadge(user.status)}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-2">
                        <button 
                          className="text-gray-400 hover:text-white p-1 rounded"
                          title="Edit user"
                        >
                          <Icon path={iconPaths.edit} className="w-4 h-4" />
                        </button>
                        {actionLoading === user.id ? (
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-400"></div>
                        ) : (
                          <div className="relative group">
                            <button className="text-gray-400 hover:text-white p-1 rounded">
                              <Icon path={iconPaths.moreVertical} className="w-4 h-4" />
                            </button>
                            {/* Dropdown menu would go here */}
                          </div>
                        )}
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
              Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, totalUsers)} of {totalUsers} users
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="p-2 rounded-lg hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Icon path={iconPaths.chevronLeft} className="w-5 h-5 text-gray-400" />
              </button>
              
              {/* Page numbers */}
              <div className="flex space-x-1">
                {[...Array(Math.min(5, totalPages))].map((_, i) => {
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
                className="p-2 rounded-lg hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Icon path={iconPaths.chevronRight} className="w-5 h-5 text-gray-400" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Bulk Actions */}
      {selectedUsers.length > 0 && (
        <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 bg-gray-800 border border-gray-600 rounded-lg p-4 shadow-xl z-50">
          <div className="flex items-center space-x-4">
            <span className="text-white text-sm font-medium">
              {selectedUsers.length} user{selectedUsers.length !== 1 ? 's' : ''} selected
            </span>
            <div className="flex space-x-2">
              <button className="px-3 py-2 bg-green-600 text-white text-sm rounded hover:bg-green-700 transition-colors">
                Activate
              </button>
              <button className="px-3 py-2 bg-red-600 text-white text-sm rounded hover:bg-red-700 transition-colors">
                Suspend
              </button>
              <button 
                onClick={exportUsers}
                className="px-3 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors"
              >
                Export
              </button>
              <button 
                onClick={() => setSelectedUsers([])}
                className="px-3 py-2 bg-gray-600 text-white text-sm rounded hover:bg-gray-700 transition-colors"
              >
                Clear
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;