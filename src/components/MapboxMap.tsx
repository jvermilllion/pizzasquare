import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Order } from '../types/orders';
import { restaurantLocation } from '../data/realData';
import { AlertTriangle, CheckCircle, XCircle, Clock, RefreshCw } from 'lucide-react';

// Set Mapbox access token
const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN || '';
mapboxgl.accessToken = MAPBOX_TOKEN;

interface MapboxMapProps {
  orders: Order[];
  selectedOrder: Order | null;
  onOrderSelect: (order: Order | null) => void;
}

export const MapboxMap: React.FC<MapboxMapProps> = ({ orders, selectedOrder, onOrderSelect }) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [diagnostics, setDiagnostics] = useState<string[]>([]);
  const [currentStep, setCurrentStep] = useState<string>('Starting diagnostics...');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<boolean>(false);

  const addLog = (message: string) => {
    console.log(`[MapboxMap] ${message}`);
    setDiagnostics(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
    setCurrentStep(message);
  };

  const addError = (message: string, details?: any) => {
    console.error(`[MapboxMap] ${message}`, details);
    setDiagnostics(prev => [...prev, `❌ ${new Date().toLocaleTimeString()}: ${message}`]);
    setCurrentStep(message);
    setError(message);
  };

  useEffect(() => {
    initializeMap();
    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, []);

  const initializeMap = async () => {
    try {
      setDiagnostics([]);
      setError(null);
      setSuccess(false);

      // Step 1: Check token
      addLog('Step 1: Checking Mapbox token...');
      if (!MAPBOX_TOKEN) {
        addError('No VITE_MAPBOX_TOKEN found in environment variables');
        return;
      }
      
      if (!MAPBOX_TOKEN.startsWith('pk.')) {
        addError('Invalid token format - should start with pk.');
        return;
      }
      
      addLog(`Token found: ${MAPBOX_TOKEN.substring(0, 20)}...`);

      // Step 2: Test token validity
      addLog('Step 2: Testing token with Mapbox API...');
      try {
        const response = await fetch(`https://api.mapbox.com/tokens/v2?access_token=${MAPBOX_TOKEN}`);
        if (!response.ok) {
          addError(`Token validation failed: HTTP ${response.status} - ${response.statusText}`);
          if (response.status === 401) {
            addError('Token is invalid or expired. Generate a new one at https://account.mapbox.com/access-tokens/');
          }
          return;
        }
        const tokenInfo = await response.json();
        addLog(`Token is valid. Scopes: ${tokenInfo.scopes?.join(', ') || 'None specified'}`);
      } catch (fetchError) {
        addError('Network error testing token - continuing anyway', fetchError);
      }

      // Step 3: Check container
      addLog('Step 3: Checking map container...');
      if (!mapContainer.current) {
        addError('Map container element not found');
        return;
      }
      
      const rect = mapContainer.current.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) {
        addError(`Container has no dimensions: ${rect.width}x${rect.height}`);
        return;
      }
      
      addLog(`Container ready: ${rect.width}x${rect.height}px`);

      // Step 4: Remove existing map
      if (map.current) {
        addLog('Step 4: Cleaning up existing map...');
        map.current.remove();
        map.current = null;
      }

      // Step 5: Create map with minimal config
      addLog('Step 5: Creating map instance...');
      
      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: 'mapbox://styles/mapbox/streets-v11', // Using older, more stable style
        center: [restaurantLocation.lng, restaurantLocation.lat],
        zoom: 12,
        accessToken: MAPBOX_TOKEN
      });

      addLog('Map instance created');

      // Step 6: Wait for map to load
      addLog('Step 6: Waiting for map to load...');
      
      map.current.on('load', () => {
        addLog('✅ Map loaded successfully!');
        setSuccess(true);
        addMarkersToMap();
      });

      map.current.on('error', (e) => {
        const errorMsg = e.error?.message || e.message || 'Unknown map error';
        addError(`Map error: ${errorMsg}`, e);
        
        // Try even simpler style
        if (map.current && !errorMsg.includes('streets-v9')) {
          addLog('Trying fallback style: streets-v9...');
          setTimeout(() => {
            if (map.current) {
              map.current.setStyle('mapbox://styles/mapbox/streets-v9');
            }
          }, 1000);
        }
      });

      // Timeout after 10 seconds
      setTimeout(() => {
        if (!success && !error) {
          addError('Map loading timed out after 10 seconds');
        }
      }, 10000);

    } catch (initError) {
      addError('Failed to initialize map', initError);
    }
  };

  const addMarkersToMap = () => {
    if (!map.current) return;

    addLog('Adding markers to map...');

    try {
      // Restaurant marker
      const restaurantEl = document.createElement('div');
      restaurantEl.innerHTML = '🍕';
      restaurantEl.style.fontSize = '24px';
      restaurantEl.style.cursor = 'pointer';

      new mapboxgl.Marker({ element: restaurantEl })
        .setLngLat([restaurantLocation.lng, restaurantLocation.lat])
        .setPopup(new mapboxgl.Popup({ offset: 25 }).setHTML(`
          <div style="padding: 8px;">
            <strong>${restaurantLocation.name}</strong><br>
            ${restaurantLocation.address}
          </div>
        `))
        .addTo(map.current);

      // Order markers
      orders.forEach((order, index) => {
        const orderEl = document.createElement('div');
        orderEl.style.cssText = `
          background: #3b82f6;
          border: 2px solid white;
          border-radius: 50%;
          width: 20px;
          height: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 10px;
          color: white;
          font-weight: bold;
          cursor: pointer;
          box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        `;
        orderEl.textContent = (index + 1).toString();

        orderEl.addEventListener('click', () => onOrderSelect(order));

        new mapboxgl.Marker({ element: orderEl })
          .setLngLat([order.deliveryLocation.lng, order.deliveryLocation.lat])
          .setPopup(new mapboxgl.Popup({ offset: 15 }).setHTML(`
            <div style="padding: 8px;">
              <strong>${order.customerName}</strong><br>
              $${order.totalAmount.toFixed(2)}<br>
              <small>${order.deliveryAddress}</small>
            </div>
          `))
          .addTo(map.current!);
      });

      addLog(`Added ${orders.length + 1} markers to map`);
    } catch (markerError) {
      addError('Failed to add markers', markerError);
    }
  };

  const retryMap = () => {
    initializeMap();
  };

  return (
    <div className="relative w-full h-full">
      {/* Diagnostics Panel */}
      <div className="absolute top-4 left-4 z-20 bg-white rounded-lg shadow-lg p-4 max-w-md max-h-96 overflow-y-auto">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center">
            {success ? (
              <CheckCircle className="w-5 h-5 text-green-500 mr-2" />
            ) : error ? (
              <XCircle className="w-5 h-5 text-red-500 mr-2" />
            ) : (
              <Clock className="w-5 h-5 text-yellow-500 mr-2 animate-spin" />
            )}
            <h3 className="font-bold text-gray-900">Map Diagnostics</h3>
          </div>
          <button
            onClick={retryMap}
            className="p-1 text-gray-500 hover:text-gray-700"
            title="Retry map loading"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        <div className="mb-3">
          <div className="text-sm font-medium text-gray-900 mb-1">Current Status:</div>
          <div className={`text-sm ${success ? 'text-green-600' : error ? 'text-red-600' : 'text-yellow-600'}`}>
            {currentStep}
          </div>
        </div>

        <div className="space-y-1">
          <div className="text-xs font-medium text-gray-700 mb-2">Debug Log:</div>
          {diagnostics.slice(-8).map((log, index) => (
            <div key={index} className="text-xs text-gray-600 font-mono bg-gray-50 p-1 rounded">
              {log}
            </div>
          ))}
        </div>

        {error && (
          <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded text-xs">
            <strong className="text-red-800">Error Details:</strong>
            <div className="text-red-700 mt-1">{error}</div>
          </div>
        )}

        {success && (
          <div className="mt-3 p-2 bg-green-50 border border-green-200 rounded text-xs">
            <strong className="text-green-800">Success!</strong>
            <div className="text-green-700 mt-1">
              Map loaded with {orders.length} delivery locations
            </div>
          </div>
        )}
      </div>

      {/* Map Container */}
      <div 
        ref={mapContainer} 
        className="w-full h-full bg-gray-100"
        style={{ minHeight: '400px' }}
      />

      {/* Loading overlay */}
      {!success && !error && (
        <div className="absolute inset-0 bg-gray-100 flex items-center justify-center">
          <div className="text-center">
            <Clock className="w-8 h-8 text-blue-500 animate-spin mx-auto mb-2" />
            <div className="text-gray-600 font-medium">Loading map...</div>
            <div className="text-gray-500 text-sm mt-1">{currentStep}</div>
          </div>
        </div>
      )}
    </div>
  );
};