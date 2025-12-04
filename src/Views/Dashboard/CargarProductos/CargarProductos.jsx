import React, { useState } from "react";
import { NavBarDashboard } from '../../../Components/NavBarDashboard/NavBarDashboard';

import { Form, Button, Card, Alert } from "react-bootstrap";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { FIRESTORE_DB } from "../../../Database/Database"
import { FooterDashboard } from "../../../Components/FooterDashboard/FooterDashboard";


// --- UTILITY FUNCTIONS ---

// Función de redondeo al múltiplo de 1000 superior - 100 (Ej: 9900)
const roundToAttractivePrice = (num) => {
    if (num <= 1000) return Math.ceil(num / 100) * 100;
    const roundedUp = Math.ceil(num / 1000) * 1000;
    return roundedUp - 100;
};

// Función robusta para parsear números (maneja comas y puntos)
const parseNumber = (value) => {
    if (value === null || value === undefined || value === "") return 0;
    if (typeof value === "number") return Number(value.toFixed(2));
    let str = value.toString().trim();
    if (str.includes(",") && str.includes(".")) {
      str = str.replace(/\./g, "").replace(",", ".");
    } else if (str.includes(",")) {
      str = str.replace(",", ".");
    }
    const n = Number(str);
    return isNaN(n) ? 0 : Number(n.toFixed(2));
};

// --- COMPONENT ---

const CargarProductos = () => {

     const [producto, setProducto] = useState({
    codigoProducto: "",
    nombreProducto: "",
    proveedor: "",
    categoria: "",
    stock: "",
    precioCosto: "",
    multiplicador: "", // Campo modificado
    precioVenta: 0,    // Nuevo campo (Costo * Multiplicador)
    precioFinal: 0,    // Nuevo campo (Redondeado)
  });

  const [mensaje, setMensaje] = useState(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    // Si el campo es numérico, solo permitir la entrada de números y caracteres de decimales
    if (["stock", "precioCosto", "multiplicador"].includes(name) && value !== "" && !/^[0-9.,]+$/.test(value)) {
        return;
    }

    setProducto((prev) => {
        const newState = { ...prev, [name]: value };

        // Auto-cálculo de precios
        if (["precioCosto", "multiplicador"].includes(name) || name === 'stock') {
            const costo = parseNumber(newState.precioCosto);
            const mult = parseNumber(newState.multiplicador) || 1; // Usar 1 si no hay multiplicador
            const precioVentaCalculado = Number((costo * mult).toFixed(2));
            
            newState.precioVenta = precioVentaCalculado;
            newState.precioFinal = roundToAttractivePrice(precioVentaCalculado);
        }
        
        return newState;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validación simplificada, nos aseguramos que los campos de precio sean válidos (no NaN)
    if (
      !producto.codigoProducto ||
      !producto.nombreProducto ||
      !producto.proveedor ||
      !producto.categoria ||
      !producto.stock ||
      !producto.multiplicador 
    ) {
      setMensaje({ tipo: "error", texto: "Por favor, completá todos los campos obligatorios." });
      return;
    }

    // Parseamos todos los números con la función robusta antes de guardar
    const dataToSave = {
      ...producto,
      stock: parseNumber(producto.stock),
      precioCosto: parseNumber(producto.precioCosto),
      multiplicador: parseNumber(producto.multiplicador),
      precioVenta: producto.precioVenta, // Ya calculado en handleChange
      precioFinal: producto.precioFinal, // Ya calculado en handleChange
      fechaIngreso: serverTimestamp(),
    };
    
    // Verificación final de números (solo para ser extra seguros)
    if (isNaN(dataToSave.precioCosto) || isNaN(dataToSave.multiplicador) || isNaN(dataToSave.precioFinal)) {
        setMensaje({ tipo: "error", texto: "❌ Error de formato en los precios o multiplicador." });
        return;
    }


    try {
      await addDoc(collection(FIRESTORE_DB, "productos"), dataToSave);

      setMensaje({ tipo: "exito", texto: "✅ Producto cargado correctamente." });

      // Limpiar formulario
      setProducto({
        codigoProducto: "",
        nombreProducto: "",
        proveedor: "",
        categoria: "",
        stock: "",
        precioCosto: "",
        multiplicador: "",
        precioVenta: 0,
        precioFinal: 0,
      });
    } catch (error) {
      console.error("Error al cargar producto:", error);
      setMensaje({ tipo: "error", texto: "❌ Error al cargar producto." });
    }
  };




    return(
        <>

        <NavBarDashboard/>


             <Card className="p-4 shadow-sm mt-4 mx-auto" style={{ maxWidth: "600px" }}>
      <h4 className="mb-4 text-center">Cargar nuevo producto</h4>

      {mensaje && (
        <Alert variant={mensaje.tipo === "error" ? "danger" : "success"}>
          {mensaje.texto}
        </Alert>
      )}

      <Form onSubmit={handleSubmit}>
        <Form.Group className="mb-3">
          <Form.Label>Código del producto</Form.Label>
          <Form.Control
            type="text"
            name="codigoProducto"
            value={producto.codigoProducto}
            onChange={handleChange}
            placeholder="Ej: A001"
          />
        </Form.Group>

        <Form.Group className="mb-3">
          <Form.Label>Nombre del producto</Form.Label>
          <Form.Control
            type="text"
            name="nombreProducto"
            value={producto.nombreProducto}
            onChange={handleChange}
            placeholder="Ej: Taza cerámica blanca"
          />
        </Form.Group>

        <Form.Group className="mb-3">
          <Form.Label>Proveedor</Form.Label>
          <Form.Control
            type="text"
            name="proveedor"
            value={producto.proveedor}
            onChange={handleChange}
            placeholder="Ej: Proveedora La Luz"
          />
        </Form.Group>

        <Form.Group className="mb-3">
          <Form.Label>Categoría</Form.Label>
          <Form.Control
            type="text"
            name="categoria"
            value={producto.categoria}
            onChange={handleChange}
            placeholder="Ej: Cocina, Plantas, Decoración..."
          />
        </Form.Group>

        <Form.Group className="mb-3">
          <Form.Label>Stock inicial</Form.Label>
          <Form.Control
            type="text"
            name="stock"
            value={producto.stock}
            onChange={handleChange}
            placeholder="Ej: 10"
          />
        </Form.Group>

        <Form.Group className="mb-3">
          <Form.Label>Precio costo</Form.Label>
          <Form.Control
            type="text"
            name="precioCosto"
            value={producto.precioCosto}
            onChange={handleChange}
            placeholder="Ej: 1500"
          />
        </Form.Group>

        <Form.Group className="mb-3">
          <Form.Label>Multiplicador</Form.Label>
          <Form.Control
            type="text"
            name="multiplicador"
            value={producto.multiplicador}
            onChange={handleChange}
            placeholder="Ej: 1.8 (180% del costo)"
          />
        </Form.Group>
        
        {/* Mostramos el resultado del cálculo para el usuario */}
        <Form.Group className="mb-3">
          <Form.Label className="fw-bold">Precio Venta (Base)</Form.Label>
          <Form.Control
            type="text"
            value={`$${producto.precioVenta.toLocaleString('es-AR', {minimumFractionDigits: 2})}`}
            readOnly
            className="bg-light"
          />
          <Form.Text className="text-muted">
            Costo x Multiplicador. Valor sin redondear.
          </Form.Text>
        </Form.Group>

        <Form.Group className="mb-3">
          <Form.Label className="fw-bold text-primary">Precio FINAL (Redondeado)</Form.Label>
          <Form.Control
            type="text"
            value={`$${producto.precioFinal.toLocaleString('es-AR')}`}
            readOnly
            className="bg-info bg-opacity-10 fw-bold"
          />
          <Form.Text className="text-muted">
            Este es el precio que se usará. Redondeado al múltiplo de 1000 superior - $100.
          </Form.Text>
        </Form.Group>

        <div className="text-center">
          <Button variant="primary" type="submit">
            Guardar producto
          </Button>
        </div>
      </Form>
    </Card>
        
        <FooterDashboard/>
        </>
       
    )
}

export { CargarProductos }