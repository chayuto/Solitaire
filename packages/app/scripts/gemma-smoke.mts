/**
 * One-off smoke test: exercises the real GeminiProvider against the live
 * gemma-4-31b-it model. Not part of the test suite. Run with:
 *   GEMINI_API_KEY=... npx tsx scripts/gemma-smoke.mts
 */
import { geminiProvider } from '../src/ai/providers/GeminiProvider';
import { buildSystemInstruction } from '../src/ai/context/systemInstruction';
import { DEFAULT_AI_CONFIG } from '../src/ai/context/presets';
import type { AIMoveContext } from '../src/ai/types';

const context: AIMoveContext = {
  notation: 'rank then suit (A 2-9 T J Q K; H D C S)',
  foundations: { hearts: null, diamonds: null, clubs: null, spades: null },
  tableau: [
    { faceDownCount: 0, faceUp: ['KS'] },
    { faceDownCount: 1, faceUp: ['9H'] },
    { faceDownCount: 2, faceUp: ['AD'] },
    { faceDownCount: 3, faceUp: ['7C'] },
    { faceDownCount: 4, faceUp: ['QS'] },
    { faceDownCount: 5, faceUp: ['4H'] },
    { faceDownCount: 6, faceUp: ['TC'] },
  ],
  discardTop: null,
  drawPileCount: 24,
  canRecycleStock: false,
  legalMoves: [
    { index: 0, type: 'draw_card', describe: 'Draw the next card from the stock' },
    {
      index: 1,
      type: 'tableau_to_foundation',
      describe: 'Send AD from column 3 to the diamonds foundation',
    },
    {
      index: 2,
      type: 'tableau_to_tableau',
      describe: 'Move 9H from column 2 to column 7 (onto TC)',
    },
  ],
};

const key = process.env.GEMINI_API_KEY;
if (!key) {
  console.error('GEMINI_API_KEY not set');
  process.exit(1);
}

const started = Date.now();
geminiProvider
  .suggestMove({
    apiKey: key,
    model: 'gemma-4-31b-it',
    systemInstruction: buildSystemInstruction(DEFAULT_AI_CONFIG),
    context,
  })
  .then((decision) => {
    console.log(`OK in ${((Date.now() - started) / 1000).toFixed(1)}s`);
    console.log(JSON.stringify(decision, null, 2));
    const chosen = context.legalMoves[decision.moveIndex];
    console.log(`Chosen move: ${chosen?.describe}`);
  })
  .catch((err) => {
    console.error(`FAILED in ${((Date.now() - started) / 1000).toFixed(1)}s:`, err);
    process.exit(1);
  });
