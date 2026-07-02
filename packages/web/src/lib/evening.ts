// Evening in the shop: from 8pm until 6am the scene dims, the candle gets a
// glow, and upcoming doses shimmer with candlelight on the due-today paper.
export function isEveningHour(hour: number): boolean {
  return hour >= 20 || hour < 6;
}

export function isEveningNow(date: Date = new Date()): boolean {
  return isEveningHour(date.getHours());
}
