export type MessageRole = 'user' | 'assistant' | 'system';

export type AIStatus = 
  | 'idle' 
  | 'thinking' 
  | 'reasoning' 
  | 'searching' 
  | 'generating' 
  | 'validating' 
  | 'planning'
  | 'executing';

export interface ScriptAction {
  type: 'create' | 'update' | 'delete';
  scriptType: 'Script' | 'LocalScript' | 'ModuleScript';
  name: string;
  parent: string;
  content: string;
}

export interface PlanStep {
  id: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed' | 'skipped';
  scriptActions?: ScriptAction[];
}

export interface Plan {
  id: string;
  title: string;
  description: string;
  steps: PlanStep[];
  status: 'draft' | 'approved' | 'rejected' | 'executing' | 'completed';
  suggestions?: string[];
}

export interface Message {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: Date;
  status?: AIStatus;
  plan?: Plan;
  actions?: ScriptAction[];
  isStatusMessage?: boolean;
}

export interface ProjectContext {
  scripts: {
    name: string;
    type: 'Script' | 'LocalScript' | 'ModuleScript';
    parent: string;
    content: string;
  }[];
  services: string[];
}

export interface PluginSession {
  id: string;
  connected: boolean;
  lastSync: Date | null;
  projectContext: ProjectContext | null;
}

export interface Settings {
  geminiApiKey: string;
  pluginSecret: string;
  autoValidate: boolean;
  theme: 'dark' | 'light';
}
