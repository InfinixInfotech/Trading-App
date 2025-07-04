import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { tradingService } from '../services/tradingService';
import { ChildAccount } from '../types/trading';
import { 
  Users, 
  Plus, 
  Trash2, 
  Eye, 
  EyeOff, 
  RefreshCw, 
  AlertCircle, 
  CheckCircle,
  TrendingUp,
  TrendingDown,
  Wifi,
  WifiOff
} from 'lucide-react';
import { format } from 'date-fns';

const ChildAccountManager: React.FC = () => {
  const { user } = useAuth();
  const [childAccounts, setChildAccounts] = useState<ChildAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newChildForm, setNewChildForm] = useState({
    user_id: '',
    access_token: ''
  });
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  useEffect(() => {
    if (user?.role === 'parent') {
      fetchChildAccounts();
    }
  }, [user]);

  const fetchChildAccounts = async () => {
    try {
      setLoading(true);
      const accounts = await tradingService.getChildAccounts();
      setChildAccounts(accounts);
    } catch (error) {
      console.error('Failed to fetch child accounts:', error);
      setMessage({ type: 'error', text: 'Failed to fetch child accounts' });
    } finally {
      setLoading(false);
    }
  };

  const handleAddChild = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newChildForm.user_id || !newChildForm.access_token) {
      setMessage({ type: 'error', text: 'Please fill in all fields' });
      return;
    }

    try {
      await tradingService.addChildAccount(newChildForm);
      setMessage({ type: 'success', text: 'Child account added successfully!' });
      setNewChildForm({ user_id: '', access_token: '' });
      setShowAddForm(false);
      fetchChildAccounts();
    } catch (error: any) {
      console.error('Failed to add child account:', error);
      const errorMessage = error.response?.data?.message || 'Failed to add child account';
      setMessage({ type: 'error', text: errorMessage });
    }
  };

  const handleRemoveChild = async (childUserId: string) => {
    if (!confirm('Are you sure you want to remove this child account?')) {
      return;
    }

    try {
      await tradingService.removeChildAccount(childUserId);
      setMessage({ type: 'success', text: 'Child account removed successfully!' });
      fetchChildAccounts();
    } catch (error: any) {
      console.error('Failed to remove child account:', error);
      const errorMessage = error.response?.data?.message || 'Failed to remove child account';
      setMessage({ type: 'error', text: errorMessage });
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2
    }).format(amount);
  };

  const getPnlColor = (pnl: number) => {
    if (pnl > 0) return 'text-green-400';
    if (pnl < 0) return 'text-red-400';
    return 'text-gray-400';
  };

  if (user?.role !== 'parent') {
    return null;
  }

  return (
    <div className="bg-gray-800 rounded-lg shadow-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <Users className="h-6 w-6 text-blue-400" />
          <h2 className="text-xl font-bold text-white">Child Account Management</h2>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={fetchChildAccounts}
            disabled={loading}
            className="flex items-center space-x-2 px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-md transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors"
          >
            <Plus className="h-4 w-4" />
            <span>Add Child</span>
          </button>
        </div>
      </div>

      {message && (
        <div className={`mb-4 p-3 rounded-md flex items-center space-x-2 ${
          message.type === 'success' 
            ? 'bg-green-900 bg-opacity-50 text-green-300 border border-green-700' 
            : 'bg-red-900 bg-opacity-50 text-red-300 border border-red-700'
        }`}>
          <AlertCircle className="h-4 w-4" />
          <span className="text-sm">{message.text}</span>
        </div>
      )}

      {/* Add Child Form */}
      {showAddForm && (
        <div className="mb-6 p-4 bg-gray-700 rounded-lg border border-gray-600">
          <h3 className="text-lg font-semibold text-white mb-4">Add New Child Account</h3>
          <form onSubmit={handleAddChild} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Child User ID *
              </label>
              <input
                type="text"
                value={newChildForm.user_id}
                onChange={(e) => setNewChildForm({ ...newChildForm, user_id: e.target.value })}
                placeholder="Enter child account user ID"
                className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Child Access Token *
              </label>
              <input
                type="password"
                value={newChildForm.access_token}
                onChange={(e) => setNewChildForm({ ...newChildForm, access_token: e.target.value })}
                placeholder="Enter child account access token"
                className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div className="flex space-x-3">
              <button
                type="submit"
                className="flex items-center space-x-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md transition-colors"
              >
                <CheckCircle className="h-4 w-4" />
                <span>Add Account</span>
              </button>
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded-md transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Child Accounts List */}
      {loading ? (
        <div className="flex items-center justify-center h-32">
          <RefreshCw className="h-8 w-8 animate-spin text-blue-400" />
        </div>
      ) : childAccounts.length === 0 ? (
        <div className="text-center py-8 text-gray-400">
          <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>No child accounts connected</p>
          <p className="text-sm">Add child accounts to start copy trading</p>
        </div>
      ) : (
        <div className="space-y-4">
          {childAccounts.map((child) => (
            <div key={child.user_id} className="bg-gray-700 rounded-lg p-4 border border-gray-600">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <div className="flex items-center space-x-2">
                      {child.is_active ? (
                        <Wifi className="h-4 w-4 text-green-400" />
                      ) : (
                        <WifiOff className="h-4 w-4 text-red-400" />
                      )}
                      <span className="font-medium text-white">{child.user_name}</span>
                    </div>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      child.is_active 
                        ? 'bg-green-800 text-green-300' 
                        : 'bg-red-800 text-red-300'
                    }`}>
                      {child.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-gray-400">User ID:</span>
                      <p className="text-white font-mono">{child.user_id}</p>
                    </div>
                    <div>
                      <span className="text-gray-400">Email:</span>
                      <p className="text-white">{child.email}</p>
                    </div>
                    <div>
                      <span className="text-gray-400">Portfolio Value:</span>
                      <p className="text-white font-medium">{formatCurrency(child.portfolio_value)}</p>
                    </div>
                    <div>
                      <span className="text-gray-400">Day P&L:</span>
                      <div className={`flex items-center space-x-1 ${getPnlColor(child.day_pnl)}`}>
                        {child.day_pnl > 0 ? (
                          <TrendingUp className="h-4 w-4" />
                        ) : child.day_pnl < 0 ? (
                          <TrendingDown className="h-4 w-4" />
                        ) : null}
                        <span className="font-medium">{formatCurrency(child.day_pnl)}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-2 text-xs text-gray-400">
                    <span>Connected: {format(new Date(child.connected_at), 'MMM dd, yyyy HH:mm')}</span>
                    <span className="mx-2">•</span>
                    <span>Last Sync: {format(new Date(child.last_sync), 'MMM dd, HH:mm')}</span>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2 ml-4">
                  <button
                    onClick={() => handleRemoveChild(child.user_id)}
                    className="flex items-center space-x-1 px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                    <span>Remove</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Summary */}
      {childAccounts.length > 0 && (
        <div className="mt-6 p-4 bg-blue-900 bg-opacity-50 rounded-lg border border-blue-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 text-blue-300">
              <Users className="h-5 w-5" />
              <span className="font-medium">
                {childAccounts.length} child account{childAccounts.length !== 1 ? 's' : ''} connected
              </span>
            </div>
            <div className="text-blue-300 text-sm">
              Active: {childAccounts.filter(child => child.is_active).length} / {childAccounts.length}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChildAccountManager;