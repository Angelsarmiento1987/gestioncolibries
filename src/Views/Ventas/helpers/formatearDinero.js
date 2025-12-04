

export function formatARS(n) {
  if (n === null || n === undefined) return "ARS 0";
  const num = Number(n) || 0;
  return "ARS " + num.toLocaleString("es-AR", { maximumFractionDigits: 0 });
}
