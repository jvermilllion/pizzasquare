import { useState, useMemo } from 'react';
import { generateMockOrders, getBusinessLocation } from './data/realData';
import { Settings } from './components/Settings';
import { Order } from './types/orders';
import { DeliveryRoutes } from './components/DeliveryRoutes';
import MapboxMap from './components/MapboxMap';
import { MapPin, Settings as SettingsIcon, Map, User, Home } from 'lucide-react';

function App() {
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [orders, setOrders] = useState<Order[]>(() => generateMockOrders());
  const [currentView, setCurrentView] = useState<'dashboard' | 'settings'>('dashboard');
  const [isDrawingMode, setIsDrawingMode] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false); // Mock login state

  // Business location from localStorage or default
  const businessLocation = useMemo(() => getBusinessLocation(), []);
  const [showArchived, setShowArchived] = useState(false);
  
  // Handle drawing completion
  const handleDrawingComplete = (_polygon: any) => {
    setIsDrawingMode(false);
    // Polygon is automatically saved in MapboxMap component
  };

  // Handle Square orders being loaded
  const handleSquareOrdersLoaded = (squareOrders: Order[]) => {
    if (squareOrders.length > 0) {
      setOrders(squareOrders);
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

  // Archive an order
  const handleArchiveOrder = (orderId: string) => {
    console.log('Archiving order:', orderId);
    setOrders(prev => prev.map(order => 
      order.id === orderId 
        ? { 
            ...order, 
            archived: true,
            archivedAt: new Date().toISOString()
          }
        : order
    ));
  };

  // Unarchive an order
  const handleUnarchiveOrder = (orderId: string) => {
    console.log('Unarchiving order:', orderId);
    setOrders(prev => prev.map(order => 
      order.id === orderId 
        ? { 
            ...order, 
            archived: false,
            archivedAt: undefined
          }
        : order
    ));
  };

  // Get active orders ready for delivery
  const activeOrders = useMemo(() => {
    return orders.filter(order => {
      const isActive = order.status === 'ready' || order.status === 'out_for_delivery';
      const matchesArchiveFilter = showArchived ? order.archived : !order.archived;
      return isActive && matchesArchiveFilter;
    }).sort((a, b) => {
      // Sort by creation time (oldest first)
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });
  }, [orders, showArchived]);

  // Get all orders (for archive view)
  const allOrders = useMemo(() => {
    return orders.filter(order => {
      return showArchived ? order.archived : !order.archived;
    }).sort((a, b) => {
      // Sort by creation time (newest first for archive view, oldest first for active)
      if (showArchived) {
        return new Date(b.archivedAt || b.createdAt).getTime() - new Date(a.archivedAt || a.createdAt).getTime();
      }
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });
  }, [orders, showArchived]);

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
          {/* Icon Sidebar */}
          <div className="fixed left-0 top-0 w-16 h-screen bg-gray-900 shadow-lg z-20 flex flex-col">
            {/* Logo/Brand */}
            <div className="p-3 border-b border-gray-700">
              <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                <MapPin className="w-6 h-6 text-white" />
              </div>
            </div>

            {/* Navigation Icons */}
            <div className="flex-1 flex flex-col space-y-2 p-2">
              <button
                onClick={() => setCurrentView('dashboard')}
                className={`p-3 rounded-lg transition-colors group relative ${
                  currentView === 'dashboard'
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-400 hover:text-white hover:bg-gray-800'
                }`}
                title="Dashboard"
              >
                <Home className="w-5 h-5" />
                {/* Tooltip */}
                <div className="absolute left-full ml-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-30">
                  Dashboard
                </div>
              </button>

              <button
                onClick={() => setCurrentView('settings')}
                className={`p-3 rounded-lg transition-colors group relative ${
                  'text-gray-400 hover:text-white hover:bg-gray-800'
                }`}
                title="Settings"
              >
                <SettingsIcon className="w-5 h-5" />
                {/* Tooltip */}
                <div className="absolute left-full ml-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-30">
                  Settings
                </div>
              </button>
            </div>

            {/* User Profile/Login Status */}
            <div className="p-2 border-t border-gray-700">
              <button
                onClick={() => setIsLoggedIn(!isLoggedIn)}
                className={`w-full p-3 rounded-lg transition-colors group relative ${
                  isLoggedIn
                    ? 'bg-green-600 text-white'
                    : 'text-gray-400 hover:text-white hover:bg-gray-800'
                }`}
                title={isLoggedIn ? 'Logged In' : 'Not Logged In'}
              >
                <div className="relative">
                  <User className="w-5 h-5" />
                  {/* Status indicator */}
                  <div className={`absolute -top-1 -right-1 w-3 h-3 rounded-full border-2 border-gray-900 ${
                    isLoggedIn ? 'bg-green-400' : 'bg-gray-500'
                  }`}></div>
                </div>
                {/* Tooltip */}
                <div className="absolute left-full ml-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-30">
                  {isLoggedIn ? 'Logged In' : 'Not Logged In'}
                </div>
              </button>
            </div>
          </div>
          {/* Sidebar */}
          <div className="fixed top-0 w-80 h-screen bg-white shadow-lg overflow-hidden border-r border-gray-200 z-10 flex flex-col" style={{ left: '64px' }}>
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
                  onClick={() => setShowArchived(!showArchived)}
                  className={`flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    showArchived
                      ? 'bg-gray-600 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  📦 {showArchived ? 'Show Active' : 'Show Archived'}
                </button>
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
                    'bg-gray-100 text-gray-600 hover:bg-gray-200'
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
                  orders={showArchived ? allOrders : activeOrders}
                  selectedOrder={selectedOrder}
                  onUpdateOrderStatus={handleUpdateOrderStatus}
                  onOrderSelect={setSelectedOrder}
                  businessLocation={businessLocation}
                  onArchiveOrder={handleArchiveOrder}
                  onUnarchiveOrder={handleUnarchiveOrder}
                  showArchived={showArchived}
                />
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="fixed top-0 right-0 bottom-0 bg-white" style={{ left: '384px' }}>
              <MapboxMap 
                orders={showArchived ? allOrders : activeOrders}
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