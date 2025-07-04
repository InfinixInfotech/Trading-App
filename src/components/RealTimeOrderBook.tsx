import React, { useState, useEffect } from 'react';
import { useSocket } from '../contexts/SocketContext';
import { useAuth } from '../contexts/AuthContext';
import { tradingService } from '../services/tradingService';
import { Order } from '../types/trading';
import { 
  Activity, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Zap
} from 'lucide-react';
import { format } from 'date-fns';

const RealTimeOrderBook: React.FC = () => {
  const { user } = useAuth();
  const { socket, isConnected } = useSocket();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  useEffect(() => {
    fetchOrders();
    
    // Subscribe to real-time updates
    if (socket && isConnected) {
      tradingService.subscribeToOrderUpdates();
    }
  }, [socket, isConnected]);

  useEffect(() => {
    if (socket) {
      // Listen for real-time order updates
      socket.on('order_update', (updatedOrder: Order) => {
        console.log('📋 Real-time order update:', updatedOrder);
        setOrders(prev => 
          prev.map(order => 
            order.order_id === updatedOrder.order_id 
              ? { ...updatedOrder, updated_at: new Date().toISOString() }
              : order
          )
        );
        setLastUpdate(new Date());
      });

      socket.on('new_order', (newOrder: Order) => {
        console.log('📋 New order received:', newOrder);
        setOrders(prev => [{ ...newOrder, updated_at: new Date().toISOString() }, ...prev]);
        setLastUpdate(new Date());
      });

      // Listen for child account order updates if parent
      if (user?.role === 'parent') {
        socket.on('child_order_update', (childOrder: Order) => {
          console.log('👶 Child order update:', childOrder);
          setOrders(prev => [childOrder, ...prev]);
          setLastUpdate(new Date());
        });
      }

      return () => {
        socket.off('order_update');
        socket.off('new_order');
        socket.off('child_order_update');
      };
    }
  }, [socket, user]);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const data = await tradingService.getOrders();
      setOrders(data.map(order => ({ ...order, updated_at: new Date().toISOString() })));
      setLastUpdate(new Date());
    } catch (error) {
      console.error('Failed to fetch orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'complete':
        return <CheckCircle className="h-4 w-4 text-green-400" />;
      case 'cancelled':
        return <XCircle className="h-4 w-4 text-red-400" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-400 animate-pulse" />;
      case 'rejected':
        return <AlertCircle className="h-4 w-4 text-red-400" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'complete':
        return 'text-green-400 bg-green-900 bg-opacity-20';
      case 'cancelled':
        return 'text-red-400 bg-red-900 bg-opacity-20';
      case 'pending':
        return 'text-yellow-400 bg-yellow-900 bg-opacity-20';
      case 'rejected':
        return 'text-red-400 bg-red-900 bg-opacity-20';
      default:
        return 'text-gray-400 bg-gray-900 bg-opacity-20';
    }
  };

  const isRecentUpdate = (order: Order) => {
    if (!order.updated_at) return false;
    const updateTime = new Date(order.updated_at);
    const now = new Date();
    return (now.getTime() - updateTime.getTime()) < 5000; // 5 seconds
  };

  if (loading) {
    return (
      <div className="bg-gray-800 rounded-lg shadow-lg p-6">
        <div className="flex items-center justify-center h-32">
          <RefreshCw className="h-8 w-8 animate-spin text-blue-400" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 rounded-lg shadow-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <Activity className="h-6 w-6 text-blue-400" />
          <h2 className="text-xl font-bold text-white">Real-time Order Book</h2>
          {isConnected && (
            <div className="flex items-center space-x-2 text-green-400">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <span className="text-sm">Live</span>
            </div>
          )}
        </div>
        
        <div className="flex items-center space-x-3">
          <div className="text-xs text-gray-400">
            Last update: {format(lastUpdate, 'HH:mm:ss')}
          </div>
          <button
            onClick={fetchOrders}
            className="flex items-center space-x-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors"
          >
            <RefreshCw className="h-4 w-4" />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Connection Status */}
      <div className={`mb-4 p-3 rounded-md flex items-center space-x-2 ${
        isConnected 
          ? 'bg-green-900 bg-opacity-30 text-green-300 border border-green-700' 
          : 'bg-red-900 bg-opacity-30 text-red-300 border border-red-700'
      }`}>
        <Zap className="h-4 w-4" />
        <span className="text-sm">
          {isConnected ? 'Connected to real-time updates' : 'Disconnected - updates may be delayed'}
        </span>
      </div>

      {orders.length === 0 ? (
        <div className="text-center py-8 text-gray-400">
          <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>No orders found</p>
          <p className="text-sm">Place your first order to see it here</p>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.slice(0, 20).map((order) => (
            <div 
              key={order.order_id} 
              className={`p-4 rounded-lg border transition-all duration-300 ${
                isRecentUpdate(order) 
                  ? 'border-blue-500 bg-blue-900 bg-opacity-20 shadow-lg' 
                  : 'border-gray-600 bg-gray-700'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <span className="font-medium text-white">{order.trading_symbol}</span>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      order.transaction_type === 'BUY' 
                        ? 'bg-green-800 text-green-300' 
                        : 'bg-red-800 text-red-300'
                    }`}>
                      {order.transaction_type}
                    </span>
                    <span className="text-xs text-gray-400">{order.order_type}</span>
                    {order.parent_order_id && (
                      <span className="px-2 py-1 bg-purple-800 text-purple-300 text-xs rounded">
                        Child Order
                      </span>
                    )}
                    {isRecentUpdate(order) && (
                      <span className="px-2 py-1 bg-blue-800 text-blue-300 text-xs rounded animate-pulse">
                        Updated
                      </span>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-gray-400">Quantity:</span>
                      <p className="text-white">{order.quantity}</p>
                    </div>
                    <div>
                      <span className="text-gray-400">Price:</span>
                      <p className="text-white">₹{order.price.toFixed(2)}</p>
                    </div>
                    <div>
                      <span className="text-gray-400">Filled:</span>
                      <p className="text-white">{order.filled_quantity} / {order.quantity}</p>
                    </div>
                    <div>
                      <span className="text-gray-400">Time:</span>
                      <p className="text-white">{format(new Date(order.timestamp), 'HH:mm:ss')}</p>
                    </div>
                  </div>
                  
                  {order.average_price > 0 && (
                    <div className="mt-2 text-sm">
                      <span className="text-gray-400">Avg Price: </span>
                      <span className="text-white">₹{order.average_price.toFixed(2)}</span>
                    </div>
                  )}
                  
                  {order.status_message && (
                    <div className="mt-2 text-xs text-red-400">
                      {order.status_message}
                    </div>
                  )}
                </div>
                
                <div className="flex items-center space-x-3">
                  <div className={`flex items-center space-x-2 px-3 py-2 rounded-md ${getStatusColor(order.status)}`}>
                    {getStatusIcon(order.status)}
                    <span className="capitalize font-medium">{order.status}</span>
                  </div>
                  
                  {order.transaction_type === 'BUY' ? (
                    <TrendingUp className="h-5 w-5 text-green-400" />
                  ) : (
                    <TrendingDown className="h-5 w-5 text-red-400" />
                  )}
                </div>
              </div>
              
              <div className="mt-3 pt-3 border-t border-gray-600 flex items-center justify-between text-xs text-gray-400">
                <span>Order ID: {order.order_id}</span>
                <span>{order.exchange} • {order.product}</span>
              </div>
            </div>
          ))}
          
          {orders.length > 20 && (
            <div className="text-center py-4 text-gray-400">
              <p>Showing latest 20 orders</p>
              <button 
                onClick={fetchOrders}
                className="mt-2 text-blue-400 hover:text-blue-300 underline"
              >
                Load more
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default RealTimeOrderBook;