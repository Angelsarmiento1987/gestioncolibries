

import { FIRESTORE_DB } from "../../../Database/Database";
import { collection, addDoc, doc, updateDoc } from "firebase/firestore";

export const registrarDevolucion = async (data) => {
  try {
    // Guardar registro
    const ref = await addDoc(collection(FIRESTORE_DB, "devoluciones"), data);

    // Reponer stock
    for (const item of data.productos) {
      const prodRef = doc(FIRESTORE_DB, "productos", item.idProducto);
      await updateDoc(prodRef, {
        stock: item.cantidad + item.stockActual
      });
    }

    return { success: true, id: ref.id };

  } catch (error) {
    console.error(error);
    return { success: false };
  }
};
