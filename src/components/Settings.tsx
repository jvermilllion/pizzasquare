import React, { useState } from 'react';
import { Settings as SettingsIcon, Square, RefreshCw, Save, AlertTriangle, CheckCircle, ArrowLeft, MapPin, Database, Clock, Info, Eye, EyeOff } from 'lucide-react';

interface SettingsProps {
  onNavigateBack: () => void;
}

export const Settings: React.FC<SettingsProps> = ({ onNavigateBack }) => {
  const [squareToken, setSquareToken] = useState((import.meta as any).env?.VITE_SQUARE_ACCESS_TOKEN || '');
  const [locationId, setLocationId] = useState((import.meta as any).env?.VITE_SQUARE_LOCATION_ID || '');
  const [environment, setEnvironment] = useState((import.meta as any).env?.VITE_SQUARE_ENVIRONMENT || 'sandbox');
  const [pollingInterval, setPollingInterval] = useState(30);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [mapboxToken, setMapboxToken] = useState((import.meta as any).env?.VITE_MAPBOX_TOKEN || '');
  
  // Business Location Settings
  const [businessName, setBusinessName] = useState(
    localStorage.getItem('businessName') || 'Square Bistro'
  );
  const [businessAddress, setBusinessAddress] = useState(
    localStorage.getItem('businessAddress') || '123 Main Street, Middletown, CT 06457'
  );
  const [businessLat, setBusinessLat] = useState(
    localStorage.getItem('businessLat') || '41.5623'
  );
  const [businessLng, setBusinessLng] = useState(
    localStorage.getItem('businessLng') || '-72.6509'
  );
  
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [showSquareToken, setShowSquareToken] = useState(false);
  const [showMapboxToken, setShowMapboxToken] = useState(false);

  const handleSave = async () => {
    setSaveStatus('saving');
    
    try {
      // Save to localStorage
      localStorage.setItem('businessName', businessName);
      localStorage.setItem('businessAddress', businessAddress);
      localStorage.setItem('businessLat', businessLat);
      localStorage.setItem('businessLng', businessLng);
      
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (error) {
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 2000);
    }
  };

  const isSquareConfigured = squareToken && locationId;
  const isMapboxConfigured = mapboxToken;
  const isBusinessConfigured = businessName && businessAddress && businessLat && businessLng;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <button
                onClick={onNavigateBack}
                className="flex items-center text-gray-600 hover:text-gray-900 transition-colors mr-4"
              >
                <ArrowLeft className="w-5 h-5 mr-2" />
                Back to Dashboard
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
                <p className="text-sm text-gray-600">Configure your delivery dashboard</p>
              </div>
            </div>
            <button
              onClick={handleSave}
              disabled={saveStatus === 'saving'}
              className={`flex items-center px-4 py-2 rounded-lg font-medium transition-colors ${
                saveStatus === 'saving'
                  ? 'bg-gray-100 text-gray-500 cursor-not-allowed'
                  : saveStatus === 'saved'
                  ? 'bg-green-100 text-green-700'
                  : saveStatus === 'error'
                  ? 'bg-red-100 text-red-700'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              {saveStatus === 'saving' ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : saveStatus === 'saved' ? (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Saved!
                </>
              ) : saveStatus === 'error' ? (
                <>
                  <AlertTriangle className="w-4 h-4 mr-2" />
                  Error
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Save Changes
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="space-y-8">
          {/* Square Integration */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Square className="w-6 h-6 text-blue-600 mr-3" />
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">Square POS Integration</h2>
                    <p className="text-sm text-gray-600">Connect to your Square account for live order data</p>
                  </div>
                </div>
                <div className={`flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                  isSquareConfigured 
                    ? 'bg-green-100 text-green-700' 
                    : 'bg-orange-100 text-orange-700'
                }`}>
                  {isSquareConfigured ? (
                    <>
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Connected
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="w-3 h-3 mr-1" />
                      Setup Required
                    </>
                  )}
                </div>
              </div>
            </div>
            
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Access Token
                  </label>
                  <div className="relative">
                    <input
                      type={showSquareToken ? "text" : "password"}
                      value={squareToken}
                      onChange={(e) => setSquareToken(e.target.value)}
                      placeholder="Enter Square access token"
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowSquareToken(!showSquareToken)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                    >
                      {showSquareToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <p className="mt-1 text-xs text-gray-500">
                    Get from your Square Developer Dashboard
                  </p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Location ID
                  </label>
                  <input
                    type="text"
                    value={locationId}
                    onChange={(e) => setLocationId(e.target.value)}
                    placeholder="Enter location ID"
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Found in your Square Dashboard
                  </p>
                </div>
              </div>
              
              <div className="mt-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Environment
                </label>
                <select
                  value={environment}
                  onChange={(e) => setEnvironment(e.target.value)}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="sandbox">Sandbox (Testing)</option>
                  <option value="production">Production (Live)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Mapbox Integration */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <MapPin className="w-6 h-6 text-green-600 mr-3" />
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">Mapbox Integration</h2>
                    <p className="text-sm text-gray-600">Configure maps and routing functionality</p>
                  </div>
                </div>
                <div className={`flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                  isMapboxConfigured 
                    ? 'bg-green-100 text-green-700' 
                    : 'bg-orange-100 text-orange-700'
                }`}>
                  {isMapboxConfigured ? (
                    <>
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Connected
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="w-3 h-3 mr-1" />
                      Setup Required
                    </>
                  )}
                </div>
              </div>
            </div>
            
            <div className="p-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Mapbox Access Token
                </label>
                <div className="relative">
                  <input
                    type={showMapboxToken ? "text" : "password"}
                    value={mapboxToken}
                    onChange={(e) => setMapboxToken(e.target.value)}
                    placeholder="Enter Mapbox access token"
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowMapboxToken(!showMapboxToken)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                  >
                    {showMapboxToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  Get from your Mapbox Account
                </p>
              </div>
            </div>
          </div>

          {/* Business Information */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Database className="w-6 h-6 text-purple-600 mr-3" />
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">Business Information</h2>
                    <p className="text-sm text-gray-600">Your restaurant location and details</p>
                  </div>
                </div>
                <div className={`flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                  isBusinessConfigured 
                    ? 'bg-green-100 text-green-700' 
                    : 'bg-orange-100 text-orange-700'
                }`}>
                  {isBusinessConfigured ? (
                    <>
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Complete
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="w-3 h-3 mr-1" />
                      Incomplete
                    </>
                  )}
                </div>
              </div>
            </div>
            
            <div className="p-6 space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Business Name
                </label>
                <input
                  type="text"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  placeholder="Enter your business name"
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Business Address
                </label>
                <input
                  type="text"
                  value={businessAddress}
                  onChange={(e) => setBusinessAddress(e.target.value)}
                  placeholder="Enter your full business address"
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Used for route calculations and map display
                </p>
              </div>
              
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Latitude
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={businessLat}
                    onChange={(e) => setBusinessLat(e.target.value)}
                    placeholder="41.5623"
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Longitude
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={businessLng}
                    onChange={(e) => setBusinessLng(e.target.value)}
                    placeholder="-72.6509"
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Delivery Area Info */}
              <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                <div className="flex items-start">
                  <Info className="w-5 h-5 mt-0.5 text-blue-600 mr-3 flex-shrink-0" />
                  <div>
                    <h3 className="text-sm font-medium text-blue-900 mb-1">Custom Delivery Area</h3>
                    <p className="text-sm text-blue-700 mb-2">
                      Use the "Edit Area" button on the main dashboard to draw a custom delivery boundary on the map.
                    </p>
                    <div className="text-xs text-blue-600">
                      1. Click "Edit Area" on the dashboard<br/>
                      2. Draw points on the map<br/>
                      3. Double-click to complete<br/>
                      4. Area saves automatically
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Data Refresh Settings */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center">
                <Clock className="w-6 h-6 text-orange-600 mr-3" />
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Data Refresh Settings</h2>
                  <p className="text-sm text-gray-600">Control how often data is synchronized</p>
                </div>
              </div>
            </div>
            
            <div className="p-6 space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-gray-700">
                    Auto Refresh Orders
                  </label>
                  <p className="text-xs text-gray-500 mt-1">Automatically fetch new orders from Square</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={autoRefresh}
                    onChange={(e) => setAutoRefresh(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Polling Interval: <span className="font-semibold text-blue-600">{pollingInterval}s</span>
                </label>
                <input
                  type="range"
                  min="10"
                  max="300"
                  step="10"
                  value={pollingInterval}
                  onChange={(e) => setPollingInterval(parseInt(e.target.value))}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={!autoRefresh}
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>10s (Fast)</span>
                  <span>300s (Slow)</span>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  How often to check for new orders. Lower values use more resources.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};