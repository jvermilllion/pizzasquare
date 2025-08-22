import React, { useState } from 'react';
import { useSquareOrders } from '../hooks/useSquareOrders';
import { AlertTriangle, RefreshCw, CheckCircle, Settings } from 'lucide-react';

interface SquareIntegrationProps {
  onOrdersLoaded: (orders: any[]) => void;
}

export const SquareIntegration: React.FC<SquareIntegrationProps> = ({ onOrdersLoaded }) => {
  const [locationId] = useState((import.meta as any).env?.VITE_SQUARE_LOCATION_ID || '');
  const [isConfigured] = useState(!!((import.meta as any).env?.VITE_SQUARE_ACCESS_TOKEN));
  
  const { orders, loading, error, refetch } = useSquareOrders(locationId);

  React.useEffect(() => {
    if (orders.length > 0) {
      onOrdersLoaded(orders);
    }
  }, [orders, onOrdersLoaded]);

  if (!isConfigured) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
        <div className="flex items-center mb-2">
          <Settings className="w-5 h-5 text-yellow-600 mr-2" />
          <h3 className="font-semibold text-yellow-800">Square Integration Setup Required</h3>
        </div>
        <div className="text-yellow-700 text-sm space-y-2">
          <p>To connect to Square, you need to:</p>
          <ol className="list-decimal list-inside space-y-1 ml-4">
            <li>Get your Square Access Token from the <a href="https://developer.squareup.com/apps" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Square Developer Dashboard</a></li>
            <li>Add it to your .env file as VITE_SQUARE_ACCESS_TOKEN</li>
            <li>Add your Location ID as VITE_SQUARE_LOCATION_ID</li>
            <li>Set VITE_SQUARE_ENVIRONMENT to 'sandbox' or 'production'</li>
            <li>Restart your development server</li>
          </ol>
          <div className="mt-3 p-3 bg-yellow-100 rounded text-xs">
            <strong>Example .env:</strong><br/>
            VITE_SQUARE_ACCESS_TOKEN=your_access_token_here<br/>
            VITE_SQUARE_LOCATION_ID=your_location_id_here<br/>
            VITE_SQUARE_ENVIRONMENT=sandbox
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 mb-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center">
          <div className={`w-3 h-3 rounded-full mr-2 ${
            error ? 'bg-red-500' : loading ? 'bg-yellow-500' : 'bg-green-500'
          }`}></div>
          <h3 className="font-semibold text-gray-900">Square Integration</h3>
        </div>
        <button
          onClick={refetch}
          disabled={loading}
          className="flex items-center px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="flex items-center text-red-600 text-sm mb-2">
          <AlertTriangle className="w-4 h-4 mr-1" />
          {error}
        </div>
      )}

      <div className="grid grid-cols-3 gap-4 text-sm">
        <div>
          <div className="text-gray-600">Status</div>
          <div className={`font-medium ${
            error ? 'text-red-600' : loading ? 'text-yellow-600' : 'text-green-600'
          }`}>
            {error ? 'Error' : loading ? 'Syncing...' : 'Connected'}
          </div>
        </div>
        <div>
          <div className="text-gray-600">Orders Loaded</div>
          <div className="font-medium text-gray-900">{orders.length}</div>
        </div>
        <div>
          <div className="text-gray-600">Last Updated</div>
          <div className="font-medium text-gray-900">
            {loading ? 'Updating...' : new Date().toLocaleTimeString()}
          </div>
        </div>
      </div>

      {orders.length > 0 && (
        <div className="mt-3 pt-3 border-t border-gray-200">
          <div className="flex items-center text-green-600 text-sm">
            <CheckCircle className="w-4 h-4 mr-1" />
            Successfully loaded {orders.length} orders from Square
          </div>
        </div>
      )}
    </div>
  );
};