

export function generarIDTicket() {
  const now = new Date();
  const YY = String(now.getFullYear()).slice(-2);
  const MM = String(now.getMonth() + 1).padStart(2, "0");
  const DD = String(now.getDate()).padStart(2, "0");
  const hh = String(now.getHours()).padStart(2, "0");
  const mm = String(now.getMinutes()).padStart(2, "0");
  const ss = String(now.getSeconds()).padStart(2, "0");
  const rnd = Math.floor(Math.random() * 9000) + 1000;
  return `T${YY}${MM}${DD}-${hh}${mm}${ss}-${rnd}`;
}
