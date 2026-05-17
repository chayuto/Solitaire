/**
 * Browser file-download helper.
 *
 * @module utils/download
 */

/** Trigger a browser download of `content` as a JSON file named `filename`. */
export function downloadJson(filename: string, content: string): void {
  const blob = new Blob([content], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/** Filename tag from a game session id: the last 6 chars, or empty. */
export function gameIdTag(gameSessionId: string | undefined): string {
  return gameSessionId ? `${gameSessionId.slice(-6)}-` : '';
}
