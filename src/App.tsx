import React, { useState, useMemo } from 'react';
import { realOrders } from './data/realData';
import { Settings } from './components/Settings';
import { Order } from './types/orders';
import { OrderCard } from './components/OrderCard';
import { DeliveryRoutes } from './components/DeliveryRoutes.tsx';
import { MapboxMap } from './components/MapboxMap';
import { MapPin, Settings as SettingsIcon, Map } from 'lucide-react';

function App() {
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [orders, setOrders] = useState<Order[]>(realOrders);
  const [useSquareData, setUseSquareData] = useState(false);
  const [currentView, setCurrentView] = useState<'dashboard' | 'settings'>('dashboard');

  // Handle Square orders being loaded
  const handleSquareOrdersLoaded = (squareOrders: Order[]) => {
    if (squareOrders.length > 0) {
      setOrders(squareOrders);
      setUseSquareData(true);
    }
  };

  // Update order status
  const handleUpdateOrderStatus = (orderId: string, status: Order['status']) => {
    setOrders(prev => prev.map(order => 
      order.id === orderId 
        ? { 
            ...order, 
            status,
            readyTime: status === 'ready' ? new Date().toISOString() : order.readyTime,
            pickedUpTime: status === 'out_for_delivery' ? new Date().toISOString() : order.pickedUpTime,
            deliveredTime: status === 'delivered' ? new Date().toISOString() : order.deliveredTime
          }
        : order
    ));
  };

  // Move order between routes
  const handleMoveOrderBetweenRoutes = (orderId: string, fromRouteIndex: number, toRouteIndex: number) => {
    setOrders(prev => {
      const updatedOrders = [...prev];
      const orderIndex = updatedOrders.findIndex(o => o.id === orderId);
      
      if (orderIndex === -1) return prev;
      
      // This is a simplified approach - in a real app you'd want more sophisticated route management
      // For now, we'll just update the order to indicate it should be in a different route
      // The actual route grouping logic in DeliveryRoutes.tsx will handle the reorganization
      
      return updatedOrders;
    });
  };

  // Move order back to queue (unassign from route)
  const handleMoveOrderToQueue = (orderId: string) => {
    setOrders(prev => prev.map(order => 
      order.id === orderId 
        ? { 
            ...order, 
            status: 'ready' as const,
            // Clear any route-specific properties if they exist
            driverId: undefined,
            groupId: undefined
          }
        : order
    ));
  };

  // Get active orders ready for delivery
  const activeOrders = useMemo(() => {
    return orders.filter(order => 
      order.status === 'ready' || order.status === 'out_for_delivery'
    ).sort((a, b) => {
      // Sort by creation time (oldest first)
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });
  }, [orders]);

  // Single layout with sidebar and map
  return (
    <div className="min-h-screen bg-gray-100 relative">
      {currentView === 'settings' ? (
        <Settings onOrdersLoaded={handleSquareOrdersLoaded} />
      ) : (
        <>
          {/* Sidebar */}
          <div className="fixed left-0 top-0 w-80 h-screen bg-white shadow-lg overflow-hidden border-r border-gray-200 z-10 flex flex-col">
            <div className="p-4 border-b border-gray-200 bg-white">
              <h1 className="text-xl font-bold mb-2 flex items-center text-gray-900">
                <MapPin className="w-5 h-5 mr-2 text-blue-600" />
                🍕 Pizza Delivery Routes
              </h1>
              <p className="text-gray-600 text-sm">
                {useSquareData ? 'Live Square orders' : 'Demo data'} • Active orders grouped by 45min routes
              </p>
            </div>

            {/* Navigation Tabs */}
            <div className="p-4 border-b border-gray-200 flex-shrink-0">
              <div className="flex space-x-2">
                <button
                  onClick={() => setCurrentView('dashboard')}
                  className={`flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    currentView === 'dashboard'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  <Map className="w-4 h-4 mr-2" />
                  Dashboard
                </button>
                <button
                  onClick={() => setCurrentView('settings')}
                  className={`flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    currentView === 'settings'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  <SettingsIcon className="w-4 h-4 mr-2" />
                  Settings
                </button>
              </div>
            </div>

            {/* Delivery Routes */}
            <div className="flex-1 overflow-y-auto">
              <div className="p-4">
                <DeliveryRoutes 
                  orders={activeOrders}
                  selectedOrder={selectedOrder}
                  onUpdateOrderStatus={handleUpdateOrderStatus}
                  onOrderSelect={setSelectedOrder}
                  onMoveOrderBetweenRoutes={handleMoveOrderBetweenRoutes}
                  onMoveOrderToQueue={handleMoveOrderToQueue}
                  onArchiveRoute={(routeId) => {
                    console.log('Archived route:', routeId);
                    // Could save to localStorage or send to backend
                  }}
                />
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="ml-80 h-screen">
            <div className="h-screen bg-white">
              <MapboxMap 
                orders={activeOrders} 
                selectedOrder={selectedOrder}
                onOrderSelect={setSelectedOrder}
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default App;