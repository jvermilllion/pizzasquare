import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Order } from '../types/orders';
import { restaurantLocation } from '../data/realData';
import { AlertTriangle } from 'lucide-react';

// Color palette for routes (matching DeliveryRoutes.tsx)
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

// Set Mapbox access token
mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN || '';

interface MapboxMapProps {
  orders: Order[];
  selectedOrder: Order | null;
  onOrderSelect: (order: Order | null) => void;
}

// Group orders into routes and get color/position info
function getOrderRouteInfo(orders: Order[]) {
  const routeInfo: { [orderId: string]: { routeIndex: number; positionInRoute: number; color: string } } = {};
  
  orders.forEach((order, globalIndex) => {
    const routeIndex = Math.floor(globalIndex / 3);
    const positionInRoute = (globalIndex % 3) + 1;
    const color = ROUTE_COLORS[routeIndex % ROUTE_COLORS.length];
    
    routeInfo[order.id] = {
      routeIndex,
      positionInRoute,
      color
    };
  });
  
  return routeInfo;
}

export const MapboxMap: React.FC<MapboxMapProps> = ({ orders, selectedOrder, onOrderSelect }) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  const [visibleRoutes, setVisibleRoutes] = useState<Set<number>>(new Set());
  const markersRef = useRef<mapboxgl.Marker[]>([]);

  // Get route information for all orders
  const routeInfo = getOrderRouteInfo(orders);

  // Get unique routes for toggle controls
  const uniqueRoutes = Array.from(new Set(Object.values(routeInfo).map(info => info.routeIndex)))
    .sort((a, b) => a - b)
    .map(routeIndex => ({
      index: routeIndex,
      color: ROUTE_COLORS[routeIndex % ROUTE_COLORS.length],
      orderCount: Object.values(routeInfo).filter(info => info.routeIndex === routeIndex).length
    }));

  // Initialize all routes as visible
  useEffect(() => {
    if (uniqueRoutes.length > 0) {
      setVisibleRoutes(new Set(uniqueRoutes.map(route => route.index)));
    }
  }, [uniqueRoutes.length]);

  // Validate token
  useEffect(() => {
    if (!mapboxgl.accessToken || mapboxgl.accessToken.trim() === '') {
      setMapError('Mapbox access token is missing. Please check your .env file.');
      return;
    }
    
    if (!mapboxgl.accessToken.startsWith('pk.')) {
      setMapError('Invalid Mapbox token format. Token should start with "pk."');
      return;
    }
    
    setMapError(null);
  }, []);

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || mapError) return;

    // Clean up existing map
    if (map.current) {
      map.current.remove();
    }

    try {
      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: 'mapbox://styles/mapbox/navigation-day-v1',
        center: [restaurantLocation.lng, restaurantLocation.lat],
        zoom: 11.5
      });

      // Add navigation controls
      map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

      // Handle map load
      map.current.on('load', () => {
        setMapLoaded(true);
        
        // Force resize after load
        setTimeout(() => {
          if (map.current) {
            map.current.resize();
          }
        }, 100);
      });

      // Handle errors
      map.current.on('error', (e) => {
        console.error('Mapbox error:', e);
        if (e.error && e.error.message) {
          if (e.error.message.includes('401')) {
            setMapError('Invalid Mapbox token. Please check your VITE_MAPBOX_TOKEN in .env file.');
          } else if (e.error.message.includes('403')) {
            setMapError('Mapbox token lacks required permissions.');
          } else {
            setMapError(`Mapbox error: ${e.error.message}`);
          }
        } else {
          setMapError('Map loading error. Please check your connection.');
        }
      });

    } catch (error) {
      console.error('Error initializing Mapbox:', error);
      setMapError('Failed to initialize map. Please check your Mapbox token.');
    }

    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
      setMapLoaded(false);
    };
  }, [mapError]);

  // Add markers when map loads or orders change
  useEffect(() => {
    if (!map.current || !mapLoaded) return;

    // Clear existing markers
    markersRef.current.forEach(marker => marker.remove());
    markersRef.current = [];

    // Add restaurant marker
    const restaurantEl = document.createElement('div');
    restaurantEl.innerHTML = '🍕';
    restaurantEl.style.fontSize = '32px';
    restaurantEl.style.cursor = 'pointer';

    const restaurantMarker = new mapboxgl.Marker({ element: restaurantEl })
      .setLngLat([restaurantLocation.lng, restaurantLocation.lat])
      .setPopup(new mapboxgl.Popup({ offset: 30 }).setHTML(`
        <div style="padding: 12px;">
          <h3 style="margin: 0 0 8px 0; font-weight: 600;">🍕 Square Bistro</h3>
          <p style="margin: 0; font-size: 14px; color: #666;">${restaurantLocation.address}</p>
        </div>
      `))
      .addTo(map.current);

    markersRef.current.push(restaurantMarker);

    // Add order markers
    orders.forEach((order) => {
      const info = routeInfo[order.id];
      const color = info.color;
      
      const orderEl = document.createElement('div');
      orderEl.style.cssText = `
        background: ${color};
        border: 3px solid white;
        border-radius: 50%;
        width: 30px;
        height: 30px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: bold;
        font-size: 12px;
        color: white;
        box-shadow: 0 4px 12px rgba(0,0,0,0.2);
        cursor: pointer;
      `;
      orderEl.textContent = info.positionInRoute.toString();

      orderEl.addEventListener('click', () => {
        onOrderSelect(order);
      });

      const orderMarker = new mapboxgl.Marker({ element: orderEl })
        .setLngLat([order.deliveryLocation.lng, order.deliveryLocation.lat])
        .setPopup(new mapboxgl.Popup({ offset: 30 }).setHTML(`
          <div style="padding: 12px; max-width: 250px;">
            <div style="margin-bottom: 8px;">
              <div style="font-weight: 600;">Route ${info.routeIndex + 1} - Stop ${info.positionInRoute}</div>
              <div style="font-size: 12px; color: #666;">Order #${order.squareOrderId.slice(-4)}</div>
            </div>
            <div style="margin-bottom: 8px;">
              <div style="font-weight: 600;">${order.customerName}</div>
              <div style="color: #10b981; font-weight: bold;">$${order.totalAmount.toFixed(2)}</div>
            </div>
            <div style="font-size: 12px; color: #666; margin-bottom: 8px;">
              📍 ${order.deliveryAddress}
            </div>
            <div style="font-size: 12px;">
              <strong>Items:</strong><br>
              ${order.items.slice(0, 2).map(item => `${item.quantity}x ${item.name}`).join('<br>')}
              ${order.items.length > 2 ? `<br>+${order.items.length - 2} more items` : ''}
            </div>
          </div>
        `))
        .addTo(map.current);

      markersRef.current.push(orderMarker);
    });

  }, [mapLoaded, orders, routeInfo, onOrderSelect]);

  // Handle selected order
  useEffect(() => {
    if (selectedOrder && map.current && mapLoaded) {
      map.current.flyTo({
        center: [selectedOrder.deliveryLocation.lng, selectedOrder.deliveryLocation.lat],
        zoom: 16,
        duration: 1000
      });
    }
  }, [selectedOrder, mapLoaded]);

  // Route toggle functions
  const toggleRoute = (routeIndex: number) => {
    setVisibleRoutes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(routeIndex)) {
        newSet.delete(routeIndex);
      } else {
        newSet.add(routeIndex);
      }
      return newSet;
    });
  };

  const toggleAllRoutes = () => {
    if (visibleRoutes.size === uniqueRoutes.length) {
      setVisibleRoutes(new Set());
    } else {
      setVisibleRoutes(new Set(uniqueRoutes.map(route => route.index)));
    }
  };

  return (
    <div className="relative w-full h-full">
      {/* Error display */}
      {mapError && (
        <div className="absolute inset-0 z-30 bg-gray-900 bg-opacity-95 flex items-center justify-center">
          <div className="bg-white rounded-lg p-8 max-w-md mx-4 text-center">
            <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Map Error</h3>
            <p className="text-gray-600 mb-4">{mapError}</p>
            <div className="text-sm text-gray-500">
              <p>To fix this:</p>
              <ol className="list-decimal list-inside mt-2 space-y-1">
                <li>Get a valid Mapbox token from <a href="https://account.mapbox.com/access-tokens/" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">account.mapbox.com</a></li>
                <li>Add it to your .env file as VITE_MAPBOX_TOKEN</li>
                <li>Ensure it has required permissions</li>
                <li>Restart your development server</li>
              </ol>
            </div>
          </div>
        </div>
      )}

      {/* Route Toggle Controls */}
      {!mapError && uniqueRoutes.length > 0 && (
        <div className="absolute top-4 right-4 z-20 bg-white rounded-lg shadow-lg p-4 max-w-xs">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-gray-900 text-sm">Route Visibility</h3>
            <button
              onClick={toggleAllRoutes}
              className="text-xs bg-gray-100 hover:bg-gray-200 px-2 py-1 rounded transition-colors"
            >
              {visibleRoutes.size === uniqueRoutes.length ? 'Hide All' : 'Show All'}
            </button>
          </div>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {uniqueRoutes.map(route => (
              <button
                key={route.index}
                onClick={() => toggleRoute(route.index)}
                className={`flex items-center w-full p-2 rounded text-sm transition-all ${
                  visibleRoutes.has(route.index)
                    ? 'bg-gray-50 hover:bg-gray-100'
                    : 'bg-gray-200 opacity-60 hover:bg-gray-300'
                }`}
              >
                <div
                  className="w-4 h-4 rounded-full mr-2 flex-shrink-0"
                  style={{ backgroundColor: route.color }}
                />
                <div className="flex-1 text-left">
                  <div className="font-medium">Route {route.index + 1}</div>
                  <div className="text-xs text-gray-600">{route.orderCount} stops</div>
                </div>
                <div className="ml-2">
                  {visibleRoutes.has(route.index) ? (
                    <div className="w-4 h-4 bg-green-500 rounded-full flex items-center justify-center">
                      <div className="w-2 h-2 bg-white rounded-full" />
                    </div>
                  ) : (
                    <div className="w-4 h-4 border-2 border-gray-400 rounded-full" />
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Map Container */}
      <div 
        ref={mapContainer} 
        className="w-full h-full rounded-lg"
        style={{ minHeight: '500px' }}
      />
    </div>
  );
};