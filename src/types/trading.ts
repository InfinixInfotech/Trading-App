export interface Position {
  instrument_key: string;
  quantity: number;
  average_price: number;
  last_price: number;
  close_price: number;
  pnl: number;
  day_change: number;
  day_change_percentage: number;
  product: string;
  exchange: string;
  trading_symbol: string;
}

export interface Order {
  order_id: string;
  instrument_token: string;
  trading_symbol: string;
  quantity: number;
  price: number;
  order_type: string;
  transaction_type: string;
  product: string;
  validity: string;
  status: string;
  timestamp: string;
  filled_quantity: number;
  pending_quantity: number;
  average_price: number;
  exchange: string;
  trigger_price?: number;
  disclosed_quantity?: number;
  is_amo?: boolean;
  tag?: string;
  status_message?: string;
  exchange_order_id?: string;
  order_timestamp?: string;
  exchange_timestamp?: string;
  user_id?: string;
  parent_order_id?: string;
  updated_at?: string;
}

export interface Trade {
  trade_id: string;
  order_id: string;
  instrument_key: string;
  trading_symbol: string;
  quantity: number;
  price: number;
  transaction_type: string;
  timestamp: string;
  parent_trade_id?: string;
  copied_to?: string[];
}

export interface MarketData {
  instrument_key: string;
  last_price: number;
  close_price: number;
  day_change: number;
  day_change_percentage: number;
  volume: number;
  timestamp: string;
}

export interface ChildAccount {
  user_id: string;
  user_name: string;
  email: string;
  access_token: string;
  is_active: boolean;
  connected_at: string;
  last_sync: string;
  portfolio_value: number;
  day_pnl: number;
}

export interface OrderRequest {
  quantity: number;
  product: string;
  validity: string;
  price: number;
  tag?: string;
  instrument_token: string;
  order_type: string;
  transaction_type: string;
  disclosed_quantity: number;
  trigger_price: number;
  is_amo: boolean;
  slice?: boolean;
}