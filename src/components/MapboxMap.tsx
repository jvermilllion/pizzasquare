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

// Group orders into routes and get color/position info
function getOrderRouteInfo(orders: Order[]) {
  const routeInfo: { [orderId: string]: { routeIndex: number; positionInRoute: number; color: string } } = {};
  
  // Group orders into routes of ~3 orders each
  orders.forEach((order, globalIndex) => {
    const routeIndex = Math.floor(globalIndex / 3);
    const positionInRoute = (globalIndex % 3) + 1; // 1, 2, 3 within each route
    const color = ROUTE_COLORS[routeIndex % ROUTE_COLORS.length];
    
    routeInfo[order.id] = {
      routeIndex,
      positionInRoute,
      color
    };
  });
  
  return routeInfo;
}

// Set Mapbox access token
mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN || '';

interface MapboxMapProps {
  orders: Order[];
  selectedOrder: Order | null;
  onOrderSelect: (order: Order | null) => void;
}

export const MapboxMap: React.FC<MapboxMapProps> = ({ orders, selectedOrder, onOrderSelect }) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [visibleRoutes, setVisibleRoutes] = useState<Set<number>>(new Set());
  const [offscreenOrders, setOffscreenOrders] = useState<Array<{
    order: Order;
    position: { x: number; y: number };
    direction: string;
    routeNumber: string;
    color: string;
  }>>([]);
  const [mapError, setMapError] = useState<string | null>(null);
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
      // Hide all
      setVisibleRoutes(new Set());
    } else {
      // Show all
      setVisibleRoutes(new Set(uniqueRoutes.map(route => route.index)));
    }
  };
  // Handle selected order changes - fly to order location
  useEffect(() => {
    if (selectedOrder && map.current && mapLoaded) {
      map.current.flyTo({
        center: [selectedOrder.deliveryLocation.lng, selectedOrder.deliveryLocation.lat],
        zoom: 16,
        duration: 1000
      });
    }
  }, [selectedOrder, mapLoaded]);

  // Function to check which orders are off-screen and calculate their directions
  const updateOffscreenOrders = () => {
    if (!map.current || !mapContainer.current) return;

    const bounds = map.current.getBounds();
    const containerRect = mapContainer.current.getBoundingClientRect();
    const mapWidth = containerRect.width;
    const mapHeight = containerRect.height;

    const offscreen: Array<{
      order: Order;
      position: { x: number; y: number };
      direction: string;
      routeNumber: string;
      color: string;
    }> = [];

    orders.forEach((order, index) => {
      const orderLngLat = new mapboxgl.LngLat(order.deliveryLocation.lng, order.deliveryLocation.lat);
      const isInBounds = bounds.contains(orderLngLat);

      if (!isInBounds) {
        const info = routeInfo[order.id];
        // Project order location to screen coordinates
        const orderPoint = map.current!.project(orderLngLat);
        const mapCenter = { x: mapWidth / 2, y: mapHeight / 2 };
        
        // Calculate direction from map center to order
        const dx = orderPoint.x - mapCenter.x;
        const dy = orderPoint.y - mapCenter.y;
        
        // Determine which edge the indicator should appear on
        const margin = 30;
        let x, y, direction;
        
        // Calculate intersection with screen edges
        const absX = Math.abs(dx);
        const absY = Math.abs(dy);
        
        if (absX / mapWidth > absY / mapHeight) {
          // Hit left or right edge
          x = dx > 0 ? mapWidth - margin : margin;
          y = Math.max(margin, Math.min(mapHeight - margin, mapCenter.y + (dy * (mapWidth / 2 - margin)) / absX));
          direction = dx > 0 ? 'right' : 'left';
        } else {
          // Hit top or bottom edge
          y = dy > 0 ? mapHeight - margin : margin;
          x = Math.max(margin, Math.min(mapWidth - margin, mapCenter.x + (dx * (mapHeight / 2 - margin)) / absY));
          direction = dy > 0 ? 'bottom' : 'top';
        }

        offscreen.push({
          order,
          position: { x, y },
          direction,
          routeNumber: info.positionInRoute.toString(),
          color: info.color
        });
      }
    });

    setOffscreenOrders(offscreen);
  };

  useEffect(() => {
    if (!mapContainer.current) return;

    // Check if Mapbox token is available
    if (!mapboxgl.accessToken) {
      setMapError('Mapbox access token is missing. Please check your .env file.');
      return;
    }

    // Initialize map
    try {
      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: 'mapbox://styles/mapbox/navigation-day-v1',
        center: [restaurantLocation.lng, restaurantLocation.lat],
        zoom: 11.5
      });
    } catch (error) {
      console.error('Error initializing Mapbox:', error);
      setMapError('Failed to initialize map. Please check your Mapbox token and permissions.');
      return;
    }

    // Add navigation controls
    map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

    // Add error handler for map
    map.current.on('error', (e) => {
      console.error('Mapbox error:', e);
      setMapError('Map loading error. Please check your Mapbox token permissions.');
    });

    map.current.on('load', () => {
      setMapLoaded(true);
      
      // Set night preset configuration
      map.current!.setConfigProperty('basemap', 'lightPreset', 'night');
      
      updateOffscreenOrders();
      
      // Add restaurant marker
      const restaurantEl = document.createElement('div');
      restaurantEl.innerHTML = `
        <div style="
          font-size: 32px;
          cursor: pointer;
        ">🍕</div>
      `;

      const restaurantMarker = new mapboxgl.Marker({ element: restaurantEl })
        .setLngLat([restaurantLocation.lng, restaurantLocation.lat])
        .setPopup(new mapboxgl.Popup({ 
          offset: 30,
          className: 'custom-popup'
        }).setHTML(`
          <div style="padding: 16px; min-width: 250px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;">
            <div style="display: flex; align-items: center; margin-bottom: 12px;">
              <div style="
                margin-right: 10px;
                font-size: 20px;
              ">🍕</div>
              <h3 style="margin: 0; color: #1f2937; font-size: 18px; font-weight: 600;">Square Bistro</h3>
            </div>
            <p style="margin: 0 0 12px 0; font-size: 14px; color: #6b7280; line-height: 1.4;">${restaurantLocation.address}</p>
            <div style="
              background: linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%);
              padding: 12px;
              border-radius: 8px;
              font-size: 12px;
              color: #374151;
              border-left: 4px solid #10b981;
            ">
              <div style="font-weight: 600; margin-bottom: 4px;">🎯 Serving Middletown & Surrounding Areas</div>
              <div style="color: #10b981; font-weight: 500;">📍 5 mile delivery radius • ⚡ 30min average delivery</div>
            </div>
          </div>
        `))
        .addTo(map.current);

      markersRef.current.push(restaurantMarker);

      // Add order markers and routes
      orders.forEach((order, index) => {
        const info = routeInfo[order.id];
        const color = info.color;
        const isRouteVisible = visibleRoutes.has(info.routeIndex);

        // Create numbered marker element
        const orderEl = document.createElement('div');
        const size = 30;
        const fontSize = '12px';
        
        orderEl.innerHTML = `
          <div style="
            position: relative;
            background: linear-gradient(135deg, ${color} 0%, ${color}dd 100%);
            border: 4px solid white;
            border-radius: 50%;
            width: ${size}px;
            height: ${size}px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: bold;
            font-size: ${fontSize};
            color: white;
            box-shadow: 0 6px 20px rgba(0,0,0,0.15), 0 2px 8px ${color}40;
            cursor: pointer;
            transition: all 0.3s ease;
            opacity: ${isRouteVisible ? '1' : '0.3'};
          ">
            <div style="
              background: rgba(255,255,255,0.2);
              border-radius: 50%;
              width: ${size - 12}px;
              height: ${size - 12}px;
              display: flex;
              align-items: center;
              justify-content: center;
              font-weight: bold;
            ">${info.positionInRoute}</div>
          </div>
        `;

        const orderMarker = new mapboxgl.Marker({ element: orderEl })
          .setLngLat([order.deliveryLocation.lng, order.deliveryLocation.lat]);
        
        orderMarker.getElement()
          .addEventListener('click', () => {
            onOrderSelect(order);
          });
        
        const marker = new mapboxgl.Marker({ element: orderEl })
          .setLngLat([order.deliveryLocation.lng, order.deliveryLocation.lat])
          .setPopup(new mapboxgl.Popup({ 
            offset: 30,
            className: 'custom-popup'
          }).setHTML(`
            <div style="padding: 12px; max-width: 250px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;">
              <div style="display: flex; align-items: center; margin-bottom: 8px;">
                <div style="
                  width: 24px;
                  height: 24px;
                  background: ${color};
                  border-radius: 50%;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  margin-right: 8px;
                  font-weight: bold;
                  color: white;
                  font-size: 12px;
                ">${info.positionInRoute}</div>
                <div>
                  <div style="font-weight: 600; color: #1f2937; font-size: 14px;">Route ${info.routeIndex + 1} - Stop ${info.positionInRoute}</div>
                  <div style="font-size: 12px; color: #6b7280;">Order #${order.squareOrderId.slice(-4)}</div>
                </div>
              </div>
              
              <div style="margin-bottom: 8px;">
                <div style="font-weight: 600; color: #1f2937; font-size: 13px;">${order.customerName}</div>
                <div style="color: #10b981; font-weight: bold; font-size: 14px;">$${order.totalAmount.toFixed(2)}</div>
              </div>
              
              <div style="font-size: 11px; color: #6b7280; line-height: 1.3; margin-bottom: 8px;">
                📍 ${order.deliveryAddress}
              </div>
              
              <div style="font-size: 11px; color: #4b5563;">
                <div style="margin-bottom: 2px;"><strong>Items:</strong></div>
                ${order.items.slice(0, 2).map(item => `
                  <div>${item.quantity}x ${item.name}</div>
                `).join('')}
                ${order.items.length > 2 ? `<div style="color: #6b7280;">+${order.items.length - 2} more items</div>` : ''}
              </div>
              
              ${order.specialInstructions ? `
                <div style="
                  background: #fef3c7;
                  padding: 6px;
                  border-radius: 4px;
                  font-size: 10px;
                  color: #92400e;
                  margin-top: 8px;
                ">
                  <strong>Instructions:</strong> ${order.specialInstructions}
                </div>
              ` : ''}
            </div>
          `))
          .addTo(map.current);

        markersRef.current.push(orderMarker);

        // Add route using Mapbox Directions API
        if (isRouteVisible) {
          fetchRoute(
            [restaurantLocation.lng, restaurantLocation.lat],
            [order.deliveryLocation.lng, order.deliveryLocation.lat],
            color,
            false,
            false,
            `route-${order.id}`
          );
        }
      });

      // Add event listeners for map movement to update off-screen indicators
      map.current.on('moveend', updateOffscreenOrders);
      map.current.on('zoomend', updateOffscreenOrders);
    });

    return () => {
      // Clean up markers
      markersRef.current.forEach(marker => marker.remove());
      markersRef.current = [];

      if (map.current) {
        map.current.remove();
      }
    };
  }, [orders]);

  // Update marker and route visibility when routes are toggled
  useEffect(() => {
    if (!map.current || !mapLoaded) return;

    // Update marker opacity and route visibility
    orders.forEach((order) => {
      const info = routeInfo[order.id];
      const isRouteVisible = visibleRoutes.has(info.routeIndex);
      const routeId = `route-${order.id}`;

      // Update route visibility
      if (map.current!.getLayer(routeId)) {
        map.current!.setLayoutProperty(routeId, 'visibility', isRouteVisible ? 'visible' : 'none');
      }
    });

    // Update off-screen indicators
    updateOffscreenOrders();
  }, [visibleRoutes, mapLoaded]);

  const fetchRoute = async (
    start: [number, number],
    end: [number, number],
    color: string,
    isActive: boolean = false,
    isDelivered: boolean = false,
    routeId: string
  ) => {
    if (!map.current) return;

    try {
      const query = await fetch(
        'https://api.mapbox.com/directions/v5/mapbox/driving/' + start[0] + ',' + start[1] + ';' + end[0] + ',' + end[1] + '?steps=true&geometries=geojson&access_token=' + mapboxgl.accessToken,
        { method: 'GET' }
      );
      const json = await query.json();
      const data = json.routes[0];
      const route = data.geometry.coordinates;

      // Add route to map
      if (map.current.getSource(routeId)) {
        map.current.removeLayer(routeId);
        map.current.removeSource(routeId);
      }

      map.current.addSource(routeId, {
        type: 'geojson',
        data: {
          type: 'Feature',
          properties: {},
          geometry: {
            type: 'LineString',
            coordinates: route
          }
        }
      });

      map.current.addLayer({
        id: routeId,
        type: 'line',
        source: routeId,
        layout: {
          'line-join': 'round',
          'line-cap': 'round'
        },
        paint: {
          'line-color': color,
          'line-width': 3,
          'line-opacity': 0.8
        }
      });
    } catch (error) {
      console.error('Error fetching route:', error);
    }
  };

  // Add better token validation
  useEffect(() => {
    if (!mapboxgl.accessToken || mapboxgl.accessToken.trim() === '') {
      setMapError('Mapbox access token is missing or empty. Please check your .env file.');
      return;
    }
    
    // Basic token format validation
    if (!mapboxgl.accessToken.startsWith('pk.')) {
      setMapError('Invalid Mapbox token format. Token should start with "pk."');
      return;
    }
  }, []);

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
                <li>Ensure it has styles:read, tiles:read, and fonts:read permissions</li>
                <li>Restart your development server</li>
              </ol>
            </div>
          </div>
        </div>
      )}

      {/* Off-screen order indicators */}
      {offscreenOrders.map(({ order, position, direction, routeNumber, color }) => {

        return (
          <div
            key={`offscreen-${order.id}`}
            className="absolute z-20 cursor-pointer transition-all duration-300 hover:scale-110"
            style={{
              left: `${position.x}px`,
              top: `${position.y}px`,
              transform: 'translate(-50%, -50%)'
            }}
            onClick={() => {
              if (map.current) {
                map.current.flyTo({
                  center: [order.deliveryLocation.lng, order.deliveryLocation.lat],
                  zoom: 16,
                  duration: 800
                });
                onOrderSelect(order);
              }
            }}
            title={`Click to view ${order.customerName}'s order`}
          >
            {/* Indicator with directional arrow */}
            <div
              className="relative flex items-center justify-center group"
              style={{
                width: '40px',
                height: '40px',
                background: `linear-gradient(135deg, ${color}, ${color}dd)`,
                borderRadius: '50%',
                border: '2px solid white',
                boxShadow: '0 4px 12px rgba(0,0,0,0.25), 0 2px 6px rgba(0,0,0,0.1)'
              }}
            >
              {/* Order number */}
              <div
                className="text-white font-bold text-xs"
              >
                {routeNumber}
              </div>
              
              {/* Directional arrow */}
              <div
                className={`absolute w-0 h-0 ${
                  direction === 'right' ? 'right-[-6px] top-1/2 -translate-y-1/2 border-l-[8px] border-t-[6px] border-b-[6px] border-transparent' :
                  direction === 'left' ? 'left-[-6px] top-1/2 -translate-y-1/2 border-r-[8px] border-t-[6px] border-b-[6px] border-transparent' :
                  direction === 'bottom' ? 'bottom-[-6px] left-1/2 -translate-x-1/2 border-t-[8px] border-l-[6px] border-r-[6px] border-transparent' :
                  'top-[-6px] left-1/2 -translate-x-1/2 border-b-[8px] border-l-[6px] border-r-[6px] border-transparent'
                }`}
                style={{
                  borderColor: direction === 'right' ? `transparent transparent transparent ${color}` :
                              direction === 'left' ? `transparent ${color} transparent transparent` :
                              direction === 'bottom' ? `${color} transparent transparent transparent` :
                              `transparent transparent ${color} transparent`
                }}
              />
            </div>
            
            {/* Enhanced tooltip */}
            <div className={`absolute ${
              direction === 'top' ? 'top-full mt-2' : 'bottom-full mb-2'
            } left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-gray-900 text-white text-xs rounded-lg px-3 py-2 whitespace-nowrap pointer-events-none shadow-lg`}>
              <div className="font-semibold">Stop {routeNumber}: {order.customerName}</div>
              <div className="text-gray-300">${order.totalAmount.toFixed(2)}</div>
              <div className={`absolute ${
                direction === 'top' ? 'bottom-full' : 'top-full'
              } left-1/2 transform -translate-x-1/2 w-0 h-0 ${
                direction === 'top' ? 'border-l-2 border-r-2 border-b-2 border-transparent border-b-gray-900' :
                'border-l-2 border-r-2 border-t-2 border-transparent border-t-gray-900'
              }`}></div>
            </div>
          </div>
        );
      })}
      <div ref={mapContainer} className="w-full h-full rounded-lg" />
    </div>
  );
};