import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Order } from '../types/orders';
import { restaurantLocation } from '../data/realData';
import { AlertTriangle, CheckCircle, XCircle, Clock } from 'lucide-react';

// Set Mapbox access token
mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN || '';

interface MapboxMapProps {
  orders: Order[];
  selectedOrder: Order | null;
  onOrderSelect: (order: Order | null) => void;
}

interface DiagnosticCheck {
  name: string;
  status: 'pending' | 'success' | 'error';
  message: string;
  details?: string;
}

export const MapboxMap: React.FC<MapboxMapProps> = ({ orders, selectedOrder, onOrderSelect }) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [diagnostics, setDiagnostics] = useState<DiagnosticCheck[]>([]);
  const [mapReady, setMapReady] = useState(false);

  // Initialize diagnostics
  useEffect(() => {
    const checks: DiagnosticCheck[] = [
      { name: 'Environment Variable', status: 'pending', message: 'Checking VITE_MAPBOX_TOKEN...' },
      { name: 'Token Format', status: 'pending', message: 'Validating token format...' },
      { name: 'Container Element', status: 'pending', message: 'Checking DOM container...' },
      { name: 'Mapbox GL JS', status: 'pending', message: 'Testing Mapbox library...' },
      { name: 'Map Initialization', status: 'pending', message: 'Creating map instance...' },
      { name: 'Style Loading', status: 'pending', message: 'Loading map style...' }
    ];
    
    setDiagnostics(checks);
    runDiagnostics(checks);
  }, []);

  const updateDiagnostic = (name: string, status: 'success' | 'error', message: string, details?: string) => {
    setDiagnostics(prev => prev.map(check => 
      check.name === name ? { ...check, status, message, details } : check
    ));
  };

  const runDiagnostics = async (checks: DiagnosticCheck[]) => {
    // Check 1: Environment Variable
    const token = import.meta.env.VITE_MAPBOX_TOKEN;
    if (!token || token.trim() === '') {
      updateDiagnostic('Environment Variable', 'error', 'Missing VITE_MAPBOX_TOKEN', 
        'Add VITE_MAPBOX_TOKEN to your .env file');
      return;
    }
    updateDiagnostic('Environment Variable', 'success', `Token found: ${token.substring(0, 20)}...`);

    // Check 2: Token Format
    if (!token.startsWith('pk.')) {
      updateDiagnostic('Token Format', 'error', 'Invalid token format', 
        'Mapbox tokens should start with "pk."');
      return;
    }
    updateDiagnostic('Token Format', 'success', 'Token format is valid');

    // Check 3: Container Element
    await new Promise(resolve => setTimeout(resolve, 100)); // Wait for DOM
    if (!mapContainer.current) {
      updateDiagnostic('Container Element', 'error', 'Map container not found', 
        'DOM element is not available');
      return;
    }
    const rect = mapContainer.current.getBoundingClientRect();
    updateDiagnostic('Container Element', 'success', 
      `Container ready (${rect.width}x${rect.height}px)`);

    // Check 4: Mapbox GL JS
    try {
      updateDiagnostic('Mapbox GL JS', 'success', `Mapbox GL JS v${mapboxgl.version} loaded`);
    } catch (error) {
      updateDiagnostic('Mapbox GL JS', 'error', 'Mapbox GL JS not available', 
        error instanceof Error ? error.message : 'Unknown error');
      return;
    }

    // Check 5: Map Initialization
    try {
      if (map.current) {
        map.current.remove();
      }

      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: 'mapbox://styles/mapbox/navigation-day-v1',
        center: [restaurantLocation.lng, restaurantLocation.lat],
        zoom: 11.5
      });

      updateDiagnostic('Map Initialization', 'success', 'Map instance created');

      // Check 6: Style Loading
      map.current.on('load', () => {
        updateDiagnostic('Style Loading', 'success', 'Map style loaded successfully');
        setMapReady(true);
        
        // Add basic markers once map is ready
        addMarkers();
      });

      map.current.on('error', (e) => {
        console.error('Mapbox error:', e);
        const errorMsg = e.error?.message || 'Unknown map error';
        updateDiagnostic('Style Loading', 'error', 'Failed to load map style', errorMsg);
      });

    } catch (error) {
      updateDiagnostic('Map Initialization', 'error', 'Failed to create map', 
        error instanceof Error ? error.message : 'Unknown error');
    }
  };

  const addMarkers = () => {
    if (!map.current || !mapReady) return;

    // Add restaurant marker
    const restaurantEl = document.createElement('div');
    restaurantEl.innerHTML = '🍕';
    restaurantEl.style.fontSize = '32px';
    restaurantEl.style.cursor = 'pointer';

    new mapboxgl.Marker({ element: restaurantEl })
      .setLngLat([restaurantLocation.lng, restaurantLocation.lat])
      .setPopup(new mapboxgl.Popup({ offset: 30 }).setHTML(`
        <div style="padding: 8px;">
          <h3 style="margin: 0 0 4px 0; font-size: 14px;">🍕 ${restaurantLocation.name}</h3>
          <p style="margin: 0; font-size: 12px; color: #666;">${restaurantLocation.address}</p>
        </div>
      `))
      .addTo(map.current);

    // Add order markers
    orders.forEach((order, index) => {
      const orderEl = document.createElement('div');
      orderEl.style.cssText = `
        background: #3b82f6;
        border: 2px solid white;
        border-radius: 50%;
        width: 24px;
        height: 24px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: bold;
        font-size: 10px;
        color: white;
        box-shadow: 0 2px 8px rgba(0,0,0,0.2);
        cursor: pointer;
      `;
      orderEl.textContent = (index + 1).toString();

      orderEl.addEventListener('click', () => onOrderSelect(order));

      new mapboxgl.Marker({ element: orderEl })
        .setLngLat([order.deliveryLocation.lng, order.deliveryLocation.lat])
        .setPopup(new mapboxgl.Popup({ offset: 25 }).setHTML(`
          <div style="padding: 8px; max-width: 200px;">
            <div style="font-weight: bold; margin-bottom: 4px;">${order.customerName}</div>
            <div style="color: #10b981; font-weight: bold; margin-bottom: 4px;">$${order.totalAmount.toFixed(2)}</div>
            <div style="font-size: 11px; color: #666;">${order.deliveryAddress}</div>
          </div>
        `))
        .addTo(map.current!);
    });
  };

  // Cleanup
  useEffect(() => {
    return () => {
      if (map.current) {
        map.current.remove();
      }
    };
  }, []);

  const getStatusIcon = (status: DiagnosticCheck['status']) => {
    switch (status) {
      case 'success': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'error': return <XCircle className="w-4 h-4 text-red-500" />;
      case 'pending': return <Clock className="w-4 h-4 text-yellow-500 animate-spin" />;
    }
  };

  const allChecksComplete = diagnostics.every(check => check.status !== 'pending');
  const hasErrors = diagnostics.some(check => check.status === 'error');

  return (
    <div className="relative w-full h-full">
      {/* Diagnostics Panel */}
      {(!allChecksComplete || hasErrors) && (
        <div className="absolute top-4 left-4 z-20 bg-white rounded-lg shadow-lg p-4 max-w-md">
          <div className="flex items-center mb-3">
            <AlertTriangle className="w-5 h-5 text-yellow-500 mr-2" />
            <h3 className="font-bold text-gray-900">Map Diagnostics</h3>
          </div>
          
          <div className="space-y-2">
            {diagnostics.map((check) => (
              <div key={check.name} className="flex items-start space-x-2">
                {getStatusIcon(check.status)}
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-900">{check.name}</div>
                  <div className="text-xs text-gray-600">{check.message}</div>
                  {check.details && (
                    <div className="text-xs text-red-600 mt-1">{check.details}</div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {hasErrors && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded text-xs">
              <strong className="text-red-800">Fix the errors above to load the map.</strong>
            </div>
          )}
        </div>
      )}

      {/* Map Container */}
      <div 
        ref={mapContainer} 
        className="w-full h-full"
        style={{ minHeight: '500px' }}
      />
    </div>
  );
};