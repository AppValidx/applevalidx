export function getTierFromMemberId(id: string) {
  const num = parseInt(id, 10);

  // FOUNDING CERRADO — solo IDs existentes
  if (num === 1) return "FOUNDING";

  // Todos los nuevos ya no pueden ser FOUNDING
  return "BLACK";
}
