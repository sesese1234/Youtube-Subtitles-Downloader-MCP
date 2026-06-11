/**
 * SRT → Plain Text converter.
 *
 * Parses standard SRT subtitle format and produces clean readable text.
 * Strips: indices, timestamps, music notes, [annotations], duplicate lines.
 */

/**
 * Convert raw SRT content to clean plain text.
 */
export function convertSrtToPlainText(srt: string): string {
  const lines = srt.split(/\r?\n/);
  const textLines: string[] = [];
  const seen = new Set<string>();

  let i = 0;
  while (i < lines.length) {
    const line = lines[i].trim();

    // Skip blank lines
    if (!line) { i++; continue; }

    // Skip index lines (pure numbers)
    if (/^\d+$/.test(line)) { i++; continue; }

    // Skip timestamp lines (00:00:00,000 --> 00:00:00,000)
    if (/^\d{2}:\d{2}:\d{2}[,\.]\d{3}\s*-->\s*\d{2}:\d{2}:\d{2}[,\.]\d{3}/.test(line)) {
      i++;
      continue;
    }

    // This is a subtitle text line — clean it
    const cleaned = line
      .replace(/♪/g, '')
      .replace(/<[^>]+>/g, '')         // Strip HTML tags (italic, bold, etc.)
      .replace(/\{[^}]+\}/g, '')       // Strip ASS/SSA formatting
      .replace(/\[.*?\]/g, '')         // Strip [Music], [Applause], etc.
      .trim();

    if (cleaned && !seen.has(cleaned)) {
      textLines.push(cleaned);
      seen.add(cleaned);
    }

    i++;
  }

  // Join into readable paragraphs
  return textLines
    .join(' ')
    .replace(/\s+/g, ' ')
    .replace(/([.!?])\s+/g, '$1\n\n')
    .trim();
}
