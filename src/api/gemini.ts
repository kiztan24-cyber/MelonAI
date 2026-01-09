import { GoogleGenerativeAI } from '@google/generative-ai';
import type { Plan, ScriptAction, ProjectContext } from '../types';

const SYSTEM_PROMPT = `You are MelonAI, a professional Roblox Studio scripting assistant powered by Gemini. You help developers create, update, and manage Luau scripts with the highest quality standards.

IMPORTANT RULES:
1. Always write PROFESSIONAL, CLEAN, and ERROR-FREE Luau code
2. Follow Roblox best practices and modern scripting patterns
3. Use proper typing with Luau type annotations when beneficial
4. Include proper error handling
5. Use meaningful variable and function names
6. Structure code for maintainability and reusability

When the user requests a system or feature, you MUST:
1. First create a detailed plan with clear steps
2. Wait for user approval before executing
3. Validate all scripts for syntax errors before providing them
4. Specify exact script names, types, and parent locations

RESPONSE FORMAT FOR PLANS:
When creating a plan, respond with JSON in this exact format:
\`\`\`json
{
  "type": "plan",
  "title": "Plan title",
  "description": "Brief description",
  "steps": [
    {
      "id": "step_1",
      "description": "Step description",
      "scriptActions": [
        {
          "type": "create|update|delete",
          "scriptType": "Script|LocalScript|ModuleScript",
          "name": "ScriptName",
          "parent": "game.ServerScriptService|game.ReplicatedStorage|etc",
          "content": "-- Full script content here"
        }
      ]
    }
  ],
  "suggestions": ["Suggestion 1 for improvements", "Suggestion 2"]
}
\`\`\`

RESPONSE FORMAT FOR EXECUTION RESULTS:
After executing a plan, summarize with:
\`\`\`json
{
  "type": "execution_summary",
  "actions": [
    {
      "action": "Created|Updated|Deleted",
      "scriptType": "Script|LocalScript|ModuleScript",
      "name": "ScriptName",
      "parent": "Location"
    }
  ],
  "suggestions": ["Next steps or improvements"]
}
\`\`\`

For conversational responses (not plans), just respond normally without JSON.`;

export class GeminiService {
  private genAI: GoogleGenerativeAI | null = null;
  private model: ReturnType<GoogleGenerativeAI['getGenerativeModel']> | null = null;

  initialize(apiKey: string) {
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.model = this.genAI.getGenerativeModel({ 
      model: 'gemini-2.5-flash',
      systemInstruction: SYSTEM_PROMPT
    });
  }

  isInitialized(): boolean {
    return this.model !== null;
  }

  async generateResponse(
    message: string,
    context?: ProjectContext,
    onStatusChange?: (status: string) => void
  ): Promise<{ text: string; plan?: Plan; actions?: ScriptAction[] }> {
    if (!this.model) {
      throw new Error('Gemini not initialized. Please set your API key.');
    }

    onStatusChange?.('thinking');

    let contextPrompt = '';
    if (context && context.scripts.length > 0) {
      contextPrompt = `\n\nCURRENT PROJECT CONTEXT:\nServices available: ${context.services.join(', ')}\n\nExisting scripts:\n`;
      context.scripts.forEach((script) => {
        contextPrompt += `- ${script.name} (${script.type}) in ${script.parent}\n`;
      });
    }

    const fullPrompt = message + contextPrompt;

    onStatusChange?.('reasoning');

    const result = await this.model.generateContent(fullPrompt);
    const response = result.response;
    const text = response.text();

    onStatusChange?.('validating');

    const planMatch = text.match(/```json\s*([\s\S]*?)\s*```/);
    if (planMatch) {
      try {
        const parsed = JSON.parse(planMatch[1]);
        
        if (parsed.type === 'plan') {
          const plan: Plan = {
            id: Math.random().toString(36).substring(2, 15),
            title: parsed.title,
            description: parsed.description,
            steps: parsed.steps.map((s: { id: string; description: string; scriptActions?: ScriptAction[] }) => ({
              ...s,
              status: 'pending' as const,
            })),
            status: 'draft',
            suggestions: parsed.suggestions,
          };
          return { text, plan };
        }

        if (parsed.type === 'execution_summary') {
          return { 
            text, 
            actions: parsed.actions?.map((a: { scriptType: string; name: string; parent: string }) => ({
              type: 'create' as const,
              scriptType: a.scriptType as 'Script' | 'LocalScript' | 'ModuleScript',
              name: a.name,
              parent: a.parent,
              content: ''
            }))
          };
        }
      } catch {
        // Not valid JSON, return as regular text
      }
    }

    return { text };
  }

  async executePlan(
    plan: Plan,
    onStatusChange?: (status: string) => void,
    onStepProgress?: (stepId: string, status: 'in_progress' | 'completed') => void
  ): Promise<ScriptAction[]> {
    if (!this.model) {
      throw new Error('Gemini not initialized');
    }

    const allActions: ScriptAction[] = [];

    for (const step of plan.steps) {
      onStepProgress?.(step.id, 'in_progress');
      onStatusChange?.('executing');

      if (step.scriptActions) {
        for (const action of step.scriptActions) {
          onStatusChange?.('validating');
          
          const validationPrompt = `Validate this Luau script for syntax errors and best practices. If there are issues, provide the corrected version. If it's fine, just say "VALID".

Script:
\`\`\`lua
${action.content}
\`\`\``;

          const validationResult = await this.model.generateContent(validationPrompt);
          const validationText = validationResult.response.text();

          if (!validationText.includes('VALID')) {
            const correctedMatch = validationText.match(/```lua\s*([\s\S]*?)\s*```/);
            if (correctedMatch) {
              action.content = correctedMatch[1];
            }
          }

          allActions.push(action);
        }
      }

      onStepProgress?.(step.id, 'completed');
    }

    return allActions;
  }
}

export const geminiService = new GeminiService();
