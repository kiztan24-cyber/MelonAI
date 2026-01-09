import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Settings, X, Key, Link, Copy, Check, RefreshCw, Trash2 } from 'lucide-react';
import { useStore } from '../store/useStore';
import { pluginBridge } from '../api/plugin';

export function SettingsPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const { settings, setSettings, pluginSession, clearMessages } = useStore();
  const [apiKey, setApiKey] = useState(settings.geminiApiKey);

  useEffect(() => {
    setApiKey(settings.geminiApiKey);
  }, [settings.geminiApiKey]);

  const handleSaveApiKey = () => {
    setSettings({ geminiApiKey: apiKey });
  };

  const handleCopy = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopied(field);
    setTimeout(() => setCopied(null), 2000);
  };

  const regenerateSecret = () => {
    const newSecret = Math.random().toString(36).substring(2, 15);
    setSettings({ pluginSecret: newSecret });
    pluginBridge.initialize(pluginSession.id, newSecret);
  };

  const connectionInfo = pluginBridge.getConnectionInfo();

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="p-2 hover:bg-[#1f1f2e] rounded-lg transition-colors"
      >
        <Settings className="w-5 h-5 text-gray-400" />
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-lg bg-[#111118] border border-[#1f1f2e] rounded-2xl overflow-hidden"
          >
            <div className="flex items-center justify-between p-4 border-b border-[#1f1f2e]">
              <h2 className="text-lg font-semibold text-white">Settings</h2>
              <button
                onClick={() => setIsOpen(false)}
                className="p-2 hover:bg-[#1f1f2e] rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            <div className="p-4 space-y-6 max-h-[70vh] overflow-y-auto">
              <div className="space-y-3">
                <label className="flex items-center gap-2 text-sm font-medium text-gray-300">
                  <Key className="w-4 h-4" />
                  Gemini API Key
                </label>
                <div className="flex gap-2">
                  <input
                    type="password"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="Enter your Gemini API key"
                    className="flex-1 px-3 py-2 bg-[#0a0a0f] border border-[#1f1f2e] rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500"
                  />
                  <button
                    onClick={handleSaveApiKey}
                    className="px-4 py-2 bg-emerald-500 text-white rounded-lg text-sm font-medium hover:bg-emerald-600 transition-colors"
                  >
                    Save
                  </button>
                </div>
                <p className="text-xs text-gray-500">
                  Get your API key from{' '}
                  <a
                    href="https://aistudio.google.com/app/apikey"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-emerald-400 hover:underline"
                  >
                    Google AI Studio
                  </a>
                </p>
              </div>

              <div className="space-y-3">
                <label className="flex items-center gap-2 text-sm font-medium text-gray-300">
                  <Link className="w-4 h-4" />
                  Plugin Connection
                </label>
                
                <div className="p-3 bg-[#0a0a0f] border border-[#1f1f2e] rounded-lg space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-400">Status:</span>
                    <span className={`text-sm font-medium ${pluginSession.connected ? 'text-green-400' : 'text-yellow-400'}`}>
                      {pluginSession.connected ? 'Connected' : 'Waiting for connection...'}
                    </span>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500">Session ID:</span>
                      <div className="flex items-center gap-2">
                        <code className="text-xs text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded">
                          {connectionInfo.sessionId}
                        </code>
                        <button
                          onClick={() => handleCopy(connectionInfo.sessionId, 'sessionId')}
                          className="p-1 hover:bg-[#1f1f2e] rounded transition-colors"
                        >
                          {copied === 'sessionId' ? (
                            <Check className="w-3 h-3 text-green-400" />
                          ) : (
                            <Copy className="w-3 h-3 text-gray-400" />
                          )}
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500">Secret:</span>
                      <div className="flex items-center gap-2">
                        <code className="text-xs text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded">
                          {settings.pluginSecret}
                        </code>
                        <button
                          onClick={() => handleCopy(settings.pluginSecret, 'secret')}
                          className="p-1 hover:bg-[#1f1f2e] rounded transition-colors"
                        >
                          {copied === 'secret' ? (
                            <Check className="w-3 h-3 text-green-400" />
                          ) : (
                            <Copy className="w-3 h-3 text-gray-400" />
                          )}
                        </button>
                        <button
                          onClick={regenerateSecret}
                          className="p-1 hover:bg-[#1f1f2e] rounded transition-colors"
                          title="Regenerate secret"
                        >
                          <RefreshCw className="w-3 h-3 text-gray-400" />
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500">Endpoint:</span>
                      <div className="flex items-center gap-2">
                        <code className="text-xs text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded max-w-[200px] truncate">
                          {connectionInfo.endpoint}
                        </code>
                        <button
                          onClick={() => handleCopy(connectionInfo.endpoint, 'endpoint')}
                          className="p-1 hover:bg-[#1f1f2e] rounded transition-colors"
                        >
                          {copied === 'endpoint' ? (
                            <Check className="w-3 h-3 text-green-400" />
                          ) : (
                            <Copy className="w-3 h-3 text-gray-400" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <p className="text-xs text-gray-500">
                  Use these credentials in your Roblox Studio MelonAI plugin to connect.
                </p>
              </div>

              <div className="space-y-3">
                <label className="flex items-center gap-2 text-sm font-medium text-gray-300">
                  <Trash2 className="w-4 h-4" />
                  Data Management
                </label>
                <button
                  onClick={() => {
                    if (confirm('Are you sure you want to clear all messages?')) {
                      clearMessages();
                    }
                  }}
                  className="w-full px-4 py-2 bg-red-500/20 text-red-400 rounded-lg text-sm font-medium hover:bg-red-500/30 transition-colors"
                >
                  Clear Chat History
                </button>
              </div>

              <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
                <h3 className="text-sm font-medium text-emerald-400 mb-2">Plugin Setup Instructions</h3>
                <ol className="text-xs text-gray-400 space-y-1 list-decimal list-inside">
                  <li>Install the MelonAI plugin in Roblox Studio</li>
                  <li>Open the plugin settings in Studio</li>
                  <li>Enter your Session ID and Secret</li>
                  <li>Set the Endpoint URL to your deployed MelonAI website</li>
                  <li>Click Connect in the plugin</li>
                </ol>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </>
  );
}
