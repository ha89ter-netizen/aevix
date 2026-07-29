export function formatProjectDate(timestamp: number) {
  return new Date(timestamp).toLocaleDateString("ru-RU", { day: "numeric", month: "short" });
}
