import React, { useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { formatDistanceToNow } from 'date-fns';
import { Order } from '../types/orders';

// Set Mapbox access token
const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN || '';
mapboxgl.accessToken = MAPBOX_TOKEN;

// Custom delivery area polygon for Middletown Valley
// Bounded by Route 40 (north), Route 340 (south), and mountain ridges (east/west)
const getDeliveryAreaPolygon = () => {
  return {
    type: 'FeatureCollection',
    features: [{
      type: 'Feature',
      properties: {
        name: 'Middletown Valley Delivery Area'
      },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          // Northern boundary (along Route 40 above Myersville)
          [-77.6200, 39.5100], // Northwest corner
          [-77.4800, 39.5100], // Northeast corner
          
          // Eastern boundary (South Mountain ridge)
          [-77.4600, 39.4800],
          [-77.4400, 39.4500],
          [-77.4200, 39.4200],
          [-77.4100, 39.3900],
          
          // Southern boundary (Route 340 through Jefferson/Burkittsville)
          [-77.4200, 39.3600], // Southeast corner
          [-77.6000, 39.3600], // Southwest corner
          
          // Western boundary (mountain ridge)
          [-77.6100, 39.3900],
          [-77.6150, 39.4200],
          [-77.6200, 39.4500],
          [-77.6200, 39.4800],
          
          // Close the polygon
          [-77.6200, 39.5100]
        ]]
      }
    }]
  };
};

interface MapboxMapProps {
  orders: Order[];
  selectedOrder: Order | null;
  onOrderSelect: (order: Order | null) => void;
  businessLocation: {
    name: string;
    address: string;
    lat: number;
    lng: number;
  };
}

const MapboxMap: React.FC<MapboxMapProps> = ({ orders, selectedOrder, onOrderSelect, businessLocation }) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markers = useRef<mapboxgl.Marker[]>([]);

  useEffect(() => {
    initializeMap();
    return () => {
      markers.current.forEach(marker => marker.remove());
      markers.current = [];
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (map.current) {
      updateMarkers();
    }
  }, [orders, selectedOrder]);

  const initializeMap = async () => {
    if (!MAPBOX_TOKEN || !mapContainer.current) return;

    if (map.current) {
      map.current.remove();
      map.current = null;
    }

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [businessLocation.lng, businessLocation.lat],
      zoom: 12,
      accessToken: MAPBOX_TOKEN,
      attributionControl: false,
      logoPosition: 'bottom-right'
    });

    map.current.on('load', () => {
      loadDeliveryArea();
      updateMarkers();
    });
  };

  const loadDeliveryArea = () => {
    if (!map.current) return;

    // Remove existing layers and source
    const layerIds = ['delivery-area-label', 'delivery-area-border', 'delivery-area-fill'];
    layerIds.forEach(layerId => {
      if (map.current!.getLayer(layerId)) {
        map.current!.removeLayer(layerId);
      }
    });

    if (map.current.getSource('delivery-area')) {
      map.current.removeSource('delivery-area');
    }

    const deliveryData = getDeliveryAreaPolygon();

    // Add source
    map.current.addSource('delivery-area', {
      type: 'geojson',
      data: deliveryData
    });

    // Add fill layer
    map.current.addLayer({
      id: 'delivery-area-fill',
      type: 'fill',
      source: 'delivery-area',
      paint: {
        'fill-color': '#3b82f6',
        'fill-opacity': 0.15
      }
    });

    // Add border layer
    map.current.addLayer({
      id: 'delivery-area-border',
      type: 'line',
      source: 'delivery-area',
      paint: {
        'line-color': '#2563eb',
        'line-width': 2,
        'line-opacity': 0.6
      }
    });

    // Add label
    map.current.addLayer({
      id: 'delivery-area-label',
      type: 'symbol',
      source: 'delivery-area',
      layout: {
        'text-field': 'Delivery Area',
        'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'],
        'text-size': 16,
        'text-anchor': 'center'
      },
      paint: {
        'text-color': '#1e40af',
        'text-halo-color': '#ffffff',
        'text-halo-width': 2
      }
    });
  };

  const updateMarkers = () => {
    if (!map.current) return;

    // Clear existing markers
    markers.current.forEach(marker => marker.remove());
    markers.current = [];

    // Restaurant marker
    const restaurantEl = document.createElement('div');
    restaurantEl.innerHTML = '🏪';
    restaurantEl.style.cssText = `
      font-size: 24px;
      cursor: pointer;
      user-select: none;
      filter: drop-shadow(2px 2px 4px rgba(0,0,0,0.3));
    `;

    const restaurantMarker = new mapboxgl.Marker({ element: restaurantEl })
      .setLngLat([businessLocation.lng, businessLocation.lat])
      .setPopup(new mapboxgl.Popup({ offset: 25 }).setHTML(`
        <div style="padding: 10px;">
          <h3 style="margin: 0 0 6px 0; font-weight: bold;">${businessLocation.name}</h3>
          <p style="margin: 0; color: #666; font-size: 13px;">${businessLocation.address}</p>
        </div>
      `))
      .addTo(map.current);

    markers.current.push(restaurantMarker);

    // Order markers
    orders.forEach((order, index) => {
      const isSelected = selectedOrder?.id === order.id;
      
      const orderEl = document.createElement('div');
      orderEl.style.cssText = `
        width: 28px;
        height: 28px;
        background: ${isSelected ? '#f59e0b' : '#3b82f6'};
        color: white;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: bold;
        font-size: 12px;
        cursor: pointer;
        border: 2px solid white;
        box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        user-select: none;
        transition: all 0.2s ease;
      `;
      orderEl.textContent = (index + 1).toString();
      
      orderEl.addEventListener('click', (e) => {
        e.stopPropagation();
        onOrderSelect(order);
      });

      orderEl.addEventListener('mouseenter', () => {
        orderEl.style.transform = 'scale(1.1)';
      });

      orderEl.addEventListener('mouseleave', () => {
        orderEl.style.transform = 'scale(1)';
      });

      const orderMarker = new mapboxgl.Marker({ element: orderEl })
        .setLngLat([order.deliveryLocation.lng, order.deliveryLocation.lat])
        .setPopup(new mapboxgl.Popup({ offset: 25 }).setHTML(`
          <div style="padding: 10px; min-width: 200px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
              <h3 style="margin: 0; font-weight: bold;">${order.customerName}</h3>
              <span style="background: #3b82f6; color: white; padding: 2px 6px; border-radius: 10px; font-size: 11px; font-weight: bold;">
                #${index + 1}
              </span>
            </div>
            <div style="margin-bottom: 6px; font-size: 13px; line-height: 1.3;">
              📍 ${order.deliveryAddress}
            </div>
            <div style="color: #666; font-size: 11px;">
              🕒 ${formatDistanceToNow(new Date(order.createdAt), { addSuffix: true })}
            </div>
          </div>
        `))
        .addTo(map.current);

      markers.current.push(orderMarker);
    });
  };

  if (!MAPBOX_TOKEN) {
    return (
      <div className="w-full h-full bg-gray-100 flex items-center justify-center">
        <div className="text-center p-6">
          <div className="text-gray-600 mb-2">Map not available</div>
          <div className="text-gray-500 text-sm">Mapbox token required</div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full">
      <div 
        ref={mapContainer} 
        className="w-full h-full"
        style={{ minHeight: '400px' }}
      />
    </div>
  );
};

export default MapboxMap;