import { useState, useEffect } from 'react';
import { chatApi } from '../api/chat';

// Default settings
const DEFAULT_SETTINGS = {
  ollamaUrl: 'http://localhost:11434',
  ollamaModel: 'llama3.2',
  chatMode: 'ai'
};

// Get settings from localStorage
const getSettings = () => {
  try {
    const saved = localStorage.getItem('appSettings');
    return saved ? { ...DEFAULT_SETTINGS, ...JSON.parse(saved) } : DEFAULT_SETTINGS;
  } catch {
    return DEFAULT_SETTINGS;
  }
};

// Save settings to localStorage
const saveSettings = (settings) => {
  localStorage.setItem('appSettings', JSON.stringify(settings));
};

function SettingsPage() {
  const [settings, setSettings] = useState(getSettings);
  const [ollamaStatus, setOllamaStatus] = useState({ checking: true, available: false, models: [] });
  const [saveMessage, setSaveMessage] = useState('');
  const [testingConnection, setTestingConnection] = useState(false);

  // Check Ollama status on mount
  useEffect(() => {
    checkOllamaStatus();
  }, []);

  const checkOllamaStatus = async () => {
    setOllamaStatus(prev => ({ ...prev, checking: true }));
    try {
      const status = await chatApi.getStatus();
      setOllamaStatus({ ...status, checking: false });
    } catch (error) {
      setOllamaStatus({ available: false, checking: false, error: error.message, models: [] });
    }
  };

  const handleChange = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = () => {
    saveSettings(settings);
    setSaveMessage('Settings saved successfully!');
    setTimeout(() => setSaveMessage(''), 3000);
  };

  const handleReset = () => {
    setSettings(DEFAULT_SETTINGS);
    saveSettings(DEFAULT_SETTINGS);
    setSaveMessage('Settings reset to defaults!');
    setTimeout(() => setSaveMessage(''), 3000);
  };

  const testConnection = async () => {
    setTestingConnection(true);
    try {
      // Test the Ollama connection with current settings
      const response = await fetch(`${settings.ollamaUrl}/api/tags`);
      if (response.ok) {
        const data = await response.json();
        setOllamaStatus({
          available: true,
          checking: false,
          models: data.models?.map(m => m.name) || []
        });
        setSaveMessage('Connection successful!');
      } else {
        setOllamaStatus({ available: false, checking: false, models: [], error: 'Failed to connect' });
        setSaveMessage('Connection failed!');
      }
    } catch (error) {
      setOllamaStatus({ available: false, checking: false, models: [], error: error.message });
      setSaveMessage('Connection failed: ' + error.message);
    }
    setTestingConnection(false);
    setTimeout(() => setSaveMessage(''), 3000);
  };

  // Popular Ollama models
  const popularModels = [
    { name: 'llama3.2', description: 'Meta Llama 3.2 - Fast and capable' },
    { name: 'llama3.1', description: 'Meta Llama 3.1 - Balanced performance' },
    { name: 'mistral', description: 'Mistral 7B - Efficient and fast' },
    { name: 'codellama', description: 'Code Llama - Optimized for code' },
    { name: 'phi3', description: 'Microsoft Phi-3 - Small but powerful' },
    { name: 'gemma2', description: 'Google Gemma 2 - Latest from Google' },
    { name: 'qwen2.5', description: 'Qwen 2.5 - Strong multilingual' },
    { name: 'deepseek-r1', description: 'DeepSeek R1 - Reasoning model' }
  ];

  return (
    <div className="h-full overflow-auto bg-gray-50 p-6">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
          <p className="text-gray-600 mt-1">Configure your Kanban board preferences</p>
        </div>

        {/* Save Message */}
        {saveMessage && (
          <div className={`mb-6 p-4 rounded-lg ${
            saveMessage.includes('failed') || saveMessage.includes('Failed')
              ? 'bg-red-50 text-red-700 border border-red-200'
              : 'bg-green-50 text-green-700 border border-green-200'
          }`}>
            {saveMessage}
          </div>
        )}

        {/* AI Chat Settings */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-6">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">AI Chat (Ollama)</h2>
                <p className="text-sm text-gray-500">Configure your local LLM settings</p>
              </div>
            </div>
          </div>

          <div className="p-6 space-y-6">
            {/* Ollama Status */}
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                <span className={`w-3 h-3 rounded-full ${
                  ollamaStatus.checking ? 'bg-yellow-400 animate-pulse' :
                  ollamaStatus.available ? 'bg-green-500' : 'bg-red-500'
                }`} />
                <div>
                  <p className="font-medium text-gray-900">
                    {ollamaStatus.checking ? 'Checking connection...' :
                     ollamaStatus.available ? 'Ollama Connected' : 'Ollama Offline'}
                  </p>
                  {ollamaStatus.available && ollamaStatus.models?.length > 0 && (
                    <p className="text-sm text-gray-500">
                      {ollamaStatus.models.length} model(s) available
                    </p>
                  )}
                  {ollamaStatus.error && (
                    <p className="text-sm text-red-500">{ollamaStatus.error}</p>
                  )}
                </div>
              </div>
              <button
                onClick={testConnection}
                disabled={testingConnection}
                className="px-4 py-2 text-sm bg-gray-200 hover:bg-gray-300 rounded-lg transition-colors disabled:opacity-50"
              >
                {testingConnection ? 'Testing...' : 'Test Connection'}
              </button>
            </div>

            {/* Ollama URL */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Ollama Server URL
              </label>
              <input
                type="text"
                value={settings.ollamaUrl}
                onChange={(e) => handleChange('ollamaUrl', e.target.value)}
                placeholder="http://localhost:11434"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
              <p className="text-xs text-gray-500 mt-1">
                Default: http://localhost:11434
              </p>
            </div>

            {/* Model Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Model Name
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={settings.ollamaModel}
                  onChange={(e) => handleChange('ollamaModel', e.target.value)}
                  placeholder="llama3.2"
                  className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
                {ollamaStatus.available && ollamaStatus.models?.length > 0 && (
                  <select
                    value=""
                    onChange={(e) => e.target.value && handleChange('ollamaModel', e.target.value)}
                    className="px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white"
                  >
                    <option value="">Select installed</option>
                    {ollamaStatus.models.map(model => (
                      <option key={model} value={model.split(':')[0]}>
                        {model}
                      </option>
                    ))}
                  </select>
                )}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Enter the model name or select from installed models
              </p>
            </div>

            {/* Popular Models */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Popular Models
              </label>
              <div className="grid grid-cols-2 gap-2">
                {popularModels.map(model => (
                  <button
                    key={model.name}
                    onClick={() => handleChange('ollamaModel', model.name)}
                    className={`p-3 text-left rounded-lg border transition-all ${
                      settings.ollamaModel === model.name
                        ? 'border-purple-500 bg-purple-50'
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <p className={`font-medium text-sm ${
                      settings.ollamaModel === model.name ? 'text-purple-700' : 'text-gray-900'
                    }`}>
                      {model.name}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">{model.description}</p>
                  </button>
                ))}
              </div>
              <p className="text-xs text-gray-500 mt-2">
                To install a model, run: <code className="bg-gray-100 px-1.5 py-0.5 rounded">ollama pull {settings.ollamaModel}</code>
              </p>
            </div>
          </div>
        </div>

        {/* Default Chat Mode */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-6">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Chat Preferences</h2>
          </div>
          <div className="p-6">
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Default Chat Mode
            </label>
            <div className="flex gap-4">
              <label className={`flex-1 p-4 rounded-lg border cursor-pointer transition-all ${
                settings.chatMode === 'ai'
                  ? 'border-purple-500 bg-purple-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}>
                <input
                  type="radio"
                  name="chatMode"
                  value="ai"
                  checked={settings.chatMode === 'ai'}
                  onChange={(e) => handleChange('chatMode', e.target.value)}
                  className="sr-only"
                />
                <div className="flex items-center gap-3">
                  <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                    settings.chatMode === 'ai' ? 'border-purple-500' : 'border-gray-300'
                  }`}>
                    {settings.chatMode === 'ai' && (
                      <div className="w-2 h-2 rounded-full bg-purple-500" />
                    )}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">AI Chat</p>
                    <p className="text-xs text-gray-500">Intelligent conversations with LLM</p>
                  </div>
                </div>
              </label>

              <label className={`flex-1 p-4 rounded-lg border cursor-pointer transition-all ${
                settings.chatMode === 'actions'
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}>
                <input
                  type="radio"
                  name="chatMode"
                  value="actions"
                  checked={settings.chatMode === 'actions'}
                  onChange={(e) => handleChange('chatMode', e.target.value)}
                  className="sr-only"
                />
                <div className="flex items-center gap-3">
                  <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                    settings.chatMode === 'actions' ? 'border-blue-500' : 'border-gray-300'
                  }`}>
                    {settings.chatMode === 'actions' && (
                      <div className="w-2 h-2 rounded-full bg-blue-500" />
                    )}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Task Actions</p>
                    <p className="text-xs text-gray-500">Quick commands for task management</p>
                  </div>
                </div>
              </label>
            </div>
          </div>
        </div>

        {/* Installation Help */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-6">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Ollama Installation</h2>
          </div>
          <div className="p-6">
            <div className="space-y-4 text-sm">
              <div className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 bg-purple-100 text-purple-700 rounded-full flex items-center justify-center text-xs font-bold">1</span>
                <div>
                  <p className="font-medium text-gray-900">Install Ollama</p>
                  <p className="text-gray-500">Visit <a href="https://ollama.ai" target="_blank" rel="noopener noreferrer" className="text-purple-600 hover:underline">https://ollama.ai</a> and download for your OS</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 bg-purple-100 text-purple-700 rounded-full flex items-center justify-center text-xs font-bold">2</span>
                <div>
                  <p className="font-medium text-gray-900">Start Ollama Server</p>
                  <code className="block mt-1 bg-gray-100 px-3 py-2 rounded text-gray-800">ollama serve</code>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 bg-purple-100 text-purple-700 rounded-full flex items-center justify-center text-xs font-bold">3</span>
                <div>
                  <p className="font-medium text-gray-900">Pull a Model</p>
                  <code className="block mt-1 bg-gray-100 px-3 py-2 rounded text-gray-800">ollama pull llama3.2</code>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-between">
          <button
            onClick={handleReset}
            className="px-6 py-2.5 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Reset to Defaults
          </button>
          <button
            onClick={handleSave}
            className="px-6 py-2.5 text-white bg-purple-600 rounded-lg hover:bg-purple-700 transition-colors"
          >
            Save Settings
          </button>
        </div>
      </div>
    </div>
  );
}

export default SettingsPage;
