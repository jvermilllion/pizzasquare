import React, { useMemo, useState, useEffect } from 'react';
import { Archive, ArrowLeft, History } from 'lucide-react';
import { Order } from '../types/orders';
import { restaurantLocation } from '../data/realData';

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
  selectedOrder?: Order | null;
  onUpdateOrderStatus: (orderId: string, status: Order['status']) => void;
  onOrderSelect: (order: Order) => void;
  onArchiveRoute?: (routeId: string) => void;
  onMoveOrderBetweenRoutes?: (orderId: string, fromRouteIndex: number, toRouteIndex: number) => void;
  onMoveOrderToQueue?: (orderId: string) => void;
  onReorderWithinRoute?: (orderId: string, routeIndex: number, newPosition: number) => void;
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
  selectedOrder,
  onUpdateOrderStatus, 
  onOrderSelect,
  onArchiveRoute,
  onMoveOrderBetweenRoutes,
  onMoveOrderToQueue,
  onReorderWithinRoute
}) => {
  const [archivedRoutes, setArchivedRoutes] = useState<string[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [lastUpdateTime, setLastUpdateTime] = useState(Date.now());

  // Force re-render when orders change
  useEffect(() => {
    setLastUpdateTime(Date.now());
  }, [orders]);

  const routeGroups = useMemo(() => groupOrdersIntoRoutes(orders), [orders]);
  
  // Update archived routes when orders change to prevent stale data
  useEffect(() => {
    // Remove archived routes that no longer have valid orders
    setArchivedRoutes(prev => {
      const validRouteIds = routeGroups.map(route => route.id);
      return prev.filter(routeId => validRouteIds.includes(routeId));
    });
  }, [routeGroups]);

  const handleArchiveRoute = (routeId: string) => {
    setArchivedRoutes(prev => [...prev, routeId]);
    if (onArchiveRoute) {
      onArchiveRoute(routeId);
    }
  };

  const handleUnarchiveRoute = (routeId: string) => {
    setArchivedRoutes(prev => prev.filter(id => id !== routeId));
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
              className={`p-2 rounded-md transition-colors ${
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
          
          return (
            <div
              key={route.id}
              className={`bg-white border-2 rounded-lg transition-all duration-200 ${
                isArchived ? 'opacity-60' : ''
              } border-gray-200`}
            >
              {/* Route Header */}
              <div className="p-3 border-b border-gray-100">
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
                        className="text-gray-500 hover:text-red-600 hover:bg-red-50 p-2 rounded-md transition-colors"
                        title="Archive route"
                      >
                        <Archive className="w-4 h-4" />
                      </button>
                    )}
                    {!isArchived && (
                      <button
                        onClick={() => window.open(route.googleMapsUrl, '_blank')}
                        className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 p-2 rounded-md transition-colors"
                        title="Open in Google Maps"
                      >
                        <span className="text-base">🗺️</span>
                      </button>
                    )}
                    {showHistory && (
                      <button
                        onClick={() => handleUnarchiveRoute(route.id)}
                        className="text-green-600 hover:text-green-700 hover:bg-green-50 p-2 rounded-md transition-colors"
                        title="Restore route"
                      >
                        <ArrowLeft className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Orders List */}
              <div className="p-2 space-y-1 max-h-64 overflow-y-auto">
                {route.orders.map((order, orderIndex) => (
                  <div
                    key={order.id}
                    className={`border border-gray-200 rounded p-2 cursor-pointer transition-all hover:shadow-sm ${
                      selectedOrder === order.id ? 'ring-2 ring-blue-500' : ''
                    }`}
                    onClick={() => onOrderSelect(order)}
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
            </div>
          );
        })}
      </div>
    </div>
  );
};