import React, { useState, useMemo } from 'react';
import { realOrders } from './data/realData';
import { SquareIntegration } from './components/SquareIntegration';
import { Order } from './types/orders';
import { OrderCard } from './components/OrderCard';
import { DeliveryRoutes } from './components/DeliveryRoutes.tsx';
import { MapboxMap } from './components/MapboxMap';
import { MapPin } from 'lucide-react';

function App() {
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [orders, setOrders] = useState<Order[]>(realOrders);
  const [useSquareData, setUseSquareData] = useState(false);

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
      {/* Sidebar */}
      <div className="fixed left-0 top-0 w-80 h-screen bg-white shadow-lg overflow-y-auto border-r border-gray-200 z-10">
        <div className="p-4 border-b border-gray-200 bg-white">
          <h1 className="text-xl font-bold mb-2 flex items-center text-gray-900">
            <MapPin className="w-5 h-5 mr-2 text-blue-600" />
            🍕 Pizza Delivery Routes
          </h1>
          <p className="text-gray-600 text-sm">
            {useSquareData ? 'Live Square orders' : 'Demo data'} • Active orders grouped by 45min routes
          </p>
        </div>

        {/* Square Integration */}
        <div className="p-4 border-b border-gray-200">
          <SquareIntegration onOrdersLoaded={handleSquareOrdersLoaded} />
        </div>

        {/* Delivery Routes */}
        <div className="p-4">
          <DeliveryRoutes 
            orders={activeOrders}
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
    </div>
  );
}

export default App;