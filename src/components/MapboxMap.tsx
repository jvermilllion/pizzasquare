import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Order } from '../types/orders';
import { AlertTriangle, CheckCircle, XCircle, RefreshCw } from 'lucide-react';

// Set Mapbox access token
const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN || '';
mapboxgl.accessToken = MAPBOX_TOKEN;

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
  const [diagnostics, setDiagnostics] = useState<string[]>([]);
  const [currentStep, setCurrentStep] = useState<string>('Starting diagnostics...');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<boolean>(false);
  const [retryCount, setRetryCount] = useState<number>(0);
  const [showDiagnostics, setShowDiagnostics] = useState<boolean>(false);
  const maxRetries = 3;

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
      // Clean up markers
      markers.current.forEach(marker => marker.remove());
      markers.current = [];
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (map.current && success) {
      updateMarkers();
    }
  }, [orders, selectedOrder, success]);

  const initializeMap = async () => {
    try {
      setDiagnostics([]);
      setError(null);
      setSuccess(false);

      // Step 1: Check token
      addLog(`Step 1: Checking Mapbox token... (Attempt ${retryCount + 1}/${maxRetries + 1})`);
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
      
      // Try the most basic style first
      const styles = [
        'mapbox://styles/mapbox/streets-v12',
        'mapbox://styles/mapbox/streets-v11', 
        'mapbox://styles/mapbox/streets-v9',
        'mapbox://styles/mapbox/basic-v9'
      ];
      
      const currentStyle = styles[Math.min(retryCount, styles.length - 1)];
      addLog(`Using style: ${currentStyle}`);

      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: currentStyle,
        center: [businessLocation.lng, businessLocation.lat],
        zoom: 12,
        accessToken: MAPBOX_TOKEN,
        attributionControl: false,
        logoPosition: 'bottom-right'
      });

      addLog('Map instance created');

      // Step 6: Wait for map to load
      addLog('Step 6: Waiting for map to load...');
      
      let loadTimeout: NodeJS.Timeout;
      let loadEventFired = false;
      
      map.current.on('load', () => {
        loadEventFired = true;
        clearTimeout(loadTimeout);
        addLog('✅ Map loaded successfully!');
        setSuccess(true);
        setRetryCount(0); // Reset retry count on success
        updateMarkers();
      });

      map.current.on('error', (e) => {
        loadEventFired = true;
        clearTimeout(loadTimeout);
        const errorMsg = e.error?.message || e.message || 'Unknown map error';
        addError(`Map error: ${errorMsg}`, e);
        
        // Retry with different style if we haven't exceeded max retries
        if (retryCount < maxRetries) {
          addLog(`Retrying with different style in 2 seconds...`);
          setTimeout(() => {
            setRetryCount(prev => prev + 1);
            initializeMap();
          }, 2000);
        }
      });

      // More aggressive timeout with retry logic
      loadTimeout = setTimeout(() => {
        if (!loadEventFired && !success && !error) {
          if (retryCount < maxRetries) {
            addLog(`Loading timeout, retrying... (${retryCount + 1}/${maxRetries})`);
            if (map.current) {
              map.current.remove();
              map.current = null;
            }
            setRetryCount(prev => prev + 1);
            setTimeout(() => initializeMap(), 1000);
          } else {
            addError(`Map loading failed after ${maxRetries + 1} attempts`);
          }
        }
      }, 8000); // Reduced timeout for faster retries

    } catch (initError) {
      addError('Failed to initialize map', initError);
      
      // Retry on initialization error
      if (retryCount < maxRetries) {
        addLog(`Initialization error, retrying in 2 seconds...`);
        setTimeout(() => {
          setRetryCount(prev => prev + 1);
          initializeMap();
        }, 2000);
      }
    }
  };

  const updateMarkers = () => {
    if (!map.current) return;

    addLog('Updating markers on map...');

    try {
      // Clear existing markers
      markers.current.forEach(marker => marker.remove());
      markers.current = [];

      // Restaurant marker
      const restaurantEl = document.createElement('div');
      restaurantEl.innerHTML = '🏪';
      restaurantEl.style.cssText = `
        font-size: 28px;
        cursor: pointer;
        user-select: none;
        filter: drop-shadow(2px 2px 4px rgba(0,0,0,0.3));
        transition: transform 0.2s;
      `;
      restaurantEl.addEventListener('mouseenter', () => {
        restaurantEl.style.transform = 'scale(1.1)';
      });
      restaurantEl.addEventListener('mouseleave', () => {
        restaurantEl.style.transform = 'scale(1)';
      });

      const restaurantMarker = new mapboxgl.Marker({ element: restaurantEl })
        .setLngLat([businessLocation.lng, businessLocation.lat])
        .setPopup(new mapboxgl.Popup({ offset: 25 }).setHTML(`
          <div style="padding: 12px; min-width: 200px;">
            <h3 style="margin: 0 0 8px 0; color: #1f2937; font-weight: bold;">${businessLocation.name}</h3>
            <p style="margin: 0; color: #6b7280; font-size: 14px;">${businessLocation.address}</p>
          </div>
        `))
        .addTo(map.current);

      markers.current.push(restaurantMarker);

      // Order markers
      orders.forEach((order, index) => {
        const isSelected = selectedOrder?.id === order.id;
        
        const orderEl = document.createElement('div');
        orderEl.style.cssText = `
          width: 32px;
          height: 32px;
          background: ${isSelected ? '#f59e0b' : '#3b82f6'};
          color: white;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: bold;
          font-size: 14px;
          cursor: pointer;
          border: 2px solid white;
          box-shadow: 0 2px 6px rgba(0,0,0,0.3);
          transition: all 0.2s;
          user-select: none;
        `;
        orderEl.textContent = (index + 1).toString();
        
        // Hover effects
        orderEl.addEventListener('mouseenter', () => {
          orderEl.style.transform = 'scale(1.1)';
          orderEl.style.zIndex = '1000';
        });
        orderEl.addEventListener('mouseleave', () => {
          orderEl.style.transform = 'scale(1)';
          orderEl.style.zIndex = '1';
        });

        // Click handler
        orderEl.addEventListener('click', (e) => {
          e.stopPropagation();
          onOrderSelect(order);
        });

        const orderMarker = new mapboxgl.Marker({ element: orderEl })
          .setLngLat([order.deliveryLocation.lng, order.deliveryLocation.lat])
          .setPopup(new mapboxgl.Popup({ offset: 25 }).setHTML(`
            <div style="padding: 12px; min-width: 250px;">
              <div style="display: flex; justify-content: between; align-items: center; margin-bottom: 8px;">
                <h3 style="margin: 0; color: #1f2937; font-weight: bold;">${order.customerName}</h3>
                <span style="background: #3b82f6; color: white; padding: 2px 8px; border-radius: 12px; font-size: 12px; font-weight: bold;">
                  #${index + 1}
                </span>
              </div>
              <div style="margin-bottom: 8px;">
                <strong style="color: #059669;">$${order.totalAmount.toFixed(2)}</strong>
                <span style="color: #6b7280; margin-left: 8px;">${order.items.length} item${order.items.length > 1 ? 's' : ''}</span>
              </div>
              <div style="margin-bottom: 8px; color: #374151; font-size: 14px;">
                📍 ${order.deliveryAddress}
              </div>
              <div style="color: #6b7280; font-size: 12px;">
                📞 ${order.customerPhone}
              </div>
              ${order.specialInstructions ? `
                <div style="margin-top: 8px; padding: 6px; background: #fef3c7; border-radius: 4px; font-size: 12px;">
                  <strong>Note:</strong> ${order.specialInstructions}
                </div>
              ` : ''}
            </div>
          `))
          .addTo(map.current);

        markers.current.push(orderMarker);
      });

      addLog(`Added ${markers.current.length} markers to map`);

    } catch (markerError) {
      addError('Failed to update markers', markerError);
    }
  };

  const retryMap = () => {
    setRetryCount(0);
    initializeMap();
  };

  return (
    <div className="relative w-full h-full">
      {/* Status Indicator Bar */}
      <div className="absolute top-4 left-4 right-4 z-20 flex items-center justify-between">
        <div className="bg-white rounded-lg shadow-lg p-3 flex items-center space-x-3">
          {success ? (
            <>
              <CheckCircle className="w-5 h-5 text-green-500" />
              <span className="text-sm font-medium text-green-700">Map loaded successfully</span>
              <span className="text-xs text-gray-500">({orders.length} orders)</span>
            </>
          ) : error ? (
            <>
              <XCircle className="w-5 h-5 text-red-500" />
              <span className="text-sm font-medium text-red-700">Map failed to load</span>
              <button
                onClick={retryMap}
                className="ml-2 px-3 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700 flex items-center"
              >
                <RefreshCw className="w-3 h-3 mr-1" />
                Retry
              </button>
            </>
          ) : (
            <>
              <RefreshCw className="w-5 h-5 text-blue-500 animate-spin" />
              <span className="text-sm font-medium text-blue-700">Loading map...</span>
              <span className="text-xs text-gray-500">({retryCount + 1}/{maxRetries + 1})</span>
            </>
          )}
        </div>
        
        {/* Toggle Diagnostics */}
        <button
          onClick={() => setShowDiagnostics(!showDiagnostics)}
          className="bg-white rounded-lg shadow-lg p-2 text-gray-600 hover:text-gray-800"
          title="Toggle diagnostics"
        >
          <AlertTriangle className="w-5 h-5" />
        </button>
      </div>

      {/* Detailed Diagnostics Panel */}
      {showDiagnostics && (
        <div className="absolute top-20 left-4 z-20 bg-white rounded-lg shadow-lg p-4 max-w-md max-h-96 overflow-y-auto">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-gray-900">Detailed Diagnostics</h3>
            <button
              onClick={() => setShowDiagnostics(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              ✕
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
      )}

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
            <RefreshCw className="w-12 h-12 text-blue-500 animate-spin mx-auto mb-4" />
            <div className="text-gray-600 font-medium">Loading map...</div>
            <div className="text-gray-500 text-sm mt-1">{currentStep}</div>
            <div className="text-xs text-gray-400 mt-2">Attempt {retryCount + 1} of {maxRetries + 1}</div>
          </div>
        </div>
      )}

      {/* Error overlay with retry */}
      {error && (
        <div className="absolute inset-0 bg-gray-100 flex items-center justify-center">
          <div className="text-center max-w-md p-6">
            <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <div className="text-gray-800 font-medium mb-2">Map failed to load</div>
            <div className="text-gray-600 text-sm mb-4">{error}</div>
            <button
              onClick={retryMap}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center mx-auto"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Try Again
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default MapboxMap;