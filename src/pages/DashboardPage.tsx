import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useSocket } from '../contexts/SocketContext';
import { tradingService } from '../services/tradingService';
import TradingPanel from '../components/TradingPanel';
import PositionsTable from '../components/PositionsTable';
import OrdersTable from '../components/OrdersTable';
import ChildAccountManager from '../components/ChildAccountManager';
import RealTimeOrderBook from '../components/RealTimeOrderBook';
import { Activity, Wifi, WifiOff, Users, User, DollarSign, TrendingUp, Settings, Zap } from 'lucide-react';

const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const { isConnected } = useSocket();
  const [activeTab, setActiveTab] = useState<'positions' | 'orders' | 'realtime' | 'children'>('realtime');
  const [portfolio, setPortfolio] = useState({
    total_value: 0,
    day_pnl: 0,
    total_pnl: 0
  });

  useEffect(() => {
    fetchPortfolio();
  }, []);

  const fetchPortfolio = async () => {
    try {
      const data = await tradingService.getPortfolio();
      setPortfolio(data.portfolio);
    } catch (error) {
      console.error('Failed to fetch portfolio:', error);
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

  return (
    <div className="min-h-screen bg-gray-900 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">
                Trading Dashboard
              </h1>
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  {user?.role === 'parent' ? (
                    <Users className="h-5 w-5 text-green-400" />
                  ) : (
                    <User className="h-5 w-5 text-blue-400" />
                  )}
                  <span className="text-gray-300">
                    {user?.role === 'parent' ? 'Parent Account' : 'Child Account'}
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  {isConnected ? (
                    <Wifi className="h-5 w-5 text-green-400" />
                  ) : (
                    <WifiOff className="h-5 w-5 text-red-400" />
                  )}
                  <span className={`text-sm ${isConnected ? 'text-green-400' : 'text-red-400'}`}>
                    {isConnected ? 'Connected' : 'Disconnected'}
                  </span>
                </div>
                <div className="flex items-center space-x-2 px-3 py-1 bg-yellow-900 bg-opacity-50 rounded-md border border-yellow-700">
                  <span className="text-yellow-400 text-sm">Sandbox Mode</span>
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="bg-gray-800 rounded-lg p-4 text-center border border-gray-700">
                <div className="flex items-center justify-center space-x-2 mb-2">
                  <DollarSign className="h-5 w-5 text-green-400" />
                  <span className="text-sm text-gray-300">Portfolio Value</span>
                </div>
                <div className="text-2xl font-bold text-white">
                  {formatCurrency(portfolio.total_value)}
                </div>
              </div>
              
              <div className="bg-gray-800 rounded-lg p-4 text-center border border-gray-700">
                <div className="flex items-center justify-center space-x-2 mb-2">
                  <TrendingUp className="h-5 w-5 text-blue-400" />
                  <span className="text-sm text-gray-300">Day P&L</span>
                </div>
                <div className={`text-2xl font-bold ${getPnlColor(portfolio.day_pnl)}`}>
                  {formatCurrency(portfolio.day_pnl)}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="trading-grid">
          {/* Trading Panel */}
          <div className="space-y-6">
            <TradingPanel />
            
            {/* Tabs */}
            <div className="bg-gray-800 rounded-lg shadow-lg border border-gray-700">
              <div className="flex border-b border-gray-700 overflow-x-auto">
                <button
                  onClick={() => setActiveTab('realtime')}
                  className={`flex-1 py-4 px-6 font-medium text-center transition-colors whitespace-nowrap ${
                    activeTab === 'realtime'
                      ? 'text-blue-400 border-b-2 border-blue-400'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  <div className="flex items-center justify-center space-x-2">
                    <Zap className="h-4 w-4" />
                    <span>Live Orders</span>
                  </div>
                </button>
                <button
                  onClick={() => setActiveTab('positions')}
                  className={`flex-1 py-4 px-6 font-medium text-center transition-colors whitespace-nowrap ${
                    activeTab === 'positions'
                      ? 'text-blue-400 border-b-2 border-blue-400'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  Positions
                </button>
                <button
                  onClick={() => setActiveTab('orders')}
                  className={`flex-1 py-4 px-6 font-medium text-center transition-colors whitespace-nowrap ${
                    activeTab === 'orders'
                      ? 'text-blue-400 border-b-2 border-blue-400'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  Order Book
                </button>
                {user?.role === 'parent' && (
                  <button
                    onClick={() => setActiveTab('children')}
                    className={`flex-1 py-4 px-6 font-medium text-center transition-colors whitespace-nowrap ${
                      activeTab === 'children'
                        ? 'text-blue-400 border-b-2 border-blue-400'
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    Child Accounts
                  </button>
                )}
              </div>
              
              <div className="p-6">
                {activeTab === 'realtime' && <RealTimeOrderBook />}
                {activeTab === 'positions' && <PositionsTable />}
                {activeTab === 'orders' && <OrdersTable />}
                {activeTab === 'children' && user?.role === 'parent' && <ChildAccountManager />}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Connection Status */}
            <div className="bg-gray-800 rounded-lg shadow-lg p-6 border border-gray-700">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">System Status</h3>
                <Activity className="h-5 w-5 text-blue-400" />
              </div>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-gray-300">WebSocket</span>
                  <span className={`text-sm ${isConnected ? 'text-green-400' : 'text-red-400'}`}>
                    {isConnected ? 'Connected' : 'Disconnected'}
                  </span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-gray-300">Upstox API</span>
                  <span className="text-sm text-green-400">Active</span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-gray-300">Environment</span>
                  <span className="text-sm text-yellow-400">Sandbox</span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-gray-300">Copy Trading</span>
                  <span className={`text-sm ${user?.role === 'parent' ? 'text-green-400' : 'text-blue-400'}`}>
                    {user?.role === 'parent' ? 'Master' : 'Follower'}
                  </span>
                </div>
              </div>
            </div>

            {/* Account Info */}
            <div className="bg-gray-800 rounded-lg shadow-lg p-6 border border-gray-700">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">Account Info</h3>
                <Settings className="h-5 w-5 text-gray-400" />
              </div>
              
              <div className="space-y-3">
                <div>
                  <span className="text-gray-400 text-sm">User ID</span>
                  <p className="text-white font-medium font-mono text-sm">{user?.user_id}</p>
                </div>
                
                <div>
                  <span className="text-gray-400 text-sm">Name</span>
                  <p className="text-white font-medium">{user?.user_name || 'Demo User'}</p>
                </div>
                
                <div>
                  <span className="text-gray-400 text-sm">Email</span>
                  <p className="text-white font-medium">{user?.email || 'demo@example.com'}</p>
                </div>
                
                <div>
                  <span className="text-gray-400 text-sm">Exchanges</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {(user?.exchanges || ['NSE', 'BSE']).map((exchange) => (
                      <span
                        key={exchange}
                        className="px-2 py-1 bg-blue-900 text-blue-300 text-xs rounded"
                      >
                        {exchange}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Copy Trading Status */}
            {user?.role === 'parent' && (
              <div className="bg-gray-800 rounded-lg shadow-lg p-6 border border-gray-700">
                <h3 className="text-lg font-semibold text-white mb-4">Copy Trading</h3>
                <div className="text-center">
                  <div className="text-3xl font-bold text-green-400 mb-2">
                    {user?.children?.length || 0}
                  </div>
                  <p className="text-gray-300">Connected Child Accounts</p>
                  <button
                    onClick={() => setActiveTab('children')}
                    className="mt-3 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors text-sm"
                  >
                    Manage Accounts
                  </button>
                </div>
              </div>
            )}

            {/* Real-time Updates */}
            <div className="bg-gray-800 rounded-lg shadow-lg p-6 border border-gray-700">
              <h3 className="text-lg font-semibold text-white mb-4">Live Updates</h3>
              <div className="space-y-2 text-sm">
                <div className="flex items-center space-x-2 text-green-400">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                  <span>Order book synced</span>
                </div>
                <div className="flex items-center space-x-2 text-blue-400">
                  <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
                  <span>Market data streaming</span>
                </div>
                {user?.role === 'parent' && (
                  <div className="flex items-center space-x-2 text-yellow-400">
                    <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></div>
                    <span>Copy trading active</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;