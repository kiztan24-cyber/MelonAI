import type { ScriptAction, ProjectContext } from '../types';

interface PluginMessage {
  type: 'sync' | 'execute' | 'ping' | 'context';
  sessionId: string;
  secret: string;
  data?: ScriptAction[] | ProjectContext;
}

interface PluginResponse {
  success: boolean;
  message?: string;
  data?: ProjectContext;
}

class PluginBridge {
  private sessionId: string = '';
  private secret: string = '';
  private connected: boolean = false;
  private pollingInterval: ReturnType<typeof setInterval> | null = null;
  private pendingActions: ScriptAction[] = [];

  initialize(sessionId: string, secret: string) {
    this.sessionId = sessionId;
    this.secret = secret;
  }

  getConnectionInfo() {
    return {
      sessionId: this.sessionId,
      secret: this.secret,
      endpoint: typeof window !== 'undefined' ? `${window.location.origin}/api/plugin` : '/api/plugin'
    };
  }

  async handlePluginRequest(message: PluginMessage): Promise<PluginResponse> {
    if (message.secret !== this.secret || message.sessionId !== this.sessionId) {
      return { success: false, message: 'Invalid credentials' };
    }

    switch (message.type) {
      case 'ping':
        this.connected = true;
        return { 
          success: true, 
          message: 'Connected',
          data: undefined
        };

      case 'sync':
        const actions = [...this.pendingActions];
        this.pendingActions = [];
        return {
          success: true,
          message: `${actions.length} actions pending`,
          data: actions.length > 0 ? { scripts: [], services: [] } : undefined
        };

      case 'context':
        if (message.data && 'scripts' in message.data) {
          return {
            success: true,
            message: 'Context received',
            data: message.data as ProjectContext
          };
        }
        return { success: false, message: 'Invalid context data' };

      case 'execute':
        return { success: true, message: 'Actions queued' };

      default:
        return { success: false, message: 'Unknown message type' };
    }
  }

  queueActions(actions: ScriptAction[]) {
    this.pendingActions.push(...actions);
  }

  getPendingActions(): ScriptAction[] {
    const actions = [...this.pendingActions];
    this.pendingActions = [];
    return actions;
  }

  isConnected(): boolean {
    return this.connected;
  }

  setConnected(connected: boolean) {
    this.connected = connected;
  }

  disconnect() {
    this.connected = false;
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
  }
}

export const pluginBridge = new PluginBridge();
