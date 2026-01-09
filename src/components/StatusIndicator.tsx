import { motion } from 'framer-motion';
import { Zap, Cpu, Search, Loader2, CheckCircle, Brain, Rocket } from 'lucide-react';
import type { AIStatus } from '../types';

interface StatusIndicatorProps {
  status: AIStatus;
}

const statusConfig: Record<AIStatus, { icon: React.ElementType; label: string; color: string }> = {
  idle: { icon: CheckCircle, label: 'Ready', color: 'text-gray-400' },
  thinking: { icon: Brain, label: 'MelonAI is Thinking...', color: 'text-yellow-400' },
  reasoning: { icon: Cpu, label: 'MelonAI is Reasoning...', color: 'text-blue-400' },
  searching: { icon: Search, label: 'MelonAI is Searching...', color: 'text-purple-400' },
  generating: { icon: Zap, label: 'MelonAI is Generating...', color: 'text-emerald-400' },
  validating: { icon: Loader2, label: 'MelonAI is Validating...', color: 'text-orange-400' },
  planning: { icon: Brain, label: 'MelonAI is Planning...', color: 'text-cyan-400' },
  executing: { icon: Rocket, label: 'MelonAI is Executing...', color: 'text-green-400' },
};

export function StatusIndicator({ status }: StatusIndicatorProps) {
  const config = statusConfig[status];
  const Icon = config.icon;

  if (status === 'idle') return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="flex items-center gap-3 px-4 py-3 bg-[#111118] border border-[#1f1f2e] rounded-lg"
    >
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ repeat: Infinity, duration: 2, ease: 'linear' }}
      >
        <Icon className={`w-5 h-5 ${config.color}`} />
      </motion.div>
      <span className={`text-sm font-medium ${config.color}`}>
        {config.label}
      </span>
      <div className="flex gap-1 ml-2">
        <span className="w-2 h-2 bg-current rounded-full typing-dot opacity-40" />
        <span className="w-2 h-2 bg-current rounded-full typing-dot opacity-40" />
        <span className="w-2 h-2 bg-current rounded-full typing-dot opacity-40" />
      </div>
    </motion.div>
  );
}
