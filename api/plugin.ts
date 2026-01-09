import type { VercelRequest, VercelResponse } from '@vercel/node';

interface ScriptAction {
  type: 'create' | 'update' | 'delete';
  scriptType: 'Script' | 'LocalScript' | 'ModuleScript';
  name: string;
  parent: string;
  content: string;
}

interface SessionData {
  secret: string;
  pendingActions: ScriptAction[];
  lastActivity: number;
  connected: boolean;
}

declare global {
  var melonSessions: Map<string, SessionData> | undefined;
}

function getSessions(): Map<string, SessionData> {
  if (!global.melonSessions) {
    global.melonSessions = new Map();
  }
  return global.melonSessions;
}

export default function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  const body = req.body;
  const sessions = getSessions();

  if (!body.sessionId || !body.secret) {
    return res.status(400).json({ success: false, message: 'Missing credentials' });
  }

  let session = sessions.get(body.sessionId);

  switch (body.type) {
    case 'ping': {
      if (!session) {
        sessions.set(body.sessionId, {
          secret: body.secret,
          pendingActions: [],
          lastActivity: Date.now(),
          connected: true
        });
      } else {
        session.lastActivity = Date.now();
        session.connected = true;
      }
      return res.status(200).json({ success: true, message: 'Connected' });
    }

    case 'sync':
    case 'getActions': {
      if (!session) {
        sessions.set(body.sessionId, {
          secret: body.secret,
          pendingActions: [],
          lastActivity: Date.now(),
          connected: true
        });
        return res.status(200).json({ success: true, message: '0 actions', actions: [] });
      }
      
      if (session.secret !== body.secret) {
        return res.status(401).json({ success: false, message: 'Invalid secret' });
      }
      
      const actions = [...session.pendingActions];
      session.pendingActions = [];
      session.lastActivity = Date.now();
      
      return res.status(200).json({
        success: true,
        message: `${actions.length} actions retrieved`,
        actions
      });
    }

    case 'queueActions': {
      if (!session) {
        sessions.set(body.sessionId, {
          secret: body.secret,
          pendingActions: body.actions || [],
          lastActivity: Date.now(),
          connected: true
        });
      } else {
        if (session.secret !== body.secret) {
          return res.status(401).json({ success: false, message: 'Invalid secret' });
        }
        if (Array.isArray(body.actions)) {
          session.pendingActions.push(...body.actions);
        }
        session.lastActivity = Date.now();
      }
      return res.status(200).json({ success: true, message: 'Actions queued' });
    }

    case 'context': {
      if (session) {
        session.lastActivity = Date.now();
      }
      return res.status(200).json({ success: true, message: 'Context received' });
    }

    case 'status': {
      return res.status(200).json({ 
        success: true, 
        connected: session?.connected || false,
        pendingCount: session?.pendingActions.length || 0
      });
    }

    default:
      return res.status(400).json({ success: false, message: 'Unknown request type' });
  }
}
