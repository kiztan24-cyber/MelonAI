import type { VercelRequest, VercelResponse } from '@vercel/node';

interface PluginRequest {
  type: 'sync' | 'execute' | 'ping' | 'context' | 'getActions';
  sessionId: string;
  secret: string;
  data?: unknown;
}

interface ScriptAction {
  type: 'create' | 'update' | 'delete';
  scriptType: 'Script' | 'LocalScript' | 'ModuleScript';
  name: string;
  parent: string;
  content: string;
}

const sessions = new Map<string, {
  secret: string;
  pendingActions: ScriptAction[];
  lastActivity: number;
  connected: boolean;
}>();

const CLEANUP_INTERVAL = 1000 * 60 * 30;
setInterval(() => {
  const now = Date.now();
  for (const [id, session] of sessions.entries()) {
    if (now - session.lastActivity > CLEANUP_INTERVAL) {
      sessions.delete(id);
    }
  }
}, CLEANUP_INTERVAL);

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

  const body = req.body as PluginRequest;

  if (!body.sessionId || !body.secret) {
    return res.status(400).json({ success: false, message: 'Missing credentials' });
  }

  let session = sessions.get(body.sessionId);

  if (body.type === 'ping') {
    if (!session) {
      sessions.set(body.sessionId, {
        secret: body.secret,
        pendingActions: [],
        lastActivity: Date.now(),
        connected: true
      });
    } else if (session.secret !== body.secret) {
      return res.status(401).json({ success: false, message: 'Invalid secret' });
    } else {
      session.lastActivity = Date.now();
      session.connected = true;
    }
    return res.status(200).json({ success: true, message: 'Connected' });
  }

  if (!session) {
    return res.status(401).json({ success: false, message: 'Session not found. Ping first.' });
  }

  if (session.secret !== body.secret) {
    return res.status(401).json({ success: false, message: 'Invalid secret' });
  }

  session.lastActivity = Date.now();

  switch (body.type) {
    case 'sync':
    case 'getActions': {
      const actions = [...session.pendingActions];
      session.pendingActions = [];
      return res.status(200).json({
        success: true,
        message: `${actions.length} actions retrieved`,
        actions
      });
    }

    case 'execute': {
      if (Array.isArray(body.data)) {
        session.pendingActions.push(...(body.data as ScriptAction[]));
      }
      return res.status(200).json({ success: true, message: 'Actions queued' });
    }

    case 'context': {
      return res.status(200).json({ success: true, message: 'Context received' });
    }

    default:
      return res.status(400).json({ success: false, message: 'Unknown request type' });
  }
}

export function queueActionsForSession(sessionId: string, actions: ScriptAction[]) {
  const session = sessions.get(sessionId);
  if (session) {
    session.pendingActions.push(...actions);
    return true;
  }
  return false;
}
