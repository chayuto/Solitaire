import { useState } from 'react';
import { useGameStore } from '../store/gameStore';
import { DEFAULT_AI_CONFIG } from '../ai';
import { downloadJson, gameIdTag } from '../utils/download';
import type { AIConfig, AIContextPreset } from '../ai';

/** A boolean context toggle exposed in the Custom preset. */
const CUSTOM_TOGGLES: { key: keyof AIConfig; label: string }[] = [
  { key: 'includeMoveHistory', label: 'Move history' },
  { key: 'includeGameMetrics', label: 'Game metrics' },
  { key: 'includeStrategyGuidance', label: 'Strategy guidance' },
  { key: 'includeHeuristicScores', label: 'Heuristic scores' },
  { key: 'includeSeenDrawPileCards', label: 'Seen stock cards' },
  { key: 'includeReasoningTrail', label: 'AI reasoning trail' },
];

const PRESETS: { value: AIContextPreset; label: string }[] = [
  { value: 'minimal', label: 'Minimal' },
  { value: 'standard', label: 'Standard' },
  { value: 'detailed', label: 'Detailed' },
  { value: 'custom', label: 'Custom' },
];

/**
 * AISettingsSection — collapsible AI advisor settings, rendered inside the
 * ControlPanel. Controls the context preset, the hidden-card fairness toggle,
 * the per-field toggles (Custom preset), and access to the API key modal.
 */
const AISettingsSection: React.FC = () => {
  const aiConfig = useGameStore((s) => s.aiConfig) ?? DEFAULT_AI_CONFIG;
  const setAIConfig = useGameStore((s) => s.setAIConfig);
  const setAIKeyModalOpen = useGameStore((s) => s.setAIKeyModalOpen);
  const exportAIInteractions = useGameStore((s) => s.exportAIInteractions);
  const gameSessionId = useGameStore((s) => s.gameSessionId);
  const [expanded, setExpanded] = useState(true);

  /** Download the full LLM interaction log as a JSON file. */
  const handleExportAILog = () => {
    downloadJson(
      `solitaire-ai-log-${gameIdTag(gameSessionId)}${Date.now()}.json`,
      exportAIInteractions(),
    );
  };

  return (
    <div data-testid="ai-settings-section" className="bg-indigo-50 rounded p-2">
      <button
        data-testid="ai-settings-toggle-btn"
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between text-xs font-semibold text-indigo-800"
        aria-expanded={expanded}
      >
        <span>⚙️ AI Settings</span>
        <span>{expanded ? '▲' : '▼'}</span>
      </button>

      {expanded && (
        <div className="mt-2 space-y-2">
          {/* Context preset */}
          <div>
            <label
              htmlFor="ai-preset-select"
              className="block text-[11px] font-semibold text-gray-600 mb-0.5"
            >
              Context detail
            </label>
            <select
              id="ai-preset-select"
              data-testid="ai-preset-select"
              value={aiConfig.preset}
              onChange={(e) => setAIConfig({ preset: e.target.value as AIContextPreset })}
              className="w-full border border-gray-300 rounded px-2 py-1 text-xs bg-white"
            >
              {PRESETS.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>

          {/* Hidden-card fairness toggle */}
          <label className="flex items-center gap-2 text-[11px] text-gray-700">
            <input
              data-testid="ai-see-hidden-toggle"
              type="checkbox"
              checked={aiConfig.seeHiddenCards}
              onChange={(e) => setAIConfig({ seeHiddenCards: e.target.checked })}
            />
            <span>AI sees hidden cards</span>
          </label>
          <p className="text-[10px] text-gray-500 -mt-1">
            Off = fair advisor (counts only). On = solver (sees every card).
          </p>

          {/* Per-field toggles (Custom preset only) */}
          {aiConfig.preset === 'custom' && (
            <div className="space-y-1 border-t border-indigo-200 pt-2">
              {CUSTOM_TOGGLES.map(({ key, label }) => (
                <label key={key} className="flex items-center gap-2 text-[11px] text-gray-700">
                  <input
                    data-testid={`ai-toggle-${key}`}
                    type="checkbox"
                    checked={Boolean(aiConfig[key])}
                    onChange={(e) => setAIConfig({ [key]: e.target.checked } as Partial<AIConfig>)}
                  />
                  <span>{label}</span>
                </label>
              ))}
            </div>
          )}

          {/* Model + key */}
          <div className="border-t border-indigo-200 pt-2">
            <p className="text-[10px] text-gray-500 mb-1">
              Model: <code className="text-[10px]">{aiConfig.model}</code>
            </p>
            <button
              data-testid="ai-key-settings-btn"
              onClick={() => setAIKeyModalOpen(true)}
              className="w-full bg-indigo-200 hover:bg-indigo-300 text-indigo-900 font-semibold py-1.5 px-2 rounded text-xs"
            >
              🔑 API Key &amp; Model
            </button>
            <button
              data-testid="export-ai-log-btn"
              onClick={handleExportAILog}
              className="w-full mt-1 bg-indigo-200 hover:bg-indigo-300 text-indigo-900 font-semibold py-1.5 px-2 rounded text-xs"
              title="Download the full LLM interaction log (prompts, responses, tokens, timing)"
            >
              ⬇️ Export AI Log
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AISettingsSection;
