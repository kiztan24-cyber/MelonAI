import { motion } from 'framer-motion';
import { Check, X, RefreshCw, ChevronDown, ChevronUp, Code, Folder } from 'lucide-react';
import { useState } from 'react';
import type { Plan } from '../types';

interface PlanCardProps {
  plan: Plan;
  onApprove: () => void;
  onReject: () => void;
  onRefine: (feedback: string) => void;
}

export function PlanCard({ plan, onApprove, onReject, onRefine }: PlanCardProps) {
  const [expanded, setExpanded] = useState(true);
  const [showRefineInput, setShowRefineInput] = useState(false);
  const [refineFeedback, setRefineFeedback] = useState('');

  const handleRefine = () => {
    if (refineFeedback.trim()) {
      onRefine(refineFeedback);
      setRefineFeedback('');
      setShowRefineInput(false);
    }
  };

  const getStepStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-400 bg-green-400/10';
      case 'in_progress': return 'text-yellow-400 bg-yellow-400/10';
      case 'skipped': return 'text-gray-500 bg-gray-500/10';
      default: return 'text-gray-400 bg-gray-400/10';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-gradient-to-br from-[#111118] to-[#0d0d12] border border-[#1f1f2e] rounded-xl overflow-hidden"
    >
      <div className="p-4 border-b border-[#1f1f2e]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center">
              <Code className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h3 className="font-semibold text-white">{plan.title}</h3>
              <p className="text-sm text-gray-400">{plan.description}</p>
            </div>
          </div>
          <button
            onClick={() => setExpanded(!expanded)}
            className="p-2 hover:bg-[#1f1f2e] rounded-lg transition-colors"
          >
            {expanded ? (
              <ChevronUp className="w-5 h-5 text-gray-400" />
            ) : (
              <ChevronDown className="w-5 h-5 text-gray-400" />
            )}
          </button>
        </div>
      </div>

      {expanded && (
        <motion.div
          initial={{ height: 0 }}
          animate={{ height: 'auto' }}
          exit={{ height: 0 }}
        >
          <div className="p-4 space-y-3">
            {plan.steps.map((step, index) => (
              <div
                key={step.id}
                className="flex items-start gap-3 p-3 bg-[#0a0a0f] rounded-lg border border-[#1f1f2e]"
              >
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${getStepStatusColor(step.status)}`}>
                  {step.status === 'completed' ? <Check className="w-4 h-4" /> : index + 1}
                </div>
                <div className="flex-1">
                  <p className="text-sm text-gray-300">{step.description}</p>
                  {step.scriptActions && step.scriptActions.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {step.scriptActions.map((action, i) => (
                        <div
                          key={i}
                          className="flex items-center gap-2 text-xs text-gray-500"
                        >
                          <Folder className="w-3 h-3" />
                          <span>
                            {action.type === 'create' ? 'Create' : action.type === 'update' ? 'Update' : 'Delete'}{' '}
                            <span className="text-emerald-400">{action.name}</span>{' '}
                            ({action.scriptType}) in {action.parent}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {plan.suggestions && plan.suggestions.length > 0 && (
            <div className="px-4 pb-4">
              <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                <p className="text-xs font-medium text-blue-400 mb-2">Suggestions for improvement:</p>
                <ul className="space-y-1">
                  {plan.suggestions.map((suggestion, i) => (
                    <li key={i} className="text-xs text-gray-400 flex items-start gap-2">
                      <span className="text-blue-400">•</span>
                      {suggestion}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {plan.status === 'draft' && (
            <div className="p-4 border-t border-[#1f1f2e] space-y-3">
              {showRefineInput ? (
                <div className="space-y-2">
                  <textarea
                    value={refineFeedback}
                    onChange={(e) => setRefineFeedback(e.target.value)}
                    placeholder="Describe what you'd like to change..."
                    className="w-full px-3 py-2 bg-[#0a0a0f] border border-[#1f1f2e] rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500 resize-none"
                    rows={2}
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={handleRefine}
                      className="px-3 py-1.5 bg-yellow-500/20 text-yellow-400 rounded-lg text-sm font-medium hover:bg-yellow-500/30 transition-colors"
                    >
                      Send Feedback
                    </button>
                    <button
                      onClick={() => setShowRefineInput(false)}
                      className="px-3 py-1.5 bg-gray-500/20 text-gray-400 rounded-lg text-sm font-medium hover:bg-gray-500/30 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex gap-2">
                  <button
                    onClick={onApprove}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-500 text-white rounded-lg font-medium hover:bg-emerald-600 transition-colors"
                  >
                    <Check className="w-4 h-4" />
                    Approve & Execute
                  </button>
                  <button
                    onClick={() => setShowRefineInput(true)}
                    className="flex items-center justify-center gap-2 px-4 py-2.5 bg-yellow-500/20 text-yellow-400 rounded-lg font-medium hover:bg-yellow-500/30 transition-colors"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Refine
                  </button>
                  <button
                    onClick={onReject}
                    className="flex items-center justify-center gap-2 px-4 py-2.5 bg-red-500/20 text-red-400 rounded-lg font-medium hover:bg-red-500/30 transition-colors"
                  >
                    <X className="w-4 h-4" />
                    Reject
                  </button>
                </div>
              )}
            </div>
          )}

          {plan.status === 'executing' && (
            <div className="p-4 border-t border-[#1f1f2e]">
              <div className="flex items-center gap-2 text-yellow-400">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                >
                  <RefreshCw className="w-4 h-4" />
                </motion.div>
                <span className="text-sm font-medium">Executing plan...</span>
              </div>
            </div>
          )}

          {plan.status === 'completed' && (
            <div className="p-4 border-t border-[#1f1f2e]">
              <div className="flex items-center gap-2 text-green-400">
                <Check className="w-4 h-4" />
                <span className="text-sm font-medium">Plan executed successfully!</span>
              </div>
            </div>
          )}
        </motion.div>
      )}
    </motion.div>
  );
}
