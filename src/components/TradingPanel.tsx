import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { tradingService } from '../services/tradingService';
import { TrendingUp, TrendingDown, DollarSign, Target, AlertCircle, Search, Clock, RefreshCw, Info, LogOut, AlertTriangle } from 'lucide-react';

const TradingPanel: React.FC = () => {
  const { user, logout } = useAuth();
  const [orderForm, setOrderForm] = useState({
    instrument_token: '',
    trading_symbol: '',
    quantity: '',
    price: '',
    order_type: 'LIMIT',
    transaction_type: 'BUY',
    product: 'D',
    validity: 'DAY',
    disclosed_quantity: '0',
    trigger_price: '0',
    is_amo: false,
    slice: true,
    tag: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info' | 'warning', text: string } | null>(null);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [showSearch, setShowSearch] = useState(false);
  const [isValidatingToken, setIsValidatingToken] = useState(false);
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const [authStatus, setAuthStatus] = useState<{ isValid: boolean; needsLogin: boolean; error?: string } | null>(null);

  useEffect(() => {
    // Check auth status on component mount
    checkAuthStatus();
    // Get debug info
    getDebugInfo();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const status = await tradingService.checkAuthStatus();
      setAuthStatus(status);
      
      if (status.needsLogin) {
        setMessage({
          type: 'warning',
          text: 'Your session has expired. Please login again to continue trading.'
        });
      } else if (status.isValid) {
        setMessage({
          type: 'info',
          text: 'Session is active and ready for trading.'
        });
        setTimeout(() => setMessage(null), 3000);
      }
    } catch (error) {
      console.error('Failed to check auth status:', error);
    }
  };

  const getDebugInfo = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/trading/debug/environment`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('upstox_token')}`,
          'Content-Type': 'application/json'
        }
      });
      const data = await response.json();
      setDebugInfo(data.environment);
    } catch (error) {
      console.error('Failed to get debug info:', error);
    }
  };

  const validateUserToken = async () => {
    try {
      setIsValidatingToken(true);
      await tradingService.validateToken(false); // Don't redirect
      console.log('✅ Token validation successful');
      setMessage({ 
        type: 'info', 
        text: 'Session validated successfully' 
      });
      setAuthStatus({ isValid: true, needsLogin: false });
      setTimeout(() => setMessage(null), 3000);
    } catch (error: any) {
      console.error('❌ Token validation failed:', error);
      
      if (error.isTokenExpired) {
        setAuthStatus({ isValid: false, needsLogin: true, error: error.message });
        setMessage({ 
          type: 'warning', 
          text: 'Your session has expired. Please login again to continue trading.' 
        });
      } else {
        setMessage({ 
          type: 'error', 
          text: `Validation failed: ${error.message}` 
        });
      }
    } finally {
      setIsValidatingToken(false);
    }
  };

  // Mock instrument search with real Upstox instrument tokens
  const searchInstruments = async (query: string) => {
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }

    // Mock search results with proper instrument tokens and current prices
    const mockResults = [
      { 
        instrument_token: 'NSE_EQ|INE002A01018', 
        trading_symbol: 'RELIANCE', 
        name: 'Reliance Industries Ltd', 
        exchange: 'NSE',
        last_price: 2475.25
      },
      { 
        instrument_token: 'NSE_EQ|INE467B01029', 
        trading_symbol: 'TCS', 
        name: 'Tata Consultancy Services Ltd', 
        exchange: 'NSE',
        last_price: 3650.80
      },
      { 
        instrument_token: 'NSE_EQ|INE009A01021', 
        trading_symbol: 'INFY', 
        name: 'Infosys Ltd', 
        exchange: 'NSE',
        last_price: 1789.45
      },
      { 
        instrument_token: 'NSE_EQ|INE040A01034', 
        trading_symbol: 'HDFCBANK', 
        name: 'HDFC Bank Ltd', 
        exchange: 'NSE',
        last_price: 1654.30
      },
      { 
        instrument_token: 'NSE_EQ|INE030A01027', 
        trading_symbol: 'ICICIBANK', 
        name: 'ICICI Bank Ltd', 
        exchange: 'NSE',
        last_price: 1198.75
      },
      { 
        instrument_token: 'NSE_EQ|INE256A01028', 
        trading_symbol: 'ZOMATO', 
        name: 'Zomato Ltd', 
        exchange: 'NSE',
        last_price: 267.85
      },
      { 
        instrument_token: 'NSE_EQ|INE758T01015', 
        trading_symbol: 'IRCTC', 
        name: 'Indian Railway Catering And Tourism Corporation Ltd', 
        exchange: 'NSE',
        last_price: 789.20
      },
      { 
        instrument_token: 'NSE_EQ|INE155A01022', 
        trading_symbol: 'TATAMOTORS', 
        name: 'Tata Motors Ltd', 
        exchange: 'NSE',
        last_price: 789.50
      },
      { 
        instrument_token: 'NSE_EQ|INE018A01030', 
        trading_symbol: 'WIPRO', 
        name: 'Wipro Ltd', 
        exchange: 'NSE',
        last_price: 567.30
      },
      { 
        instrument_token: 'NSE_EQ|INE062A01020', 
        trading_symbol: 'BPCL', 
        name: 'Bharat Petroleum Corporation Ltd', 
        exchange: 'NSE',
        last_price: 289.75
      }
    ].filter(item => 
      item.trading_symbol.toLowerCase().includes(query.toLowerCase()) ||
      item.name.toLowerCase().includes(query.toLowerCase())
    );

    setSearchResults(mockResults);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Check if user needs to login first
    if (authStatus?.needsLogin) {
      setMessage({ 
        type: 'error', 
        text: 'Please login again before placing orders.' 
      });
      return;
    }
    
    if (!orderForm.trading_symbol || !orderForm.quantity || !orderForm.price) {
      setMessage({ type: 'error', text: 'Please fill in all required fields' });
      return;
    }

    if (!orderForm.instrument_token) {
      setMessage({ type: 'error', text: 'Please select an instrument from search results' });
      return;
    }

    setIsSubmitting(true);
    setMessage(null);

    try {
      const orderData = {
        ...orderForm,
        quantity: parseInt(orderForm.quantity),
        price: parseFloat(orderForm.price),
        disclosed_quantity: parseInt(orderForm.disclosed_quantity),
        trigger_price: parseFloat(orderForm.trigger_price),
        tag: orderForm.tag || `copy_trading_${Date.now()}`
      };

      console.log('📤 Submitting order:', orderData);

      const response = await tradingService.placeOrder(orderData);

      // Reset form on success
      setOrderForm({
        instrument_token: '',
        trading_symbol: '',
        quantity: '',
        price: '',
        order_type: 'LIMIT',
        transaction_type: 'BUY',
        product: 'D',
        validity: 'DAY',
        disclosed_quantity: '0',
        trigger_price: '0',
        is_amo: false,
        slice: true,
        tag: ''
      });

      const successMessage = user?.role === 'parent' 
        ? 'Order placed successfully! It will be copied to all child accounts.' 
        : 'Order placed successfully!';
      
      setMessage({ type: 'success', text: successMessage });

      // Clear success message after 5 seconds
      setTimeout(() => setMessage(null), 5000);

    } catch (error: any) {
      console.error('Order placement failed:', error);
      
      let errorMessage = 'Failed to place order. Please try again.';
      
      // Handle different types of errors
      if (error.isTokenExpired) {
        setAuthStatus({ isValid: false, needsLogin: true, error: error.message });
        errorMessage = 'Your session has expired. Please login again to continue trading.';
        setMessage({ type: 'warning', text: errorMessage });
      } else if (error.response?.data?.details?.errors?.[0]?.message) {
        errorMessage = error.response.data.details.errors[0].message;
        setMessage({ type: 'error', text: errorMessage });
      } else if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
        setMessage({ type: 'error', text: errorMessage });
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
        setMessage({ type: 'error', text: errorMessage });
      } else if (error.message) {
        errorMessage = error.message;
        setMessage({ type: 'error', text: errorMessage });
      } else {
        setMessage({ type: 'error', text: errorMessage });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setOrderForm({
        ...orderForm,
        [name]: checked
      });
    } else {
      setOrderForm({
        ...orderForm,
        [name]: value
      });

      // Trigger search for trading symbol
      if (name === 'trading_symbol') {
        searchInstruments(value);
        setShowSearch(value.length > 0);
      }
    }
  };

  const selectInstrument = (instrument: any) => {
    setOrderForm({
      ...orderForm,
      trading_symbol: instrument.trading_symbol,
      instrument_token: instrument.instrument_token,
      price: instrument.last_price?.toString() || orderForm.price
    });
    setShowSearch(false);
    setSearchResults([]);
  };

  const handleTransactionTypeChange = (type: 'BUY' | 'SELL') => {
    setOrderForm({
      ...orderForm,
      transaction_type: type
    });
  };

  const handleLoginRedirect = () => {
    logout(); // Clear current session
    // The logout function will handle the redirect
  };

  if (isValidatingToken) {
    return (
      <div className="bg-gray-800 rounded-lg shadow-lg p-6">
        <div className="flex items-center justify-center h-32">
          <RefreshCw className="h-8 w-8 animate-spin text-blue-400" />
          <span className="ml-3 text-white">Validating session...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 rounded-lg shadow-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-white">Trading Panel</h2>
        <div className="flex items-center space-x-3">
          {user?.role === 'parent' && (
            <div className="flex items-center space-x-2 text-green-400">
              <Target className="h-5 w-5" />
              <span className="text-sm">Copy Trading Active</span>
            </div>
          )}
          <button
            onClick={validateUserToken}
            disabled={isValidatingToken}
            className="flex items-center space-x-2 px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-md transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${isValidatingToken ? 'animate-spin' : ''}`} />
            <span>Validate</span>
          </button>
        </div>
      </div>

      {/* Session Status Alert */}
      {authStatus?.needsLogin && (
        <div className="mb-4 p-4 bg-yellow-900 bg-opacity-50 rounded-md border border-yellow-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 text-yellow-300">
              <AlertTriangle className="h-5 w-5" />
              <div>
                <div className="font-medium">Session Expired</div>
                <div className="text-sm">Your trading session has expired. Please login again to continue.</div>
              </div>
            </div>
            <button
              onClick={handleLoginRedirect}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors"
            >
              <LogOut className="h-4 w-4" />
              <span>Login Again</span>
            </button>
          </div>
        </div>
      )}

      {/* Debug Info */}
      {debugInfo && (
        <div className="mb-4 p-3 bg-blue-900 bg-opacity-30 rounded-md border border-blue-700">
          <div className="flex items-center space-x-2 text-blue-300 mb-2">
            <Info className="h-4 w-4" />
            <span className="text-sm font-medium">Environment Info</span>
          </div>
          <div className="text-xs text-blue-200 space-y-1">
            <div>Environment: <span className="font-mono">{debugInfo.UPSTOX_ENV}</span></div>
            <div>API Base: <span className="font-mono">{debugInfo.API_BASE}</span></div>
            <div>Session Status: <span className={`font-mono ${authStatus?.isValid ? 'text-green-400' : 'text-red-400'}`}>
              {authStatus?.isValid ? 'Valid' : 'Invalid'}
            </span></div>
          </div>
        </div>
      )}

      {message && (
        <div className={`mb-4 p-3 rounded-md flex items-center space-x-2 ${
          message.type === 'success' 
            ? 'bg-green-900 bg-opacity-50 text-green-300 border border-green-700' 
            : message.type === 'info'
            ? 'bg-blue-900 bg-opacity-50 text-blue-300 border border-blue-700'
            : message.type === 'warning'
            ? 'bg-yellow-900 bg-opacity-50 text-yellow-300 border border-yellow-700'
            : 'bg-red-900 bg-opacity-50 text-red-300 border border-red-700'
        }`}>
          <AlertCircle className="h-4 w-4" />
          <span className="text-sm">{message.text}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Instrument Search */}
        <div className="relative">
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Trading Symbol *
          </label>
          <div className="relative">
            <input
              type="text"
              name="trading_symbol"
              value={orderForm.trading_symbol}
              onChange={handleInputChange}
              placeholder="Search for stocks (e.g., RELIANCE, TCS, INFY)"
              className="w-full px-3 py-2 pl-10 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
              disabled={authStatus?.needsLogin}
            />
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
          </div>
          
          {showSearch && searchResults.length > 0 && !authStatus?.needsLogin && (
            <div className="absolute z-10 w-full mt-1 bg-gray-700 border border-gray-600 rounded-md shadow-lg max-h-60 overflow-y-auto">
              {searchResults.map((instrument) => (
                <div
                  key={instrument.instrument_token}
                  onClick={() => selectInstrument(instrument)}
                  className="px-4 py-3 hover:bg-gray-600 cursor-pointer border-b border-gray-600 last:border-b-0"
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="text-white font-medium">{instrument.trading_symbol}</div>
                      <div className="text-gray-400 text-sm">{instrument.name}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-blue-400 text-xs">{instrument.exchange}</div>
                      <div className="text-white text-sm">₹{instrument.last_price}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Quantity *
            </label>
            <input
              type="number"
              name="quantity"
              value={orderForm.quantity}
              onChange={handleInputChange}
              placeholder="0"
              min="1"
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
              disabled={authStatus?.needsLogin}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Price *
            </label>
            <input
              type="number"
              name="price"
              value={orderForm.price}
              onChange={handleInputChange}
              placeholder="0.00"
              step="0.05"
              min="0"
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
              disabled={authStatus?.needsLogin}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Order Type
            </label>
            <select
              name="order_type"
              value={orderForm.order_type}
              onChange={handleInputChange}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={authStatus?.needsLogin}
            >
              <option value="LIMIT">Limit</option>
              <option value="MARKET">Market</option>
              <option value="SL">Stop Loss</option>
              <option value="SL-M">Stop Loss Market</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Product
            </label>
            <select
              name="product"
              value={orderForm.product}
              onChange={handleInputChange}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={authStatus?.needsLogin}
            >
              <option value="D">Delivery</option>
              <option value="I">Intraday</option>
              <option value="MTF">Margin Trading</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Validity
            </label>
            <select
              name="validity"
              value={orderForm.validity}
              onChange={handleInputChange}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={authStatus?.needsLogin}
            >
              <option value="DAY">Day</option>
              <option value="IOC">IOC</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Trigger Price
            </label>
            <input
              type="number"
              name="trigger_price"
              value={orderForm.trigger_price}
              onChange={handleInputChange}
              placeholder="0.00"
              step="0.05"
              min="0"
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={authStatus?.needsLogin}
            />
          </div>
        </div>

        {/* Advanced Options */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Disclosed Quantity
            </label>
            <input
              type="number"
              name="disclosed_quantity"
              value={orderForm.disclosed_quantity}
              onChange={handleInputChange}
              placeholder="0"
              min="0"
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={authStatus?.needsLogin}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Tag (Optional)
            </label>
            <input
              type="text"
              name="tag"
              value={orderForm.tag}
              onChange={handleInputChange}
              placeholder="Order tag"
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={authStatus?.needsLogin}
            />
          </div>
        </div>

        {/* Checkboxes */}
        <div className="flex space-x-6">
          <label className="flex items-center space-x-2 text-gray-300">
            <input
              type="checkbox"
              name="is_amo"
              checked={orderForm.is_amo}
              onChange={handleInputChange}
              className="rounded bg-gray-700 border-gray-600 text-blue-600 focus:ring-blue-500"
              disabled={authStatus?.needsLogin}
            />
            <span className="text-sm">After Market Order</span>
            <Clock className="h-4 w-4" />
          </label>

          <label className="flex items-center space-x-2 text-gray-300">
            <input
              type="checkbox"
              name="slice"
              checked={orderForm.slice}
              onChange={handleInputChange}
              className="rounded bg-gray-700 border-gray-600 text-blue-600 focus:ring-blue-500"
              disabled={authStatus?.needsLogin}
            />
            <span className="text-sm">Auto Slice</span>
          </label>
        </div>

        <div className="flex space-x-4">
          <button
            type="submit"
            onClick={() => handleTransactionTypeChange('BUY')}
            disabled={isSubmitting || authStatus?.needsLogin}
            className="flex-1 flex items-center justify-center space-x-2 bg-green-600 hover:bg-green-700 text-white font-medium py-3 px-4 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <TrendingUp className="h-5 w-5" />
            <span>{isSubmitting && orderForm.transaction_type === 'BUY' ? 'Placing...' : 'BUY'}</span>
          </button>

          <button
            type="submit"
            onClick={() => handleTransactionTypeChange('SELL')}
            disabled={isSubmitting || authStatus?.needsLogin}
            className="flex-1 flex items-center justify-center space-x-2 bg-red-600 hover:bg-red-700 text-white font-medium py-3 px-4 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <TrendingDown className="h-5 w-5" />
            <span>{isSubmitting && orderForm.transaction_type === 'SELL' ? 'Placing...' : 'SELL'}</span>
          </button>
        </div>
      </form>

      {user?.role === 'parent' && !authStatus?.needsLogin && (
        <div className="mt-6 p-4 bg-blue-900 bg-opacity-50 rounded-lg border border-blue-700">
          <div className="flex items-center space-x-2 text-blue-300">
            <DollarSign className="h-5 w-5" />
            <span className="text-sm font-medium">
              This trade will be automatically copied to all connected child accounts
            </span>
          </div>
        </div>
      )}

      {/* Debug Info */}
      {orderForm.instrument_token && !authStatus?.needsLogin && (
        <div className="mt-4 p-3 bg-gray-700 rounded-md">
          <div className="text-xs text-gray-400">
            <div>Instrument Token: <span className="font-mono">{orderForm.instrument_token}</span></div>
            <div>Trading Symbol: <span className="font-mono">{orderForm.trading_symbol}</span></div>
            <div>Order Data Preview:</div>
            <pre className="mt-2 text-xs bg-gray-800 p-2 rounded overflow-x-auto">
{JSON.stringify({
  quantity: parseInt(orderForm.quantity) || 0,
  product: orderForm.product,
  validity: orderForm.validity,
  price: parseFloat(orderForm.price) || 0,
  instrument_token: orderForm.instrument_token,
  order_type: orderForm.order_type,
  transaction_type: orderForm.transaction_type,
  disclosed_quantity: parseInt(orderForm.disclosed_quantity) || 0,
  trigger_price: parseFloat(orderForm.trigger_price) || 0,
  is_amo: orderForm.is_amo,
  slice: orderForm.slice
}, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
};

export default TradingPanel;