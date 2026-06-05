/**
 * Tests for the hybrid ASCII renderer.
 *
 * The renderer's contract is documented in the layout-ask doc in the
 * solitaire-analytics sibling repo; these tests pin the wire format so a
 * silent shape drift is caught here, where it's cheap, rather than at the
 * dataset-side comparison report.
 */

import { describe, it, expect } from 'vitest';
import { PROMPT_LAYOUT_VERSION, renderHybridContext } from './renderContext';
import type { AIMoveContext } from '../types';

/** Minimal fair-play context — fills in only the always-present fields. */
function baseContext(overrides: Partial<AIMoveContext> = {}): AIMoveContext {
  return {
    notation: 'ignored by hybrid renderer',
    foundations: { hearts: null, diamonds: null, clubs: null, spades: null },
    tableau: [
      { column: 1, faceDownCount: 0, faceUp: [] },
      { column: 2, faceDownCount: 0, faceUp: [] },
      { column: 3, faceDownCount: 0, faceUp: [] },
      { column: 4, faceDownCount: 0, faceUp: [] },
      { column: 5, faceDownCount: 0, faceUp: [] },
      { column: 6, faceDownCount: 0, faceUp: [] },
      { column: 7, faceDownCount: 0, faceUp: [] },
    ],
    discardTop: null,
    drawPileCount: 0,
    canRecycleStock: false,
    cycle: 1,
    legalMoves: [{ index: 0, type: 'draw_card', describe: 'Draw the next card' }],
    ...overrides,
  };
}

describe('renderHybridContext', () => {
  it('always emits the FOUNDATIONS, STOCK, TABLEAU, LEGAL MOVES blocks', () => {
    const out = renderHybridContext(baseContext());
    // NOTATION moved to the static rules block in 2026-05-26 hygiene edit 2;
    // the per-turn render must NOT carry it any more (re-rendered every turn
    // for no information change).
    expect(out).not.toMatch(/NOTATION:/);
    expect(out).toMatch(/^FOUNDATIONS:/);
    expect(out).toContain('FOUNDATIONS:   H: --   D: --   C: --   S: --');
    expect(out).toContain('STOCK: 0 cards   CYCLE: 1   WASTE top: --   recycle stock: no');
    expect(out).toContain('TABLEAU:');
    expect(out).toContain('LEGAL MOVES (respond with the index of your chosen move):');
  });

  it('renders an empty tableau column as <empty>', () => {
    const out = renderHybridContext(baseContext());
    // All seven columns are empty in baseContext.
    for (let n = 1; n <= 7; n++) {
      expect(out).toContain(`  col${n}: <empty>`);
    }
  });

  it('renders face-down + face-up cards as ?? followed by face-up tokens', () => {
    const out = renderHybridContext(
      baseContext({
        tableau: [
          { column: 1, faceDownCount: 3, faceUp: ['QC', 'JD', 'TC', '9D'] },
          ...baseContext().tableau.slice(1),
        ],
      }),
    );
    expect(out).toContain('  col1: ?? ?? ?? QC JD TC 9D');
  });

  it('uses real card identities for face-down cards when seeHiddenCards oracle data is present', () => {
    // `faceDown` is populated only when `seeHiddenCards` is on; the renderer
    // must trust the oracle data rather than rendering generic `??` tokens.
    const out = renderHybridContext(
      baseContext({
        tableau: [
          { column: 1, faceDownCount: 2, faceUp: ['5C'], faceDown: ['KH', '7D'] },
          ...baseContext().tableau.slice(1),
        ],
      }),
    );
    expect(out).toContain('  col1: KH 7D 5C');
  });

  it('falls back to ?? when faceDown length does not match faceDownCount', () => {
    // Defensive: a malformed context with the wrong-length oracle array should
    // not leak partial data — render generic ?? tokens by count.
    const out = renderHybridContext(
      baseContext({
        tableau: [
          { column: 1, faceDownCount: 3, faceUp: ['5C'], faceDown: ['KH'] },
          ...baseContext().tableau.slice(1),
        ],
      }),
    );
    expect(out).toContain('  col1: ?? ?? ?? 5C');
  });

  it('omits RECENT MOVES, SEEN IN WASTE, PROGRESS, and PRIOR REASONING when those fields are absent', () => {
    const out = renderHybridContext(baseContext());
    expect(out).not.toContain('RECENT MOVES');
    expect(out).not.toContain('SEEN IN WASTE');
    expect(out).not.toContain('PROGRESS:');
    expect(out).not.toContain('PRIOR REASONING');
  });

  it('right-aligns RECENT MOVES numbers and labels the block with the oscillation hint', () => {
    const recentMoves = Array.from({ length: 12 }, (_, i) => `draw card-${i + 1}`);
    const out = renderHybridContext(baseContext({ recentMoves }));
    expect(out).toContain(
      'RECENT MOVES (oldest -> newest; review before picking, do not undo your own work):',
    );
    // Width is 2 because the list reaches 12 entries — single-digit numbers
    // are padded so the dots align.
    expect(out).toContain('   1. draw card-1');
    expect(out).toContain('   9. draw card-9');
    expect(out).toContain('  10. draw card-10');
    expect(out).toContain('  12. draw card-12');
  });

  it('renders DRAW TIMELINE as a single space-separated line when supplied', () => {
    // hybrid-v1.2 replaces the old SEEN IN WASTE THIS CYCLE block with a
    // single linear DRAW TIMELINE: stock cards left of {NOW}, current waste
    // top wrapped in {}, and earlier-this-cycle waste cards to the right.
    const out = renderHybridContext(
      baseContext({
        drawTimeline: ['???', '???', '8D', 'QH', '3C', '{7H}', '4S', 'KH', '2D'],
      }),
    );
    expect(out).toContain('DRAW TIMELINE:\n  ??? ??? 8D QH 3C {7H} 4S KH 2D');
  });

  it('skips DRAW TIMELINE when no draws have happened (drawTimeline undefined)', () => {
    const out = renderHybridContext(baseContext());
    expect(out).not.toContain('DRAW TIMELINE');
  });

  it('renders CYCLE inline on the STOCK line', () => {
    expect(renderHybridContext(baseContext())).toContain(
      'STOCK: 0 cards   CYCLE: 1   WASTE top: --   recycle stock: no',
    );
    expect(
      renderHybridContext(baseContext({ cycle: 3, drawPileCount: 14, discardTop: '2H' })),
    ).toContain('STOCK: 14 cards   CYCLE: 3   WASTE top: 2H   recycle stock: no');
  });

  it('renders the HIDDEN INFO oracle block only when hiddenInfo is supplied', () => {
    const without = renderHybridContext(baseContext());
    expect(without).not.toContain('HIDDEN INFO');

    const withOracle = renderHybridContext(
      baseContext({ hiddenInfo: { drawPileOrder: ['AC', '2D', '3H'] } }),
    );
    expect(withOracle).toContain('HIDDEN INFO (oracle): draw pile order: AC 2D 3H');
  });

  it('aligns LEGAL MOVES with [index] prefix and a 24-char type column', () => {
    const out = renderHybridContext(
      baseContext({
        legalMoves: [
          { index: 0, type: 'tableau_to_tableau', describe: 'Move 7S col 1 -> col 5' },
          { index: 1, type: 'draw_card', describe: 'Draw the next card' },
          { index: 2, type: 'discard_to_foundation', describe: 'Play AH to hearts' },
        ],
      }),
    );
    // `tableau_to_tableau` is 18 chars → 6 trailing spaces; describe follows.
    expect(out).toContain('  [0] tableau_to_tableau       Move 7S col 1 -> col 5');
    // `draw_card` is 9 chars → 15 trailing spaces.
    expect(out).toContain('  [1] draw_card                Draw the next card');
    // `discard_to_foundation` is 21 chars → 3 trailing spaces + 1 separator.
    expect(out).toContain('  [2] discard_to_foundation    Play AH to hearts');
  });

  it('appends the heuristic score on a legal-moves line when present', () => {
    const out = renderHybridContext(
      baseContext({
        legalMoves: [
          {
            index: 0,
            type: 'tableau_to_foundation',
            describe: 'Play 2S to spades',
            heuristicScore: 87,
          },
        ],
      }),
    );
    expect(out).toContain('Play 2S to spades   (heuristic score: 87)');
  });

  it('renders the PROGRESS line from metrics when supplied', () => {
    const out = renderHybridContext(
      baseContext({
        metrics: {
          completionProgress: 12,
          perceivedDifficulty: 70,
          difficulty: 2,
          foundationCards: 6,
          faceDownTotal: 12,
          progressScore: 35,
          turnsSinceFoundationGrew: 63,
          turnsSinceCardRevealed: 47,
        },
      }),
    );
    expect(out).toContain(
      'PROGRESS: foundation=6/52, face-down remaining=12, completion=12%, ' +
        'turns since foundation grew: 63, turns since a card was revealed: 47',
    );
  });

  it('does NOT render PRIOR REASONING even when reasoningTrail is supplied (hybrid-v1.3)', () => {
    // hybrid-v1.3 drops the block per the v1.3 candidate spec: feeding the
    // model its own prior rationales reinforces any doom-loop in progress
    // (Halawi et al. 2023). The field on AIMoveContext is still accepted —
    // analytics and any future re-enablement experiment can populate it —
    // but the renderer ignores it.
    const out = renderHybridContext(
      baseContext({
        reasoningTrail: [
          { move: 'Draw the next card', reasoning: 'No productive tableau move.' },
          { move: 'Play AC to clubs', reasoning: 'Aces always go up early.' },
        ],
      }),
    );
    expect(out).not.toContain('PRIOR REASONING');
    expect(out).not.toContain('No productive tableau move.');
    expect(out).not.toContain('Aces always go up early.');
  });

  it('places RECENT MOVES before DRAW TIMELINE before LEGAL MOVES', () => {
    // The whole point of the layout is the visual adjacency of just-played
    // moves and on-offer moves. The DRAW TIMELINE (hybrid-v1.2) replaces the
    // old SEEN IN WASTE block at the same slot.
    const out = renderHybridContext(
      baseContext({
        recentMoves: ['draw 6C', 'move 9D col 3 -> col 7'],
        drawTimeline: ['???', '???', '{6C}', '9D'],
      }),
    );
    const recentIdx = out.indexOf('RECENT MOVES');
    const timelineIdx = out.indexOf('DRAW TIMELINE');
    const legalIdx = out.indexOf('LEGAL MOVES');
    expect(recentIdx).toBeGreaterThan(-1);
    expect(timelineIdx).toBeGreaterThan(-1);
    expect(legalIdx).toBeGreaterThan(-1);
    expect(recentIdx).toBeLessThan(timelineIdx);
    expect(timelineIdx).toBeLessThan(legalIdx);
  });

  it('has no trailing blank line', () => {
    const out = renderHybridContext(baseContext());
    expect(out.endsWith('\n')).toBe(false);
  });

  it('is smaller than the pretty-printed JSON dump it replaces on a realistic snapshot', () => {
    // Token saving is the main cross-team justification for the change. The
    // 4–5× ratio quoted in the layout-ask doc is measured against
    // pretty-printed JSON on real corpus snapshots; a small fixture won't
    // reproduce it (preamble overhead dominates), but the *direction* should
    // hold even here. The shape-level tests above are the real regression
    // guards — this one just catches a verbose label sneaking in.
    const ctx = baseContext({
      tableau: [
        { column: 1, faceDownCount: 0, faceUp: ['8H', '7S', '6D', '5C'] },
        { column: 2, faceDownCount: 0, faceUp: ['TD'] },
        { column: 3, faceDownCount: 1, faceUp: ['QS'] },
        { column: 4, faceDownCount: 0, faceUp: ['7D', '6S', '5H', '4C'] },
        { column: 5, faceDownCount: 2, faceUp: ['8D'] },
        { column: 6, faceDownCount: 4, faceUp: ['JS', 'TH'] },
        { column: 7, faceDownCount: 5, faceUp: ['QC', 'JD', 'TC', '9D'] },
      ],
      discardTop: 'KD',
      drawPileCount: 16,
      foundations: { hearts: '4H', diamonds: null, clubs: null, spades: '2S' },
      recentMoves: ['draw 6C', 'draw JC', 'move JD col 3 -> col 7'],
      seenDrawPileCards: ['9H', '5S', 'KS', 'JC', '6C'],
      legalMoves: [
        { index: 0, type: 'tableau_to_tableau', describe: 'Move 7S col 1 -> col 5' },
        { index: 1, type: 'draw_card', describe: 'Draw the next card from the stock' },
      ],
      metrics: {
        completionProgress: 12,
        perceivedDifficulty: 70,
        difficulty: 2,
        foundationCards: 6,
        faceDownTotal: 12,
        progressScore: 35,
        turnsSinceFoundationGrew: 63,
        turnsSinceCardRevealed: 47,
      },
    });
    const hybridChars = renderHybridContext(ctx).length;
    const prettyJsonChars = JSON.stringify(ctx, null, 2).length;
    expect(hybridChars).toBeLessThan(prettyJsonChars);
  });

  it('PROMPT_LAYOUT_VERSION follows the lockstep semver and matches the template version', () => {
    // Tripwire: layout and template versions are now bumped together so the
    // two fields on a harvested interaction never disagree. See the
    // promptlayoutversion-lockstep follow-up note.
    expect(PROMPT_LAYOUT_VERSION).toMatch(/^hybrid-v\d+\.\d+$/);
    expect(PROMPT_LAYOUT_VERSION).toBe('hybrid-v1.5');
  });
});
