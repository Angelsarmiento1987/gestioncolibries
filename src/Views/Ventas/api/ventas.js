import { FIRESTORE_DB } from "../../../Database/Database";
import { 
  collection, 
  addDoc, 
  updateDoc, 
  doc, 
  Timestamp,
  getDoc
} from "firebase/firestore";
import { registrarVentaEnCaja } from "./caja";

/**
 * registrarVenta:
 * - crea doc en 'ventas'
 * - actualiza stock (si estado === 'completada')
 * - actualiza caja diaria
 *
 * ventaData must include:
 * {
 *   productos: [{ idProducto, nombre, cantidad, precioUnitario, subtotal, precioCosto }],
 *   totalSinDescuento, descuentoAplicado, totalFinal,
 *   metodoPago, cliente, estado, ticketId, usuario
 * }
 */
export async function registrarVenta(ventaData) {
  try {
    const ventasRef = collection(FIRESTORE_DB, "ventas");
    const ventaDoc = {
      ...ventaData,
      fecha: Timestamp.now()
    };

    const docRef = await addDoc(ventasRef, ventaDoc);

    // Si la venta está completada, actualizamos stock
    if (ventaData.estado === "completada") {
      for (const item of ventaData.productos) {
        const prodRef = doc(FIRESTORE_DB, "productos", item.idProducto);

        // Obtener stock actual desde firestore
        const prodSnap = await getDoc(prodRef);
        const stockActual = prodSnap.exists() ? prodSnap.data().stock ?? 0 : 0;

        // NUEVA LÓGICA: permitimos stock negativo
        const nuevoStock = stockActual - item.cantidad;

        try {
          await updateDoc(prodRef, { stock: nuevoStock });
        } catch (err) {
          console.error("Error actualizando stock:", err);
        }
      }
    }

    // Actualizar caja diaria
    const fechaStr = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    const gananciaTotal = ventaData.productos.reduce(
      (s, it) => s + ((it.precioUnitario - (it.precioCosto || 0)) * it.cantidad),
      0
    );

    await registrarVentaEnCaja(fechaStr, {
      idVenta: docRef.id,
      total: ventaData.totalFinal,
      metodoPago: ventaData.metodoPago,
      ganancia: gananciaTotal
    });

    return { success: true, id: docRef.id };

  } catch (error) {
    console.error("registrarVenta error", error);
    return { success: false, error };
  }
}
