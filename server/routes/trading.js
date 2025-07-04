import express from 'express';
import axios from 'axios';
import { authenticateToken } from '../middleware/auth.js';
import { io } from '../index.js';

const router = express.Router();

// In-memory stores for demo - in production use a database
const childAccountMappings = new Map();
const orderHistory = new Map();

// Upstox API base URLs - CORRECTED
const UPSTOX_API_BASE = 'https://api.upstox.com/v2';
const UPSTOX_V3_API_BASE = 'https://api-v3.upstox.com'; // This is the correct V3 URL

// Helper function to make Upstox API calls with better error handling
const makeUpstoxCall = async (endpoint, method = 'GET', data = null, accessToken) => {
  try {
    console.log(`🔗 Making Upstox API call: ${method} ${endpoint}`);
    console.log(`🔑 Using token: ${accessToken?.substring(0, 20)}...`);
    
    const config = {
      method,
      url: `${UPSTOX_API_BASE}${endpoint}`,
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      timeout: 30000 // 30 second timeout
    };

    if (data && (method === 'POST' || method === 'PUT')) {
      config.data = data;
    }

    const response = await axios(config);
    console.log(`✅ Upstox API success: ${response.status}`);
    return response;
  } catch (error) {
    console.error(`❌ Upstox API error for ${endpoint}:`, {
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      message: error.message
    });
    throw error;
  }
};

// Helper function for V3 API calls (for order placement) - FIXED URL
const makeUpstoxV3Call = async (endpoint, method = 'POST', data = null, accessToken) => {
  try {
    console.log(`🔗 Making Upstox V3 API call: ${method} ${endpoint}`);
    console.log(`🔑 Using token: ${accessToken?.substring(0, 20)}...`);
    console.log(`📤 Request data:`, JSON.stringify(data, null, 2));
    
    // Use the correct V3 API URL format
    const apiUrl = process.env.UPSTOX_ENV === 'live' 
      ? 'https://api-hft.upstox.com/v3'
      : 'https://api-sandbox.upstox.com/v3';
    
    console.log(`🌐 Using API URL: ${apiUrl}`);
    
    const config = {
      method,
      url: `${apiUrl}${endpoint}`,
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      timeout: 30000 // 30 second timeout
    };

    if (data) {
      config.data = data;
    }

    console.log(`📡 Full request config:`, {
      url: config.url,
      method: config.method,
      headers: config.headers,
      data: config.data
    });

    const response = await axios(config);
    console.log(`✅ Upstox V3 API success: ${response.status}`);
    console.log(`📥 Response data:`, response.data);
    return response;
  } catch (error) {
    console.error(`❌ Upstox V3 API error for ${endpoint}:`, {
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      message: error.message,
      url: error.config?.url,
      requestData: error.config?.data
    });
    throw error;
  }
};

// Validate access token
const validateAccessToken = async (accessToken) => {
  try {
    console.log('🔍 Validating access token...');
    const response = await makeUpstoxCall('/user/profile', 'GET', null, accessToken);
    console.log('✅ Token validation successful:', response.data);
    return response.data;
  } catch (error) {
    console.error('❌ Token validation failed:', error.response?.data);
    throw new Error('Invalid or expired access token');
  }
};

// Get positions from Upstox
router.get('/positions', authenticateToken, async (req, res) => {
  try {
    console.log('📊 Fetching positions from Upstox...');
    
    // First validate the token
    await validateAccessToken(req.user.access_token);
    
    const response = await makeUpstoxCall('/portfolio/long-term-holdings', 'GET', null, req.user.access_token);
    
    // Transform Upstox response to our format
    const positions = response.data.data?.map(position => ({
      instrument_key: position.instrument_token,
      trading_symbol: position.trading_symbol,
      quantity: position.quantity,
      average_price: position.average_price,
      last_price: position.last_price,
      close_price: position.close_price,
      pnl: position.pnl,
      day_change: position.day_change,
      day_change_percentage: position.day_change_percentage,
      product: position.product,
      exchange: position.exchange
    })) || [];

    res.json({ success: true, positions });
  } catch (error) {
    console.error('❌ Positions fetch error:', error.response?.data || error.message);
    
    // Check if it's a token error
    if (error.response?.status === 401 || error.message.includes('Invalid or expired')) {
      return res.status(401).json({ 
        success: false, 
        error: 'Access token expired or invalid. Please login again.',
        code: 'TOKEN_EXPIRED'
      });
    }
    
    // Fallback to mock data if API fails
    const mockPositions = [
      {
        instrument_key: 'NSE_EQ|INE002A01018',
        trading_symbol: 'RELIANCE',
        quantity: 10,
        average_price: 2450.50,
        last_price: 2475.25,
        close_price: 2460.00,
        pnl: 247.50,
        day_change: 15.25,
        day_change_percentage: 0.62,
        product: 'D',
        exchange: 'NSE'
      }
    ];
    
    res.json({ success: true, positions: mockPositions, mock: true });
  }
});

// Get real-time order book from Upstox
router.get('/orders', authenticateToken, async (req, res) => {
  try {
    console.log('📋 Fetching orders from Upstox...');
    
    // First validate the token
    await validateAccessToken(req.user.access_token);
    
    const response = await makeUpstoxCall('/order/retrieve-all', 'GET', null, req.user.access_token);
    
    // Transform Upstox response to our format
    const orders = response.data.data?.map(order => ({
      order_id: order.order_id,
      instrument_token: order.instrument_token,
      trading_symbol: order.trading_symbol,
      quantity: order.quantity,
      price: order.price,
      order_type: order.order_type,
      transaction_type: order.transaction_type,
      product: order.product,
      validity: order.validity,
      status: order.status,
      timestamp: order.order_timestamp,
      filled_quantity: order.filled_quantity,
      pending_quantity: order.pending_quantity,
      average_price: order.average_price,
      exchange: order.exchange,
      trigger_price: order.trigger_price,
      disclosed_quantity: order.disclosed_quantity,
      is_amo: order.is_amo,
      tag: order.tag,
      status_message: order.status_message,
      exchange_order_id: order.exchange_order_id,
      order_timestamp: order.order_timestamp,
      exchange_timestamp: order.exchange_timestamp,
      user_id: req.user.user_id
    })) || [];

    res.json({ success: true, orders });
  } catch (error) {
    console.error('❌ Orders fetch error:', error.response?.data || error.message);
    
    // Check if it's a token error
    if (error.response?.status === 401 || error.message.includes('Invalid or expired')) {
      return res.status(401).json({ 
        success: false, 
        error: 'Access token expired or invalid. Please login again.',
        code: 'TOKEN_EXPIRED'
      });
    }
    
    // Fallback to stored orders or mock data
    const userOrders = orderHistory.get(req.user.user_id) || [];
    res.json({ success: true, orders: userOrders, mock: true });
  }
});

// Place order using Upstox V3 API - FIXED
router.post('/orders', authenticateToken, async (req, res) => {
  try {
    const {
      quantity,
      product,
      validity,
      price,
      tag,
      instrument_token,
      order_type,
      transaction_type,
      disclosed_quantity,
      trigger_price,
      is_amo,
      slice
    } = req.body;

    const userId = req.user.user_id;
    const userRole = req.user.role;

    console.log('🚀 Placing order on Upstox:', {
      userId,
      userRole,
      instrument_token,
      quantity,
      price,
      order_type,
      transaction_type,
      accessToken: req.user.access_token?.substring(0, 20) + '...',
      environment: process.env.UPSTOX_ENV || 'sandbox'
    });

    // Validate required fields
    if (!instrument_token || !quantity || !order_type || !transaction_type || !product) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing required fields: instrument_token, quantity, order_type, transaction_type, product' 
      });
    }

    // First validate the token
    try {
      await validateAccessToken(req.user.access_token);
    } catch (tokenError) {
      console.error('❌ Token validation failed during order placement:', tokenError);
      return res.status(401).json({
        success: false,
        error: 'Access token expired or invalid. Please login again.',
        code: 'TOKEN_EXPIRED'
      });
    }

    // Prepare order data for Upstox V3 API - EXACT FORMAT
    const orderData = {
      quantity: parseInt(quantity),
      product: product,
      validity: validity || 'DAY',
      price: parseFloat(price) || 0,
      tag: tag || `copy_trading_${Date.now()}`,
      instrument_token: instrument_token,
      order_type: order_type,
      transaction_type: transaction_type,
      disclosed_quantity: parseInt(disclosed_quantity) || 0,
      trigger_price: parseFloat(trigger_price) || 0,
      is_amo: Boolean(is_amo),
      slice: Boolean(slice)
    };

    console.log('📤 Final order data for Upstox V3 API:', JSON.stringify(orderData, null, 2));

    // Place order with Upstox V3 API
    const response = await makeUpstoxV3Call('/order/place', 'POST', orderData, req.user.access_token);
    
    console.log('✅ Upstox order response:', response.data);

    const orderIds = response.data.data?.order_ids || [response.data.data?.order_id];
    const primaryOrderId = orderIds[0];

    if (!primaryOrderId) {
      throw new Error('No order ID received from Upstox API');
    }

    // Create order object for our system
    const order = {
      order_id: primaryOrderId,
      instrument_token,
      trading_symbol: req.body.trading_symbol || instrument_token.split('|')[1],
      quantity: parseInt(quantity),
      price: parseFloat(price) || 0,
      order_type,
      transaction_type,
      product,
      validity: validity || 'DAY',
      status: 'pending',
      timestamp: new Date().toISOString(),
      filled_quantity: 0,
      pending_quantity: parseInt(quantity),
      average_price: 0,
      exchange: instrument_token.split('_')[0],
      trigger_price: parseFloat(trigger_price) || 0,
      disclosed_quantity: parseInt(disclosed_quantity) || 0,
      is_amo: Boolean(is_amo),
      tag: tag || `copy_trading_${Date.now()}`,
      user_id: userId,
      upstox_order_ids: orderIds
    };

    // Store order in our system
    const userOrders = orderHistory.get(userId) || [];
    userOrders.unshift(order);
    orderHistory.set(userId, userOrders);

    // Emit real-time order update
    io.emit('new_order', order);

    // If this is a parent account, copy the trade to child accounts
    if (userRole === 'parent') {
      console.log('👨‍👩‍👧‍👦 Parent trade executed - copying to child accounts');
      
      const childAccounts = childAccountMappings.get(userId) || [];
      
      for (const childAccount of childAccounts) {
        if (childAccount.is_active) {
          try {
            console.log(`📋 Copying order to child account: ${childAccount.user_id}`);
            
            // Validate child account token first
            await validateAccessToken(childAccount.access_token);
            
            // Place same order for child account
            const childOrderData = {
              ...orderData,
              tag: `${tag}_child_${childAccount.user_id}`
            };

            const childResponse = await makeUpstoxV3Call('/order/place', 'POST', childOrderData, childAccount.access_token);
            
            const childOrderIds = childResponse.data.data?.order_ids || [childResponse.data.data?.order_id];
            const childOrder = {
              ...order,
              order_id: childOrderIds[0],
              user_id: childAccount.user_id,
              parent_order_id: primaryOrderId,
              tag: childOrderData.tag,
              upstox_order_ids: childOrderIds
            };

            // Store child order
            const childOrders = orderHistory.get(childAccount.user_id) || [];
            childOrders.unshift(childOrder);
            orderHistory.set(childAccount.user_id, childOrders);

            // Emit child order update
            io.emit('new_order', childOrder);
            
            console.log(`✅ Order copied to child account: ${childAccount.user_id}`);
          } catch (childError) {
            console.error(`❌ Failed to copy order to child ${childAccount.user_id}:`, childError.response?.data || childError.message);
            
            // If child token is invalid, mark account as inactive
            if (childError.response?.status === 401 || childError.message.includes('Invalid or expired')) {
              childAccount.is_active = false;
              console.log(`🔒 Marked child account ${childAccount.user_id} as inactive due to token error`);
            }
          }
        }
      }
    }

    res.json({ 
      success: true, 
      order,
      upstox_response: response.data,
      message: userRole === 'parent' ? 'Order placed and copied to child accounts' : 'Order placed successfully'
    });

  } catch (error) {
    console.error('❌ Order placement error:', {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status,
      config: error.config,
      requestBody: req.body
    });
    
    // Check if it's a token error
    if (error.response?.status === 401 || error.message.includes('Invalid or expired')) {
      return res.status(401).json({ 
        success: false, 
        error: 'Access token expired or invalid. Please login again.',
        code: 'TOKEN_EXPIRED',
        details: error.response?.data
      });
    }

    // Check for specific Upstox errors
    let errorMessage = 'Failed to place order';
    if (error.response?.data?.errors?.[0]?.message) {
      errorMessage = error.response.data.errors[0].message;
    } else if (error.response?.data?.message) {
      errorMessage = error.response.data.message;
    } else if (error.message) {
      errorMessage = error.message;
    }
    
    res.status(500).json({ 
      success: false, 
      error: errorMessage,
      details: error.response?.data,
      debug: {
        url: error.config?.url,
        method: error.config?.method,
        status: error.response?.status,
        environment: process.env.UPSTOX_ENV || 'sandbox'
      }
    });
  }
});

// Cancel order
router.delete('/orders/:orderId', authenticateToken, async (req, res) => {
  try {
    const { orderId } = req.params;
    const userId = req.user.user_id;

    console.log('❌ Cancelling order:', orderId);

    // First validate the token
    await validateAccessToken(req.user.access_token);

    // Cancel order with Upstox API
    const response = await makeUpstoxCall(`/order/cancel`, 'DELETE', { order_id: orderId }, req.user.access_token);

    // Update order status in our system
    const userOrders = orderHistory.get(userId) || [];
    const orderIndex = userOrders.findIndex(order => order.order_id === orderId);
    
    if (orderIndex !== -1) {
      userOrders[orderIndex].status = 'cancelled';
      orderHistory.set(userId, userOrders);
      
      // Emit real-time update
      io.emit('order_update', userOrders[orderIndex]);
    }

    res.json({ success: true, message: 'Order cancelled successfully' });
  } catch (error) {
    console.error('❌ Order cancellation error:', error.response?.data || error.message);
    
    if (error.response?.status === 401 || error.message.includes('Invalid or expired')) {
      return res.status(401).json({ 
        success: false, 
        error: 'Access token expired or invalid. Please login again.',
        code: 'TOKEN_EXPIRED'
      });
    }
    
    res.status(500).json({ 
      success: false, 
      error: error.response?.data?.message || 'Failed to cancel order' 
    });
  }
});

// Get portfolio
router.get('/portfolio', authenticateToken, async (req, res) => {
  try {
    console.log('💰 Fetching portfolio from Upstox...');
    
    // First validate the token
    await validateAccessToken(req.user.access_token);
    
    const response = await makeUpstoxCall('/user/get-funds-and-margin', 'GET', null, req.user.access_token);
    
    const equity = response.data.data?.equity || {};
    
    const portfolio = {
      total_value: (equity.used_margin || 0) + (equity.available_margin || 0),
      day_pnl: equity.unrealised_pnl || 0,
      total_pnl: equity.unrealised_pnl || 0,
      available_margin: equity.available_margin || 0,
      used_margin: equity.used_margin || 0
    };

    res.json({ success: true, portfolio });
  } catch (error) {
    console.error('❌ Portfolio fetch error:', error.response?.data || error.message);
    
    if (error.response?.status === 401 || error.message.includes('Invalid or expired')) {
      return res.status(401).json({ 
        success: false, 
        error: 'Access token expired or invalid. Please login again.',
        code: 'TOKEN_EXPIRED'
      });
    }
    
    // Fallback to mock data
    const portfolio = {
      total_value: 100000,
      day_pnl: 2500,
      total_pnl: 15000,
      available_margin: 75000,
      used_margin: 25000
    };
    
    res.json({ success: true, portfolio, mock: true });
  }
});

// Child account management routes
router.get('/child-accounts', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'parent') {
      return res.status(403).json({ success: false, error: 'Only parent accounts can access child accounts' });
    }

    const childAccounts = childAccountMappings.get(req.user.user_id) || [];
    res.json({ success: true, children: childAccounts });
  } catch (error) {
    console.error('❌ Child accounts fetch error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch child accounts' });
  }
});

router.post('/child-accounts', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'parent') {
      return res.status(403).json({ success: false, error: 'Only parent accounts can add child accounts' });
    }

    const { user_id, access_token } = req.body;

    if (!user_id || !access_token) {
      return res.status(400).json({ success: false, error: 'Missing user_id or access_token' });
    }

    // Verify child account by making a test API call
    try {
      console.log('🔍 Verifying child account:', user_id);
      const testResponse = await makeUpstoxCall('/user/profile', 'GET', null, access_token);
      const childProfile = testResponse.data.data;

      const childAccount = {
        user_id: childProfile.user_id || user_id,
        user_name: childProfile.user_name || 'Child User',
        email: childProfile.email || 'child@example.com',
        access_token,
        is_active: true,
        connected_at: new Date().toISOString(),
        last_sync: new Date().toISOString(),
        portfolio_value: 0,
        day_pnl: 0
      };

      const childAccounts = childAccountMappings.get(req.user.user_id) || [];
      
      // Check if child account already exists
      const existingIndex = childAccounts.findIndex(child => child.user_id === childAccount.user_id);
      if (existingIndex !== -1) {
        childAccounts[existingIndex] = childAccount;
      } else {
        childAccounts.push(childAccount);
      }
      
      childAccountMappings.set(req.user.user_id, childAccounts);

      res.json({ success: true, child: childAccount });
    } catch (verificationError) {
      console.error('❌ Child account verification failed:', verificationError.response?.data);
      res.status(400).json({ 
        success: false, 
        error: 'Invalid access token or child account not accessible',
        details: verificationError.response?.data
      });
    }
  } catch (error) {
    console.error('❌ Add child account error:', error);
    res.status(500).json({ success: false, error: 'Failed to add child account' });
  }
});

router.delete('/child-accounts/:childUserId', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'parent') {
      return res.status(403).json({ success: false, error: 'Only parent accounts can remove child accounts' });
    }

    const { childUserId } = req.params;
    const childAccounts = childAccountMappings.get(req.user.user_id) || [];
    
    const filteredAccounts = childAccounts.filter(child => child.user_id !== childUserId);
    childAccountMappings.set(req.user.user_id, filteredAccounts);

    res.json({ success: true, message: 'Child account removed successfully' });
  } catch (error) {
    console.error('❌ Remove child account error:', error);
    res.status(500).json({ success: false, error: 'Failed to remove child account' });
  }
});

// Subscribe to order updates (for real-time functionality)
router.post('/subscribe-orders', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.user_id;
    
    // In a real implementation, you would set up WebSocket connection to Upstox
    // For now, we'll simulate real-time updates
    console.log(`🔔 User ${userId} subscribed to order updates`);
    
    res.json({ success: true, message: 'Subscribed to order updates' });
  } catch (error) {
    console.error('❌ Order subscription error:', error);
    res.status(500).json({ success: false, error: 'Failed to subscribe to order updates' });
  }
});

// Get market data
router.get('/market-data/:instrumentToken', authenticateToken, async (req, res) => {
  try {
    const { instrumentToken } = req.params;
    
    // First validate the token
    await validateAccessToken(req.user.access_token);
    
    // In production, use Upstox market data API
    const response = await makeUpstoxCall(`/market-quote/ltp?instrument_key=${instrumentToken}`, 'GET', null, req.user.access_token);
    
    const marketData = {
      instrument_key: instrumentToken,
      last_price: response.data.data[instrumentToken]?.last_price || 0,
      timestamp: new Date().toISOString()
    };

    res.json({ success: true, data: marketData });
  } catch (error) {
    console.error('❌ Market data fetch error:', error);
    
    if (error.response?.status === 401 || error.message.includes('Invalid or expired')) {
      return res.status(401).json({ 
        success: false, 
        error: 'Access token expired or invalid. Please login again.',
        code: 'TOKEN_EXPIRED'
      });
    }
    
    // Fallback to mock data
    const mockMarketData = {
      instrument_key: req.params.instrumentToken,
      last_price: 2500 + Math.random() * 100,
      close_price: 2480,
      day_change: Math.random() * 50 - 25,
      day_change_percentage: Math.random() * 4 - 2,
      volume: Math.floor(Math.random() * 1000000),
      timestamp: new Date().toISOString()
    };

    res.json({ success: true, data: mockMarketData, mock: true });
  }
});

// Token refresh endpoint
router.post('/refresh-token', authenticateToken, async (req, res) => {
  try {
    console.log('🔄 Refreshing access token...');
    
    // In a real implementation, you would refresh the token using Upstox refresh token API
    // For now, we'll validate the current token
    const profile = await validateAccessToken(req.user.access_token);
    
    res.json({ 
      success: true, 
      message: 'Token is still valid',
      profile: profile.data
    });
  } catch (error) {
    console.error('❌ Token refresh error:', error);
    res.status(401).json({ 
      success: false, 
      error: 'Token refresh failed. Please login again.',
      code: 'TOKEN_EXPIRED'
    });
  }
});

// Debug endpoint to check environment
router.get('/debug/environment', authenticateToken, async (req, res) => {
  res.json({
    success: true,
    environment: {
      UPSTOX_ENV: process.env.UPSTOX_ENV || 'sandbox',
      API_BASE: process.env.UPSTOX_ENV === 'live' 
        ? 'https://api-hft.upstox.com/v3'
        : 'https://api-sandbox.upstox.com/v3',
      NODE_ENV: process.env.NODE_ENV,
      timestamp: new Date().toISOString()
    }
  });
});

// Periodic order status updates (simulate real-time updates)
setInterval(async () => {
  try {
    // Update order statuses for all users
    for (const [userId, orders] of orderHistory.entries()) {
      const pendingOrders = orders.filter(order => order.status === 'pending');
      
      for (const order of pendingOrders) {
        // Simulate order completion (in production, fetch from Upstox)
        if (Math.random() > 0.7) { // 30% chance of completion per interval
          order.status = 'complete';
          order.filled_quantity = order.quantity;
          order.pending_quantity = 0;
          order.average_price = order.price;
          
          // Emit real-time update
          io.emit('order_update', order);
          
          console.log(`✅ Order ${order.order_id} completed for user ${userId}`);
        }
      }
    }
  } catch (error) {
    console.error('❌ Order status update error:', error);
  }
}, 10000); // Check every 10 seconds

export default router;