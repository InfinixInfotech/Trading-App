import React, { useState, useEffect } from 'react';
import { useSocket } from '../contexts/SocketContext';
import { tradingService } from '../services/tradingService';
import { Order } from '../types/trading';
import { 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  X, 
  Edit3, 
  RefreshCw,
  Filter,
  Download,
  Eye
} from 'lucide-react';
import { format } from 'date-fns';

const OrdersTable: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({
    status: 'all',
    transaction_type: 'all',
    product: 'all'
  });
  const [showFilters, setShowFilters] = useState(false);
  const { socket } = useSocket();

  useEffect(() => {
    fetchOrders();
    
    // Subscribe to real-time order updates
    if (socket) {
      tradingService.subscribeToOrderUpdates();
    }
  }, []);

  useEffect(() => {
    if (socket) {
      socket.on('order_update', (updatedOrder: Order) => {
        console.log('📋 Order update received:', updatedOrder);
        setOrders(prev => 
          prev.map(order => 
            order.order_id === updatedOrder.order_id 
              ? updatedOrder 
              : order
          )
        );
      });

      socket.on('new_order', (newOrder: Order) => {
        console.log('📋 New order received:', newOrder);
        setOrders(prev => [newOrder, ...prev]);
      });

      return () => {
        socket.off('order_update');
        socket.off('new_order');
      };
    }
  }, [socket]);

  useEffect(() => {
    applyFilters();
  }, [orders, filter]);

  const fetchOrders = async () => {
    try {
      const data = await tradingService.getOrders();
      setOrders(data);
    } catch (error) {
      console.error('Failed to fetch orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...orders];

    if (filter.status !== 'all') {
      filtered = filtered.filter(order => order.status.toLowerCase() === filter.status);
    }

    if (filter.transaction_type !== 'all') {
      filtered = filtered.filter(order => order.transaction_type === filter.transaction_type);
    }

    if (filter.product !== 'all') {
      filtered = filtered.filter(order => order.product === filter.product);
    }

    setFilteredOrders(filtered);
  };

  const handleCancelOrder = async (orderId: string) => {
    if (!confirm('Are you sure you want to cancel this order?')) {
      return;
    }

    try {
      await tradingService.cancelOrder(orderId);
      fetchOrders();
    } catch (error) {
      console.error('Failed to cancel order:', error);
    }
  };

  const handleModifyOrder = async (orderId: string) => {
    // This would open a modal for order modification
    console.log('Modify order:', orderId);
    // Implementation for order modification modal
  };

  const exportOrders = () => {
    const csvContent = [
      ['Order ID', 'Symbol', 'Type', 'Quantity', 'Price', 'Status', 'Time'].join(','),
      ...filteredOrders.map(order => [
        order.order_id,
        order.trading_symbol,
        order.transaction_type,
        order.quantity,
        order.price,
        order.status,
        format(new Date(order.timestamp), 'yyyy-MM-dd HH:mm:ss')
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `orders_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'complete':
        return <CheckCircle className="h-5 w-5 text-green-400" />;
      case 'cancelled':
        return <XCircle className="h-5 w-5 text-red-400" />;
      case 'pending':
        return <Clock className="h-5 w-5 text-yellow-400" />;
      case 'rejected':
        return <AlertCircle className="h-5 w-5 text-red-400" />;
      default:
        return <AlertCircle className="h-5 w-5 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'complete':
        return 'text-green-400';
      case 'cancelled':
        return 'text-red-400';
      case 'pending':
        return 'text-yellow-400';
      case 'rejected':
        return 'text-red-400';
      default:
        return 'text-gray-400';
    }
  };

  if (loading) {
    return (
      <div className="bg-gray-800 rounded-lg shadow-lg p-6">
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin text-blue-400" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 rounded-lg shadow-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-white">Order Book</h2>
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center space-x-2 px-3 py-2 rounded-md transition-colors ${
              showFilters ? 'bg-blue-600 text-white' : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
            }`}
          >
            <Filter className="h-4 w-4" />
            <span>Filters</span>
          </button>
          <button
            onClick={exportOrders}
            className="flex items-center space-x-2 px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-md transition-colors"
          >
            <Download className="h-4 w-4" />
            <span>Export</span>
          </button>
          <button
            onClick={fetchOrders}
            className="flex items-center space-x-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors"
          >
            <RefreshCw className="h-4 w-4" />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="mb-6 p-4 bg-gray-700 rounded-lg border border-gray-600">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Status</label>
              <select
                value={filter.status}
                onChange={(e) => setFilter({ ...filter, status: e.target.value })}
                className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="complete">Complete</option>
                <option value="cancelled">Cancelled</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Transaction Type</label>
              <select
                value={filter.transaction_type}
                onChange={(e) => setFilter({ ...filter, transaction_type: e.target.value })}
                className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Types</option>
                <option value="BUY">Buy</option>
                <option value="SELL">Sell</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Product</label>
              <select
                value={filter.product}
                onChange={(e) => setFilter({ ...filter, product: e.target.value })}
                className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Products</option>
                <option value="D">Delivery</option>
                <option value="I">Intraday</option>
                <option value="MTF">Margin Trading</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Orders Count */}
      <div className="mb-4 text-sm text-gray-400">
        Showing {filteredOrders.length} of {orders.length} orders
      </div>

      {filteredOrders.length === 0 ? (
        <div className="text-center py-8 text-gray-400">
          <Eye className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>No orders found</p>
          {orders.length > 0 && <p className="text-sm">Try adjusting your filters</p>}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-gray-400 uppercase bg-gray-700">
              <tr>
                <th className="px-6 py-3">Order ID</th>
                <th className="px-6 py-3">Symbol</th>
                <th className="px-6 py-3">Type</th>
                <th className="px-6 py-3">Quantity</th>
                <th className="px-6 py-3">Price</th>
                <th className="px-6 py-3">Filled</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3">Time</th>
                <th className="px-6 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.map((order) => (
                <tr key={order.order_id} className="bg-gray-800 border-b border-gray-700 hover:bg-gray-750">
                  <td className="px-6 py-4 font-mono text-xs text-gray-300">
                    {order.order_id}
                  </td>
                  <td className="px-6 py-4 font-medium text-white">
                    <div>
                      <div>{order.trading_symbol}</div>
                      <div className="text-xs text-gray-400">{order.exchange}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="space-y-1">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        order.transaction_type === 'BUY' 
                          ? 'bg-green-800 text-green-300' 
                          : 'bg-red-800 text-red-300'
                      }`}>
                        {order.transaction_type}
                      </span>
                      <div className="text-xs text-gray-400">{order.order_type}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-gray-300">
                    <div>
                      <div>{order.quantity}</div>
                      <div className="text-xs text-gray-400">{order.product}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-gray-300">
                    ₹{order.price.toFixed(2)}
                  </td>
                  <td className="px-6 py-4 text-gray-300">
                    <div>
                      <div>{order.filled_quantity} / {order.quantity}</div>
                      {order.average_price > 0 && (
                        <div className="text-xs text-gray-400">
                          Avg: ₹{order.average_price.toFixed(2)}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className={`flex items-center space-x-2 ${getStatusColor(order.status)}`}>
                      {getStatusIcon(order.status)}
                      <span className="capitalize">{order.status}</span>
                    </div>
                    {order.status_message && (
                      <div className="text-xs text-red-400 mt-1 max-w-xs truncate" title={order.status_message}>
                        {order.status_message}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 text-gray-300">
                    <div>
                      <div>{format(new Date(order.timestamp), 'MMM dd')}</div>
                      <div className="text-xs text-gray-400">
                        {format(new Date(order.timestamp), 'HH:mm:ss')}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-2">
                      {order.status.toLowerCase() === 'pending' && (
                        <>
                          <button
                            onClick={() => handleModifyOrder(order.order_id)}
                            className="flex items-center space-x-1 px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs transition-colors"
                            title="Modify Order"
                          >
                            <Edit3 className="h-3 w-3" />
                          </button>
                          <button
                            onClick={() => handleCancelOrder(order.order_id)}
                            className="flex items-center space-x-1 px-2 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-xs transition-colors"
                            title="Cancel Order"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default OrdersTable;