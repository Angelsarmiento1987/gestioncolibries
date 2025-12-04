import React, { useEffect, useState, useMemo, useRef, useCallback } from "react";
// ⭐️ CAMBIO 1: Importar doc, getDoc, updateDoc, arrayUnion, QUERY y WHERE
import { FIRESTORE_DB } from "../../Database/Database";
import { collection, getDocs, doc, getDoc, updateDoc, arrayUnion, query, where } from "firebase/firestore"; 
import { NavBarDashboard } from "../../Components/NavBarDashboard/NavBarDashboard";
import { FooterDashboard } from "../../Components/FooterDashboard/FooterDashboard";

import { Container, Row, Col, Card, Button, Spinner, Form, Alert } from "react-bootstrap";

import { BuscadorProductos } from "./components/BuscadorProductos";
import { ListaProductos } from "./components/ListaProductos";
import { Carrito } from "./components/Carrito";
import { MetodoPago } from "./components/MetodoPago";
import { TicketA4 } from "./components/TicketA4";
import { AtajosPOS } from "./components/AtajosPOS";

import { generarIDTicket } from "./helpers/generarIDTicket";
import { registrarVenta } from "./api/ventas";

const Ventas = () => {
  const [productos, setProductos] = useState([]);
  const [filtros, setFiltros] = useState({ codigo: "", categoria: "", proveedor: "", nombre: "" });
  const [carrito, setCarrito] = useState([]);

  const [metodoPago, setMetodoPago] = useState("efectivo");
  const [descuentoAplicado, setDescuentoAplicado] = useState(0);

  // 🔹 ESTADOS PROMO
  const [promoDescuento, setPromoDescuento] = useState(0); // porcentaje
  const [motivoPromo, setMotivoPromo] = useState("");

  const [cliente, setCliente] = useState("");
  const [estado, setEstado] = useState("completada");

  const [loading, setLoading] = useState(false);
  const [ticketToPrint, setTicketToPrint] = useState(null);

  const buscadorRef = useRef(null);

  // 🔹 NUEVOS ESTADOS NOTA DE CRÉDITO
  const [ncIDIngresado, setNcIDIngresado] = useState("");
  const [notaCreditoActiva, setNotaCreditoActiva] = useState(null); // Objeto NC fetched
  const [errorNC, setErrorNC] = useState(null);

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

  const limpiarFiltros = () => setFiltros({ codigo: "", categoria: "", proveedor: "", nombre: "" });

  const limpiarCarrito = () => {
    setCarrito([]);
    setTicketToPrint(null);
    setCliente("");
    setDescuentoAplicado(0);
    setPromoDescuento(0);
    setMotivoPromo("");
    setMetodoPago("efectivo");
    // ⭐️ Limpiar estado de NC
    setNcIDIngresado("");
    setNotaCreditoActiva(null);
    setErrorNC(null);
  };

  const totalSinDescuento = carrito.reduce(
    (s, it) => s + (Number(it.precioFinal || 0) * it.cantidad),
    0
  );

  const gananciaBruta = carrito.reduce((s, it) => {
    const costo = Number(it.precioCosto || 0);
    const precioUnit = Number(it.precioFinal || 0);
    return s + ((precioUnit - costo) * it.cantidad);
  }, 0);

  // 🔹 TOTAL BRUTO (Antes de aplicar NC)
  const totalFinalBruto = Math.max(
    0,
    totalSinDescuento - (descuentoAplicado || 0) - Math.round(totalSinDescuento * ((promoDescuento || 0) / 100))
  );

  // 🔹 CÁLCULO DE MONTO DE NC A APLICAR
  const montoNCUsado = useMemo(() => {
    if (!notaCreditoActiva) return 0;
    // El monto a usar es el mínimo entre:
    // 1. El total de la venta (bruto)
    // 2. El saldo restante de la Nota de Crédito
    return Math.min(totalFinalBruto, notaCreditoActiva.montoRestante);
  }, [notaCreditoActiva, totalFinalBruto]);

  // 🔹 TOTAL FINAL (Bruto - Monto NC Aplicado)
  const totalFinal = Math.max(0, totalFinalBruto - montoNCUsado);


  // 💥 LOGICA NOTA DE CRÉDITO: Función de consulta (MODIFICADA)
  const consultarNotaCredito = useCallback(async (id) => {
    setNotaCreditoActiva(null);
    setErrorNC(null);
    if (!id || id.length < 5) return; 

    let ncSnap = null;
    const ncCollection = collection(FIRESTORE_DB, "notasCredito");
    
    // 1. Intentar buscar por el ID PRÁCTICO (numeroNC)
    try {
        const q = query(ncCollection, where("numeroNC", "==", id));
        const qSnapshot = await getDocs(q);
        
        if (!qSnapshot.empty) {
            ncSnap = qSnapshot.docs[0]; // Tomar el primer resultado
        }
    } catch (e) {
        console.warn("Error searching by numeroNC:", e);
    }
    
    // 2. Si no se encontró por numeroNC, intentar buscar por el ID de Firestore (id)
    // Esto cubre NCs antiguas o si el vendedor pega el hash largo.
    if (!ncSnap) {
        try {
            const ncRef = doc(FIRESTORE_DB, "notasCredito", id);
            const directSnap = await getDoc(ncRef);
            if (directSnap.exists()) {
                 ncSnap = directSnap;
            }
        } catch (e) {
            console.warn("Error searching by Firestore ID:", e);
        }
    }

    if (!ncSnap) {
        setErrorNC("ID/N° de Nota de Crédito no encontrado.");
        return;
    }

    // Continuar con la validación de la NC
    const ncData = { id: ncSnap.id, ...ncSnap.data() };
    
    if (ncData.montoRestante <= 0 || ncData.estado === 'usada') {
        // Usar el número práctico o el ID largo para el mensaje
        const displayId = ncData.numeroNC || ncData.id; 
        setErrorNC(`La NC (${displayId}) ya fue usada o no tiene saldo. Saldo: $${(ncData.montoRestante || 0).toFixed(2)}.`);
        return;
    }
    
    // Si es válida, la guardamos
    setNotaCreditoActiva(ncData);
    setErrorNC(null);

  }, []);

  // 💥 LOGICA NOTA DE CRÉDITO: useEffect para consulta automática
  useEffect(() => {
    // Consultar solo si el ID tiene un formato razonable para evitar spam de consultas.
    if (ncIDIngresado && ncIDIngresado.length > 5) {
        consultarNotaCredito(ncIDIngresado);
    } else {
        setNotaCreditoActiva(null);
        setErrorNC(null);
    }
  }, [ncIDIngresado, consultarNotaCredito]);


  const handleFinalizar = async () => {
    if (carrito.length === 0) return alert("El carrito está vacío.");
    
    // Si el total final es 0, pero no hay NC activa, pedimos método de pago.
    if (totalFinal === 0 && montoNCUsado === 0 && carrito.length > 0) {
        // Esto solo pasaría si el descuento es 100% y no hay NC
        // Si totalFinal es 0 y montoNCUsado es > 0, es un pago con NC, ok.
        // Si totalFinal es > 0, ok.
    }


    const vendedorActivo = JSON.parse(localStorage.getItem("vendedorActivo"));
    if (!vendedorActivo) {
      alert("Debe seleccionar un vendedor antes de realizar ventas.");
      return;
    }

    setLoading(true);

    const ticketId = generarIDTicket();

    const ventaPayload = {
      ticketId,
      productos: carrito.map(it => ({
        idProducto: it.id,
        codigoProducto: it.codigoProducto,
        nombre: it.nombreProducto,
        categoria: it.categoria,                  // ← NUEVO: guarda la categoría del producto
        cantidad: it.cantidad,
        precioUnitario: Number(it.precioFinal || 0),
        subtotal: Number(it.precioFinal || 0) * it.cantidad,
        precioCosto: Number(it.precioCosto || 0),
        stockActual: Number(it.stock || 0)
      })),
      totalSinDescuento,
      descuentoAplicado,
      promoDescuento,
      motivoPromo,
      // ⭐️ Se registra el totalFinal (que incluye el descuento de la NC)
      totalFinal, 
      metodoPago,
      cliente,
      estado,
      vendedor: {
        id: vendedorActivo.id,
        nombre: vendedorActivo.nombre
      },
      // 🔹 NUEVOS CAMPOS NC
      idNotaCreditoUsada: notaCreditoActiva ? notaCreditoActiva.id : null,
      numeroNotaCreditoUsada: notaCreditoActiva ? notaCreditoActiva.numeroNC || notaCreditoActiva.id : null, // ✅ NUEVO: Guardar el número práctico o el ID
      montoCreditoUsado: montoNCUsado,
    };

    try {
      // 1. Registrar Venta
      const res = await registrarVenta(ventaPayload);
      if (!res.success) throw new Error("Error desconocido");
      
      // 💥 LOGICA NOTA DE CRÉDITO: Actualizar estado de la NC si fue usada
      if (notaCreditoActiva && montoNCUsado > 0) {
          const ncRef = doc(FIRESTORE_DB, "notasCredito", notaCreditoActiva.id);
          const nuevoMontoRestante = notaCreditoActiva.montoRestante - montoNCUsado;
          
          let nuevoEstadoNC;
          if (nuevoMontoRestante <= 0) {
              nuevoEstadoNC = 'usada'; // Usada completamente
          } else {
              nuevoEstadoNC = 'parcialmente_usada'; // Usada parcialmente (montoNCUsado > 0 y saldo > 0)
          }

          await updateDoc(ncRef, {
              montoRestante: nuevoMontoRestante,
              estado: nuevoEstadoNC,
              ventasDondeSeUso: arrayUnion({
                  idVenta: res.id,
                  montoAplicado: montoNCUsado,
                  fechaUso: new Date()
              })
          });
      }

      alert("Venta registrada: " + res.id);

      setTicketToPrint({
        ticketId,
        fecha: new Date(),
        productos: ventaPayload.productos,
        totalSinDescuento,
        descuentoAplicado,
        promoDescuento,
        motivoPromo,
        totalFinal,
        metodoPago,
        cliente,
        // ⭐️ Pasar la info de NC al ticket
        idNotaCreditoUsada: ventaPayload.idNotaCreditoUsada,
        numeroNotaCreditoUsada: ventaPayload.numeroNotaCreditoUsada, // ✅ NUEVO: Pasarlo al ticket
        montoCreditoUsado: ventaPayload.montoCreditoUsado,
      });

      await loadProductos();
      setCarrito([]);
    } catch (err) {
      console.error(err);
      alert("Error al finalizar la venta");
    }

    setLoading(false);
  };

  const focusBuscar = () => {
    if (buscadorRef.current) {
      buscadorRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  };

  return (
    <>
      <NavBarDashboard />

      <Container fluid className="py-4" style={{ background: "#f5f7fb", minHeight: "100vh" }}>
        <Row className="mb-3">
          <Col>
            <h3 className="text-primary">Venta al Público</h3>
            <p className="text-muted">POS — Seleccioná productos, elegí método de pago y generá ticket.</p>
          </Col>
        </Row>

        <Row className="mb-3">
          <Col>
            <Card className="shadow-sm border-0 p-3">
              <div ref={buscadorRef}>
                <BuscadorProductos
                  filtros={filtros}
                  setFiltros={setFiltros}
                  categorias={categorias}
                  proveedores={proveedores}
                  onClear={limpiarFiltros}
                />
              </div>
            </Card>
          </Col>
        </Row>

        <Row className="g-4">
          <Col xs={12} md={7}>
            <Card className="shadow-sm border-0">
              <Card.Body>
                <Card.Title>Productos disponibles</Card.Title>
                <Card.Subtitle className="text-muted small mb-3">
                  Lista con código, proveedor, stock, precio final y categoría
                </Card.Subtitle>
                <hr />

                <ListaProductos productos={productosFiltrados} onAgregar={agregarAlCarrito} />
              </Card.Body>
            </Card>
          </Col>

          <Col xs={12} md={5}>
            <Card
              className="shadow-sm border-0"
              style={{
                background: "#d8e9ff",
                borderRadius: "12px"
              }}
            >
              <Card.Body>
                <Card.Title>Carrito</Card.Title>
                <Card.Subtitle className="text-muted small mb-3">
                  Productos seleccionados
                </Card.Subtitle>

                <hr />

                <Carrito
                  carrito={carrito}
                  cambiarCantidad={cambiarCantidad}
                  quitarDelCarrito={quitarDelCarrito}
                  totalSinDescuento={totalSinDescuento}
                  gananciaBruta={gananciaBruta}
                />

                <hr />
                
                {/* 💥 NUEVA SECCIÓN DE NOTA DE CRÉDITO */}
                <Row className="mb-3">
                    <Col>
                        <Card className="p-3 border-secondary" style={{ borderStyle: 'dashed' }}>
                            <Form.Group>
                                <Form.Label className="fw-bold">Aplicar Nota de Crédito (NC)</Form.Label>
                                <div className="d-flex gap-2">
                                    <Form.Control
                                        type="text"
                                        placeholder="Ingresar ID/N° de NC"
                                        value={ncIDIngresado}
                                        onChange={(e) => setNcIDIngresado(e.target.value)}
                                        disabled={carrito.length === 0}
                                    />
                                    {/* Botón para forzar la limpieza si la NC fue cargada */}
                                    {notaCreditoActiva && (
                                        <Button variant="outline-danger" onClick={() => {
                                            setNcIDIngresado("");
                                            setNotaCreditoActiva(null);
                                        }}>
                                            X
                                        </Button>
                                    )}
                                </div>
                            </Form.Group>
                            {/* Mensajes de estado */}
                            {errorNC && <Alert variant="danger" className="mt-2 p-2">{errorNC}</Alert>}
                            {notaCreditoActiva && (
                                <div className="mt-2">
                                    <Alert variant="success" className="p-2 m-0">
                                        <p className="m-0">
                                            NC Válida (
                                            {/* ✅ CAMBIO: Mostrar el número práctico o el ID */}
                                            N°: <strong>{notaCreditoActiva.numeroNC || notaCreditoActiva.id}</strong> | 
                                            Saldo: <strong>${notaCreditoActiva.montoRestante.toFixed(2)}</strong>
                                        </p>
                                        <p className="m-0 text-decoration-underline">
                                            Monto a aplicar en esta venta: <strong>${montoNCUsado.toFixed(2)}</strong>
                                        </p>
                                    </Alert>
                                </div>
                            )}
                        </Card>
                    </Col>
                </Row>
                {/* 💥 FIN SECCIÓN NOTA DE CRÉDITO */}

                <MetodoPago
                  metodoPago={metodoPago}
                  setMetodoPago={setMetodoPago}
                  cliente={cliente}
                  setCliente={setCliente}
                  estado={estado}
                  setEstado={setEstado}
                  totalSinDescuento={totalSinDescuento}
                  descuentoAplicado={descuentoAplicado}
                  setDescuentoAplicado={setDescuentoAplicado}
                  promoDescuento={promoDescuento}
                  setPromoDescuento={setPromoDescuento}
                  motivoPromo={motivoPromo}
                  setMotivoPromo={setMotivoPromo}
                />

                {/* 💥 RESUMEN DE NC APLICADA */}
                {montoNCUsado > 0 && (
                     <div className="d-flex justify-content-between align-items-center mt-3 pt-3 border-top border-secondary border-2">
                        <span className="text-info fw-bold">PAGO CON NOTA DE CRÉDITO</span>
                        <h5 className="m-0 text-info fw-bold">
                            -${montoNCUsado.toFixed(2)}
                        </h5>
                    </div>
                )}
                {/* 💥 FIN RESUMEN NC */}

                {/* 💥 TOTAL FINAL ACTUALIZADO */}
                <div className="d-flex justify-content-between align-items-center mt-3 pt-3 border-top border-dark border-3">
                    <span className="fw-bold">TOTAL FINAL A PAGAR</span>
                    <h3 className="m-0 text-success fw-bold">
                        ${totalFinal.toFixed(2)}
                    </h3>
                </div>


                <div className="mt-3 d-grid gap-2">
                  <Button variant="success" onClick={handleFinalizar} disabled={loading || carrito.length === 0}>
                    {loading ? (
                      <>
                        <Spinner animation="border" size="sm" className="me-2" />
                        Procesando...
                      </>
                    ) : (
                      "Finalizar venta (F2)"
                    )}
                  </Button>

                  <Button variant="outline-secondary" onClick={limpiarCarrito}>
                    Limpiar carrito
                  </Button>

                  {ticketToPrint && (
                    <div className="d-flex justify-content-between align-items-center mt-2">
                      <div>
                        <strong>Último ticket:</strong> {ticketToPrint.ticketId}
                      </div>
                      <TicketA4 venta={{ ...ticketToPrint, fecha: new Date() }} />
                    </div>
                  )}
                </div>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Container>

      <AtajosPOS
        onFocusBuscar={focusBuscar}
        onFinalizarVenta={handleFinalizar}
        onLimpiar={limpiarCarrito}
      />

      <FooterDashboard/>
    </>
  );
};

export { Ventas };