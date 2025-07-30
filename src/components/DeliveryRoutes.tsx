import React, { useMemo, useState } from 'react';
import { Order } from '../types/orders';
import { restaurantLocation } from '../data/realData';
import { MapPin, Truck, Phone, Archive, History, X, Check } from 'lucide-react';

interface DeliveryRoutesProps {
  orders: Order[];
  onUpdateOrderStatus: (orderId: string, status: Order['status']) => void;
  onOrderSelect: (order: Order) => void;
  onArchiveRoute?: (routeId: string) => void;
}

interface RouteGroup {
  id: string;
  name: string;
  orders: Order[];
  totalValue: number;
  googleMapsUrl: string;
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
        googleMapsUrl: generateGoogleMapsUrl(currentRoute)
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
  onArchiveRoute
}) => {
  const [archivedRoutes, setArchivedRoutes] = useState<string[]>([]);
  const [showHistory, setShowHistory] = useState(false);
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
    const startX = e.clientX;
    setDragState({
      routeId,
      offset: 0,
      isDragging: true,
      startX
    });
    
    const handleMouseMove = (e: MouseEvent) => {
      if (!dragState.isDragging) return;
      const offset = e.clientX - startX;
      // Only allow left drag (negative offset)
      if (offset < 0) {
        setDragState(prev => ({
          ...prev,
          offset: Math.max(offset, -150)
        }));
      }
    };
    
    const handleMouseUp = () => {
      // If dragged far enough left, archive the route
      if (dragState.isDragging && dragState.routeId && dragState.offset < -80) {
        handleArchiveRoute(dragState.routeId);
      }
      
      // Reset drag state
      setDragState({
        routeId: null,
        offset: 0,
        isDragging: false,
        startX: 0
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
          
          return (
          <div 
            key={route.id} 
            className="bg-white border border-gray-200 rounded relative overflow-hidden"
            style={{
              transform: dragState.routeId === route.id ? `translateX(${dragState.offset}px)` : 'translateX(0)',
              transition: dragState.isDragging && dragState.routeId === route.id ? 'none' : 'transform 0.3s ease'
            }}
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
            } text-white p-2 rounded-t flex items-center justify-between`}>
              <div className="flex items-center">
                <div className="w-6 h-6 bg-white bg-opacity-20 rounded-full flex items-center justify-center font-bold text-xs mr-2">
                  {routeIndex + 1}
                </div>
                <span className="font-medium text-sm">
                  {route.orders.length} stops
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
                  className="flex items-center justify-between p-2 bg-gray-50 rounded text-sm hover:bg-gray-100 cursor-pointer"
                  onClick={() => onOrderSelect(order)}
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
                  </div>
                </div>
              ))}
            </div>
          </div>
          );
        })}
        
        {/* Instructions for swipe/drag */}
        {!showHistory && activeRoutes.length > 0 && (
          <div className="text-center py-2 text-gray-500 text-xs">
            💡 Swipe or drag routes left to archive them
          </div>
        )}
      </div>
    </div>
  );
};