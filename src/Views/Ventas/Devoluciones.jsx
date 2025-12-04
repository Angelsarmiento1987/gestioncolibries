


import React, { useEffect, useState, useMemo, useRef } from "react";
import { FIRESTORE_DB } from "../../Database/Database";
import { collection, getDocs } from "firebase/firestore";
import { NavBarDashboard } from "../../Components/NavBarDashboard/NavBarDashboard";

import { Container, Row, Col, Card, Button, Spinner } from "react-bootstrap";

import { BuscadorProductos } from "./components/BuscadorProductos";
import { ListaProductos } from "./components/ListaProductos";
import { Carrito } from "./components/Carrito";

import { generarIDTicket } from "./helpers/generarIDTicket";
import { registrarDevolucion } from "../Ventas/apiDevoluciones/registrarDevolucion"; // 🔹 NUEVO

const Devoluciones = () => {
  const [productos, setProductos] = useState([]);
  const [filtros, setFiltros] = useState({ codigo: "", categoria: "", proveedor: "", nombre: "" });
  const [carrito, setCarrito] = useState([]);
  const [loading, setLoading] = useState(false);

  const buscadorRef = useRef(null);

  // 🔹 Cargar productos
  const loadProductos = async () => {
    try {
      const snap = await getDocs(collection(FIRESTORE_DB, "productos"));
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setProductos(list);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    loadProductos();
  }, []);

  const categorias = useMemo(() => {
    const s = new Set();
    productos.forEach(p => p.categoria && s.add(p.categoria));
    return Array.from(s);
  }, [productos]);

  const proveedores = useMemo(() => {
    const s = new Set();
    productos.forEach(p => p.proveedor && s.add(p.proveedor));
    return Array.from(s);
  }, [productos]);

  const productosFiltrados = useMemo(() => {
    return productos.filter(p => {
      if (filtros.codigo && !(String(p.codigoProducto || "").toLowerCase().includes(filtros.codigo.toLowerCase()))) return false;
      if (filtros.categoria && p.categoria !== filtros.categoria) return false;
      if (filtros.proveedor && p.proveedor !== filtros.proveedor) return false;
      if (filtros.nombre && !(String(p.nombreProducto || "").toLowerCase().includes(filtros.nombre.toLowerCase()))) return false;
      return true;
    });
  }, [productos, filtros]);

  const agregarAlCarrito = (prod) => {
    const exists = carrito.find(p => p.id === prod.id);
    if (exists) {
      setCarrito(carrito.map(p => p.id === prod.id ? { ...p, cantidad: p.cantidad + 1 } : p));
    } else {
      setCarrito([...carrito, { ...prod, cantidad: 1 }]);
    }
  };

  const cambiarCantidad = (id, cantidad) => {
    if (cantidad <= 0) return;
    setCarrito(carrito.map(p => p.id === id ? { ...p, cantidad } : p));
  };

  const quitarDelCarrito = (id) => {
    setCarrito(carrito.filter(p => p.id !== id));
  };

  const limpiarCarrito = () => setCarrito([]);

  // 🧮 Total devuelto
  const totalDevolucion = carrito.reduce(
    (s, it) => s + (Number(it.precioFinal || 0) * it.cantidad),
    0
  );

  // 🔹 Finalizar devolución/anulación
  const handleFinalizarDevolucion = async () => {
    if (carrito.length === 0) return alert("No hay productos para devolver.");

    const vendedorActivo = JSON.parse(localStorage.getItem("vendedorActivo"));
    if (!vendedorActivo) return alert("Debe seleccionar un vendedor.");

    setLoading(true);

    const devolucionId = generarIDTicket();

    const payload = {
      devolucionId,
      fecha: new Date(),
      productos: carrito.map(it => ({
        idProducto: it.id,
        nombre: it.nombreProducto,
        cantidad: it.cantidad,
        precioUnitario: Number(it.precioFinal || 0),
        subtotal: Number(it.precioFinal || 0) * it.cantidad
      })),
      total: totalDevolucion,
      vendedor: vendedorActivo,
      tipo: "devolucion",
      motivo: "cliente devuelve producto"
    };

    try {
      const res = await registrarDevolucion(payload);
      if (!res.success) throw new Error("Error al registrar devolución");

      alert("Devolución registrada correctamente");

      await loadProductos();
      limpiarCarrito();

    } catch (err) {
      console.error(err);
      alert("Error al procesar la devolución");
    }

    setLoading(false);
  };

  return (
    <>
      <NavBarDashboard />

      <Container fluid className="py-4" style={{ background: "#f5f7fb", minHeight: "100vh" }}>
        <Row className="mb-3">
          <Col>
            <h3 className="text-danger">Devoluciones / Anulaciones</h3>
            <p className="text-muted">Seleccioná productos y registrá devolución.</p>
          </Col>
        </Row>

        <Row className="mb-3">
          <Col>
            <Card className="shadow-sm border-0 p-3">
              <BuscadorProductos
                filtros={filtros}
                setFiltros={setFiltros}
                categorias={categorias}
                proveedores={proveedores}
                onClear={() => setFiltros({ codigo: "", categoria: "", proveedor: "", nombre: "" })}
              />
            </Card>
          </Col>
        </Row>

        <Row className="g-4">
          <Col xs={12} md={7}>
            <Card className="shadow-sm border-0">
              <Card.Body>
                <Card.Title>Productos</Card.Title>
                <ListaProductos productos={productosFiltrados} onAgregar={agregarAlCarrito} />
              </Card.Body>
            </Card>
          </Col>

          <Col xs={12} md={5}>
            <Card className="shadow-sm border-0" style={{ background: "#ffe2e2" }}>
              <Card.Body>
                <Card.Title>Productos a devolver</Card.Title>

                <Carrito
                  carrito={carrito}
                  cambiarCantidad={cambiarCantidad}
                  quitarDelCarrito={quitarDelCarrito}
                  totalSinDescuento={totalDevolucion}
                  gananciaBruta={0}
                />

                <div className="mt-3 d-grid gap-2">
                  <Button variant="danger" onClick={handleFinalizarDevolucion} disabled={loading}>
                    {loading ? "Procesando..." : "Registrar devolución"}
                  </Button>

                  <Button variant="outline-secondary" onClick={limpiarCarrito}>
                    Limpiar
                  </Button>
                </div>

              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Container>
    </>
  );
};

export { Devoluciones };
