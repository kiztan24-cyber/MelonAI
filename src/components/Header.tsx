import { Wifi, WifiOff, MessageSquare } from 'lucide-react';
import { useStore } from '../store/useStore';
import { SettingsPanel } from './SettingsPanel';

export function Header() {
  const { pluginSession, messages } = useStore();

  return (
    <header className="flex items-center justify-between px-4 py-3 bg-[#111118] border-b border-[#1f1f2e]">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center glow-green">
          <span className="text-xl">🍈</span>
        </div>
        <div>
          <h1 className="text-lg font-bold text-white">MelonAI</h1>
          <p className="text-xs text-gray-400">Roblox Studio AI Assistant</p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 px-3 py-1.5 bg-[#0a0a0f] rounded-lg border border-[#1f1f2e]">
          <MessageSquare className="w-4 h-4 text-gray-400" />
          <span className="text-sm text-gray-400">{messages.length}</span>
        </div>

        <div
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border ${
            pluginSession.connected
              ? 'bg-green-500/10 border-green-500/20'
              : 'bg-yellow-500/10 border-yellow-500/20'
          }`}
        >
          {pluginSession.connected ? (
            <>
              <Wifi className="w-4 h-4 text-green-400" />
              <span className="text-sm text-green-400">Connected</span>
            </>
          ) : (
            <>
              <WifiOff className="w-4 h-4 text-yellow-400" />
              <span className="text-sm text-yellow-400">Disconnected</span>
            </>
          )}
        </div>

        <SettingsPanel />
      </div>
    </header>
  );
}
