import { useState, useMemo } from 'react';
import { generateMockOrders, getBusinessLocation } from './data/realData';
import { Settings } from './components/Settings';
import { Order } from './types/orders';
import { DeliveryRoutes } from './components/DeliveryRoutes';
import MapboxMap from './components/MapboxMap';
import { MapPin, Settings as SettingsIcon, Map } from 'lucide-react';

function App() {
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [orders, setOrders] = useState<Order[]>(() => generateMockOrders());
  const [useSquareData, setUseSquareData] = useState(false);
  const [currentView, setCurrentView] = useState<'dashboard' | 'settings'>('dashboard');
  const [isDrawingMode, setIsDrawingMode] = useState(false);

  // Business location from localStorage or default
  const businessLocation = useMemo(() => getBusinessLocation(), []);
  
  // Handle drawing completion
  const handleDrawingComplete = (polygon: any) => {
    setIsDrawingMode(false);
    // Polygon is automatically saved in MapboxMap component
  };

  // Regenerate mock orders when business location changes
  const refreshMockOrders = () => {
    if (!useSquareData) {
      setOrders(generateMockOrders());
    }
  };

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
  const handleMoveOrderBetweenRoutes = (orderId: string, _fromRouteIndex: number, _toRouteIndex: number) => {
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
        <Settings 
          onOrdersLoaded={handleSquareOrdersLoaded} 
          onNavigateBack={() => setCurrentView('dashboard')}
        />
      ) : (
        <>
          {/* Sidebar */}
          <div className="fixed left-0 top-0 w-80 h-screen bg-white shadow-lg overflow-hidden border-r border-gray-200 z-10 flex flex-col">
            <div className="p-4 border-b border-gray-200 bg-white">
              <h1 className="text-xl font-bold flex items-center text-gray-900">
                <MapPin className="w-5 h-5 mr-2 text-blue-600" />
                Delivery Dashboard
              </h1>
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
                <button
                  onClick={() => setIsDrawingMode(!isDrawingMode)}
                  className={`flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isDrawingMode
                      ? 'bg-orange-600 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {isDrawingMode ? 'Drawing...' : 'Edit Area'}
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
                  businessLocation={businessLocation}
                />
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="fixed top-0 right-0 bottom-0 bg-white" style={{ left: '320px' }}>
              <MapboxMap 
                orders={activeOrders} 
                selectedOrder={selectedOrder}
                onOrderSelect={setSelectedOrder}
                isDrawingMode={isDrawingMode}
                onDrawingComplete={handleDrawingComplete}
                businessLocation={businessLocation}
              />
          </div>
        </>
      )}
    </div>
  );
}

export default App;