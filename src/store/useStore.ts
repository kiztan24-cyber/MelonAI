import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Message, Plan, PluginSession, Settings, AIStatus, ScriptAction } from '../types';

interface MelonStore {
  messages: Message[];
  currentPlan: Plan | null;
  aiStatus: AIStatus;
  pluginSession: PluginSession;
  settings: Settings;
  pendingActions: ScriptAction[];
  
  addMessage: (message: Omit<Message, 'id' | 'timestamp'>) => void;
  updateMessage: (id: string, updates: Partial<Message>) => void;
  setAIStatus: (status: AIStatus) => void;
  setCurrentPlan: (plan: Plan | null) => void;
  updatePlanStatus: (status: Plan['status']) => void;
  updatePlanStep: (stepId: string, status: 'pending' | 'in_progress' | 'completed' | 'skipped') => void;
  setPluginSession: (session: Partial<PluginSession>) => void;
  setSettings: (settings: Partial<Settings>) => void;
  addPendingActions: (actions: ScriptAction[]) => void;
  clearPendingActions: () => void;
  clearMessages: () => void;
}

const generateId = () => Math.random().toString(36).substring(2, 15);

export const useStore = create<MelonStore>()(
  persist(
    (set) => ({
      messages: [],
      currentPlan: null,
      aiStatus: 'idle',
      pluginSession: {
        id: generateId(),
        connected: false,
        lastSync: null,
        projectContext: null,
      },
      settings: {
        geminiApiKey: '',
        pluginSecret: generateId(),
        autoValidate: true,
        theme: 'dark',
      },
      pendingActions: [],

      addMessage: (message) =>
        set((state) => ({
          messages: [
            ...state.messages,
            {
              ...message,
              id: generateId(),
              timestamp: new Date(),
            },
          ],
        })),

      updateMessage: (id, updates) =>
        set((state) => ({
          messages: state.messages.map((m) =>
            m.id === id ? { ...m, ...updates } : m
          ),
        })),

      setAIStatus: (status) => set({ aiStatus: status }),

      setCurrentPlan: (plan) => set({ currentPlan: plan }),

      updatePlanStatus: (status) =>
        set((state) => ({
          currentPlan: state.currentPlan
            ? { ...state.currentPlan, status }
            : null,
        })),

      updatePlanStep: (stepId, status) =>
        set((state) => ({
          currentPlan: state.currentPlan
            ? {
                ...state.currentPlan,
                steps: state.currentPlan.steps.map((s) =>
                  s.id === stepId ? { ...s, status } : s
                ),
              }
            : null,
        })),

      setPluginSession: (session) =>
        set((state) => ({
          pluginSession: { ...state.pluginSession, ...session },
        })),

      setSettings: (settings) =>
        set((state) => ({
          settings: { ...state.settings, ...settings },
        })),

      addPendingActions: (actions) =>
        set((state) => ({
          pendingActions: [...state.pendingActions, ...actions],
        })),

      clearPendingActions: () => set({ pendingActions: [] }),

      clearMessages: () => set({ messages: [], currentPlan: null }),
    }),
    {
      name: 'melon-ai-storage',
      partialize: (state) => ({
        settings: state.settings,
        pluginSession: {
          id: state.pluginSession.id,
          connected: false,
          lastSync: null,
          projectContext: null,
        },
      }),
    }
  )
);
