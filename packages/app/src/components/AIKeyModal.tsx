import { useState } from 'react';
import { useGameStore } from '../store/gameStore';
import { DEFAULT_AI_CONFIG, listProviders } from '../ai';
import { clearKey, getDevFallbackKey, getKey, hasUserKey, setKey } from '../ai';
import { modelLabel } from '../utils/modelLabel';
import type { AIProviderId } from '../ai';

/**
 * Modal body. Mounted only while the modal is open, so `useState` initializers
 * run fresh on every open — no synchronizing effect required.
 */
const AIKeyModalContent: React.FC = () => {
  const aiConfig = useGameStore((s) => s.aiConfig) ?? DEFAULT_AI_CONFIG;
  const setAIKeyModalOpen = useGameStore((s) => s.setAIKeyModalOpen);
  const setAIConfig = useGameStore((s) => s.setAIConfig);

  const providers = listProviders();
  const provider = providers.find((p) => p.id === aiConfig.provider) ?? providers[0];
  const providerId = aiConfig.provider as AIProviderId;

  const [keyInput, setKeyInput] = useState('');
  const [model, setModel] = useState(aiConfig.model);
  const [keyAlreadySet, setKeyAlreadySet] = useState(() => hasUserKey(providerId));
  const [notice, setNotice] = useState<string | null>(null);

  if (!provider) return null;

  const devKeyAvailable = getDevFallbackKey().length > 0;

  const handleSave = () => {
    if (model.trim().length > 0 && model.trim() !== aiConfig.model) {
      setAIConfig({ model: model.trim() });
    }
    const trimmed = keyInput.trim();
    if (trimmed.length > 0) {
      setKey(providerId, trimmed);
    }
    setAIKeyModalOpen(false);
  };

  const handleClear = () => {
    clearKey(providerId);
    setKeyInput('');
    setKeyAlreadySet(false);
    setNotice('Stored key cleared for this session.');
  };

  const maskedExisting = (() => {
    const existing = getKey(providerId);
    if (!existing) return null;
    return `••••••••${existing.slice(-4)}`;
  })();

  return (
    <div
      data-testid="ai-key-modal"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="AI API key settings"
    >
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-md p-6">
        <div className="flex items-start justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-800">🤖 AI Advisor Setup</h2>
          <button
            data-testid="ai-key-modal-close-btn"
            onClick={() => setAIKeyModalOpen(false)}
            className="text-gray-400 hover:text-gray-700 text-xl leading-none"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Provider */}
        <label className="block text-sm font-semibold text-gray-700 mb-1">Provider</label>
        <div className="mb-4 text-sm text-gray-800 bg-gray-100 rounded px-3 py-2">
          {provider.displayName}
        </div>

        {/* Model — a dropdown of the provider's known models. If the stored
            config names one outside that list (e.g. a legacy value), include
            it so saving the form does not silently swap models. */}
        <label htmlFor="ai-model-input" className="block text-sm font-semibold text-gray-700 mb-1">
          Model
        </label>
        <select
          id="ai-model-input"
          data-testid="ai-model-input"
          value={model}
          onChange={(e) => setModel(e.target.value)}
          className="w-full border border-gray-300 rounded px-3 py-2 mb-1 text-sm bg-white"
        >
          {(provider.availableModels.includes(model)
            ? provider.availableModels
            : [model, ...provider.availableModels]
          ).map((m) => (
            <option key={m} value={m}>
              {modelLabel(m)}
            </option>
          ))}
        </select>
        <p className="text-xs text-gray-500 mb-4">
          Default <code>gemma-4-31b-it</code> is a thinking model — a suggestion can take
          up to ~3 minutes. Pick a faster model (e.g.{' '}
          <code>gemini-3.1-flash-lite</code>) for quicker, lower-quality advice.
        </p>

        {/* API key */}
        <label htmlFor="ai-key-input" className="block text-sm font-semibold text-gray-700 mb-1">
          API Key
        </label>
        {keyAlreadySet && maskedExisting && (
          <p className="text-xs text-green-700 mb-1">
            A key is stored for this session ({maskedExisting}). Leave blank to keep it.
          </p>
        )}
        {!keyAlreadySet && devKeyAvailable && (
          <p data-testid="ai-key-dev-note" className="text-xs text-blue-700 mb-1">
            A local <code>.env</code> key is available and will be used automatically in
            development. Enter a key here to override it.
          </p>
        )}
        <input
          id="ai-key-input"
          data-testid="ai-key-input"
          type="password"
          value={keyInput}
          onChange={(e) => setKeyInput(e.target.value)}
          autoComplete="off"
          className="w-full border border-gray-300 rounded px-3 py-2 mb-2 text-sm font-mono"
          placeholder={keyAlreadySet ? 'Enter a new key to replace' : 'Paste your API key'}
        />

        <p className="text-xs text-gray-500 mb-4">
          Your key is stored only in this browser tab (<code>sessionStorage</code>) and is
          sent only to {provider.displayName} — there is no server. It is cleared when the
          tab closes.{' '}
          {provider.apiKeyUrl && (
            <a
              href={provider.apiKeyUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 underline"
            >
              Get a key
            </a>
          )}
        </p>

        {notice && (
          <p className="text-xs text-amber-700 bg-amber-50 rounded px-2 py-1 mb-3">{notice}</p>
        )}

        <div className="flex gap-2">
          <button
            data-testid="ai-key-save-btn"
            onClick={handleSave}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded text-sm"
          >
            Save
          </button>
          <button
            data-testid="ai-key-clear-btn"
            onClick={handleClear}
            disabled={!keyAlreadySet}
            className={`flex-1 font-semibold py-2 px-4 rounded text-sm ${
              keyAlreadySet
                ? 'bg-red-600 hover:bg-red-700 text-white'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
          >
            Clear Key
          </button>
        </div>
      </div>
    </div>
  );
};

/**
 * AIKeyModal — collects the user's LLM API key and model selection.
 *
 * The key is stored in `sessionStorage` only (see `ai/keyStore`): it survives
 * reloads within the tab but is cleared when the tab closes. It is never
 * persisted to disk, exported, or logged.
 */
const AIKeyModal: React.FC = () => {
  const isOpen = useGameStore((s) => s.aiKeyModalOpen) ?? false;
  if (!isOpen) return null;
  return <AIKeyModalContent />;
};

export default AIKeyModal;
