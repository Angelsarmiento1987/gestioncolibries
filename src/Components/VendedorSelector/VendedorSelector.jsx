import React, { useEffect, useState, useCallback } from "react";
import { Form } from "react-bootstrap";
import { collection, getDocs } from "firebase/firestore";
import { FIRESTORE_DB } from "../../Database/Database";

// 🔑 CORRECCIÓN: Función auxiliar para inicializar el estado de forma segura
const getInitialVendedorId = () => {
  const storedVendedor = localStorage.getItem("vendedorActivo");

  // 1. Verificar que el valor no sea nulo, ni la cadena literal "undefined"
  if (storedVendedor && storedVendedor !== 'undefined') {
    try {
      // 2. Intentar parsear el JSON de forma segura
      return JSON.parse(storedVendedor)?.id || "";
    } catch (e) {
      // 3. En caso de JSON corrupto, loguear el error y retornar cadena vacía
      console.error("Error al parsear vendedorActivo:", e);
      return ""; 
    }
  }
  
  // 4. Si es nulo o "undefined", retorna cadena vacía
  return "";
};

const VendedorSelector = ({ onSelect }) => {
  const [vendedores, setVendedores] = useState([]);
  const [seleccion, setSeleccion] = useState(getInitialVendedorId()); 

  // Cargar vendedores activos
  const loadVendedores = useCallback(async () => {
    const querySnapshot = await getDocs(collection(FIRESTORE_DB, "vendedores"));
    const data = querySnapshot.docs
      .map((d) => ({ id: d.id, ...d.data() }))
      .filter((v) => v.estadoLaboral === "activo");

    setVendedores(data);

    // ⭐️ NUEVA LÓGICA: FORZAR SELECCIÓN INICIAL
    // Si no hay un vendedor previamente seleccionado o el ID no existe en la lista,
    // seleccionamos el primero disponible.
    const isSelectionValid = seleccion && data.some(v => v.id === seleccion);
    
    if (!isSelectionValid && data.length > 0) {
      const firstVendedor = data[0];
      setSeleccion(firstVendedor.id);
      
      // Actualizar localStorage y notificar al componente padre
      localStorage.setItem("vendedorActivo", JSON.stringify(firstVendedor));
      if (onSelect) onSelect(firstVendedor);
      
    } else if (isSelectionValid) {
      // Si la selección es válida, nos aseguramos de notificar al padre (útil para el componente Ventas)
      const currentVendedor = data.find(v => v.id === seleccion);
      if (onSelect && currentVendedor) {
          onSelect(currentVendedor);
      }
    }
  }, [seleccion, onSelect]);

  useEffect(() => {
    loadVendedores();
  }, [loadVendedores]);

  const handleChange = (e) => {
    const id = e.target.value;
    setSeleccion(id);

    const vendedorSeleccionado = vendedores.find((v) => v.id === id);

    // Guardar en LOCAL STORAGE (siempre será un objeto vendedor válido)
    localStorage.setItem("vendedorActivo", JSON.stringify(vendedorSeleccionado));

    // Enviar al padre si hace falta
    if (onSelect) onSelect(vendedorSeleccionado);
  };

  // Solo renderizamos si hay vendedores cargados
  if (vendedores.length === 0) {
      return (
          <Form.Select disabled size="sm">
              <option>Cargando vendedores...</option>
          </Form.Select>
      );
  }

  return (
    <Form.Select value={seleccion} onChange={handleChange} size="sm">
      {/* ❌ ELIMINADA: Se ha quitado la opción 'Seleccionar vendedor...' 
          para forzar la selección de uno de la lista. */}
          
      {vendedores.map((v) => (
        <option key={v.id} value={v.id}>
          {v.nombre}
        </option>
      ))}
    </Form.Select>
  );
};

export default VendedorSelector;