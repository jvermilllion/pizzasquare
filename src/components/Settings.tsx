import React, { useState } from 'react';
import { Settings as SettingsIcon, Square, RefreshCw, Save, AlertTriangle, CheckCircle, ArrowLeft } from 'lucide-react';

interface SettingsProps {
  onOrdersLoaded: (orders: any[]) => void;
  onNavigateBack: () => void;
}

export const Settings: React.FC<SettingsProps> = ({ onOrdersLoaded, onNavigateBack }) => {
  const [squareToken, setSquareToken] = useState(import.meta.env.VITE_SQUARE_ACCESS_TOKEN || '');
  const [locationId, setLocationId] = useState(import.meta.env.VITE_SQUARE_LOCATION_ID || '');
  const [environment, setEnvironment] = useState(import.meta.env.VITE_SQUARE_ENVIRONMENT || 'sandbox');
  const [pollingInterval, setPollingInterval] = useState(30);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [mapboxToken, setMapboxToken] = useState(import.meta.env.VITE_MAPBOX_TOKEN || '');
  
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  const handleSave = async () => {
    setSaveStatus('saving');
    
    try {
      // In a real app, you'd save these to a backend or local storage
      // For now, we'll just simulate saving
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

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-4xl mx-auto">
        {/* Back Navigation */}
        <div className="mb-4">
          <button
            onClick={onNavigateBack}
            className="flex items-center text-blue-600 hover:text-blue-700 font-medium transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </button>
        </div>

        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center">
            <SettingsIcon className="w-8 h-8 mr-3 text-blue-600" />
            Settings
          </h1>
          <p className="text-gray-600">Configure integrations and application settings</p>
        </div>

        <div className="space-y-6">
          {/* Square Integration Settings */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Square className="w-6 h-6 mr-3 text-blue-600" />
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900">Square Integration</h2>
                    <p className="text-gray-600 text-sm">Connect to Square POS for live order data</p>
                  </div>
                </div>
                <div className={`flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                  isSquareConfigured 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-yellow-100 text-yellow-800'
                }`}>
                  {isSquareConfigured ? (
                    <>
                      <CheckCircle className="w-4 h-4 mr-1" />
                      Configured
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="w-4 h-4 mr-1" />
                      Not Configured
                    </>
                  )}
                </div>
              </div>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Access Token
                  </label>
                  <input
                    type="password"
                    value={squareToken}
                    onChange={(e) => setSquareToken(e.target.value)}
                    placeholder="Enter Square access token"
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Get from <a href="https://developer.squareup.com/apps" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Square Developer Dashboard</a>
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
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Environment
                </label>
                <select
                  value={environment}
                  onChange={(e) => setEnvironment(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="sandbox">Sandbox (Testing)</option>
                  <option value="production">Production (Live)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Mapbox Settings */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="w-6 h-6 mr-3 bg-blue-600 rounded flex items-center justify-center">
                    <span className="text-white text-xs font-bold">M</span>
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900">Mapbox Integration</h2>
                    <p className="text-gray-600 text-sm">Configure map display and routing</p>
                  </div>
                </div>
                <div className={`flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                  isMapboxConfigured 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-yellow-100 text-yellow-800'
                }`}>
                  {isMapboxConfigured ? (
                    <>
                      <CheckCircle className="w-4 h-4 mr-1" />
                      Configured
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="w-4 h-4 mr-1" />
                      Not Configured
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
                <input
                  type="password"
                  value={mapboxToken}
                  onChange={(e) => setMapboxToken(e.target.value)}
                  placeholder="Enter Mapbox access token"
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Get from <a href="https://account.mapbox.com/access-tokens/" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Mapbox Account</a>
                </p>
              </div>
            </div>
          </div>

          {/* Polling & Refresh Settings */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center">
                <RefreshCw className="w-6 h-6 mr-3 text-green-600" />
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">Data Refresh Settings</h2>
                  <p className="text-gray-600 text-sm">Configure how often data is updated</p>
                </div>
              </div>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Auto Refresh Orders
                  </label>
                  <p className="text-xs text-gray-500">Automatically fetch new orders from Square</p>
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
                  Polling Interval (seconds)
                </label>
                <div className="flex items-center space-x-4">
                  <input
                    type="range"
                    min="10"
                    max="300"
                    step="10"
                    value={pollingInterval}
                    onChange={(e) => setPollingInterval(parseInt(e.target.value))}
                    className="flex-1"
                    disabled={!autoRefresh}
                  />
                  <span className="text-sm font-medium text-gray-700 w-16">
                    {pollingInterval}s
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  How often to check for new orders (10-300 seconds)
                </p>
              </div>
            </div>
          </div>

          {/* Save Button */}
          <div className="flex justify-end">
            <button
              onClick={handleSave}
              disabled={saveStatus === 'saving'}
              className={`flex items-center px-6 py-3 rounded-lg font-medium transition-colors ${
                saveStatus === 'saving'
                  ? 'bg-gray-400 text-white cursor-not-allowed'
                  : saveStatus === 'saved'
                  ? 'bg-green-600 text-white'
                  : saveStatus === 'error'
                  ? 'bg-red-600 text-white'
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
                  Save Settings
                </>
              )}
            </button>
          </div>

          {/* Help Section */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-blue-900 mb-3">Setup Instructions</h3>
            <div className="space-y-3 text-sm text-blue-800">
              <div>
                <strong>Square Setup:</strong>
                <ol className="list-decimal list-inside mt-1 space-y-1 ml-4">
                  <li>Create a Square Developer account</li>
                  <li>Create a new application</li>
                  <li>Copy the Access Token and Location ID</li>
                  <li>Choose Sandbox for testing or Production for live data</li>
                </ol>
              </div>
              <div>
                <strong>Mapbox Setup:</strong>
                <ol className="list-decimal list-inside mt-1 space-y-1 ml-4">
                  <li>Create a Mapbox account</li>
                  <li>Generate an access token with appropriate permissions</li>
                  <li>Ensure the token has styles:read, tiles:read, and fonts:read permissions</li>
                </ol>
              </div>
              <div className="mt-4 p-3 bg-blue-100 rounded text-xs">
                <strong>Note:</strong> After updating settings, restart your development server for changes to take effect.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};