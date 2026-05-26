/**
 * Static text blocks for the AI advisor prompt: the rules of Klondike
 * Solitaire and optional strategy guidance.
 *
 * Including the rules explicitly means the model reasons from a known, correct
 * specification rather than relying on its (possibly imperfect) priors.
 *
 * @module ai/context/rulesPrimer
 */

/** The role + rules of the game. Always included in the prompt. */
export const RULES_PRIMER = `You are an expert Klondike Solitaire strategist acting as an advisor.

KLONDIKE SOLITAIRE RULES (this variant):
- There are 7 tableau columns, 4 foundations (one per suit), a stock (draw) pile and a waste (discard) pile.
- Tableau columns are numbered 1 to 7. Always refer to a column by that 1-based number, never 0-based.
- Foundations are built UP by suit, starting from the Ace: A, 2, 3, ... up to King.
- Tableau columns are built DOWN in alternating colors (red on black, black on red). Example: a black 7 can go on a red 8.
- Only a King (or a valid sequence headed by a King) may be moved onto an EMPTY tableau column.
- A face-up run of cards in a tableau column may be moved together as a unit onto another column.
- The top card of a column, or a valid run, may move to another column; the top card may move to a foundation.
- The top (most recent) card of the waste pile may move to a tableau column or a foundation.
- Drawing turns the next stock card face-up onto the waste. When the stock is empty it can be recycled from the waste.
- When a face-down tableau card is exposed by a move, it flips face-up automatically.
- The game is WON when all 52 cards reach the foundations.
NOTATION: rank+suit (A 2-9 T J Q K; H D C S). ?? = face-down. In each column the top of the stack is the rightmost card.

THE GOAL: choose the single move that gives the best chance of eventually winning.`;

/** Klondike strategy heuristics. Included when `includeStrategyGuidance` is on. */
export const STRATEGY_GUIDANCE = `STRATEGY GUIDANCE (heuristics, not absolute rules):
- Prioritize moves that turn over (reveal) a face-down tableau card — hidden cards are the main obstacle.
- Play Aces and 2s to the foundations promptly; they are rarely useful in the tableau.
- Be cautious sending higher cards to the foundations too early — they are sometimes needed to receive tableau cards.
- Do not empty a column unless you have a King ready to occupy it.
- Prefer exposing new cards and creating useful sequences over shuffling cards between columns with no gain.
- Drawing from the stock is reasonable when no productive tableau/foundation move exists.
- Avoid moves that simply undo a recent move or lead nowhere.`;

/** Instructions describing the required JSON output. Always included. */
export const OUTPUT_INSTRUCTION = `RESPONSE FORMAT:
You will receive the current game as plain-text blocks (NOTATION, FOUNDATIONS, STOCK,
TABLEAU, RECENT MOVES, SEEN IN WASTE, LEGAL MOVES, PROGRESS — some are optional). The
LEGAL MOVES block is a numbered list; each line begins with [index], the canonical
move identifier you must return.
Reason step by step, then respond with ONLY a single JSON object containing exactly
these three keys, in this order (no prose or markdown fences outside the object):
{
  "board_analysis": <string>,
  "strategic_plan": <string>,
  "final_decision": { "move_index": <number> }
}
- board_analysis: assess the current board, hidden cards, blocked columns, foundation
  progress, and the opportunities each legal move opens or closes.
- strategic_plan: explain your plan and why the chosen move is best, given that analysis.
- final_decision.move_index: the [index] of your chosen move from the LEGAL MOVES
  block, OR -1 to RESIGN. Resign only when no legal move can productively advance
  the game, drawing has been exhausted, and you would not bet on any of the
  available moves to recover. Resign is final and ends the session.
Produce the keys in the order above: analyse the board first, then plan, then decide.`;
