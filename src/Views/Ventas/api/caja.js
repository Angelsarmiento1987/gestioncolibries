import { FIRESTORE_DB } from "../../../Database/Database";
import { doc, getDoc, setDoc, updateDoc, arrayUnion } from "firebase/firestore";

export const getCajaDocRef = (fechaStr) => doc(FIRESTORE_DB, "caja", fechaStr);

export async function openOrCreateCaja(fechaStr, montoInicial = 0) {
  const ref = getCajaDocRef(fechaStr);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    await setDoc(ref, {
      fecha: fechaStr,
      montoInicial: Number(montoInicial) || 0,
      ventas: [],
      totalVendido: 0,
      efectivo: 0,
      tarjeta: 0,
      transferencia: 0,
      mercadoPago: 0,
      modo: 0, // nuevo método
      gananciaTotal: 0,
      cantidadVentas: 0,
    });
    return true;
  }
  return false;
}

export async function registrarVentaEnCaja(fechaStr, ventaResumen) {
  const ref = getCajaDocRef(fechaStr);
  const snap = await getDoc(ref);

  if (!snap.exists()) {
    await setDoc(ref, {
      fecha: fechaStr,
      montoInicial: 0,
      ventas: [ventaResumen.idVenta],
      totalVendido: ventaResumen.total,
      efectivo: ventaResumen.metodoPago === "efectivo" ? ventaResumen.total : 0,
      tarjeta: ventaResumen.metodoPago === "tarjeta" ? ventaResumen.total : 0,
      transferencia: ventaResumen.metodoPago === "transferencia" ? ventaResumen.total : 0,
      mercadoPago: ventaResumen.metodoPago === "mercadopago" ? ventaResumen.total : 0,
      modo: ventaResumen.metodoPago === "modo" ? ventaResumen.total : 0,
      gananciaTotal: ventaResumen.ganancia,
      cantidadVentas: 1,
    });
    return;
  }

  const data = snap.data();
  const updates = {
    totalVendido: (data.totalVendido || 0) + ventaResumen.total,
    gananciaTotal: (data.gananciaTotal || 0) + ventaResumen.ganancia,
    cantidadVentas: (data.cantidadVentas || 0) + 1,
  };

  if (ventaResumen.metodoPago === "efectivo") updates.efectivo = (data.efectivo || 0) + ventaResumen.total;
  if (ventaResumen.metodoPago === "tarjeta") updates.tarjeta = (data.tarjeta || 0) + ventaResumen.total;
  if (ventaResumen.metodoPago === "transferencia") updates.transferencia = (data.transferencia || 0) + ventaResumen.total;
  if (ventaResumen.metodoPago === "mercadopago") updates.mercadoPago = (data.mercadoPago || 0) + ventaResumen.total;
  if (ventaResumen.metodoPago === "modo") updates.modo = (data.modo || 0) + ventaResumen.total;

  await updateDoc(ref, {
    ...updates,
    ventas: arrayUnion(ventaResumen.idVenta),
  });
}
