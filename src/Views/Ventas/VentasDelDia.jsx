// VentasDelDia.jsx
import React, { useEffect, useState } from "react";
import {
  collection,
  getDocs,
  doc,
  updateDoc,
  addDoc,
  arrayUnion,
  increment,
  Timestamp,
} from "firebase/firestore";
import { useNavigate } from "react-router-dom"; 
import { FIRESTORE_DB } from "../../Database/Database";
import { NavBarDashboard } from "../../Components/NavBarDashboard/NavBarDashboard";
import { FooterDashboard } from "../../Components/FooterDashboard/FooterDashboard";
import {
  Container,
  Row,
  Col,
  Card,
  Table,
  Spinner,
  Badge,
  Form,
  Button,
  Modal,
  Alert, 
} from "react-bootstrap";
// CHARTS
import { Bar, Line } from "react-chartjs-2"; 
import {
  Chart as ChartJS,
  BarElement,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
} from "chart.js";
// EXPORTS
import * as XLSX from "xlsx";
ChartJS.register(
  BarElement,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend
);

// Estilo custom para Badge MODO (si no está definido en tu CSS)
const ModoBadge = (props) => (
  <Badge
    style={{ backgroundColor: "#ffc0cb", color: "#333" }}
    {...props}
  >
    MODO
  </Badge>
);

// Colores personalizados para las tarjetas de resumen (KPIs)
const cardStyles = {
    totalCaja: {
        borderLeft: '5px solid #198754', // Green
        icon: '💰',
        textClass: 'text-success'
    },
    efectivo: {
        borderLeft: '5px solid #ffc107', // Yellow
        icon: '💵',
        textClass: 'text-warning'
    },
    tarjeta: {
        borderLeft: '5px solid #0d6efd', // Blue
        icon: '💳',
        textClass: 'text-primary'
    },
    otros: {
        borderLeft: '5px solid #0dcaf0', // Cyan
        icon: '📲',
        textClass: 'text-info'
    },
    ncUsadas: {
        backgroundColor: '#f3e5f5', // Light Purple background
        borderLeft: '5px solid #9c27b0', // Purple border
        icon: '🟣',
        textClass: 'text-dark'
    }
};

// Componente helper para las tarjetas de resumen
const KPICard = ({ title, amount, style, children }) => (
    <Card className="shadow-lg p-3 border-0 h-100" style={{...style, transition: '0.3s'}}>
        <div className="d-flex justify-content-between align-items-center mb-2">
            <h6 className="text-uppercase text-muted">{title}</h6>
            <span className={`fs-4 ${style.textClass || 'text-dark'}`}>{style.icon}</span>
        </div>
        <h3 className={`fw-bold ${style.textClass || 'text-dark'}`}>
            {amount}
        </h3>
        {children}
    </Card>
);

// -------------------------------------------------------------
// MODAL DE IMPRESIÓN 
// -------------------------------------------------------------
const ModalImprimirTicket = ({ show, handleClose, venta }) => {
  const handlePrint = () => {
    // 💡 AQUÍ DEBE IR LA LOGICA PARA LLAMAR A TU COMPONENTE DE IMPRESIÓN (TicketPrint)
    alert(
      `Simulando impresión del ticket ${venta.ticketId || venta.id}. \n\nDebes agregar la lógica de impresión real aquí.`
    );
    handleClose();
  };

  if (!venta) return null;

  const fechaObj = venta.fecha ? (venta.fecha instanceof Timestamp ? venta.fecha.toDate() : new Date(venta.fecha)) : null;

  return (
    <Modal show={show} onHide={handleClose} size="lg">
      <Modal.Header closeButton>
        <Modal.Title>
          Imprimir Ticket - Venta: {venta.ticketId || venta.id}
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <h5>Detalle de la Venta</h5>
        <p>
          Fecha: {fechaObj?.toLocaleDateString("es-AR")} -{" "}
          {fechaObj?.toLocaleTimeString("es-AR")}
        </p>
        <p>Vendedor: {venta.vendedor?.nombre}</p>
        <Table size="sm" bordered striped>
          <thead>
            <tr>
              <th>Producto</th>
              <th>Cant.</th>
              <th>Precio Unit. Ref</th>
              <th>Subtotal</th>
            </tr>
          </thead>
          <tbody>
            {venta.productos.map((p, idx) => (
              <tr key={idx}>
                <td>{p.nombre}</td>
                <td>{p.cantidad}</td>
                <td>${p.precioUnitario.toFixed(2)}</td>
                <td>${p.subtotal.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </Table>
        <h4 className="text-end mt-3">
          Total Final Pagado: ${venta.totalFinal?.toFixed(2)}
        </h4>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={handleClose}>
          Cerrar
        </Button>
        <Button variant="primary" onClick={handlePrint}>
          Confirmar e Imprimir
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

// -------------------------------------------------------------
const VentasDelDia = () => {
  // ventas para la fecha seleccionada
  const [ventasHoy, setVentasHoy] = useState([]);
  const [ventasAnuladasHoy, setVentasAnuladasHoy] = useState([]); 
  const [loading, setLoading] = useState(true);

  // ✅ 1. ESTADO: Total de dinero USADO de Notas de Crédito como forma de pago
  const [totalNCUsadas, setTotalNCUsadas] = useState(0); 

  // UI filtros
  const [fechaSeleccionada, setFechaSeleccionada] = useState(() => {
    return new Date().toLocaleDateString("en-CA"); // "YYYY-MM-DD"
  });
  const [filtroMetodo, setFiltroMetodo] = useState("todos");
  const [filtroVendedor, setFiltroVendedor] = useState("todos");

  // Modal devolución
  const [showDevolucionModal, setShowDevolucionModal] = useState(false);
  const [ventaSeleccionada, setVentaSeleccionada] = useState(null);
  const [cantidadesDevolver, setCantidadesDevolver] = useState({});
  const [procesandoDevolucion, setProcesandoDevolucion] = useState(false);

  // Modal anulación
  const [showAnularModal, setShowAnularModal] = useState(false);
  const [procesandoAnulacion, setProcesandoAnulacion] = useState(false);

  // Modal impresión
  const [showImprimirModal, setShowImprimirModal] = useState(false);
  
  const navigate = useNavigate(); 

  // Cargar ventas (filtradas por fechaSeleccionada)
  const cargarVentasDelDia = async () => {
    setLoading(true);
    try {
      // 1. Cargar Ventas
      const snapVentas = await getDocs(collection(FIRESTORE_DB, "ventas"));
      const listaBruta = snapVentas.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .filter((v) => {
          if (!v.fecha) return false;
          const fechaObj = v.fecha instanceof Timestamp ? v.fecha.toDate() : new Date(v.fecha);
          const fechaVentaStr = fechaObj.toLocaleDateString("en-CA");
          // Filtramos solo por fecha (el estado se separa después)
          return fechaVentaStr === fechaSeleccionada;
        })
        .sort((a, b) => {
          // Asumiendo que 'fecha' tiene el método 'toDate()' si es un objeto Timestamp
          const fa = a.fecha?.toDate ? a.fecha.toDate().getTime() : new Date(a.fecha).getTime();
          const fb = b.fecha?.toDate ? b.fecha.toDate().getTime() : new Date(b.fecha).getTime();
          return fb - fa;
        });

      // Separamos ventas activas y anuladas
      const listaVentasActivas = listaBruta.filter(v => v.estado !== "anulada");
      const listaVentasAnuladas = listaBruta.filter(v => v.estado === "anulada");

      setVentasHoy(listaVentasActivas);
      setVentasAnuladasHoy(listaVentasAnuladas);
      
      // 2. Calcular el monto total USADO de Notas de Crédito como pago ese día.
      const totalCreditoUsadoEnVentas = listaVentasActivas.reduce((sum, v) => sum + (v.montoCreditoUsado || 0), 0);
      setTotalNCUsadas(totalCreditoUsadoEnVentas); 
      
    } catch (e) {
      console.error("Error cargando ventas:", e);
      setVentasHoy([]);
      setVentasAnuladasHoy([]);
      setTotalNCUsadas(0); 
    }
    setLoading(false);
  };

  useEffect(() => {
    cargarVentasDelDia();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fechaSeleccionada]);

  // Lógica de filtros actualizada para incluir Nota de Crédito
  const ventasFiltradas = ventasHoy.filter((v) => {
    let metodoOK = filtroMetodo === "todos";
    
    if (filtroMetodo !== "todos") {
        if (filtroMetodo === "notacredito") {
            // Si se filtra por Nota de Crédito, chequea si la venta tiene un monto de NC usado > 0
            metodoOK = (v.montoCreditoUsado || 0) > 0;
        } else {
            // Para los métodos de pago normales, usa el campo metodoPago
            metodoOK = v.metodoPago === filtroMetodo;
        }
    }

    const vendOK =
      filtroVendedor === "todos" ||
      (v.vendedor && v.vendedor.nombre === filtroVendedor);
    return metodoOK && vendOK;
  });

  // cálculos para gráficos y resumen
  const totalPorMetodo = (metodo) =>
    ventasFiltradas
      .filter((v) => v.metodoPago === metodo)
      .reduce((acc, v) => acc + (v.totalFinal || 0), 0);
  
  // ---------------- NUEVO: cantidad de ventas por método ----------------
  const cantidadPorMetodo = (metodo) =>
    ventasFiltradas.filter((v) => v.metodoPago === metodo).length;
  // --------------------------------------------------------------------

  const totalCaja = ventasFiltradas.reduce(
    (acc, v) => acc + (v.totalFinal || 0),
    0
  );
  const totalEfectivo = totalPorMetodo("efectivo");
  const totalTarjeta = totalPorMetodo("tarjeta");
  const totalTransferencia = totalPorMetodo("transferencia");
  const totalMercadoPago = totalPorMetodo("mercadopago");
  const totalModo = totalPorMetodo("modo");

  // Cantidades (nuevas)
  const cantEfectivo = cantidadPorMetodo("efectivo");
  const cantTarjeta = cantidadPorMetodo("tarjeta");
  const cantTransferencia = cantidadPorMetodo("transferencia");
  const cantMercadoPago = cantidadPorMetodo("mercadopago");
  const cantModo = cantidadPorMetodo("modo");

  // CÁLCULO: Métricas para ventas anuladas
  const totalAnuladasCount = ventasAnuladasHoy.length;
  const totalAnuladoMonto = ventasAnuladasHoy.reduce(
    (acc, v) => acc + (v.totalFinal || 0),
    0
  );


  // datos para mostrar (mapeo productos)
  const ventasUnificadas = ventasFiltradas.map((v) => {
    const descuentoPromo =
      v.promoDescuento && v.totalSinDescuento
        ? Math.round((v.totalSinDescuento * v.promoDescuento) / 100)
        : 0;
    // Calcular descuento en efectivo
    const descuentoEfectivo = v.totalSinDescuento
      ? Math.max(
          0,
          (v.totalSinDescuento - v.totalFinal - descuentoPromo - (v.montoCreditoUsado || 0)) || 0
        )
      : 0;
    return {
      ...v,
      descuentoPromo,
      descuentoEfectivo,
      productosDetalle:
        v.productos?.map((p) => ({
          codigo: p.codigoProducto,
          nombre: p.nombre,
          cantidad: p.cantidad,
          subtotal: p.subtotal,
          idProducto: p.idProducto,
          precioUnitario: p.precioUnitario,
        })) || [],
    };
  });

  // gráficos
  const dataBarras = {
    labels: [
      "Efectivo",
      "Tarjeta",
      "Mercado Pago",
      "Transferencia",
      "MODO",
    ],
    datasets: [
      {
        label: "Total por método ($)",
        data: [
          totalEfectivo,
          totalTarjeta,
          totalMercadoPago,
          totalTransferencia,
          totalModo,
        ],
        backgroundColor: [
          "#ffc107", // Efectivo: Amarillo
          "#0d6efd", // Tarjeta: Azul
          "#198754", // MP: Verde oscuro (cambiado de amarillo para más contraste con Efectivo)
          "#0dcaf0", // Transferencia: Cyan
          "#ffc0cb", // MODO: Rosa
        ],
      },
    ],
  };

  // Opcional: gráfico de cantidad por método
  const dataBarrasCantidad = {
    labels: ["Efectivo", "Tarjeta", "Mercado Pago", "Transferencia", "MODO"],
    datasets: [
      {
        label: "Cantidad de ventas",
        data: [cantEfectivo, cantTarjeta, cantMercadoPago, cantTransferencia, cantModo],
        backgroundColor: ["#ffc107", "#0d6efd", "#198754", "#0dcaf0", "#ffc0cb"],
      },
    ],
  };

  const horas = {};
  ventasFiltradas.forEach((v => {
    const fechaObj = v.fecha?.toDate ? v.fecha.toDate() : new Date(v.fecha);
    if (fechaObj && !isNaN(fechaObj.getTime())) { 
      const h = fechaObj.getHours();
      horas[h] = (horas[h] || 0) + (v.totalFinal || 0);
    }
  }));

  // Ordenar las horas para la gráfica
  const horasOrdenadas = Object.keys(horas).sort((a, b) => Number(a) - Number(b));

  const dataLineas = {
    labels: horasOrdenadas,
    datasets: [
      {
        label: "Ventas por hora ($)",
        data: horasOrdenadas.map((h) => horas[h]),
        borderColor: "#9c27b0", // Morado
        backgroundColor: "rgba(156, 39, 176, 0.1)",
        tension: 0.3,
        fill: true,
      },
    ],
  };

  // Exportar Excel 
  const exportarExcel = () => {
    const detalleVentas = [];
    ventasUnificadas.forEach((v) => {
      const fechaObj = v.fecha?.toDate ? v.fecha.toDate() : new Date(v.fecha);
      const fechaStr = fechaObj ? fechaObj.toLocaleDateString("es-AR") : "—";
      const horaStr = fechaObj ? fechaObj.toLocaleTimeString("es-AR") : "—";
      v.productosDetalle.forEach((p) => {
        detalleVentas.push({
          Fecha: fechaStr,
          Hora: horaStr,
          Vendedor: v.vendedor?.nombre || "—",
          MetodoPago: v.metodoPago,
          CodigoProducto: p.codigo,
          Producto: p.nombre,
          Cantidad: p.cantidad,
          Subtotal: p.subtotal,
          TotalVenta: v.totalFinal,
          DescEfectivo: v.descuentoEfectivo,
          DescPromo: v.descuentoPromo,
          MotivoPromo: v.motivoPromo || "",
          // Campo para el excel: Uso el campo de la colección
          MontoNCUsado: v.montoCreditoUsado || 0,
          NumeroNCUsada: v.numeroNotaCreditoUsada || "", 
        });
      });
    });

    const cierreCaja = [
      { Concepto: "Total Caja (Medios Efectivos)", Monto: totalCaja },
      { Concepto: "Efectivo", Monto: totalEfectivo },
      { Concepto: "Tarjeta", Monto: totalTarjeta },
      { Concepto: "Mercado Pago", Monto: totalMercadoPago },
      { Concepto: "Transferencia", Monto: totalTransferencia },
      { Concepto: "MODO", Monto: totalModo },
      // Cierre de caja con NC
      { 
          Concepto: `Total Notas Crédito Usadas (NO ES EFECTIVO DE CAJA)`, 
          Monto: totalNCUsadas 
      }, 
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet(detalleVentas),
      "Ventas Detalladas"
    );
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet(cierreCaja),
      "Cierre de Caja"
    );
    XLSX.writeFile(wb, `ventas_${fechaSeleccionada}.xlsx`);
  };

  const vendedoresUnicos = [
    ...new Set(
      ventasHoy.map((v) => v.vendedor?.nombre).filter(Boolean)
    ),
  ];

  const badgeMetodo = (m) => {
    switch (m) {
      case "efectivo":
        return <Badge bg="warning" text="dark" className="fw-bold">Efectivo</Badge>;
      case "tarjeta":
        return <Badge bg="primary" className="fw-bold">Tarjeta</Badge>;
      case "transferencia":
        return <Badge bg="info" className="fw-bold">Transferencia</Badge>;
      case "mercadopago":
        return (
          <Badge bg="success" text="light" className="fw-bold">
            Mercado Pago
          </Badge>
        );
      case "modo":
        return <ModoBadge className="fw-bold" />;
      default:
        return m;
    }
  };

  // ---------- ACCIONES Modal Impresión ----------
  const abrirModalImprimir = (venta) => {
    setVentaSeleccionada(venta);
    setShowImprimirModal(true);
  };

  const cerrarModalImprimir = () => {
    setShowImprimirModal(false);
    setVentaSeleccionada(null);
  };

  // HELPER: Para calcular el factor de descuento (clave para la nota de crédito)
  const getDescuentoFactor = (venta) => {
    if (!venta || !venta.productos) return 1;
    // 1. Calcular el total BRUTO de la venta (suma de precioUnitario * cantidad)
    const totalVentaBruto = venta.productos.reduce((sum, p) => sum + (p.cantidad * (p.precioUnitario || 0)), 0);
    // 2. Calcular el total neto (totalFinal) sumando el monto de NC usado, si existe. 
    const totalVentaNetoPagado = (venta.totalFinal || 0) + (venta.montoCreditoUsado || 0); 

    // 3. Si hay un monto bruto y el monto neto es menor (hay descuento), calcular el factor (ej: 0.9 para 10% desc.)
    if (totalVentaBruto > 0 && totalVentaNetoPagado < totalVentaBruto) {
        // Se usa el total neto *pagado* para calcular el factor de descuento (promocional/efectivo)
        return totalVentaNetoPagado / totalVentaBruto;
    }
    return 1;
  };
  
  // NUEVO HELPER: Calcula la cantidad total devuelta de un producto específico en una venta
  const getCantidadYaDevuelta = (venta, idProducto) => {
    // Si no hay array 'devoluciones' o está vacío, no se devolvió nada.
    if (!venta.devoluciones || venta.devoluciones.length === 0) return 0;

    let devueltoTotal = 0;
    
    // Sumar items de TODAS las devoluciones registradas en esta venta
    venta.devoluciones.forEach(devolucion => {
      // Buscar el producto en los items de cada nota de crédito
      const item = devolucion.items.find(it => it.idProducto === idProducto);
      if (item) {
        devueltoTotal += item.cantidad;
      }
    });

    return devueltoTotal;
  };

  // ---------- HELPERS y ACCIONES (Devolución) ----------
  const abrirModalDevolucion = (venta) => {
    // MODIFICACIÓN CLAVE: Inyectar la cantidad disponible a devolver
    const ventaConMaximos = {
        ...venta,
        productos: venta.productos.map(p => {
            const yaDevuelto = getCantidadYaDevuelta(venta, p.idProducto);
            return {
                ...p,
                // Campo clave: cantidad vendida menos cantidad ya devuelta
                cantidadDisponibleDevolver: p.cantidad - yaDevuelto, 
                cantidadYaDevuelta: yaDevuelto, // Para mostrar al usuario
            }
        })
    };

    setVentaSeleccionada(ventaConMaximos);
    
    const mapa = {};
    // Inicializar cantidades a devolver a 0
    (ventaConMaximos.productos || []).forEach((p) => {
      // Solo inicializar si queda algo por devolver
      if (p.cantidadDisponibleDevolver > 0) { 
          mapa[p.idProducto] = 0;
      }
    });
    setCantidadesDevolver(mapa);
    setShowDevolucionModal(true);
  };

  const cerrarModalDevolucion = () => {
    setShowDevolucionModal(false);
    setVentaSeleccionada(null);
    setCantidadesDevolver({});
    setProcesandoDevolucion(false);
  };

  // Maneja el cambio de cantidad a devolver, aplicando el máximo.
  const handleCantidadDevolver = (idProducto, valor, max) => {
    let v = Number(valor) || 0;
    if (v < 0) v = 0;
    if (v > max) v = max;
    setCantidadesDevolver((prev) => ({ ...prev, [idProducto]: v }));
  };

  // Procesar devolución parcial: actualizar stock, crear nota de crédito y actualizar venta
  const procesarDevolucion = async () => {
    if (!ventaSeleccionada) return;
    const items = ventaSeleccionada.productos || [];

    // CLAVE: Calculamos el factor de descuento para aplicar a los productos
    const factorDescuento = getDescuentoFactor(ventaSeleccionada); 

    // Filtrar solo los productos con cantidad a devolver > 0
    const itemsDevueltos = items
      .map((p) => {
        // Usamos la cantidad Disponible para saber cuánto devolver
        const qty = Number(cantidadesDevolver[p.idProducto] || 0); 
        
        // Aplicamos el factor de descuento calculado al precio unitario bruto.
        const precioUnitarioBruto = p.precioUnitario || 0;
        const precioPostDescuento = precioUnitarioBruto * factorDescuento; 

        return qty > 0 ? {
          idProducto: p.idProducto,
          codigoProducto: p.codigoProducto,
          nombre: p.nombre,
          cantidad: qty,
          precioUnitario: p.precioUnitario, // Precio sin descuento (referencia)
          precioFinalUnitario: precioPostDescuento, // Precio final que pagó por unidad (CLAVE)
          // El subtotal de la devolución se basa en el precio final pagado.
          subtotal: Math.round(qty * precioPostDescuento * 100) / 100,
        } : null;
      })
      .filter(Boolean);

    if (itemsDevueltos.length === 0) {
      return alert("Seleccioná al menos un producto para devolver.");
    }

    const totalDevuelto = itemsDevueltos.reduce(
      (s, it) => s + (it.subtotal || 0),
      0
    );
    const totalDevueltoRedondeado = totalDevuelto.toFixed(2);

    if (
      !window.confirm(
        `Generar nota de crédito por $${totalDevueltoRedondeado} ?`
      )
    ) return;
    
    setProcesandoDevolucion(true);
    try {
      // 1) Actualizar stock por cada producto
      for (const it of itemsDevueltos) {
        try {
          const prodRef = doc(FIRESTORE_DB, "productos", it.idProducto);
          await updateDoc(prodRef, {
            stock: increment(it.cantidad), // Sumar la cantidad devuelta al stock
          });
        } catch (err) {
          console.error(
            "Error actualizando stock de producto",
            it.idProducto,
            err
          );
        }
      }
      
      // -------------------------------------------------------------------
      // 2) CREACIÓN Y REGISTRO DE NOTA DE CRÉDITO
      
      // ✅ CAMBIO CLAVE: GENERAR NÚMERO DE NC FÁCIL DE CARGAR
      const numeroNCGenerado = `NC-${Math.floor(Date.now() / 1000).toString().slice(-6)}`; 
      
      // Payload de la Nota de Crédito
      const ncPayload = {
        idVentaOrigen: ventaSeleccionada.id,
        fechaEmision: Timestamp.now(), 
        cliente: ventaSeleccionada.cliente || null,
        items: itemsDevueltos,
        totalCredito: totalDevuelto,
        // CAMPOS DE SEGUIMIENTO AÑADIDOS
        estado: "emitida", 
        montoRestante: totalDevuelto, 
        historialUso: [], 
        // ✅ CAMPO USADO POR EL USUARIO
        numeroNC: numeroNCGenerado, 
        vendedor: ventaSeleccionada.vendedor || null,
      };

      // Crear el documento de NC y obtener la referencia
      const ncRef = await addDoc(
        collection(FIRESTORE_DB, "notasCredito"),
        ncPayload
      );

      // 3) Actualizar venta original: agregar devoluciones y sumar el total de notaCredito
      const ventaRef = doc(FIRESTORE_DB, "ventas", ventaSeleccionada.id);
      const notaCreditoActual = ventaSeleccionada.notaCredito || 0;
      
      await updateDoc(ventaRef, {
        estado: "devuelta_parcial", 
        // ✅ LÓGICA REQUERIDA: Sumar el monto total de NC en la venta original
        notaCredito: notaCreditoActual + totalDevuelto, 
        devoluciones: arrayUnion({
          fecha: Timestamp.now(),
          idNotaCredito: ncRef.id,
          numeroNotaCredito: numeroNCGenerado, // Usar el número práctico para referencia
          items: itemsDevueltos,
          totalDevuelto,
        }),
      });

      // 4) Registrar movimiento en caja
      await addDoc(collection(FIRESTORE_DB, "movimientosCaja"), {
        tipo: "nota_credito_emitida",
        referenciaVenta: ventaSeleccionada.id,
        referenciaNotaCredito: ncRef.id,
        monto: 0, 
        fecha: Timestamp.now(),
        // Usar numeroNCGenerado para la visualización en movimientos de caja
        detalle: `Nota de crédito por devolución - $${totalDevueltoRedondeado} (NC N°: ${numeroNCGenerado})`,
      });

      // -------------------------------------------------------------------
      alert(`Devolución procesada. Nota de Crédito ${numeroNCGenerado} generada por $${totalDevueltoRedondeado}.`);
      
      setProcesandoDevolucion(false); 
      setShowDevolucionModal(false); 
      // ✅ FIX IMPORTANTE: Recargar las ventas antes de navegar para que la lista se actualice
      cargarVentasDelDia(); 

      // ✅ TU NAVEGACIÓN: Pasar datos a la ruta estática '/imprimir-nota-credito' usando 'state'
      navigate('/imprimir-nota-credito', {
        state: {
          ventaOriginal: ventaSeleccionada,
          itemsDevueltos: itemsDevueltos,
          totalDevuelto: totalDevuelto,
          idNotaCredito: ncRef.id,
          numeroNotaCredito: numeroNCGenerado // Pasar el número de NC práctico
        }
      });
      
      // -------------------------------------------------------------------

    } catch (err) {
      console.error("Error procesando devolución:", err);
      alert("Error al procesar la devolución.");
      setProcesandoDevolucion(false);
    }
  };


  // ---------- ANULAR VENTA COMPLETA ----------
  const abrirModalAnular = (venta) => {
    setVentaSeleccionada(venta);
    setShowAnularModal(true);
  };

  const cerrarModalAnular = () => {
    setShowAnularModal(false);
    setVentaSeleccionada(null);
    setProcesandoAnulacion(false);
  };

  const procesarAnulacion = async () => {
    if (!ventaSeleccionada) return;

    const totalVenta = ventaSeleccionada.totalFinal || 0;

    if (
      !window.confirm(
        `Anular la venta **${ventaSeleccionada.ticketId || ventaSeleccionada.id
        }**? Esto restará $${totalVenta.toLocaleString()} de la caja.`
      )
    ) {
      return;
    }

    setProcesandoAnulacion(true);
    try {
      // 1) Restaurar stock de todos los productos de la venta
      for (const p of ventaSeleccionada.productos || []) {
        try {
          const prodRef = doc(FIRESTORE_DB, "productos", p.idProducto);
          await updateDoc(prodRef, {
            stock: increment(p.cantidad),
          });
        } catch (err) {
          console.error(
            "Error restaurando stock producto",
            p.idProducto,
            err
          );
        }
      }

      // 2) Marcar venta como anulada
      const ventaRef = doc(
        FIRESTORE_DB,
        "ventas",
        ventaSeleccionada.id
      );
      await updateDoc(ventaRef, {
        estado: "anulada",
        anulacion: {
          fecha: Timestamp.now(),
          usuario:
            (ventaSeleccionada.vendedor && ventaSeleccionada.vendedor.nombre) || null,
        },
      });

      // 3) Registrar movimiento en caja (resta el totalFinal)
      await addDoc(collection(FIRESTORE_DB, "movimientosCaja"), {
        tipo: "anulacion_venta",
        referenciaVenta: ventaSeleccionada.id,
        monto: -totalVenta,
        fecha: Timestamp.now(),
        detalle: `Anulación de venta ${ventaSeleccionada.ticketId || ventaSeleccionada.id
          }`,
      });

      alert("Venta anulada correctamente.");
      cerrarModalAnular();
      cargarVentasDelDia();
    } catch (err) {
      console.error("Error anulando venta:", err);
      alert("Error al anular la venta.");
      setProcesandoAnulacion(false);
    }
  };

  // ---------- HELPERS FECHA / CONDICIONES ----------
  const esVentaDeHoy = (venta) => {
  if (!venta?.fecha) return false;

  const fechaVenta = venta.fecha instanceof Timestamp
    ? venta.fecha.toDate()
    : new Date(venta.fecha);

  const hoy = new Date().toLocaleDateString("en-CA");
  const fechaV = fechaVenta.toLocaleDateString("en-CA");

  return fechaV === hoy;
};

  const diasDesdeVenta = (venta) => {
    if (!venta?.fecha) return 999;
    const fechaVenta = venta.fecha instanceof Timestamp ? venta.fecha.toDate() : new Date(venta.fecha);
    const hoy = new Date();
    // Limpiar hora para comparar solo días
    fechaVenta.setHours(0, 0, 0, 0);
    hoy.setHours(0, 0, 0, 0);

    const diffTime = Math.abs(hoy.getTime() - fechaVenta.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const tieneDevoluciones = (venta) => {
  if (!venta) return false;

  const devols =
    venta.devoluciones ||
    venta.itemsDevueltos ||
    venta.detalleDevolucion ||
    venta.historialDevoluciones ||
    [];

  return Array.isArray(devols) && devols.length > 0;
};

  // ---------------------------------------------------
  // RENDERIZADO
  // ---------------------------------------------------

  return (
    <>
      <NavBarDashboard />
      <Container className="my-4">
        <h2 className="mb-4 fw-bold text-primary">Reporte de Ventas Diario</h2>
        
        {/* FILTROS Y EXPORTAR */}
        <Row className="mb-5 g-3 p-3 rounded shadow-sm bg-light">
          <Col md={3}>
            <Form.Label className="fw-bold">Seleccionar fecha:</Form.Label>
            <Form.Control
              type="date"
              value={fechaSeleccionada}
              onChange={(e) => setFechaSeleccionada(e.target.value)}
              className="border-primary"
            />
          </Col>
          <Col md={3}>
            <Form.Label className="fw-bold">Método de Pago:</Form.Label>
            <Form.Select
              value={filtroMetodo}
              onChange={(e) => setFiltroMetodo(e.target.value)}
            >
              <option value="todos">Todos los métodos</option>
              <option value="efectivo">Efectivo</option>
              <option value="tarjeta">Tarjeta</option>
              <option value="mercadopago">Mercado Pago</option>
              <option value="transferencia">Transferencia</option>
              <option value="modo">MODO</option>
              {/* ✅ OPCIÓN DE FILTRO POR NC USADA */}
              <option value="notacredito">Nota de Crédito usada</option>
            </Form.Select>
          </Col>
          <Col md={3}>
            <Form.Label className="fw-bold">Vendedor:</Form.Label>
            <Form.Select
              value={filtroVendedor}
              onChange={(e) => setFiltroVendedor(e.target.value)}
            >
              <option value="todos">Todos los vendedores</option>
              {vendedoresUnicos.map((v, i) => (
                <option key={i} value={v}>
                  {v}
                </option>
              ))}
            </Form.Select>
          </Col>
          <Col md={3} className="d-flex align-items-end">
            <Button
              variant="success"
              onClick={exportarExcel}
              className="w-100 fw-bold shadow"
            >
              📊 Exportar a Excel
            </Button>
          </Col>
        </Row>

        {/* LOADING */}
        {loading ? (
          <div className="text-center mt-5">
            <Spinner animation="border" variant="primary" />
            <p className="mt-2 text-muted">Cargando datos...</p>
          </div>
        ) : (
          <>
            <h4 className="mt-5 mb-3 text-secondary">Resumen Financiero</h4>
            {/* RESUMEN - Fila 1 (Métricas de Venta Activa) */}
            <Row className="mb-4 g-4">
              <Col md={3}>
                  <KPICard 
                      title="Total Caja" 
                      amount={`$${totalCaja.toFixed(2)}`} 
                      style={cardStyles.totalCaja} 
                  >
                    <small className="text-muted">
                      {ventasFiltradas.length} ventas totales
                    </small>
                  </KPICard>
              </Col>
              <Col md={3}>
                  <KPICard 
                      title="Efectivo" 
                      amount={`$${totalEfectivo.toFixed(2)}`} 
                      style={cardStyles.efectivo} 
                  >
                        <small className="text-muted fw-bold">
                          {cantEfectivo} venta(s)
                        </small>
                  </KPICard>
              </Col>
              <Col md={3}>
                  <KPICard 
                      title="Tarjeta" 
                      amount={`$${totalTarjeta.toFixed(2)}`} 
                      style={cardStyles.tarjeta} 
                  >
                        <small className="text-muted fw-bold">
                          {cantTarjeta} venta(s)
                        </small>
                  </KPICard>
              </Col>
              <Col md={3}>
                  <KPICard 
                      title="Otros Pagos" 
                      amount={`$${(totalMercadoPago + totalTransferencia + totalModo).toFixed(2)}`} 
                      style={cardStyles.otros} 
                  >
                        <small className="text-muted mt-2 d-block">
                            MP: $ {totalMercadoPago.toFixed(2)} | {cantMercadoPago} vtas<br />
                            Transf.: $ {totalTransferencia.toFixed(2)} | {cantTransferencia} vtas<br />
                            MODO: $ {totalModo.toFixed(2)} | {cantModo} vtas
                        </small>
                  </KPICard>
              </Col>
            </Row>

          <Row className="mb-4 g-3">

  {/* CARD: NOTAS DE CRÉDITO USADAS */}
  {totalNCUsadas > 0 && (
    <Col md={3}>
      <KPICard
        title="Notas Crédito Usadas"
        amount={`$${totalNCUsadas.toFixed(2)}`}
        style={cardStyles.ncUsadas}
      >
        <small className="text-danger fw-bold mt-2">
          ⚠️ ¡NO ES EFECTIVO DE CAJA!
        </small>
      </KPICard>
    </Col>
  )}

  {/* CARD: VENTAS ANULADAS */}
  {totalAnuladasCount > 0 && (
    <Col md={3}>
      <Card
        className="shadow-lg p-3 border-0"
        style={{ backgroundColor: "#f8d7da", borderLeft: "5px solid #dc3545" }}
      >
        <div className="d-flex justify-content-between align-items-center mb-2">
          <h6 className="text-uppercase text-danger">Ventas Anuladas</h6>
          <span className="fs-4 text-danger">🗑️</span>
        </div>

        <h3 className="text-danger fw-bold">
          {totalAnuladasCount} Venta(s)
        </h3>

        <small className="text-danger mt-2">
          Total anulado: $ {totalAnuladoMonto.toFixed(2)}
        </small>
      </Card>
    </Col>
  )}

</Row>

            
            {/* INICIO DE GRÁFICOS */}
            <h4 className="mt-5 mb-3 text-secondary">Distribución y Flujo</h4>
            <Row className="mb-5 g-4">
                <Col md={6}>
                    <Card className="shadow-lg p-3 border-0">
                        <Card.Title className="text-center text-primary">Total por Método de Pago</Card.Title>
                        <div style={{ height: '300px' }}>
                            <Bar data={dataBarras} options={{ responsive: true, maintainAspectRatio: false }} />
                        </div>
                    </Card>
                </Col>
                <Col md={6}>
                    <Card className="shadow-lg p-3 border-0">
                        <Card.Title className="text-center text-primary">Ventas por Hora</Card.Title>
                        <div style={{ height: '300px' }}>
                            <Line data={dataLineas} options={{ responsive: true, maintainAspectRatio: false }} />
                        </div>
                    </Card>
                </Col>
            </Row>

            {/* Gráfico de cantidad por método (opcional) */}
            <Row className="mb-5 g-4">
              <Col md={6}>
                <Card className="shadow-lg p-3 border-0">
                  <Card.Title className="text-center text-primary">Cantidad de Ventas por Método</Card.Title>
                  <div style={{ height: '260px' }}>
                    <Bar data={dataBarrasCantidad} options={{ responsive: true, maintainAspectRatio: false }} />
                  </div>
                </Card>
              </Col>
            </Row>
            {/* FIN DE GRÁFICOS */}


            {/* LISTADO DE VENTAS */}
            <h4 className="mt-5 mb-3 text-secondary">Ventas Activas ({ventasFiltradas.length})</h4>
            <Row className="g-4">
              {ventasUnificadas.length === 0 && (
                <Col md={12}>
                  <Alert variant="info">
                    No hay ventas activas para la fecha y filtros seleccionados.
                  </Alert>
                </Col>
              )}
              {ventasUnificadas.map((v, i) => {
                const hora = v.fecha?.toDate
                  ? v.fecha.toDate().toLocaleTimeString("es-AR", {
                      hour: "2-digit",
                      minute: "2-digit",
                      hour12: false,
                    })
                  : "--";
                const dias = diasDesdeVenta(v);
                // Permitir devolución hasta 7 días después de la venta
                const puedeDevolver = dias <= 7 && v.estado !== "anulada";
                // Permitir anulación SÓLO el día de la venta
                const puedeAnular = esVentaDeHoy(v) && !tieneDevoluciones(v) && v.estado !== "anulada";
                const esDevueltaParcial = v.estado === "devuelta_parcial";
                
                // Determinamos el color del borde superior
                const cardBorderColor = esDevueltaParcial ? '#ffc107' : '#198754';

                return (
                  <Col md={6} key={i}>
                    <Card
                      className="shadow-lg border-0 h-100"
                      style={{ borderTop: `5px solid ${cardBorderColor}`}}
                    >
                      <Card.Body>
    <div className="d-flex justify-content-between align-items-start mb-2">
        <div className="d-flex flex-column">
            {badgeMetodo(v.metodoPago)}
            <small className="text-muted mt-1">
                Vendedor: <strong>{v.vendedor?.nombre}</strong>
            </small>
        </div>
        <div className="text-end">
            <h5 className="m-0 fw-light">{hora}</h5>
            <small className="text-muted">
                ID: {v.ticketId || v.id.slice(0, 8)}...
            </small>
        </div>
    </div>
    
    {/* 👇 ESTE BLOQUE HA SIDO MEJORADO ESTÉTICAMENTE Y CORREGIDO LÓGICAMENTE 👇 */}
    <div className="d-flex flex-wrap gap-2 mb-2">
        {/* 🟣 Corrección Lógica: Solo muestra si el monto USADO es estrictamente > 0 */}
        {((v.montoCreditoUsado || 0) > 0) && (
            <Badge 
                bg="dark" 
                className="p-2 rounded-pill shadow-sm"
                style={{ backgroundColor: '#9c27b0', color: 'white' }} 
            > 
                <span className="fw-bold">🟣 NC usada: ${v.montoCreditoUsado.toFixed(2)}</span>{" "}
                {v.numeroNotaCreditoUsada && <span className="text-light">(N° {v.numeroNotaCreditoUsada})</span>}
            </Badge>
        )}
        
        {/* Estado de Devolución Parcial */}
        {esDevueltaParcial && (
            <Badge 
                bg="warning" 
                text="dark" 
                className="p-2 rounded-pill fw-bold shadow-sm"
            >
                🔄 DEVOLUCIÓN PARCIAL
            </Badge>
        )}
        
        {/* Descuento Aplicado */}
        {(v.descuentoEfectivo > 0 || v.descuentoPromo > 0) && (
            <Badge 
                bg="danger" 
                className="p-2 rounded-pill shadow-sm"
            >
                🔻 DESCUENTO
            </Badge>
        )}
    </div>
    {/* 👆 FIN DEL BLOQUE MEJORADO 👆 */}

    <Table bordered size="sm" className="mt-3 table-hover">
        <thead className="table-light">
            <tr>
                <th>Cód.</th>
                <th>Producto</th>
                <th>Cant.</th>
            </tr>
        </thead>
        <tbody>
            {v.productosDetalle.map((p, idx) => (
                <tr key={idx}>
                    <td>
                        <strong>{p.codigo}</strong>
                    </td>
                    <td>{p.nombre}</td>
                    <td><Badge bg="primary">{p.cantidad}</Badge></td>
                </tr>
            ))}
        </tbody>
    </Table>

    <div className="mt-3">
        <small className="text-muted d-block border-top pt-2">
            {v.descuentoEfectivo > 0 && (
                <>
                    Desc. Efectivo: $ {v.descuentoEfectivo.toFixed(2)}{" "}
                </>
            )}
            {v.descuentoPromo > 0 && (
                <>
                    {" "}
                    {v.descuentoEfectivo > 0 ? "|" : ""}{" "}
                    Desc. Promo: $ {v.descuentoPromo.toFixed(2)} ({v.promoDescuento}%)
                </>
            )}
        </small>
    </div>

</Card.Body>
                      <Card.Footer className="bg-light d-flex justify-content-between align-items-center">
                        <h6 className="m-0 text-muted">Total Final Pagado</h6>
                        <h4 className="m-0 text-success fw-bold">
                          ${v.totalFinal?.toFixed(2)}
                        </h4>
                      </Card.Footer>
                      <Card.Footer className="d-flex justify-content-end gap-2 bg-white">
                      
                          {puedeDevolver && (
                            <Button
                              variant="outline-warning"
                              size="sm"
                              onClick={() => abrirModalDevolucion(v)}
                              title="Devolver Producto(s)"
                            >
                              ↩️ Devolver
                            </Button>
                          )}
                          {puedeAnular && (
                            <Button
                              variant="outline-danger"
                              size="sm"
                              onClick={() => abrirModalAnular(v)}
                              title="Anular Venta Completa"
                            >
                              ❌ Anular
                            </Button>
                          )}
                        </Card.Footer>
                    </Card>
                  </Col>
                );
              })}
            </Row>

            {/* LISTADO DE VENTAS ANULADAS */}
            {ventasAnuladasHoy.length > 0 && (
              <h4 className="mt-5 mb-3 text-danger">
                Ventas Anuladas ({ventasAnuladasHoy.length})
              </h4>
            )}
            <Row className="g-4">
              {ventasAnuladasHoy.map((v, i) => {
                const hora = v.fecha?.toDate
                  ? v.fecha.toDate().toLocaleTimeString("es-AR", {
                      hour: "2-digit",
                      minute: "2-digit",
                      hour12: false,
                    })
                  : "--";
                const productosAnulados =
                  v.productos?.map((p) => ({
                    codigo: p.codigoProducto,
                    nombre: p.nombre,
                    cantidad: p.cantidad,
                  })) || [];
                return (
                  <Col md={6} key={`anulada-${i}`}>
                    <Card
                      className="shadow-lg border-0 h-100"
                      style={{
                        backgroundColor: "#fcdfe2",
                        borderTop: "5px solid #dc3545",
                      }}
                    >
                      <Card.Body>
                        <div className="d-flex justify-content-between align-items-center mb-2">
                          <Badge bg="danger" className="fw-bold">❌ VENTA ANULADA</Badge>
                          <span className="text-muted">{hora}</span>
                        </div>
                        <p className="m-0 text-muted mt-2">
                          Vendedor:{" "}
                          <strong>{v.vendedor?.nombre}</strong>
                        </p>
                        <Table
                          bordered
                          size="sm"
                          className="mt-3 bg-white"
                        >
                          <thead className="table-danger">
                            <tr>
                              <th>Código</th>
                              <th>Producto</th>
                              <th>Cant. Vendida</th>
                            </tr>
                          </thead>
                          <tbody>
                            {productosAnulados.map((p, idx) => (
                              <tr key={idx}>
                                <td>
                                  <strong>{p.codigo}</strong>
                                </td>
                                <td>{p.nombre}</td>
                                <td><Badge bg="dark">{p.cantidad}</Badge></td>
                              </tr>
                            ))}
                          </tbody>
                        </Table>
                      </Card.Body>
                      <Card.Footer className="bg-danger-subtle d-flex justify-content-between align-items-center">
                          <h6 className="m-0 text-danger">Total Restado de Caja</h6>
                          <h4 className="m-0 text-danger fw-bold">
                              ${v.totalFinal?.toFixed(2)}
                          </h4>
                      </Card.Footer>
                    </Card>
                  </Col>
                );
              })}
            </Row>
          </>
        )}
      </Container>

      {/* ---------------- Modal Devolución ---------------- */}
      <Modal show={showDevolucionModal} onHide={cerrarModalDevolucion} size="xl">
        <Modal.Header closeButton className="bg-warning-subtle">
          <Modal.Title>
            Generar Nota de Crédito por Devolución - Venta:{" "}
            {ventaSeleccionada?.ticketId || ventaSeleccionada?.id}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {ventaSeleccionada ? (
            <>
              <Alert variant="info" className="p-2">
                <p className="m-0"><strong>Factor de Descuento Aplicado:</strong> {(getDescuentoFactor(ventaSeleccionada) * 100).toFixed(2)}%. Esto asegura que la nota de crédito refleje el precio final que el cliente pagó por el producto.</p>
              </Alert>
              <h6>Productos en Venta:</h6>
              <Table striped bordered hover size="sm">
                <thead>
                  <tr className="table-primary">
                    <th>Código</th>
                    <th>Producto</th>
                    <th>Cant. Vendida</th>
                    <th>Cant. Ya Devuelta</th>
                    <th>Máx. a Devolver</th>
                    <th>Cant. a Devolver</th>
                    <th className="bg-light">Precio Unit. Ref. (Bruto)</th>
                    <th className="bg-warning-subtle">Precio Final Unit. (Neto)</th>
                    <th className="bg-success-subtle">Subtotal Devol. (Estimado)</th>
                  </tr>
                </thead>
                <tbody>
                  {(ventaSeleccionada.productos || []).map((p, idx) => {
                    // Calculo el factor de descuento para mostrar el precio unitario final pagado
                    const factorDescuento = getDescuentoFactor(ventaSeleccionada);
                    const precioPostDescuento = (p.precioUnitario || 0) * factorDescuento;
                    const cantidadDevolver = Number(cantidadesDevolver[p.idProducto] || 0);
                    const subtotalDevolver = (cantidadDevolver * precioPostDescuento).toFixed(2);
                    
                    return (
                      <tr key={idx}>
                        <td>{p.codigoProducto}</td>
                        <td>{p.nombre}</td>
                        <td><Badge bg="secondary">{p.cantidad}</Badge></td>
                        <td>
                          <Badge bg="danger">{p.cantidadYaDevuelta}</Badge>
                        </td>
                        <td>
                          <Badge bg="info">{p.cantidadDisponibleDevolver}</Badge>
                        </td>
                        <td>
                          {p.cantidadDisponibleDevolver > 0 ? (
                            <Form.Control
                              type="number"
                              size="sm"
                              value={cantidadesDevolver[p.idProducto] || 0}
                              onChange={(e) =>
                                handleCantidadDevolver(
                                  p.idProducto,
                                  e.target.value,
                                  p.cantidadDisponibleDevolver
                                )
                              }
                              min="0"
                              max={p.cantidadDisponibleDevolver}
                              style={{ width: "90px" }}
                              className="text-center"
                            />
                          ) : (
                            <Badge bg="secondary">0</Badge>
                          )}
                        </td>
                        <td className="bg-light fw-bold">${p.precioUnitario.toFixed(2)}</td>
                        <td className="bg-warning-subtle fw-bold">${precioPostDescuento.toFixed(2)}</td> 
                        <td className="bg-success-subtle fw-bold">${subtotalDevolver}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </Table>
              
              <div className="d-flex justify-content-end mt-4 p-3 bg-success-subtle border border-success rounded shadow-sm">
                <h5 className="m-0">Total de Crédito a Generar:</h5>
                <div className="ms-4 text-success">
                  <h4 className="m-0 fw-bold">
                    $
                    {(() => {
                      const factorDescuento = getDescuentoFactor(ventaSeleccionada);
                      return (ventaSeleccionada.productos || []).reduce((s, p) => {
                        const id = p.idProducto;
                        const q = Number(cantidadesDevolver[id] || 0);
                        const precioUnitarioBruto = p?.precioUnitario || 0;
                        const precioPostDescuento = precioUnitarioBruto * factorDescuento;
                        return s + (p ? precioPostDescuento * q : 0);
                      }, 0).toFixed(2);
                    })()}
                  </h4>
                </div>
              </div>
            </>
          ) : (
            <div>Cargando...</div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button
            variant="secondary"
            onClick={cerrarModalDevolucion}
            disabled={procesandoDevolucion}
          >
            Cancelar
          </Button>
          <Button
            variant="warning"
            onClick={procesarDevolucion}
            disabled={
              procesandoDevolucion ||
              Object.values(cantidadesDevolver).every((q) => q === 0)
            }
            className="fw-bold shadow"
          >
            {procesandoDevolucion ? (
              <>
                <Spinner animation="border" size="sm" className="me-2" />
                Procesando...
              </>
            ) : (
              "💰 Generar Nota de Crédito"
            )}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* ---------------- Modal Anular ---------------- */}
      <Modal show={showAnularModal} onHide={cerrarModalAnular}>
        <Modal.Header closeButton className="bg-danger-subtle">
          <Modal.Title className="text-danger">Anular Venta Completa</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p>
            {" "}
            ¿Confirma anular la venta **
            {ventaSeleccionada?.ticketId || ventaSeleccionada?.id}**?{" "}
          </p>
          <p className="fw-bold text-danger fs-5 p-3 border border-danger rounded">
            {" "}
            Esto restará **$
            {(ventaSeleccionada?.totalFinal || 0).toFixed(2)}** de la
            caja y restaurará el stock de los productos vendidos.{" "}
          </p>
        </Modal.Body>
        <Modal.Footer>
          <Button
            variant="secondary"
            onClick={cerrarModalAnular}
            disabled={procesandoAnulacion}
          >
            Cancelar
          </Button>
          <Button
            variant="danger"
            onClick={procesarAnulacion}
            disabled={procesandoAnulacion}
            className="fw-bold shadow"
          >
            {procesandoAnulacion ? (
              <Spinner
                animation="border"
                size="sm"
                className="me-2"
              />
            ) : (
              "Confirmar Anulación"
            )}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* ---------------- Modal Imprimir ---------------- */}
      <ModalImprimirTicket
        show={showImprimirModal}
        handleClose={cerrarModalImprimir}
        venta={ventaSeleccionada}
      />

      <FooterDashboard/>
    </>
  );
};

export { VentasDelDia };
