import React, { useState, useMemo } from 'react';
import { Settings, MapPin, Package, Route } from 'lucide-react';
import { OrderList } from './components/OrderList';
import { OrderStats } from './components/OrderStats';
import { MapboxMap } from './components/MapboxMap';
import { DeliveryRoutes } from './components/DeliveryRoutes';
import { Settings as SettingsComponent } from './components/Settings';
import { SquareIntegration } from './components/SquareIntegration';
import { Order } from './types/orders';
import { mockOrders } from './data/realData';

type ViewMode = 'orders' | 'map' | 'routes' | 'settings';
type OrderFilter = 'all' | 'pending' | 'preparing' | 'ready' | 'out_for_delivery';

function App() {
  const [orders, setOrders] = useState<Order[]>(mockOrders);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('orders');
  const [orderFilter, setOrderFilter] = useState<OrderFilter>('all');

  const filteredOrders = useMemo(() => {
    if (orderFilter === 'all') return orders;
    return orders.filter(order => order.status === orderFilter);
  }, [orders, orderFilter]);

  const handleUpdateOrderStatus = (orderId: string, status: Order['status']) => {
    setOrders(prevOrders =>
      prevOrders.map(order =>
        order.id === orderId ? { ...order, status } : order
      )
    );
  };

  const handleOrderSelect = (order: Order) => {
    setSelectedOrder(order);
  };

  const handleSquareOrdersLoaded = (squareOrders: Order[]) => {
    setOrders(prevOrders => {
      // Merge Square orders with existing mock orders, avoiding duplicates
      const existingIds = new Set(prevOrders.map(o => o.squareOrderId));
      const newSquareOrders = squareOrders.filter(o => !existingIds.has(o.squareOrderId));
      return [...prevOrders, ...newSquareOrders];
    });
  };

  const getFilterCounts = () => {
    return {
      all: orders.length,
      pending: orders.filter(o => o.status === 'pending').length,
      preparing: orders.filter(o => o.status === 'preparing').length,
      ready: orders.filter(o => o.status === 'ready').length,
      out_for_delivery: orders.filter(o => o.status === 'out_for_delivery').length,
    };
  };

  const filterCounts = getFilterCounts();

  if (viewMode === 'settings') {
    return (
      <SettingsComponent
        onOrdersLoaded={handleSquareOrdersLoaded}
        onNavigateBack={() => setViewMode('orders')}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              <div className="text-2xl mr-3">🍕</div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Pizza Delivery Dashboard</h1>
                <p className="text-sm text-gray-600">Real-time order management and delivery tracking</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              {/* View Mode Tabs */}
              <div className="flex bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setViewMode('orders')}
                  className={`flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    viewMode === 'orders'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <Package className="w-4 h-4 mr-2" />
                  Orders
                </button>
                <button
                  onClick={() => setViewMode('map')}
                  className={`flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    viewMode === 'map'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <MapPin className="w-4 h-4 mr-2" />
                  Map
                </button>
                <button
                  onClick={() => setViewMode('routes')}
                  className={`flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    viewMode === 'routes'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <Route className="w-4 h-4 mr-2" />
                  Routes
                </button>
              </div>

              <button
                onClick={() => setViewMode('settings')}
                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                title="Settings"
              >
                <Settings className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Square Integration Status */}
        <SquareIntegration onOrdersLoaded={handleSquareOrdersLoaded} />

        {/* Stats Overview */}
        <OrderStats orders={orders} />

        {/* Content based on view mode */}
        {viewMode === 'orders' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Order List */}
            <div className="lg:col-span-2">
              {/* Order Filters */}
              <div className="flex flex-wrap gap-2 mb-4">
                {[
                  { key: 'all', label: 'All Orders', count: filterCounts.all },
                  { key: 'pending', label: 'Pending', count: filterCounts.pending },
                  { key: 'preparing', label: 'Preparing', count: filterCounts.preparing },
                  { key: 'ready', label: 'Ready', count: filterCounts.ready },
                  { key: 'out_for_delivery', label: 'Out for Delivery', count: filterCounts.out_for_delivery },
                ].map(({ key, label, count }) => (
                  <button
                    key={key}
                    onClick={() => setOrderFilter(key as OrderFilter)}
                    className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                      orderFilter === key
                        ? 'bg-blue-600 text-white'
                        : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    {label} ({count})
                  </button>
                ))}
              </div>

              <OrderList
                orders={filteredOrders}
                selectedOrder={selectedOrder}
                onOrderSelect={handleOrderSelect}
                onUpdateOrderStatus={handleUpdateOrderStatus}
              />
            </div>

            {/* Order Details/Mini Map */}
            <div className="lg:col-span-1">
              {selectedOrder && (
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-4">
                  <h3 className="font-bold text-gray-900 mb-2">Order Details</h3>
                  <div className="space-y-2 text-sm">
                    <div><strong>Customer:</strong> {selectedOrder.customerName}</div>
                    <div><strong>Phone:</strong> {selectedOrder.customerPhone}</div>
                    <div><strong>Address:</strong> {selectedOrder.deliveryAddress}</div>
                    <div><strong>Total:</strong> ${selectedOrder.totalAmount.toFixed(2)}</div>
                    <div><strong>Status:</strong> {selectedOrder.status}</div>
                    {selectedOrder.specialInstructions && (
                      <div><strong>Instructions:</strong> {selectedOrder.specialInstructions}</div>
                    )}
                  </div>
                </div>
              )}
              
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                <div className="h-64">
                  <MapboxMap
                    orders={filteredOrders}
                    selectedOrder={selectedOrder}
                    onOrderSelect={handleOrderSelect}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {viewMode === 'map' && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="h-96">
              <MapboxMap
                orders={filteredOrders}
                selectedOrder={selectedOrder}
                onOrderSelect={handleOrderSelect}
              />
            </div>
          </div>
        )}

        {viewMode === 'routes' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-4">Delivery Routes</h2>
              <DeliveryRoutes
                orders={filteredOrders}
                selectedOrder={selectedOrder}
                onUpdateOrderStatus={handleUpdateOrderStatus}
                onOrderSelect={handleOrderSelect}
              />
            </div>
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              <div className="h-96">
                <MapboxMap
                  orders={filteredOrders}
                  selectedOrder={selectedOrder}
                  onOrderSelect={handleOrderSelect}
                />
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;