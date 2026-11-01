/** Remove decorative emoji from interface copy, after translation lookup. */
export function displayText(value: string): string {
  return value.replace(/[0-9#*]\uFE0F?\u20E3|(?:\p{Extended_Pictographic}|\p{Regional_Indicator})[\uFE0E\uFE0F\u200D\p{Emoji_Modifier}\u{E0020}-\u{E007F}]*/gu, symbol => /^[©®™]$/.test(symbol) ? symbol : '').replace(/ {2,}/g, ' ');
}
