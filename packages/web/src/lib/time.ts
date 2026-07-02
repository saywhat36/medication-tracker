// A dose's scheduledFor is a true UTC instant; show it in the browser's
// local time (HH:MM) so it matches the timezone the times were entered in.
// Shared by the classic dose list and the shop's due-today paper so the two
// views always print the same time for the same dose.
export function localHHMM(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  });
}
