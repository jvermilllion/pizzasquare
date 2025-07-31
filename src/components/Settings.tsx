import React, { useState } from 'react';
import { Settings as SettingsIcon, Save, CheckCircle, AlertTriangle, ArrowLeft } from 'lucide-react';

interface SettingsProps {
  onOrdersLoaded: (orders: any[]) => void;
  onNavigateBack: () => void;
}

export const Settings: React.FC<SettingsProps> = ({ onNavigateBack }) => {
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
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');

  const handleSave = async () => {
    setSaveStatus('saving');
    localStorage.setItem('businessName', businessName);
    localStorage.setItem('businessAddress', businessAddress);
    localStorage.setItem('businessLat', businessLat);
    localStorage.setItem('businessLng', businessLng);
    
    await new Promise(resolve => setTimeout(resolve, 500));
    setSaveStatus('saved');
    setTimeout(() => setSaveStatus('idle'), 2000);
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-2xl mx-auto">
        <div className="mb-4">
          <button
            onClick={onNavigateBack}
            className="flex items-center text-blue-600 hover:text-blue-700 font-medium"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </button>
        </div>

        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2 flex items-center">
            <SettingsIcon className="w-6 h-6 mr-3 text-blue-600" />
            Settings
          </h1>
        </div>

        <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Business Location</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Business Name</label>
              <input
                type="text"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Business Address</label>
              <input
                type="text"
                value={businessAddress}
                onChange={(e) => setBusinessAddress(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Latitude</label>
                <input
                  type="number"
                  step="any"
                  value={businessLat}
                  onChange={(e) => setBusinessLat(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Longitude</label>
                <input
                  type="number"
                  step="any"
                  value={businessLng}
                  onChange={(e) => setBusinessLng(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            onClick={handleSave}
            disabled={saveStatus === 'saving'}
            className={`flex items-center px-6 py-3 rounded-lg font-medium transition-colors ${
              saveStatus === 'saving'
                ? 'bg-gray-400 text-white cursor-not-allowed'
                : saveStatus === 'saved'
                ? 'bg-green-600 text-white'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            {saveStatus === 'saving' ? (
              <>Saving...</>
            ) : saveStatus === 'saved' ? (
              <>
                <CheckCircle className="w-4 h-4 mr-2" />
                Saved!
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Save Settings
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};