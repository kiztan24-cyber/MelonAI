import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Loader2 } from 'lucide-react';
import { useStore } from '../store/useStore';
import { geminiService } from '../api/gemini';
import { pluginBridge } from '../api/plugin';
import { ChatMessage } from './ChatMessage';
import { StatusIndicator } from './StatusIndicator';
import type { Plan } from '../types';

export function ChatInterface() {
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const {
    messages,
    aiStatus,
    currentPlan,
    settings,
    pluginSession,
    addMessage,
    updateMessage,
    setAIStatus,
    setCurrentPlan,
    updatePlanStatus,
    updatePlanStep,
    addPendingActions,
  } = useStore();

  useEffect(() => {
    if (settings.geminiApiKey) {
      geminiService.initialize(settings.geminiApiKey);
    }
  }, [settings.geminiApiKey]);

  useEffect(() => {
    pluginBridge.initialize(pluginSession.id, settings.pluginSecret);
  }, [pluginSession.id, settings.pluginSecret]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, aiStatus]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    if (!geminiService.isInitialized()) {
      addMessage({
        role: 'assistant',
        content: 'Please configure your Gemini API key in the settings to start using MelonAI.',
      });
      return;
    }

    const userMessage = input.trim();
    setInput('');
    setIsLoading(true);

    addMessage({ role: 'user', content: userMessage });

    try {
      const enhancedPrompt = `${userMessage}

IMPORTANT: Before implementing anything, create a detailed plan first. The user must approve the plan before you execute any changes.`;

      const response = await geminiService.generateResponse(
        enhancedPrompt,
        pluginSession.projectContext || undefined,
        (status) => setAIStatus(status as typeof aiStatus)
      );

      if (response.plan) {
        setCurrentPlan(response.plan);
        addMessage({
          role: 'assistant',
          content: "I've created a plan for your request. Please review it below and approve, refine, or reject it.",
          plan: response.plan,
        });
      } else {
        addMessage({
          role: 'assistant',
          content: response.text,
          actions: response.actions,
        });
      }
    } catch (error) {
      addMessage({
        role: 'assistant',
        content: `Error: ${error instanceof Error ? error.message : 'Failed to generate response'}`,
      });
    } finally {
      setIsLoading(false);
      setAIStatus('idle');
    }
  };

  const handleApprovePlan = async (messageId: string, plan: Plan) => {
    setIsLoading(true);
    updatePlanStatus('executing');
    setAIStatus('executing');

    try {
      const actions = await geminiService.executePlan(
        plan,
        (status) => setAIStatus(status as typeof aiStatus),
        (stepId, status) => updatePlanStep(stepId, status)
      );

      updatePlanStatus('completed');
      addPendingActions(actions);
      pluginBridge.queueActions(actions);

      const summary = actions.map(a => 
        `${a.type === 'create' ? 'Created' : a.type === 'update' ? 'Updated' : 'Deleted'} ${a.scriptType}: **${a.name}** in ${a.parent}`
      ).join('\n');

      addMessage({
        role: 'assistant',
        content: `Plan executed successfully!\n\n**Actions completed:**\n${summary}\n\n${
          pluginBridge.isConnected() 
            ? 'The scripts have been sent to your Roblox Studio plugin.' 
            : 'Connect the Roblox Studio plugin to sync these scripts.'
        }`,
        actions,
      });

      if (plan.suggestions && plan.suggestions.length > 0) {
        addMessage({
          role: 'assistant',
          content: `**Suggestions to expand/improve your system:**\n${plan.suggestions.map((s, i) => `${i + 1}. ${s}`).join('\n')}\n\nWould you like me to help with any of these improvements?`,
        });
      }

      updateMessage(messageId, { plan: { ...plan, status: 'completed' } });
    } catch (error) {
      updatePlanStatus('rejected');
      addMessage({
        role: 'assistant',
        content: `Error executing plan: ${error instanceof Error ? error.message : 'Unknown error'}`,
      });
    } finally {
      setIsLoading(false);
      setAIStatus('idle');
      setCurrentPlan(null);
    }
  };

  const handleRejectPlan = (messageId: string, plan: Plan) => {
    updateMessage(messageId, { plan: { ...plan, status: 'rejected' } });
    setCurrentPlan(null);
    addMessage({
      role: 'assistant',
      content: "Plan rejected. What would you like me to do differently?",
    });
  };

  const handleRefinePlan = async (feedback: string) => {
    if (!currentPlan) return;
    
    setIsLoading(true);
    setAIStatus('planning');

    try {
      const response = await geminiService.generateResponse(
        `The user wants to refine the current plan. Here's their feedback: "${feedback}"

Current plan:
${JSON.stringify(currentPlan, null, 2)}

Please create an updated plan based on this feedback.`,
        pluginSession.projectContext || undefined,
        (status) => setAIStatus(status as typeof aiStatus)
      );

      if (response.plan) {
        setCurrentPlan(response.plan);
        addMessage({
          role: 'assistant',
          content: "I've updated the plan based on your feedback. Please review:",
          plan: response.plan,
        });
      } else {
        addMessage({
          role: 'assistant',
          content: response.text,
        });
      }
    } catch (error) {
      addMessage({
        role: 'assistant',
        content: `Error refining plan: ${error instanceof Error ? error.message : 'Unknown error'}`,
      });
    } finally {
      setIsLoading(false);
      setAIStatus('idle');
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center mb-4 glow-green">
              <span className="text-4xl">🍈</span>
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Welcome to MelonAI</h2>
            <p className="text-gray-400 max-w-md">
              Your professional Roblox Studio scripting assistant. Tell me what you want to build and I'll help you create it with clean, error-free code.
            </p>
            <div className="mt-6 grid grid-cols-2 gap-3 max-w-lg">
              {[
                'Make me an Inventory System',
                'Create a DataStore handler',
                'Build a combat system',
                'Design a shop UI system',
              ].map((suggestion) => (
                <button
                  key={suggestion}
                  onClick={() => setInput(suggestion)}
                  className="px-4 py-3 bg-[#111118] border border-[#1f1f2e] rounded-lg text-sm text-gray-300 hover:border-emerald-500 hover:text-emerald-400 transition-colors text-left"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((message) => (
          <ChatMessage
            key={message.id}
            message={message}
            onApprovePlan={() => message.plan && handleApprovePlan(message.id, message.plan)}
            onRejectPlan={() => message.plan && handleRejectPlan(message.id, message.plan)}
            onRefinePlan={handleRefinePlan}
          />
        ))}

        <AnimatePresence>
          {aiStatus !== 'idle' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <StatusIndicator status={aiStatus} />
            </motion.div>
          )}
        </AnimatePresence>

        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 border-t border-[#1f1f2e]">
        <form onSubmit={handleSubmit} className="flex gap-3">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Tell MelonAI what you want to build..."
            disabled={isLoading}
            className="flex-1 px-4 py-3 bg-[#111118] border border-[#1f1f2e] rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500 transition-colors disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="px-6 py-3 bg-emerald-500 text-white rounded-xl font-medium hover:bg-emerald-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
