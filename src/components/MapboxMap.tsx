import React, { useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { formatDistanceToNow } from 'date-fns';
import { Order } from '../types/orders';

// Set Mapbox access token
const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN || '';
mapboxgl.accessToken = MAPBOX_TOKEN;

// Function to fetch Middletown Valley boundaries
const fetchValleyBoundaries = async () => {
  try {
    const towns = ['Middletown, MD', 'Myersville, MD', 'Jefferson, MD'];
    
    const townBoundaries = await Promise.all(
      towns.map(async (town) => {
        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/search?format=geojson&addressdetails=1&limit=1&polygon_geojson=1&q=${encodeURIComponent(town)}&countrycodes=us`
          );
          
          if (!response.ok) return null;
          const data = await response.json();
          return data.features && data.features.length > 0 ? data.features[0] : null;
        } catch {
          return null;
        }
      })
    );
    
    const validFeatures = townBoundaries.filter(feature => feature !== null);
    
    return validFeatures.length > 0 ? {
      type: 'FeatureCollection',
      features: validFeatures
    } : null;
  } catch {
    return null;
  }
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
      loadValleyBoundaries();
      updateMarkers();
    });
  };

  const loadValleyBoundaries = async () => {
    if (!map.current) return;

    try {
      const valleyData = await fetchValleyBoundaries();
      if (!valleyData) return;

      // Remove existing layers and source
      const layerIds = ['valley-boundaries-labels', 'valley-boundaries-border', 'valley-boundaries-fill'];
      layerIds.forEach(layerId => {
        if (map.current!.getLayer(layerId)) {
          map.current!.removeLayer(layerId);
        }
      });

      if (map.current.getSource('valley-boundaries')) {
        map.current.removeSource('valley-boundaries');
      }

      // Add source
      map.current.addSource('valley-boundaries', {
        type: 'geojson',
        data: valleyData
      });

      // Add fill layer
      map.current.addLayer({
        id: 'valley-boundaries-fill',
        type: 'fill',
        source: 'valley-boundaries',
        paint: {
          'fill-color': [
            'case',
            ['in', 'Middletown', ['get', 'display_name']], '#ef4444',
            ['in', 'Myersville', ['get', 'display_name']], '#eab308',
            ['in', 'Jefferson', ['get', 'display_name']], '#3b82f6',
            '#6b7280'
          ],
          'fill-opacity': 0.2
        }
      });

      // Add border layer
      map.current.addLayer({
        id: 'valley-boundaries-border',
        type: 'line',
        source: 'valley-boundaries',
        paint: {
          'line-color': [
            'case',
            ['in', 'Middletown', ['get', 'display_name']], '#dc2626',
            ['in', 'Myersville', ['get', 'display_name']], '#ca8a04',
            ['in', 'Jefferson', ['get', 'display_name']], '#2563eb',
            '#4b5563'
          ],
          'line-width': 2,
          'line-opacity': 0.8
        }
      });

      // Add labels
      map.current.addLayer({
        id: 'valley-boundaries-labels',
        type: 'symbol',
        source: 'valley-boundaries',
        layout: {
          'text-field': [
            'case',
            ['in', 'Middletown', ['get', 'display_name']], 'Middletown',
            ['in', 'Myersville', ['get', 'display_name']], 'Myersville',
            ['in', 'Jefferson', ['get', 'display_name']], 'Jefferson',
            ['get', 'name']
          ],
          'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'],
          'text-size': 14,
          'text-anchor': 'center'
        },
        paint: {
          'text-color': '#374151',
          'text-halo-color': '#ffffff',
          'text-halo-width': 2
        }
      });
    } catch {
      // Silently fail boundary loading
    }
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