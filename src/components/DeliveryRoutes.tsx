import React, { useMemo, useState } from 'react';
import { Archive, ArrowLeft, History } from 'lucide-react';
import { Order } from '../types/orders';

// Color palette for routes
const ROUTE_COLORS = [
  '#ef4444', // red
  '#3b82f6', // blue  
  '#10b981', // green
  '#f59e0b', // yellow
  '#8b5cf6', // purple
  '#ec4899', // pink
  '#f97316', // orange
  '#06b6d4', // cyan
  '#84cc16', // lime
  '#6366f1', // indigo
];

interface DeliveryRoutesProps {
  orders: Order[];
  businessLocation: { name: string; address: string; lat: number; lng: number };
  selectedOrder?: Order | null;
  onUpdateOrderStatus: (orderId: string, status: Order['status']) => void;
  onOrderSelect: (order: Order) => void;
  onArchiveRoute?: (routeId: string) => void;
  onMoveOrderBetweenRoutes?: (orderId: string, fromRouteIndex: number, toRouteIndex: number) => void;
  onMoveOrderToQueue?: (orderId: string) => void;
}

interface RouteGroup {
  id: string;
  name: string;
  orders: Order[];
  totalValue: number;
  estimatedTime: number;
  googleMapsUrl: string;
  color: string;
}

// Calculate distance between two points using Haversine formula
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 3959; // Earth's radius in miles
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

// Generate Google Maps route URL
function generateGoogleMapsUrl(orders: Order[], businessLocation: { name: string; address: string; lat: number; lng: number }): string {
  const origin = encodeURIComponent(businessLocation.address);
  const waypoints = orders
    .map(order => encodeURIComponent(order.deliveryAddress))
    .join('/');
  
  return `https://www.google.com/maps/dir/${origin}/${waypoints}/${origin}`;
}

// Calculate estimated route time
function calculateRouteTime(orders: Order[], businessLocation: { name: string; address: string; lat: number; lng: number }): number {
  if (orders.length === 0) return 0;
  
  let totalTime = 0;
  let currentLocation = businessLocation;
  
  orders.forEach(order => {
    // Calculate distance to this order
    const distance = calculateDistance(
      currentLocation.lat, currentLocation.lng,
      order.deliveryLocation.lat, order.deliveryLocation.lng
    );
    
    // Add travel time (2.5 minutes per mile) + delivery time (3 minutes per stop)
    totalTime += distance * 2.5 + 3;
    currentLocation = order.deliveryLocation;
  });
  
  // Add return time to restaurant
  const returnDistance = calculateDistance(
    currentLocation.lat, currentLocation.lng,
    businessLocation.lat, businessLocation.lng
  );
  totalTime += returnDistance * 2.5;
  
  return Math.round(totalTime);
}

// Group orders into 45-minute round trip routes using nearest neighbor algorithm
function groupOrdersIntoRoutes(orders: Order[], businessLocation: { name: string; address: string; lat: number; lng: number }): RouteGroup[] {
  if (orders.length === 0) return [];

  const routes: RouteGroup[] = [];
  const unassignedOrders = [...orders];
  let routeCounter = 1;

  while (unassignedOrders.length > 0) {
    const currentRoute: Order[] = [];
    let currentLocation = businessLocation;
    let totalTime = 0;

    // Start with the first unassigned order
    let nextOrderIndex = 0;
    let nextOrder = unassignedOrders[nextOrderIndex];
    
    while (nextOrder && totalTime < 35) { // Leave 10 minutes buffer for 45min total
      // Calculate distance to this order
      const distanceToOrder = calculateDistance(
        currentLocation.lat, currentLocation.lng,
        nextOrder.deliveryLocation.lat, nextOrder.deliveryLocation.lng
      );
      
      // Calculate return distance to restaurant
      const returnDistance = calculateDistance(
        nextOrder.deliveryLocation.lat, nextOrder.deliveryLocation.lng,
        businessLocation.lat, businessLocation.lng
      );
      
      // Estimate time for this addition (distance in miles * 2.5 minutes per mile + 3 minutes per stop)
      const additionalTime = distanceToOrder * 2.5 + 3;
      const newReturnTime = returnDistance * 2.5;
      const projectedTotalTime = totalTime + additionalTime + newReturnTime;
      
      // If adding this order would exceed 45 minutes, stop
      if (projectedTotalTime > 45 && currentRoute.length > 0) {
        break;
      }
      
      // Add this order to the route
      currentRoute.push(nextOrder);
      unassignedOrders.splice(nextOrderIndex, 1);
      totalTime += additionalTime;
      currentLocation = nextOrder.deliveryLocation;
      
      // Find the nearest remaining order for next iteration
      if (unassignedOrders.length > 0) {
        let nearestDistance = Infinity;
        let nearestIndex = 0;
        
        unassignedOrders.forEach((order, index) => {
          const distance = calculateDistance(
            currentLocation.lat, currentLocation.lng,
            order.deliveryLocation.lat, order.deliveryLocation.lng
          );
          if (distance < nearestDistance) {
            nearestDistance = distance;
            nearestIndex = index;
          }
        });
        
        nextOrderIndex = nearestIndex;
        nextOrder = unassignedOrders[nearestIndex];
      } else {
        nextOrder = null;
      }
    }
    
    if (currentRoute.length > 0) {
      const totalValue = currentRoute.reduce((sum, order) => sum + order.totalAmount, 0);
      
      routes.push({
        id: `route_${routeCounter}`,
        name: `Route ${routeCounter}`,
        orders: currentRoute,
        totalValue,
        estimatedTime: calculateRouteTime(currentRoute, businessLocation),
        googleMapsUrl: generateGoogleMapsUrl(currentRoute, businessLocation),
        color: ROUTE_COLORS[(routeCounter - 1) % ROUTE_COLORS.length]
      });
      
      routeCounter++;
    }
  }

  return routes;
}

export const DeliveryRoutes: React.FC<DeliveryRoutesProps> = ({ 
  orders, 
  businessLocation,
  selectedOrder,
  onUpdateOrderStatus, 
  onOrderSelect,
  onArchiveRoute,
  onMoveOrderBetweenRoutes,
  onMoveOrderToQueue
}) => {
  const [archivedRoutes, setArchivedRoutes] = useState<string[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [draggedOrder, setDraggedOrder] = useState<{ order: Order; routeIndex: number; fromQueue?: boolean } | null>(null);
  const [dragOverTarget, setDragOverTarget] = useState<{ type: 'route' | 'queue'; index?: number } | null>(null);

  const routeGroups = useMemo(() => {
    return groupOrdersIntoRoutes(orders, businessLocation);
  }, [orders, businessLocation]);

  const handleArchiveRoute = (routeId: string) => {
    setArchivedRoutes(prev => [...prev, routeId]);
    if (onArchiveRoute) {
      onArchiveRoute(routeId);
    }
  };

  const handleUnarchiveRoute = (routeId: string) => {
    setArchivedRoutes(prev => prev.filter(id => id !== routeId));
  };

  const handleMoveOrder = (orderId: string, fromRouteIndex: number, toRouteIndex: number) => {
    if (onMoveOrderBetweenRoutes && fromRouteIndex !== toRouteIndex) {
      onMoveOrderBetweenRoutes(orderId, fromRouteIndex, toRouteIndex);
    }
  };

  const handleMoveOrderToQueue = (orderId: string) => {
    if (onMoveOrderToQueue) {
      onMoveOrderToQueue(orderId);
    }
  };

  const handleOrderDragStart = (e: React.DragEvent, order: Order, routeIndex: number, fromQueue: boolean = false) => {
    e.stopPropagation();
    setDraggedOrder({ order, routeIndex, fromQueue });
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', order.id);
    
    // Add visual feedback
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = '0.5';
    }
  };

  const handleOrderDragEnd = () => {
    // Reset visual feedback
    document.querySelectorAll('[draggable="true"]').forEach(el => {
      if (el instanceof HTMLElement) {
        el.style.opacity = '';
      }
    });
    
    setDraggedOrder(null);
    setDragOverTarget(null);
  };

  const handleRouteDragOver = (e: React.DragEvent, targetRouteIndex: number) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';
    
    if (draggedOrder) {
      setDragOverTarget({ type: 'route', index: targetRouteIndex });
    }
  };

  const handleRouteDragLeave = (e: React.DragEvent) => {
    // Only clear if we're actually leaving the drop zone
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX;
    const y = e.clientY;
    
    if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
      setDragOverTarget(null);
    }
  };

  const handleRouteDrop = (e: React.DragEvent, targetRouteIndex: number) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverTarget(null);
    
    if (!draggedOrder) return;
    
    if (draggedOrder.fromQueue) {
      // Moving from queue to route - this would need to be handled by parent
      console.log('Move from queue to route', draggedOrder.order.id, targetRouteIndex);
    } else if (draggedOrder.routeIndex !== targetRouteIndex) {
      handleMoveOrder(draggedOrder.order.id, draggedOrder.routeIndex, targetRouteIndex);
    }
  };

  const handleQueueDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';
    
    if (draggedOrder && !draggedOrder.fromQueue) {
      setDragOverTarget({ type: 'queue' });
    }
  };

  const handleQueueDragLeave = (e: React.DragEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX;
    const y = e.clientY;
    
    if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
      setDragOverTarget(null);
    }
  };

  const handleQueueDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverTarget(null);
    
    if (draggedOrder && !draggedOrder.fromQueue) {
      handleMoveOrderToQueue(draggedOrder.order.id);
    }
  };
  // Filter routes based on view mode
  const activeRoutes = routeGroups.filter(route => !archivedRoutes.includes(route.id));
  const archivedRoutesList = routeGroups.filter(route => archivedRoutes.includes(route.id));
  const displayRoutes = showHistory ? archivedRoutesList : activeRoutes;

  if (orders.length === 0) {
    return (
      <div className="text-center py-4 text-gray-500">
        <div className="text-2xl mb-2">📦</div>
        <p className="text-sm">No active orders</p>
      </div>
    );
  }

  return (
    <div className="space-y-3 pb-4">
      {/* Compact Summary */}
      <div className="bg-blue-50 border border-blue-200 rounded p-2">
        <div className="flex justify-between items-center text-sm">
          <div className="flex items-center space-x-4">
            <span className="font-medium">
              {showHistory ? `${archivedRoutesList.length} Archived` : `${activeRoutes.length} Active Routes`}
            </span>
            <span className="font-medium text-gray-600">{orders.length} Orders</span>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowHistory(!showHistory)}
              className={`p-1.5 rounded transition-colors ${
                showHistory 
                  ? 'bg-gray-600 text-white' 
                  : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
              }`}
              title={showHistory ? 'Show active routes' : 'Show archived routes'}
            >
              <History className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Empty State */}
      {displayRoutes.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <div className="text-2xl mb-2">
            {showHistory ? '📦' : '🚚'}
          </div>
          <p className="text-sm">
            {showHistory ? 'No archived routes' : 'No active routes'}
          </p>
        </div>
      )}

      {/* Routes Display */}
      <div className="space-y-3 min-h-0">
        {displayRoutes.map((route, routeIndex) => {
          const isArchived = archivedRoutes.includes(route.id);
          const isDropTarget = dragOverTarget?.type === 'route' && dragOverTarget?.index === routeIndex;
          
          return (
            <div
              key={route.id}
              className={`bg-white rounded-lg transition-all duration-200 ${
                isArchived ? 'opacity-60' : ''
              } ${
                isDropTarget ? 'border-blue-400 bg-blue-50 border-2 shadow-lg' : ''
              }`}
              onDragOver={!isArchived ? (e) => handleRouteDragOver(e, routeIndex) : undefined}
              onDragLeave={!isArchived ? handleRouteDragLeave : undefined}
              onDrop={!isArchived ? (e) => handleRouteDrop(e, routeIndex) : undefined}
            >
              {/* Route Header */}
              <div className="p-2 border-b border-gray-100">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center">
                    <div
                      className="w-5 h-5 rounded-full mr-2 flex-shrink-0 border-2 border-white shadow-sm"
                      style={{ backgroundColor: route.color }}
                    />
                    <div>
                      <h4 className="font-semibold text-gray-900 text-sm">{route.name}</h4>
                      <div className="text-xs text-gray-600">
                        {route.orders.length} stops • ${route.totalValue.toFixed(2)} • ~{route.estimatedTime}min
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-1">
                    {!showHistory && !isArchived && (
                      <button
                        onClick={() => handleArchiveRoute(route.id)}
                        className="text-gray-500 hover:text-red-600 p-1 transition-colors"
                        title="Archive route"
                      >
                        <Archive className="w-5 h-5" />
                      </button>
                    )}
                    {!isArchived && (
                      <button
                        onClick={() => window.open(route.googleMapsUrl, '_blank')}
                        className="text-blue-600 hover:text-blue-700 p-1 text-sm"
                        title="Open in Google Maps"
                      >
                        <span className="text-lg">🗺️</span>
                      </button>
                    )}
                    {showHistory && (
                      <button
                        onClick={() => handleUnarchiveRoute(route.id)}
                        className="text-green-600 hover:text-green-700 p-1 transition-colors"
                        title="Restore route"
                      >
                        <ArrowLeft className="w-5 h-5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Drop Zone Indicator */}
              {isDropTarget && draggedOrder && (
                <div className="absolute inset-0 bg-blue-100 bg-opacity-95 border-2 border-dashed border-blue-400 rounded-lg flex items-center justify-center z-10 pointer-events-none">
                  <div className="text-blue-700 font-bold text-center">
                    <div className="text-lg mb-1">📦</div>
                    <div>Drop order here</div>
                    <div className="text-sm opacity-75">Move to {route.name}</div>
                  </div>
                </div>
              )}

              {/* Orders List */}
              <div className="p-1 space-y-1 max-h-64 overflow-y-auto">
                {route.orders.map((order, orderIndex) => (
                  <div
                    key={order.id}
                    className={`border border-gray-200 rounded p-2 cursor-pointer transition-all hover:shadow-sm ${
                      selectedOrder === order.id ? 'ring-2 ring-blue-500' : ''
                    } ${
                      draggedOrder?.order.id === order.id ? 'opacity-30 transform scale-95' : ''
                    }`}
                    onClick={() => onOrderSelect(order)}
                    draggable={!isArchived}
                    onDragStart={!isArchived ? (e) => handleOrderDragStart(e, order, routeIndex) : undefined}
                    onDragEnd={!isArchived ? handleOrderDragEnd : undefined}
                    title={!isArchived ? "Drag to move between routes or back to queue" : ""}
                    style={{
                      cursor: !isArchived ? 'grab' : 'pointer',
                      userSelect: 'none'
                    }}
                    onMouseDown={(e) => {
                      if (!isArchived && e.currentTarget instanceof HTMLElement) {
                        e.currentTarget.style.cursor = 'grabbing';
                      }
                    }}
                    onMouseUp={(e) => {
                      if (e.currentTarget instanceof HTMLElement) {
                        e.currentTarget.style.cursor = !isArchived ? 'grab' : 'pointer';
                      }
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div
                          className="w-5 h-5 rounded-full flex items-center justify-center text-white font-bold text-xs mr-2 flex-shrink-0"
                          style={{ backgroundColor: route.color }}
                        >
                          {orderIndex + 1}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-medium text-gray-900 truncate">{order.customerName}</div>
                          <div className="text-xs text-gray-500 truncate">{order.deliveryAddress}</div>
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0 ml-2">
                        <div className="text-sm font-medium text-gray-900">${order.totalAmount.toFixed(2)}</div>
                        <div className="text-xs text-gray-600 font-medium">{order.distance}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Drag Instructions */}
              {!isArchived && !showHistory && route.orders.length > 0 && (
                <div className="px-1 pb-1">
                  <div className="text-xs text-gray-400 text-center leading-tight">
                    💡 Drag orders to move between routes • Use archive button to complete routes
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Queue Drop Zone - Only show when dragging */}
      {draggedOrder && (
        <div 
          className={`mt-4 border-2 border-dashed rounded-lg p-4 text-center transition-all duration-200 ${
            dragOverTarget?.type === 'queue'
              ? 'border-green-400 bg-green-50 scale-105' 
              : 'border-gray-300 bg-gray-50 hover:border-gray-400'
          }`}
          onDragOver={handleQueueDragOver}
          onDragLeave={handleQueueDragLeave}
          onDrop={handleQueueDrop}
          style={{ minHeight: '80px' }}
        >
          <div className={`transition-colors ${
            dragOverTarget?.type === 'queue' ? 'text-green-700' : 'text-gray-600'
          }`}>
            📦 <strong>Drop here to move back to queue</strong>
          </div>
          <div className={`text-xs mt-1 ${
            dragOverTarget?.type === 'queue' ? 'text-green-600' : 'text-gray-500'
          }`}>
            Order will be unassigned from route
          </div>
        </div>
      )}
    </div>
  );
};