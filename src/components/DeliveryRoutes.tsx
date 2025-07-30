import React, { useMemo, useState } from 'react';
import { Order } from '../types/orders';
import { restaurantLocation } from '../data/realData';
import { MapPin, Truck, Phone, Archive, History, X, Check, ArrowLeft, ArrowRight } from 'lucide-react';

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
function generateGoogleMapsUrl(orders: Order[]): string {
  const origin = encodeURIComponent(restaurantLocation.address);
  const waypoints = orders
    .map(order => encodeURIComponent(order.deliveryAddress))
    .join('/');
  
  return `https://www.google.com/maps/dir/${origin}/${waypoints}/${origin}`;
}

// Calculate estimated route time
function calculateRouteTime(orders: Order[]): number {
  if (orders.length === 0) return 0;
  
  let totalTime = 0;
  let currentLocation = restaurantLocation;
  
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
    restaurantLocation.lat, restaurantLocation.lng
  );
  totalTime += returnDistance * 2.5;
  
  return Math.round(totalTime);
}

// Group orders into 45-minute round trip routes using nearest neighbor algorithm
function groupOrdersIntoRoutes(orders: Order[]): RouteGroup[] {
  if (orders.length === 0) return [];

  const routes: RouteGroup[] = [];
  const unassignedOrders = [...orders];
  let routeCounter = 1;

  while (unassignedOrders.length > 0) {
    const currentRoute: Order[] = [];
    let currentLocation = restaurantLocation;
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
        restaurantLocation.lat, restaurantLocation.lng
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
        estimatedTime: calculateRouteTime(currentRoute),
        googleMapsUrl: generateGoogleMapsUrl(currentRoute),
        color: ROUTE_COLORS[(routeCounter - 1) % ROUTE_COLORS.length]
      });
      
      routeCounter++;
    }
  }

  return routes;
}

export const DeliveryRoutes: React.FC<DeliveryRoutesProps> = ({ 
  orders, 
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
  const [dragState, setDragState] = useState<{
    routeId: string | null;
    offset: number;
    isDragging: boolean;
    startX: number;
  }>({
    routeId: null,
    offset: 0,
    isDragging: false,
    startX: 0
  });

  const routeGroups = useMemo(() => groupOrdersIntoRoutes(orders), [orders]);

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
    setDraggedOrder({ order, routeIndex, fromQueue });
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', order.id);
  };

  const handleOrderDragEnd = () => {
    setDraggedOrder(null);
    setDragOverTarget(null);
  };

  const handleRouteDragOver = (e: React.DragEvent, targetRouteIndex: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverTarget({ type: 'route', index: targetRouteIndex });
  };

  const handleRouteDragLeave = (e: React.DragEvent) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setDragOverTarget(null);
    }
  };

  const handleRouteDrop = (e: React.DragEvent, targetRouteIndex: number) => {
    e.preventDefault();
    setDragOverTarget(null);
    
    if (!draggedOrder) return;
    
    if (draggedOrder.fromQueue) {
      // Moving from queue to route - this would need to be handled by parent
      console.log('Move from queue to route', draggedOrder.order.id, targetRouteIndex);
    } else if (draggedOrder.routeIndex !== targetRouteIndex) {
      handleMoveOrder(draggedOrder.order.id, draggedOrder.routeIndex, targetRouteIndex);
    }
    setDraggedOrder(null);
  };

  const handleQueueDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverTarget({ type: 'queue' });
  };

  const handleQueueDragLeave = (e: React.DragEvent) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setDragOverTarget(null);
    }
  };

  const handleQueueDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOverTarget(null);
    
    if (draggedOrder && !draggedOrder.fromQueue) {
      handleMoveOrderToQueue(draggedOrder.order.id);
    }
    setDraggedOrder(null);
  };

  const handleTouchStart = (e: React.TouchEvent, routeId: string) => {
    const touch = e.touches[0];
    setDragState({
      routeId,
      offset: 0,
      isDragging: true,
      startX: touch.clientX
    });
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!dragState.isDragging || !dragState.routeId) return;
    
    const touch = e.touches[0];
    const offset = touch.clientX - dragState.startX;
    
    // Only allow left swipe (negative offset)
    if (offset < 0) {
      setDragState(prev => ({
        ...prev,
        offset: Math.max(offset, -150)
      }));
    }
  };

  const handleTouchEnd = () => {
    if (!dragState.isDragging || !dragState.routeId) return;
    
    // If swiped far enough left, archive the route
    if (dragState.offset < -80) {
      handleArchiveRoute(dragState.routeId);
    }
    
    // Reset drag state
    setDragState({
      routeId: null,
      offset: 0,
      isDragging: false,
      startX: 0
    });
  };

  const handleMouseDown = (e: React.MouseEvent, routeId: string) => {
    e.preventDefault();
    setDragState({
      routeId,
      offset: 0,
      isDragging: true,
      startX: e.clientX
    });
    
    const handleMouseMove = (moveEvent: MouseEvent) => {
      const offset = moveEvent.clientX - e.clientX;
      // Only allow left drag (negative offset)
      if (offset < 0) {
        setDragState(prev => ({
          ...prev,
          offset: Math.max(offset, -150)
        }));
      }
    };
    
    const handleMouseUp = () => {
      setDragState(currentState => {
        // If dragged far enough left, archive the route
        if (currentState.isDragging && currentState.routeId && currentState.offset < -80) {
          handleArchiveRoute(currentState.routeId);
        }
        
        // Reset drag state
        return {
          routeId: null,
          offset: 0,
          isDragging: false,
          startX: 0
        };
      });
      
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
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
    <div className="space-y-3">
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
              className={`p-1 rounded transition-colors ${
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
          <span className="font-medium text-gray-600">{orders.length} Orders</span>
          <p className="text-sm">
            {showHistory ? 'No archived routes' : 'No active routes'}
          </p>
        </div>
      )}

      {/* Compact Route Groups */}
      <div className="space-y-2">
        {displayRoutes.map((route, routeIndex) => {
          const isArchived = archivedRoutes.includes(route.id);
          const isDropTarget = draggedOrder && draggedOrder.routeIndex !== routeIndex && !isArchived;
          
          return (
          <div 
            key={route.id} 
            className={`bg-white border border-gray-200 rounded relative overflow-hidden transition-all ${
              isDropTarget ? 'border-blue-400 bg-blue-50 border-2' : ''
            }`}
            style={{
              transform: dragState.routeId === route.id ? `translateX(${dragState.offset}px)` : 'translateX(0)',
              transition: dragState.isDragging && dragState.routeId === route.id ? 'none' : 'transform 0.3s ease'
            }}
            onDragOver={!isArchived ? handleRouteDragOver : undefined}
            onDrop={!isArchived ? (e) => handleRouteDrop(e, routeIndex) : undefined}
            onTouchStart={(e) => !isArchived && handleTouchStart(e, route.id)}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onMouseDown={(e) => !isArchived && handleMouseDown(e, route.id)}
          >
            {/* Archive indicator that appears when dragging */}
            {dragState.routeId === route.id && dragState.offset < -40 && (
              <div className="absolute right-4 top-1/2 transform -translate-y-1/2 z-10">
                <div className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-all ${
                  dragState.offset < -80 ? 'bg-red-500 text-white' : 'bg-red-100 text-red-600'
                }`}>
                  <Archive className="w-5 h-5" />
                  <span className="font-medium text-sm">
                    {dragState.offset < -80 ? 'Release to Archive' : 'Keep Dragging'}
                  </span>
                </div>
              </div>
            )}
            
            {/* Compact Route Header */}
            <div className={`${
              isArchived ? 'bg-gray-500' : 'bg-blue-500'
            } text-white p-2 rounded-t flex items-center justify-between`}
            style={!isArchived ? { backgroundColor: route.color } : {}}>
              <div className="flex items-center">
                <div className="w-6 h-6 bg-white bg-opacity-30 rounded-full flex items-center justify-center font-bold text-xs mr-2">
                  {routeIndex + 1}
                </div>
                <span className="font-medium text-sm">
                  {route.orders.length} stops • {route.estimatedTime}min
                  {isArchived && <span className="ml-2 text-xs opacity-75">(Archived)</span>}
                </span>
              </div>
              <div className="flex items-center space-x-1">
                {!isArchived && (
                  <>
                    <button
                      onClick={() => window.open(route.googleMapsUrl, '_blank')}
                      className="bg-white bg-opacity-20 hover:bg-opacity-30 text-white p-1.5 transition-colors"
                      title="Open route in Google Maps"
                    >
                      <Truck className="w-4 h-4" />
                    </button>
                  </>
                )}
                {isArchived && (
                  <button
                    onClick={() => handleUnarchiveRoute(route.id)}
                    className="bg-white bg-opacity-20 hover:bg-opacity-30 text-white p-1.5 rounded transition-colors"
                    title="Restore this route"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
            
            {/* Compact Orders List */}
            <div className="p-2 space-y-1">
              {route.orders.map((order, orderIndex) => (
                <div 
                  key={order.id}
                  className={`flex items-center justify-between p-2 bg-gray-50 rounded text-sm hover:bg-gray-100 cursor-pointer transition-all ${
                    draggedOrder?.order.id === order.id ? 'opacity-50 transform rotate-1' : ''
                  }`}
                  onClick={() => onOrderSelect(order)}
                  draggable={!isArchived}
                  onDragStart={(e) => !isArchived && handleOrderDragStart(e, order, routeIndex)}
                  onDragEnd={handleOrderDragEnd}
                >
                  <div className="flex items-center flex-1 min-w-0">
                    <div className="w-5 h-5 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-bold mr-2 flex-shrink-0">
                      {orderIndex + 1}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-medium truncate">{order.customerName}</div>
                      <div className="text-xs text-gray-600 truncate">{order.deliveryAddress}</div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2 flex-shrink-0">
                    {!isArchived && (
                      <div className="flex space-x-1">
                        {routeIndex > 0 && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleMoveOrder(order.id, routeIndex, routeIndex - 1);
                            }}
                            className="p-1 text-blue-600 hover:bg-blue-100 rounded"
                            title="Move to previous route"
                          >
                            <ArrowLeft className="w-3 h-3" />
                          </button>
                        )}
                        {routeIndex < displayRoutes.length - 1 && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleMoveOrder(order.id, routeIndex, routeIndex + 1);
                            }}
                            className="p-1 text-blue-600 hover:bg-blue-100 rounded"
                            title="Move to next route"
                          >
                            <ArrowRight className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    )}
                    <div className="text-xs text-gray-500">
                      ${order.totalAmount.toFixed(2)}
                    </div>
                  </div>
                </div>
              ))}
              
              {/* Drop zone indicator */}
              {isDropTarget && (
                <div className="border-2 border-dashed border-blue-400 bg-blue-100 rounded p-3 text-center text-blue-700 text-sm">
                  📦 Drop order here to move to Route {routeIndex + 1}
                </div>
              )}
            </div>
          </div>
          );
        })}
        
        {/* Instructions for swipe/drag */}
        {!showHistory && activeRoutes.length > 0 && (
          <div className="text-center py-2 text-gray-500 text-xs">
            💡 Swipe routes left to archive • Drag orders between routes or to queue to reorganize
          </div>
        )}

        {/* Queue Drop Zone */}
        <div 
          className={`border-2 border-dashed rounded-lg p-4 text-center transition-all ${
            dragOverTarget?.type === 'queue' 
              ? 'border-green-400 bg-green-50' 
              : draggedOrder && !draggedOrder.fromQueue
              ? 'border-gray-300 bg-gray-50'
              : 'hidden'
          }`}
          onDragOver={handleQueueDragOver}
          onDragLeave={handleQueueDragLeave}
          onDrop={handleQueueDrop}
        >
          <div className={`${dragOverTarget?.type === 'queue' ? 'text-green-600' : 'text-gray-600'}`}>
            📦 <strong>Drop here to move order back to queue</strong>
          </div>
          <div className="text-xs text-gray-500 mt-1">
            Order will be unassigned and available for reassignment
          </div>
        </div>
      </div>
    </div>
  );
};