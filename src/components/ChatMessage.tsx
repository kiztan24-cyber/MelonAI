import { motion } from 'framer-motion';
import { User, Bot, FileCode, ArrowRight } from 'lucide-react';
import type { Message, ScriptAction } from '../types';
import { PlanCard } from './PlanCard';

interface ChatMessageProps {
  message: Message;
  onApprovePlan?: () => void;
  onRejectPlan?: () => void;
  onRefinePlan?: (feedback: string) => void;
}

export function ChatMessage({ message, onApprovePlan, onRejectPlan, onRefinePlan }: ChatMessageProps) {
  const isUser = message.role === 'user';
  const isSystem = message.role === 'system';

  if (message.isStatusMessage) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex justify-center py-2"
      >
        <div className="px-4 py-2 bg-[#111118] border border-[#1f1f2e] rounded-full text-sm text-gray-400">
          {message.content}
        </div>
      </motion.div>
    );
  }

  const formatContent = (content: string) => {
    const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      const beforeJson = content.substring(0, content.indexOf('```json')).trim();
      const afterJson = content.substring(content.lastIndexOf('```') + 3).trim();
      return (
        <>
          {beforeJson && <p className="mb-3 whitespace-pre-wrap">{beforeJson}</p>}
          {afterJson && <p className="mt-3 whitespace-pre-wrap">{afterJson}</p>}
        </>
      );
    }

    const luaMatch = content.match(/```lua\s*([\s\S]*?)\s*```/g);
    if (luaMatch) {
      const parts = content.split(/```lua[\s\S]*?```/);
      return (
        <>
          {parts.map((part, i) => (
            <span key={i}>
              {part && <span className="whitespace-pre-wrap">{part}</span>}
              {luaMatch[i] && (
                <pre className="mt-2 mb-2 p-3 bg-[#0a0a0f] rounded-lg overflow-x-auto border border-[#1f1f2e]">
                  <code className="text-sm font-mono text-emerald-300">
                    {luaMatch[i].replace(/```lua\s*/, '').replace(/\s*```/, '')}
                  </code>
                </pre>
              )}
            </span>
          ))}
        </>
      );
    }

    return <p className="whitespace-pre-wrap">{content}</p>;
  };

  const renderActions = (actions: ScriptAction[]) => (
    <div className="mt-3 space-y-2">
      <p className="text-sm font-medium text-emerald-400">Actions Completed:</p>
      {actions.map((action, i) => (
        <div
          key={i}
          className="flex items-center gap-2 p-2 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-sm"
        >
          <FileCode className="w-4 h-4 text-emerald-400" />
          <span className="text-gray-300">
            {action.type === 'create' ? 'Created' : action.type === 'update' ? 'Updated' : 'Deleted'}
          </span>
          <span className="text-emerald-400 font-medium">{action.name}</span>
          <span className="text-gray-500">({action.scriptType})</span>
          <ArrowRight className="w-3 h-3 text-gray-500" />
          <span className="text-gray-400">{action.parent}</span>
        </div>
      ))}
    </div>
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex gap-3 ${isUser ? 'flex-row-reverse' : ''} ${isSystem ? 'justify-center' : ''}`}
    >
      {!isSystem && (
        <div
          className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
            isUser ? 'bg-blue-500/20' : 'bg-emerald-500/20'
          }`}
        >
          {isUser ? (
            <User className="w-4 h-4 text-blue-400" />
          ) : (
            <Bot className="w-4 h-4 text-emerald-400" />
          )}
        </div>
      )}

      <div
        className={`max-w-[80%] ${
          isSystem ? 'max-w-full' : ''
        }`}
      >
        <div
          className={`px-4 py-3 rounded-2xl ${
            isUser
              ? 'bg-blue-500/20 text-white rounded-br-md'
              : isSystem
              ? 'bg-transparent text-gray-400 text-center'
              : 'bg-[#111118] border border-[#1f1f2e] text-gray-200 rounded-bl-md'
          }`}
        >
          {formatContent(message.content)}
          
          {message.actions && message.actions.length > 0 && renderActions(message.actions)}
        </div>

        {message.plan && (
          <div className="mt-3">
            <PlanCard
              plan={message.plan}
              onApprove={onApprovePlan || (() => {})}
              onReject={onRejectPlan || (() => {})}
              onRefine={onRefinePlan || (() => {})}
            />
          </div>
        )}

        <p className={`text-xs text-gray-500 mt-1 ${isUser ? 'text-right' : ''}`}>
          {new Date(message.timestamp).toLocaleTimeString()}
        </p>
      </div>
    </motion.div>
  );
}
