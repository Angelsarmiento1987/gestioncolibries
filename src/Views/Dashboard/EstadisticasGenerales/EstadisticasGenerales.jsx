import React, { useEffect, useState, useMemo } from "react";
import { collection, getDocs } from "firebase/firestore";
// Asegúrate de que esta ruta sea correcta
import { FIRESTORE_DB } from "../../../Database/Database";
// Asegúrate de que esta ruta sea correcta
import { NavBarDashboard } from "../../../Components/NavBarDashboard/NavBarDashboard";
import { FooterDashboard } from "../../../Components/FooterDashboard/FooterDashboard";
import {
  Container,
  Row,
  Col,
  Card,
  Table,
  Spinner,
  Form,
  Button,
  Badge,
} from "react-bootstrap";

import { Bar, Pie, Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  BarElement,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ArcElement,
  Tooltip,
  Legend,
} from "chart.js";

import * as XLSX from "xlsx";

ChartJS.register(
  BarElement,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ArcElement,
  Tooltip,
  Legend
);

// --- util: parseFecha ---
const parseFecha = (f) => {
  if (!f && f !== 0) return null;
  try {
    if (typeof f.toDate === "function") return f.toDate();
    if (f instanceof Date) return f;
    if (typeof f === "string" || typeof f === "number") {
      const d = new Date(f);
      return isNaN(d.getTime()) ? null : d;
    }
    return null;
  } catch {
    return null;
  }
};

// años dinámicos 2022 → actual+1
const añosDisponibles = [];
for (let a = 2022; a <= new Date().getFullYear() + 1; a++)
  añosDisponibles.push(a);

// Función para generar colores aleatorios y consistentes (para gráficos)
const generateRandomColors = (count) => {
  const colors = [];
  const baseColors = [
    "rgba(255, 99, 132, 0.7)", // Rojo
    "rgba(54, 162, 235, 0.7)", // Azul
    "rgba(255, 206, 86, 0.7)", // Amarillo
    "rgba(75, 192, 192, 0.7)", // Verde
    "rgba(153, 102, 255, 0.7)", // Púrpura
    "rgba(255, 159, 64, 0.7)", // Naranja
    "rgba(199, 199, 199, 0.7)", // Gris
    "rgba(100, 100, 100, 0.7)", // Gris Oscuro
    "rgba(255, 0, 255, 0.7)", // Magenta
    "rgba(0, 255, 255, 0.7)", // Cian
  ];
  for (let i = 0; i < count; i++) {
    colors.push(baseColors[i % baseColors.length]);
  }
  return colors;
};

// =========================
// ESTILOS DE TABLAS
// =========================
// Fondo blanco para todas las filas.
const rowStyle = (index) => ({
  backgroundColor: "white", 
  transition: "0.2s",
});

// Estilo de encabezado de tabla
const tableHeaderStyle = {
  backgroundColor: '#e9ecef', // Gris muy claro
  color: '#495057', // Texto oscuro
  fontWeight: 'bold',
  borderBottom: '2px solid #adb5bd'
};


// =================================================================
// ESTILOS Y COMPONENTE KPI CARD (Recaudación) - CON SHADOW-LG
// =================================================================
const cardStyles = {
    total: { 
        borderLeft: '5px solid #6c757d', // Gray
        backgroundColor: '#f8f9fa', 
        icon: '📊',
        textClass: 'text-secondary'
    },
    efectivo: {
        borderLeft: '5px solid #ffc107', // Yellow
        backgroundColor: '#fffbe6', 
        icon: '💵',
        textClass: 'text-warning'
    },
    tarjeta: {
        borderLeft: '5px solid #0d6efd', // Blue
        backgroundColor: '#e6f0ff', 
        icon: '💳',
        textClass: 'text-primary'
    },
    transferencia: { 
        borderLeft: '5px solid #0dcaf0', // Cyan
        backgroundColor: '#e6faff', 
        icon: '📲',
        textClass: 'text-info'
    },
    mercadopago: { 
        borderLeft: '5px solid #198754', // Green
        backgroundColor: '#e6fff0', 
        icon: '🟢',
        textClass: 'text-success'
    },
    creditoUsado: { // Estilo para Nota de Crédito usada
        backgroundColor: '#f3e5f5', 
        borderLeft: '5px solid #9c27b0', // Purple border
        icon: '🟣',
        textClass: 'text-dark'
    }
};

const KPICard = ({ title, amount, style, children }) => (
    <Card 
        // 🚀 CAMBIO PRINCIPAL: Usar shadow-lg
        className="shadow-lg p-3 border-0 h-100 rounded-3" 
        style={{
            borderLeft: style.borderLeft, 
            backgroundColor: style.backgroundColor, 
            transition: '0.3s',
            cursor: 'default', 
            transform: 'scale(1.0)', 
        }}
        onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.02)'}
        onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1.0)'}
    >
        <div className="d-flex justify-content-between align-items-center mb-2">
            <h6 className="text-uppercase text-muted" style={{fontSize: '0.75rem'}}>{title}</h6>
            <span className={`fs-4 ${style.textClass || 'text-dark'}`}>{style.icon}</span>
        </div>
        <h3 className={`fw-bold ${style.textClass || 'text-dark'} m-0`} style={{fontSize: '1.75rem'}}>
            {amount}
        </h3>
        {children}
    </Card>
);

// =================================================================
// NUEVO COMPONENTE StatCard (Métricas de Resultado) - CON SHADOW-LG
// =================================================================
const StatCard = ({ title, amount, style, children }) => (
    <Card 
        // 🚀 USANDO shadow-lg para consistencia
        className="shadow-lg p-3 border-0 h-100 rounded-3" 
        style={{
            borderLeft: `5px solid ${style.border}`, 
            backgroundColor: style.bg, 
            transition: '0.3s',
            cursor: 'default', 
            transform: 'scale(1.0)', 
        }}
        onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.02)'}
        onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1.0)'}
    >
        <div className="d-flex justify-content-between align-items-start mb-1">
            <small className="text-uppercase text-muted fw-bold" style={{fontSize: '0.75rem'}}>{title}</small>
            <span className={`fs-4 ${style.text}`}>{style.icon}</span>
        </div>
        <h4 className={`m-0 ${style.text} fw-bold`} style={{fontSize: '1.5rem'}}>
            {amount}
        </h4>
        {children}
    </Card>
);
// =================================================================


// =================================================================
// ESTILOS PARA MÉTRICAS CLAVE
// =================================================================
const metricStyles = {
    // Ingreso
    ventaTotal: { 
        border: '#0d6efd', 
        text: 'text-primary', 
        bg: '#e6f0ff', // Fondo azul claro
        icon: '💸'
    }, 
    // Neutro/Secundario
    ticketPromedio: { 
        border: '#6f42c1', 
        text: 'text-secondary', 
        bg: '#f3e5f5', // Fondo púrpura claro
        icon: '🎟️'
    }, 
    // Costo (Color Café/Marrón)
    costoProductos: { 
        border: '#795548', 
        text: '#795548', // Custom Color
        bg: '#fcf8f6', // Fondo marrón claro
        icon: '📦'
    }, 
    // Ganancia Bruta (Éxito Fuerte)
    gananciaBruta: { 
        border: '#198754', 
        text: 'text-success', 
        bg: '#e6fff0', // Fondo verde claro
        icon: '📈'
    }, 
    // Gasto (Peligro)
    totalGastos: { 
        border: '#dc3545', 
        text: 'text-danger', 
        bg: '#fce9eb', // Fondo rojo claro
        icon: '🚨'
    }, 
    // Ganancia Neta (Advertencia/Resultado Final)
    gananciaNeta: { 
        border: '#ffc107', 
        text: 'text-warning', 
        bg: '#fffbe6', // Fondo amarillo claro
        icon: '🎯'
    }, 
};
// =================================================================


const EstadisticasGenerales = () => {
  const [ventas, setVentas] = useState([]);
  const [gastos, setGastos] = useState([]);
  const [loading, setLoading] = useState(true);

  // ESTADOS DE FILTRO
  const [mesFiltro, setMesFiltro] = useState(new Date().getMonth() + 1);
  const [anioFiltro, setAnioFiltro] = useState(new Date().getFullYear());
  // Vista de filtrado ('mensual' | 'anual')
  const [vistaFiltro, setVistaFiltro] = useState("mensual"); 
  
  // 🚀 NUEVOS ESTADOS para el rango en modo anual
  const [mesInicioRango, setMesInicioRango] = useState(1); // Por defecto: Enero (1)
  const [mesFinRango, setMesFinRango] = useState(new Date().getMonth() + 1); // Por defecto: Mes actual


  // carga ventas
  const cargarVentas = async () => {
    try {
      const snap = await getDocs(collection(FIRESTORE_DB, "ventas"));
      const list = snap.docs
        .map((d) => {
          const data = d.data();
          const fechaObj = parseFecha(data.fecha);
          return { id: d.id, ...data, fechaObj };
        })
        .sort((a, b) => {
          const ta = a.fechaObj ? a.fechaObj.getTime() : 0;
          const tb = b.fechaObj ? b.fechaObj.getTime() : 0;
          return tb - ta;
        });

      setVentas(list);
    } catch (err) {
      console.error("Error cargando ventas:", err);
    }
  };

  // carga gastos
  const cargarGastos = async () => {
    try {
      const snap = await getDocs(collection(FIRESTORE_DB, "gastos"));
      const list = snap.docs
        .map((d) => {
          const data = d.data();
          const fechaObj = parseFecha(data.fecha);
          return { id: d.id, ...data, fechaObj };
        })
        .sort((a, b) => {
          const ta = a.fechaObj ? a.fechaObj.getTime() : 0;
          const tb = b.fechaObj ? b.fechaObj.getTime() : 0;
          return tb - ta;
        });

      setGastos(list);
    } catch (err) {
      console.error("Error cargando gastos:", err);
    }
  };

  useEffect(() => {
    setLoading(true);
    (async () => {
      await Promise.all([cargarVentas(), cargarGastos()]);
      setLoading(false);
    })();
  }, []);

  // ventas filtradas (Aseguramos que no incluya ventas "anuladas")
  const ventasFiltradas = useMemo(() => {
    return ventas.filter((v) => {
      if (!v.fechaObj) return false;
      
      // ⚠️ CONDICIÓN CRUCIAL: Excluir ventas anuladas
      if (v.estado === "anulada") return false; 
      
      // 1. FILTRADO POR AÑO (siempre activo)
      const esMismoAnio = v.fechaObj.getFullYear() === Number(anioFiltro);
      if (!esMismoAnio) return false;

      // 2. FILTRADO POR MES (condicional)
      const mesVenta = v.fechaObj.getMonth() + 1;

      if (vistaFiltro === 'mensual') {
          return mesVenta === Number(mesFiltro);
      }
      
      if (vistaFiltro === 'anual') {
          // 🚀 NUEVA LÓGICA: Rango de meses
          const inicio = Number(mesInicioRango);
          const fin = Number(mesFinRango);
          // Asegura que el mes esté dentro del rango [inicio, fin] y que el rango sea válido
          return mesVenta >= inicio && mesVenta <= fin && inicio <= fin;
      }

      return true;
    });
  }, [ventas, mesFiltro, anioFiltro, vistaFiltro, mesInicioRango, mesFinRango]); // Añadir nuevas dependencias

  // gastos filtrados
  const gastosFiltrados = useMemo(() => {
    return gastos.filter((g) => {
      if (!g.fechaObj) return false;

      // 1. FILTRADO POR AÑO (siempre activo)
      const esMismoAnio = g.fechaObj.getFullYear() === Number(anioFiltro);
      if (!esMismoAnio) return false;
      
      // 2. FILTRADO POR MES (condicional)
      const mesGasto = g.fechaObj.getMonth() + 1;

      if (vistaFiltro === 'mensual') {
          return mesGasto === Number(mesFiltro);
      }
      
      if (vistaFiltro === 'anual') {
          // 🚀 NUEVA LÓGICA: Rango de meses
          const inicio = Number(mesInicioRango);
          const fin = Number(mesFinRango);
          // Asegura que el mes esté dentro del rango [inicio, fin] y que el rango sea válido
          return mesGasto >= inicio && mesGasto <= fin && inicio <= fin;
      }

      return true;
    });
  }, [gastos, mesFiltro, anioFiltro, vistaFiltro, mesInicioRango, mesFinRango]); // Añadir nuevas dependencias

  // totales
  const totalVentas = useMemo(
    () => ventasFiltradas.reduce((acc, v) => acc + Number(v.totalFinal || 0), 0),
    [ventasFiltradas]
  );

  const totalSinDescuento = useMemo(
    () =>
      ventasFiltradas.reduce(
        (acc, v) => acc + Number(v.totalSinDescuento || 0),
        0
      ),
    [ventasFiltradas]
  );

  const totalDescuentos = totalSinDescuento - totalVentas;

  const totalGastos = useMemo(
    () => gastosFiltrados.reduce((acc, g) => acc + Number(g.monto || 0), 0),
    [gastosFiltrados]
  );

  // ** Ticket Promedio de Venta (AOV) **
  const ticketPromedioVenta = useMemo(() => {
    const numVentas = ventasFiltradas.length;
    return numVentas > 0 ? totalVentas / numVentas : 0;
  }, [totalVentas, ventasFiltradas.length]);

  // productos agregados (Ajustado para Recaudación Neta)
  const { costoTotalProductos, detalleProductosAggregado } = useMemo(() => {
    const map = new Map();
    let costoTotal = 0;

    ventasFiltradas.forEach((v) => {
      const totalVentaSinDescuentos = Number(v.totalSinDescuento || 0); // Total de la venta antes del descuento global
      const totalFinalVenta = Number(v.totalFinal || 0);
      
      // Si la venta tiene total sin descuentos > 0, calculamos el factor de ajuste del descuento global
      const factorDescuento = totalVentaSinDescuentos > 0 
        ? (totalFinalVenta / totalVentaSinDescuentos) 
        : 1; 

      (v.productos || []).forEach((p) => {
        const key = p.idProducto || p.codigoProducto || p.nombre;

        const cantidad = Number(p.cantidad || 0);
        const costoUnit = Number(p.precioCosto || 0);
        
        // 1. Tomamos el subtotal de la línea (se asume que incluye descuentos de línea)
        const subtotalBrutoLinea = Number(p.subtotal || p.precioUnitario * cantidad || 0);
        
        // 2. Aplicamos el factor de descuento global proporcional a este subtotal
        // Este es el monto Neto que el producto "recaudó" para la venta final.
        const recaudadoNetoLinea = subtotalBrutoLinea * factorDescuento;

        if (!map.has(key)) {
          map.set(key, {
            key,
            codigo: p.codigoProducto || "",
            nombre: p.nombre || "",
            categoria: p.categoria || "Sin Categoría",
            cantidad: 0,
            recaudado: 0, // <<-- ESTE ES EL QUE SERÁ NETO
            costo: 0,
            ganancia: 0,
            margenPorcentaje: 0, 
            precioUnitario: Number(p.precioUnitario || 0),
            precioCosto: costoUnit,
            stockActual: p.stockActual,
          });
        }

        const e = map.get(key);
        e.cantidad += cantidad;
        e.recaudado += recaudadoNetoLinea; // <<-- SUMAMOS EL VALOR NETO
        e.costo += costoUnit * cantidad;
        e.ganancia = e.recaudado - e.costo;
        // Calcular Margen Bruto = (Ganancia / Recaudado) * 100
        e.marguentePorcentaje =
          e.recaudado > 0 ? (e.ganancia / e.recaudado) * 100 : 0;
      });
    });

    map.forEach((v) => (costoTotal += Number(v.costo || 0)));

    const detalle = Array.from(map.values()).sort(
      (a, b) => b.cantidad - a.cantidad
    );

    return {
      costoTotalProductos: costoTotal,
      detalleProductosAggregado: detalle,
    };
  }, [ventasFiltradas]);

  const gananciaBruta = totalVentas - costoTotalProductos;
  const gananciaNeta = gananciaBruta - totalGastos;

  // ** Margen Neto Porcentaje **
  const margenNetoPorcentaje = useMemo(() => {
    // Calculamos el Margen Neto (%)
    return totalVentas > 0 ? (gananciaNeta / totalVentas) * 100 : 0;
  }, [gananciaNeta, totalVentas]);
  // ------------------------------------

  // ventas por vendedor
  const ventasPorVendedor = useMemo(() => {
    const map = new Map();
    ventasFiltradas.forEach((v) => {
      const nombre = v.vendedor?.nombre || "—";
      const prev =
        map.get(nombre) || { vendedor: nombre, total: 0, cantidadVentas: 0 };
      prev.total += Number(v.totalFinal || 0);
      prev.cantidadVentas += 1;
      map.set(nombre, prev);
    });
    return Array.from(map.values()).sort((a, b) => b.total - a.total);
  }, [ventasFiltradas]);

  // ventas por día (Para vista Mensual)
  const ventasPorDia = useMemo(() => {
    // Solo se calcula para vista mensual, si no, se devuelve vacío
    if (vistaFiltro !== 'mensual') return { labels: [], values: [] };

    const days = {};
    ventasFiltradas.forEach((v) => {
      if (!v.fechaObj) return;
      const d = v.fechaObj.getDate();
      days[d] = (days[d] || 0) + Number(v.totalFinal || 0);
    });

    const labels = Object.keys(days)
      .map((k) => Number(k))
      .sort((a, b) => a - b);
    const values = labels.map((d) => days[d]);

    return { labels, values };
  }, [ventasFiltradas, vistaFiltro]);
  
  // NUEVO: Ventas por Mes (Para vista Anual)
  const ventasPorMes = useMemo(() => {
      // Solo se calcula para vista anual, si no, se devuelve vacío
      if (vistaFiltro !== 'anual') return { labels: [], values: [] };

      const months = {};
      // Inicializar solo los meses del rango seleccionado
      for (let m = Number(mesInicioRango); m <= Number(mesFinRango); m++) {
          months[m] = 0;
      }

      ventasFiltradas.forEach((v) => {
        if (!v.fechaObj) return;
        const m = v.fechaObj.getMonth() + 1; // Mes (1-12)
        // Aseguramos que solo contamos los meses dentro del rango
        if (m >= Number(mesInicioRango) && m <= Number(mesFinRango)) {
            months[m] = (months[m] || 0) + Number(v.totalFinal || 0);
        }
      });

      const labels = Object.keys(months)
        .map((k) => Number(k))
        .sort((a, b) => a - b)
        .map(m => new Date(Number(anioFiltro), m - 1).toLocaleString("es-AR", { month: "short" })); // Enero, Feb, etc.

      const values = Object.keys(months)
          .map(k => months[k]);

      return { labels, values };
  }, [ventasFiltradas, vistaFiltro, anioFiltro, mesInicioRango, mesFinRango]);

  // ** Ventas por Hora del Día ** (Aplica a ambas vistas)
  const ventasPorHora = useMemo(() => {
    const hours = {};
    // Inicializar todas las horas de 0 a 23 en 0
    for (let h = 0; h <= 23; h++) {
        hours[h] = 0;
    }

    ventasFiltradas.forEach((v) => {
      if (!v.fechaObj) return;
      const h = v.fechaObj.getHours(); // Obtener la hora (0-23)
      hours[h] = (hours[h] || 0) + Number(v.totalFinal || 0);
    });

    const labels = Object.keys(hours)
      .map((k) => Number(k))
      .sort((a, b) => a - b)
      .map(h => `${h}:00 - ${h + 1}:00`); // Formato de etiqueta

    const values = Object.keys(hours)
        .map(k => hours[k]);


    return { labels, values };
  }, [ventasFiltradas]);

  // ** Ventas por Forma de Pago **
  const { 
    ventasPorFormaDePago, 
    totalEfectivo, 
    totalTarjeta, 
    totalMercadoPago, 
    totalTransferencia, 
    totalModo,
    totalCreditoUsado
  } = useMemo(() => {
    const map = new Map();
    let totalEfectivo = 0;
    let totalTarjeta = 0;
    let totalMercadoPago = 0;
    let totalTransferencia = 0;
    let totalModo = 0;
    let totalCreditoUsado = 0;

    ventasFiltradas.forEach((v) => {
      // 1. Total Final Pagado
      const totalPagado = Number(v.totalFinal || 0);

      // 2. Monto de Nota de Crédito usado (si aplica)
      const montoNCUsado = Number(v.montoCreditoUsado || 0);
      totalCreditoUsado += montoNCUsado;
      
      // 3. Método de Pago Principal (Usamos metodoPago o formaPago)
      const metodoPago = v.metodoPago || v.formaPago || "otros"; 

      if (metodoPago === "efectivo") {
        totalEfectivo += totalPagado;
      } else if (metodoPago === "tarjeta") {
        totalTarjeta += totalPagado;
      } else if (metodoPago === "mercadopago") {
        totalMercadoPago += totalPagado;
      } else if (metodoPago === "transferencia") {
        totalTransferencia += totalPagado;
      } else if (metodoPago === "modo") {
        totalModo += totalPagado;
      } else {
        // Agrupar otros métodos no clasificados
        const otroMetodo = map.get(metodoPago) || { formaPago: metodoPago, total: 0, cantidadVentas: 0 };
        otroMetodo.total += totalPagado;
        otroMetodo.cantidadVentas += 1;
        map.set(metodoPago, otroMetodo);
      }
    });
    
    // Crear el array final incluyendo los métodos calculados explícitamente
    const detalleFormasDePago = [
        { formaPago: "Efectivo", total: totalEfectivo, cantidadVentas: ventasFiltradas.filter(v => (v.metodoPago || v.formaPago) === "efectivo").length },
        { formaPago: "Tarjeta", total: totalTarjeta, cantidadVentas: ventasFiltradas.filter(v => (v.metodoPago || v.formaPago) === "tarjeta").length },
        { formaPago: "Mercado Pago", total: totalMercadoPago, cantidadVentas: ventasFiltradas.filter(v => (v.metodoPago || v.formaPago) === "mercadopago").length },
        { formaPago: "Transferencia", total: totalTransferencia, cantidadVentas: ventasFiltradas.filter(v => (v.metodoPago || v.formaPago) === "transferencia").length },
        { formaPago: "MODO", total: totalModo, cantidadVentas: ventasFiltradas.filter(v => (v.metodoPago || v.formaPago) === "modo").length },
        // Otros métodos agrupados (si existen)
        ...Array.from(map.values()),
        // Nota de Crédito (se considera aparte, pero es un "medio" si se usó)
        ...(totalCreditoUsado > 0 ? [{ formaPago: "Nota de Crédito", total: totalCreditoUsado, cantidadVentas: ventasFiltradas.filter(v => (v.montoCreditoUsado || 0) > 0).length }] : [])
    ].filter(d => d.total > 0).sort((a, b) => b.total - a.total); // Filtrar y ordenar por total

    return { 
        ventasPorFormaDePago: detalleFormasDePago, 
        totalEfectivo, 
        totalTarjeta, 
        totalMercadoPago, 
        totalTransferencia, 
        totalModo,
        totalCreditoUsado
    };
  }, [ventasFiltradas]);


  // ** Ventas por Categoría de Producto **
  const ventasPorCategoria = useMemo(() => {
    const map = new Map();
    detalleProductosAggregado.forEach((p) => {
      const categoria = p.categoria || "Sin Categoría";
      const prev = map.get(categoria) || {
        categoria,
        totalRecaudado: 0,
        cantidadProductos: 0,
      };
      prev.totalRecaudado += p.recaudado;
      prev.cantidadProductos += p.cantidad;
      map.set(categoria, prev);
    });
    return Array.from(map.values()).sort(
      (a, b) => b.totalRecaudado - a.totalRecaudado
    );
  }, [detalleProductosAggregado]);


  // ** Gastos por Categoría Alta **
  const gastosPorCategoriaAlta = useMemo(() => {
    const map = new Map();
    gastosFiltrados.forEach((g) => {
      const categoria = g.categoria || "Sin Categoría";
      const prev = map.get(categoria) || { categoria, total: 0, cantidadGastos: 0 };
      prev.total += Number(g.monto || 0);
      prev.cantidadGastos += 1;
      map.set(categoria, prev);
    });
    return Array.from(map.values()).sort((a, b) => b.total - a.total);
  }, [gastosFiltrados]);

  // ** Top 10 Gastos **
  const top10Gastos = useMemo(() => {
    return gastosFiltrados.sort((a, b) => Number(b.monto || 0) - Number(a.monto || 0)).slice(0, 10);
  }, [gastosFiltrados]);


  // Data para Top Productos
  const dataTopProductos = useMemo(() => {
    const top10 = detalleProductosAggregado.slice(0, 10).reverse();
    return {
      labels: top10.map((p) => p.nombre),
      datasets: [
        {
          label: "Cantidad Vendida",
          data: top10.map((p) => p.cantidad),
          backgroundColor: "rgba(13, 110, 253, 0.8)", // Azul
          borderColor: "rgba(13, 110, 253, 1)",
          borderWidth: 1,
        },
      ],
    };
  }, [detalleProductosAggregado]);

  // Data para Ventas por Día (MENSUAL)
  const dataVentasPorDia = useMemo(() => {
    return {
      labels: ventasPorDia.labels,
      datasets: [
        {
          label: "Total Vendido ($)",
          data: ventasPorDia.values,
          borderColor: "rgba(25, 135, 84, 1)", // Verde
          backgroundColor: "rgba(25, 135, 84, 0.5)",
          tension: 0.3,
        },
      ],
    };
  }, [ventasPorDia]);

  // NUEVO: Data para Ventas por Mes (ANUAL)
  const dataVentasPorMes = useMemo(() => {
    return {
      labels: ventasPorMes.labels,
      datasets: [
        {
          label: "Total Vendido ($)",
          data: ventasPorMes.values,
          borderColor: "rgba(108, 117, 125, 1)", // Gris
          backgroundColor: "rgba(108, 117, 125, 0.5)",
          tension: 0.3,
        },
      ],
    };
  }, [ventasPorMes]);

  // Data para Ventas por Hora
  const dataVentasPorHora = useMemo(() => {
    return {
        labels: ventasPorHora.labels,
        datasets: [
            {
                label: "Total Recaudado ($)",
                data: ventasPorHora.values,
                backgroundColor: 'rgba(255, 193, 7, 0.8)', // Amarillo
                borderColor: 'rgba(255, 193, 7, 1)',
                borderWidth: 1,
            },
        ],
    };
  }, [ventasPorHora]);

  // Data para Distribución Pagos
  const dataVentasPorFormaDePago = useMemo(() => {
    // Usar la lista detallada y filtrada que ya incluye todos los métodos con total > 0
    const labels = ventasPorFormaDePago.map((v) => v.formaPago);
    const data = ventasPorFormaDePago.map((v) => v.total);
    return {
      labels,
      datasets: [
        {
          data: data,
          backgroundColor: generateRandomColors(labels.length),
          hoverOffset: 4,
        },
      ],
    };
  }, [ventasPorFormaDePago]);
  
  // Data para Gastos por Categoría
  const dataGastosPorCategoriaAlta = useMemo(() => {
    const labels = gastosPorCategoriaAlta.map((g) => g.categoria);
    const data = gastosPorCategoriaAlta.map((g) => g.total);
    return {
      labels,
      datasets: [
        {
          data: data,
          backgroundColor: generateRandomColors(labels.length),
          hoverOffset: 4,
        },
      ],
    };
  }, [gastosPorCategoriaAlta]);

  // Se añade el título dinámico para mostrar el período actual
  const tituloPeriodo = useMemo(() => {
    const anio = anioFiltro;
    if (vistaFiltro === 'anual') {
      const inicio = Number(mesInicioRango);
      const fin = Number(mesFinRango);

      const mesInicio = new Date(Number(anio), inicio - 1).toLocaleString("es-AR", { month: "long" });
      const mesFin = new Date(Number(anio), fin - 1).toLocaleString("es-AR", { month: "long" });
      
      const mesInicioCap = mesInicio.charAt(0).toUpperCase() + mesInicio.slice(1);
      const mesFinCap = mesFin.charAt(0).toUpperCase() + mesFin.slice(1);

      if (inicio > fin) {
          return `Rango Inválido en ${anio}`;
      }
      if (inicio === 1 && fin === 12) {
          return `Año Completo ${anio}`;
      }
      if (inicio === fin) {
          return `${mesInicioCap} de ${anio}`; // Si es un solo mes, usar formato mensual
      }
      
      return `De ${mesInicioCap} a ${mesFinCap} de ${anio}`;
    }
    const mes = new Date(Number(anio), Number(mesFiltro) - 1).toLocaleString("es-AR", { month: "long" });
    return `${mes.charAt(0).toUpperCase() + mes.slice(1)} de ${anio}`;
  }, [vistaFiltro, mesFiltro, anioFiltro, mesInicioRango, mesFinRango]);


  // -------------------------------------------------------------
  // 🚀 FUNCIÓN DE EXPORTACIÓN A EXCEL MEJORADA CON PESTAÑAS
  // -------------------------------------------------------------
  const exportarExcel = () => {
    
    if (ventasFiltradas.length === 0 && gastosFiltrados.length === 0) {
      alert("No hay datos para exportar en el período seleccionado.");
      return;
    }

    const workbook = XLSX.utils.book_new();
    const periodoDescarga = vistaFiltro === 'anual' ? anioFiltro : `${mesFiltro}-${anioFiltro}`;
    
    // ------------------------------------
    // 1. Pestaña: Resumen General (KPIs)
    // ------------------------------------
    const resumenData = [
        { Metrica: "Período Analizado", Valor: tituloPeriodo },
        { Metrica: "Total Ventas Final", Valor: totalVentas },
        { Metrica: "Total Descuentos Aplicados", Valor: totalDescuentos },
        { Metrica: "Costo de Productos Vendidos (CPV)", Valor: costoTotalProductos },
        { Metrica: "Ganancia Bruta", Valor: gananciaBruta },
        { Metrica: "Total Gastos", Valor: totalGastos },
        { Metrica: "Ganancia Neta", Valor: gananciaNeta },
        { Metrica: "Margen Neto (%)", Valor: margenNetoPorcentaje.toFixed(2) + '%' },
        { Metrica: "Ticket Promedio de Venta", Valor: ticketPromedioVenta.toFixed(2) },
        { Metrica: "Total Ventas por Efectivo", Valor: totalEfectivo },
        { Metrica: "Total Ventas por Tarjeta", Valor: totalTarjeta },
        { Metrica: "Total Ventas por Mercado Pago", Valor: totalMercadoPago },
        { Metrica: "Total Ventas por Transferencia/Otros", Valor: (totalTransferencia + totalModo) },
        ...(totalCreditoUsado > 0 ? [{ Metrica: "Total Nota de Crédito Usada", Valor: totalCreditoUsado }] : []),
    ];
    const resumenSheet = XLSX.utils.json_to_sheet(resumenData);
    XLSX.utils.book_append_sheet(workbook, resumenSheet, "Resumen General");
    
    // ------------------------------------
    // 2. Pestaña: Ventas Detalle
    // ------------------------------------
    if (ventasFiltradas.length > 0) {
        const ventasData = ventasFiltradas.map(v => ({
            Fecha: v.fechaObj ? v.fechaObj.toLocaleDateString("es-AR") : "—",
            Hora: v.fechaObj ? v.fechaObj.toLocaleTimeString("es-AR") : "—",
            Ticket: v.ticketId || v.id,
            Vendedor: v.vendedor?.nombre || "—",
            TotalSinDescuento: v.totalSinDescuento,
            DescuentoAplicado: (v.totalSinDescuento - v.totalFinal).toFixed(2),
            TotalFinal: v.totalFinal,
            FormaPago: v.metodoPago || v.formaPago || "—",
            ProductosDetalle: (v.productos || []).map(p => `${p.nombre} (${p.cantidad}u @ $${p.precioUnitario})`).join('; ')
        }));
        const ventasSheet = XLSX.utils.json_to_sheet(ventasData);
        XLSX.utils.book_append_sheet(workbook, ventasSheet, "Ventas Detalle");
    }

    // ------------------------------------
    // 3. Pestaña: Productos Agregado
    // ------------------------------------
    if (detalleProductosAggregado.length > 0) {
        const productosData = detalleProductosAggregado.map(p => ({
            Codigo: p.codigo,
            Nombre: p.nombre,
            Categoria: p.categoria,
            CantidadTotalVendida: p.cantidad,
            RecaudadoNeto: p.recaudado,
            CostoTotal: p.costo,
            GananciaBruta: p.ganancia,
            MargenBrutoPorcentaje: p.margenPorcentaje.toFixed(2) + '%'
        }));
        const productosSheet = XLSX.utils.json_to_sheet(productosData);
        XLSX.utils.book_append_sheet(workbook, productosSheet, "Productos Agregado");
    }
    
    // ------------------------------------
    // 4. Pestaña: Ventas por Vendedor
    // ------------------------------------
    if (ventasPorVendedor.length > 0) {
        const vendedoresData = ventasPorVendedor.map(v => ({
            Vendedor: v.vendedor,
            TotalVendido: v.total,
            CantidadDeVentas: v.cantidadVentas,
            TicketPromedio: (v.total / v.cantidadVentas).toFixed(2)
        }));
        const vendedoresSheet = XLSX.utils.json_to_sheet(vendedoresData);
        XLSX.utils.book_append_sheet(workbook, vendedoresSheet, "Ventas x Vendedor");
    }

    // ------------------------------------
    // 5. Pestaña: Gastos Detalle
    // ------------------------------------
    if (gastosFiltrados.length > 0) {
        const gastosData = gastosFiltrados.map(g => ({
            Fecha: g.fechaObj ? g.fechaObj.toLocaleDateString("es-AR") : "—",
            Monto: g.monto,
            CategoriaPrincipal: g.categoria,
            Subcategoria: g.subcategoria,
            Descripcion: g.descripcion || "—",
            MetodoPago: g.metodoPago || "—"
        }));
        const gastosSheet = XLSX.utils.json_to_sheet(gastosData);
        XLSX.utils.book_append_sheet(workbook, gastosSheet, "Gastos Detalle");
    }

    // ------------------------------------
    // 6. Pestaña: Gastos por Categoría
    // ------------------------------------
    if (gastosPorCategoriaAlta.length > 0 && totalGastos > 0) {
        const gastosCatData = gastosPorCategoriaAlta.map(c => ({
            Categoria: c.categoria,
            TotalGastado: c.total,
            CantidadGastos: c.cantidadGastos,
            PorcentajeDelTotal: (c.total / totalGastos * 100).toFixed(2) + '%'
        }));
        const gastosCatSheet = XLSX.utils.json_to_sheet(gastosCatData);
        XLSX.utils.book_append_sheet(workbook, gastosCatSheet, "Gastos x Categoría");
    }

    // Descargar
    XLSX.writeFile(workbook, `Estadisticas_${periodoDescarga}_${new Date().toLocaleDateString("es-AR").replace(/\//g, "-")}.xlsx`);
  };

  return (
    <>
      <NavBarDashboard />
      <Container fluid className="py-4">
        <Row className="mb-3">
          <Col>
            <h3 className="text-primary fw-light">Dashboard de <span className="fw-bold">Estadísticas</span> 📈</h3>
            <p className="text-muted">
              Resumen financiero y operativo del período: <span className="fw-bold text-dark">{tituloPeriodo}</span>
            </p>
          </Col>
        </Row>
        {/* filtros */}
        <Row className="mb-4 g-3 align-items-end">
          <Col xs={12} md={2}>
            <Form.Group controlId="vistaFiltro">
              <Form.Label className="fw-bold text-muted">Vista:</Form.Label>
              <Form.Control
                as="select"
                value={vistaFiltro}
                onChange={(e) => setVistaFiltro(e.target.value)}
                className="rounded-3 shadow-sm"
              >
                <option value="mensual">Mensual (por mes)</option>
                <option value="anual">Anual (Rango de Meses)</option>
              </Form.Control>
            </Form.Group>
          </Col>
          
          {/* CAMPO DE MESES CONDICIONAL */}
          {vistaFiltro === 'mensual' ? (
              // VISTA MENSUAL: Selector de un solo mes
              <Col xs={12} md={3}>
                <Form.Group controlId="mesFiltro">
                  <Form.Label className="fw-bold text-muted">Mes:</Form.Label>
                  <Form.Control
                    as="select"
                    value={mesFiltro}
                    onChange={(e) => setMesFiltro(Number(e.target.value))}
                    className="rounded-3 shadow-sm"
                  >
                    {[...Array(12).keys()].map((i) => (
                      <option key={i + 1} value={i + 1}>
                        {new Date(0, i).toLocaleString("es-AR", { month: "long" })}
                      </option>
                    ))}
                  </Form.Control>
                </Form.Group>
              </Col>
          ) : (
              // VISTA ANUAL: Selectores de RANGO de meses
              <>
                  <Col xs={6} md={3}>
                      <Form.Group controlId="mesInicioRango">
                          <Form.Label className="fw-bold text-muted">Mes Desde:</Form.Label>
                          <Form.Control
                              as="select"
                              value={mesInicioRango}
                              onChange={(e) => setMesInicioRango(Number(e.target.value))}
                              className="rounded-3 shadow-sm"
                          >
                              {[...Array(12).keys()].map((i) => (
                                  <option key={i + 1} value={i + 1}>
                                      {new Date(0, i).toLocaleString("es-AR", { month: "long" })}
                                  </option>
                              ))}
                          </Form.Control>
                      </Form.Group>
                  </Col>
                  <Col xs={6} md={3}>
                      <Form.Group controlId="mesFinRango">
                          <Form.Label className="fw-bold text-muted">Mes Hasta:</Form.Label>
                          <Form.Control
                              as="select"
                              value={mesFinRango}
                              onChange={(e) => setMesFinRango(Number(e.target.value))}
                              className="rounded-3 shadow-sm"
                          >
                              {[...Array(12).keys()].map((i) => (
                                  <option key={i + 1} value={i + 1}>
                                      {new Date(0, i).toLocaleString("es-AR", { month: "long" })}
                                  </option>
                              ))}
                          </Form.Control>
                      </Form.Group>
                  </Col>
              </>
          )}


          <Col xs={12} md={vistaFiltro === 'mensual' ? 3 : 2}>
            <Form.Group controlId="anioFiltro">
              <Form.Label className="fw-bold text-muted">Año:</Form.Label>
              <Form.Control
                as="select"
                value={anioFiltro}
                onChange={(e) => setAnioFiltro(Number(e.target.value))}
                className="rounded-3 shadow-sm"
              >
                {añosDisponibles.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </Form.Control>
            </Form.Group>
          </Col>
          <Col xs={12} md={2}>
            <Button variant="outline-success" onClick={exportarExcel} className="rounded-3 shadow-sm mt-3 mt-md-0 w-100">
              Exportar a Excel
            </Button>
          </Col>
        </Row>
        
        {loading ? (
          <div className="text-center py-5">
            <Spinner animation="border" role="status" className="me-2" />
            <p>Cargando datos...</p>
          </div>
        ) : (
          <>
            
            {/* ------------------------------------------------------------- */}
            {/* TARJETAS DE RESUMEN (KPIs) - RECAUDACIÓN POR PAGO (Usa KPICard con shadow-lg) */}
            {/* ------------------------------------------------------------- */}
            <h5 className="mt-4 mb-3 text-secondary fw-light">
              <span className="fw-bold">Recaudación</span> por Medio de Pago (Período Filtrado)
            </h5>
            <Row className="mb-4 g-4">
              <Col lg={2} md={4} sm={6}>
                <KPICard
                  title="Total Ventas"
                  amount={`$${totalVentas.toLocaleString("es-AR", {
                    minimumFractionDigits: 2,
                  })}`}
                  style={cardStyles.total}
                />
              </Col>
              <Col lg={2} md={4} sm={6}>
                <KPICard
                  title="Efectivo"
                  amount={`$${totalEfectivo.toLocaleString("es-AR", {
                    minimumFractionDigits: 2,
                  })}`}
                  style={cardStyles.efectivo}
                />
              </Col>
              <Col lg={2} md={4} sm={6}>
                <KPICard
                  title="Tarjeta"
                  amount={`$${totalTarjeta.toLocaleString("es-AR", {
                    minimumFractionDigits: 2,
                  })}`}
                  style={cardStyles.tarjeta}
                />
              </Col>
              <Col lg={2} md={4} sm={6}>
                <KPICard
                  title="Mercado Pago"
                  amount={`$${totalMercadoPago.toLocaleString("es-AR", {
                    minimumFractionDigits: 2,
                  })}`}
                  style={cardStyles.mercadopago}
                />
              </Col>
              <Col lg={2} md={4} sm={6}>
                <KPICard
                  title="Transferencia/Otros"
                  amount={`$${(totalTransferencia + totalModo).toLocaleString("es-AR", {
                    minimumFractionDigits: 2,
                  })}`}
                  style={cardStyles.transferencia}
                >
                  <small className="text-muted mt-2 d-block" style={{fontSize: '0.65rem'}}>
                    Transf: ${totalTransferencia.toLocaleString("es-AR", {minimumFractionDigits: 2})} | MODO: ${totalModo.toLocaleString("es-AR", {minimumFractionDigits: 2})}
                  </small>
                </KPICard>
              </Col>
              {totalCreditoUsado > 0 && (
                <Col lg={2} md={4} sm={6}>
                  <KPICard
                    title="NC Usada"
                    amount={`$${totalCreditoUsado.toLocaleString("es-AR", {
                      minimumFractionDigits: 2,
                    })}`}
                    style={cardStyles.creditoUsado}
                  >
                    <small className="text-danger fw-bold mt-2 d-block" style={{fontSize: '0.65rem'}}>
                      ⚠️ NO ES EFECTIVO DE CAJA
                    </small>
                  </KPICard>
                </Col>
              )}
            </Row>

            {/* *************************************************************** */}
            {/* 🚀 NUEVA CARD: DESGLOSE COMPLETO POR FORMA DE PAGO DEL PERÍODO FILTRADO */}
            {/* *************************************************************** */}
            <Row className="mb-4">
              <Col lg={4} md={6}>
                  <Card className="shadow-lg p-3 border-0 h-100 rounded-3">
                      <div className="d-flex justify-content-between align-items-center mb-1">
                          <h5 className="mb-0 text-uppercase fw-bold text-dark" style={{fontSize: '0.85rem'}}>
                              Total de <span className="text-primary">Ventas Registradas</span>
                          </h5>
                          <span className="fs-4 text-primary">🛍️</span>
                      </div>
                      
                      <div className="d-flex justify-content-between align-items-end border-bottom pb-2 mb-3">
                          <h2 className={`fw-bold text-success m-0`} style={{fontSize: '2rem'}}>
                              $
                              {totalVentas.toLocaleString("es-AR", {
                                  minimumFractionDigits: 2,
                              })}
                          </h2>
                          <Badge bg="primary" className="fs-5 rounded-pill shadow-sm text-white">
                              {ventasFiltradas.length} Ventas
                          </Badge>
                      </div>

                      <h6 className="mt-2 mb-2 text-muted fw-bold" style={{fontSize: '0.8rem'}}>DESGLOSE DETALLADO POR MÉTODO:</h6>
                      <div className="list-group list-group-flush">
                          {ventasPorFormaDePago.map((stats, index) => (
                              <div
                                  key={stats.formaPago}
                                  // Usamos un estilo diferente para Nota de Crédito para destacarlo
                                  className={`list-group-item d-flex justify-content-between align-items-center px-0 py-1 ${stats.formaPago === 'Nota de Crédito' ? 'bg-light' : ''}`}
                                  style={{ backgroundColor: 'transparent', border: 'none'}}
                              >
                                  <div className={`text-truncate fw-bold ${stats.formaPago === 'Nota de Crédito' ? 'text-secondary' : 'text-dark'}`}>
                                      {stats.formaPago}
                                      {stats.cantidadVentas !== 0 && (
                                          <Badge bg="secondary" className="ms-2 rounded-pill">
                                              {stats.cantidadVentas}
                                          </Badge>
                                      )}
                                  </div>
                                  <span className="fw-bold">
                                      $
                                      {stats.total.toLocaleString("es-AR", {
                                          minimumFractionDigits: 2,
                                      })}
                                  </span>
                              </div>
                          ))}
                          {ventasPorFormaDePago.length === 0 && (
                            <p className="text-muted fst-italic">No hay ventas registradas en el período seleccionado.</p>
                          )}
                      </div>

                  </Card>
              </Col>
            </Row>
            {/* *************************************************************** */}
            {/* FIN: NUEVA CARD DESGLOSE */}
            {/* *************************************************************** */}
            
            <hr className="my-4" />


            {/* Fila de métricas clave (USANDO COMPONENTE StatCard) */}
            <h5 className="mt-4 mb-3 text-secondary fw-light">
               <span className="fw-bold">Métricas</span> de Resultado (Período Filtrado)
            </h5>
            <Row className="mb-4 g-3">
              
              {/* Venta Total */}
              <Col xs={6} md={2}>
                  <StatCard 
                      title="Venta Total (Final)"
                      amount={`$${totalVentas.toLocaleString("es-AR", { minimumFractionDigits: 2, })}`}
                      style={metricStyles.ventaTotal} 
                  />
              </Col>

              {/* Ticket Promedio */}
              <Col xs={6} md={2}>
                  <StatCard 
                      title="Ticket Promedio"
                      amount={`$${ticketPromedioVenta.toLocaleString("es-AR", { minimumFractionDigits: 2, })}`}
                      style={metricStyles.ticketPromedio} 
                  />
              </Col>

              {/* Costo de Productos */}
              <Col xs={6} md={2}>
                  <StatCard 
                      title="Costo Productos (CPV)"
                      amount={`$${costoTotalProductos.toLocaleString("es-AR", { minimumFractionDigits: 2, })}`}
                      style={metricStyles.costoProductos} 
                  />
              </Col>

              {/* Ganancia Bruta */}
              <Col xs={6} md={2}>
                  <StatCard 
                      title="Ganancia Bruta"
                      amount={`$${gananciaBruta.toLocaleString("es-AR", { minimumFractionDigits: 2, })}`}
                      style={metricStyles.gananciaBruta} 
                  />
              </Col>

              {/* Total Gastos */}
              <Col xs={6} md={2}>
                  <StatCard 
                      title="Total Gastos"
                      amount={`$${totalGastos.toLocaleString("es-AR", { minimumFractionDigits: 2, })}`}
                      style={metricStyles.totalGastos} 
                  />
              </Col>

              {/* Ganancia Neta */}
              <Col xs={6} md={2}>
                  <StatCard 
                      title="Ganancia Neta"
                      amount={`$${gananciaNeta.toLocaleString("es-AR", { minimumFractionDigits: 2, })}`}
                      style={metricStyles.gananciaNeta} 
                  >
                  
                  </StatCard>
              </Col>
            </Row>

            {/* CHARTS */}
            <h5 className="mt-5 mb-3 text-secondary fw-light">
               <span className="fw-bold">Visualización</span> de Datos (Período Filtrado)
            </h5>
            <Row className="g-4 mb-4">
              <Col lg={6}>
                <Card className="p-3 shadow-lg rounded-3 border-0">
                  <h6 className="fw-bold text-dark">Ventas por Hora del Día ⏰ (Total Recaudado)</h6>
                  <Bar data={dataVentasPorHora} />
                </Card>
              </Col>
              <Col lg={6}>
                <Card className="p-3 shadow-lg rounded-3 border-0">
                  {/* GRÁFICO CONDICIONAL */}
                  {vistaFiltro === 'mensual' ? (
                      <>
                          <h6 className="fw-bold text-dark">Tendencia de Ventas por Día (Mes) 🗓️</h6>
                          <Line data={dataVentasPorDia} />
                      </>
                  ) : (
                      <>
                          <h6 className="fw-bold text-dark">Tendencia de Ventas por Mes (Rango Anual) 📊</h6>
                          <Line data={dataVentasPorMes} />
                      </>
                  )}
                </Card>
              </Col>
            </Row>
            <Row className="g-4 mb-4">
              <Col lg={4} md={6}>
                <Card className="p-3 shadow-lg rounded-3 border-0">
                  <h6 className="fw-bold text-dark">Top 10 Productos más vendidos (Cantidad) 📦</h6>
                  <Bar data={dataTopProductos} />
                </Card>
              </Col>
              <Col lg={4} md={6}>
                <Card className="p-3 shadow-lg rounded-3 border-0">
                  <h6 className="fw-bold text-dark">Distribución Gastos (Categoría Principal) 📉</h6>
                  <Pie data={dataGastosPorCategoriaAlta} />
                </Card>
              </Col>
              <Col lg={4} md={6}>
                <Card className="p-3 shadow-lg rounded-3 border-0">
                  <h6 className="fw-bold text-dark">Distribución Ventas (Forma de Pago) 💳</h6>
                  <Pie data={dataVentasPorFormaDePago} />
                </Card>
              </Col>
            </Row>

            {/* TABLAS DETALLE */}
            <h5 className="mt-5 mb-3 text-secondary fw-light">
              <span className="fw-bold">Detalle</span> de Productos, Vendedores y Gastos (Período Filtrado)
            </h5>
            <Row className="g-4 mb-4">
              {/* TABLA: TOP 10 PRODUCTOS */}
              <Col lg={12}>
                <Card className="shadow-lg border-0 rounded-3">
                  {/* 🎨 COLOR PASTEL: Azul Claro (Primary) */}
                  <Card.Header 
                    className="fw-bold border-bottom text-primary" 
                    style={{ backgroundColor: cardStyles.tarjeta.backgroundColor }}
                  >
                    🔝 Top 10 Productos Más Vendidos (Recaudación <span className='fw-bold'>Neta</span>)
                  </Card.Header>
                  <div className="table-responsive">
                    <Table bordered={false} hover size="sm" className="mb-0">
                      <thead>
                        <tr>
                          <th style={tableHeaderStyle}>#</th>
                          <th style={tableHeaderStyle}>
                            Producto (Código)
                          </th>
                          <th
                            style={tableHeaderStyle}
                            className="text-end"
                          >
                            Cantidad Vendida
                          </th>
                          <th
                            style={tableHeaderStyle}
                            className="text-end"
                          >
                            Recaudado **NETO**
                          </th>
                          <th
                            style={tableHeaderStyle}
                            className="text-end"
                          >
                            Margen Bruto (%)
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {detalleProductosAggregado.slice(0, 10).map((p, i) => (
                          <tr
                            key={p.key}
                            style={rowStyle(i)}
                            onMouseEnter={(e) =>
                              (e.currentTarget.style.backgroundColor =
                                "#f8f9fa") // Gris muy sutil en hover
                            }
                            onMouseLeave={(e) =>
                              (e.currentTarget.style.backgroundColor =
                                rowStyle(i).backgroundColor)
                            }
                          >
                            <td>{i + 1}</td>
                            <td>
                              <strong>{p.nombre}</strong>
                              <small className="text-muted d-block" style={{fontSize: '0.75rem'}}>
                                {p.codigo}
                              </small>
                            </td>
                            <td className="text-end">
                              <Badge bg="primary" className="fw-bold rounded-pill">
                                {p.cantidad.toLocaleString("es-AR")}
                              </Badge>
                            </td>
                            <td className="text-end fw-bold text-success">
                              $
                              {Number(p.recaudado || 0).toLocaleString(
                                "es-AR",
                                { minimumFractionDigits: 2 }
                              )}
                            </td>
                            <td className="text-end">
                              <Badge
                                bg={
                                  p.margenPorcentaje > 0 ? "success" : "danger"
                                }
                                className="rounded-pill"
                              >
                                {p.margenPorcentaje.toFixed(2)}%
                              </Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                  </div>
                </Card>
              </Col>
              
              {/* TABLA: Ventas por Vendedor */}
              <Col lg={6}>
                <Card className="shadow-lg border-0 rounded-3">
                  {/* 🎨 COLOR PASTEL: Verde Claro (Success) */}
                  <Card.Header 
                    className="fw-bold border-bottom text-success"
                    style={{ backgroundColor: cardStyles.mercadopago.backgroundColor }}
                  >
                    Ventas por Vendedor 🧑‍💼
                  </Card.Header>
                  <div className="table-responsive">
                    <Table bordered={false} hover size="sm" className="mb-0">
                      <thead>
                        <tr>
                          <th style={tableHeaderStyle}>
                            Vendedor
                          </th>
                          <th
                            style={tableHeaderStyle}
                            className="text-end"
                          >
                            Total Vendido
                          </th>
                          <th
                            style={tableHeaderStyle}
                            className="text-end"
                          >
                            # Ventas
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {ventasPorVendedor.map((v, i) => (
                          <tr
                            key={v.vendedor}
                            style={rowStyle(i)}
                            onMouseEnter={(e) =>
                              (e.currentTarget.style.backgroundColor =
                                "#f8f9fa")
                            }
                            onMouseLeave={(e) =>
                              (e.currentTarget.style.backgroundColor =
                                rowStyle(i).backgroundColor)
                            }
                          >
                            <td>{v.vendedor}</td>
                            <td className="text-end fw-bold text-success">
                              $
                              {v.total.toLocaleString("es-AR", {
                                minimumFractionDigits: 2,
                              })}
                            </td>
                            <td className="text-end">
                              <Badge bg="secondary" className="rounded-pill">{v.cantidadVentas}</Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                  </div>
                </Card>
              </Col>

              {/* TABLA: Top 10 Gastos Mayores */}
              <Col lg={6}>
                <Card className="shadow-lg border-0 rounded-3">
                  {/* 🎨 COLOR PASTEL: Rojo Claro (Danger) */}
                  <Card.Header 
                    className="fw-bold border-bottom text-danger"
                    style={{ backgroundColor: metricStyles.totalGastos.bg }}
                  >
                    Top 10 Gastos Mayores 💸
                  </Card.Header>
                  <div className="table-responsive">
                    <Table bordered={false} hover size="sm" className="mb-0">
                      <thead>
                        <tr>
                          <th style={tableHeaderStyle}>
                            Fecha
                          </th>
                          <th style={tableHeaderStyle}>
                            Categoría
                          </th>
                          <th style={tableHeaderStyle}>
                            Descripción
                          </th>
                          <th
                            style={tableHeaderStyle}
                            className="text-end"
                          >
                            Monto
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {top10Gastos.map((g, i) => (
                          <tr
                            key={g.id}
                            style={rowStyle(i)}
                            onMouseEnter={(e) =>
                              (e.currentTarget.style.backgroundColor =
                                "#f8f9fa") 
                            } 
                            onMouseLeave={(e) =>
                              (e.currentTarget.style.backgroundColor =
                                rowStyle(i).backgroundColor)
                            }
                          >
                            <td>
                              {g.fechaObj
                                ? g.fechaObj.toLocaleDateString("es-AR")
                                : "—"}
                            </td>
                            <td>
                              <strong>{g.categoria}</strong>
                              <small className="text-muted d-block" style={{fontSize: '0.75rem'}}>{g.subcategoria}</small>
                            </td>
                            <td>{g.descripcion || "—"}</td>
                            <td className="text-end fw-bold text-danger">
                              $
                              {Number(g.monto || 0).toLocaleString("es-AR", {
                                minimumFractionDigits: 2,
                              })}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                  </div>
                </Card>
              </Col>
            </Row>

            {/* TABLA: Ventas por Categoría de Producto */}
            <Row className="g-4 mb-4">
              <Col lg={12}>
                <Card className="shadow-lg border-0 rounded-3">
                  {/* 🎨 COLOR PASTEL: Cyan Claro (Info) */}
                  <Card.Header 
                    className="fw-bold border-bottom text-info"
                    style={{ backgroundColor: cardStyles.transferencia.backgroundColor }}
                  >
                    Ventas por Categoría de Producto 🏷️
                  </Card.Header>
                  <div className="table-responsive">
                    <Table bordered={false} hover size="sm" className="mb-0">
                      <thead>
                        <tr>
                          <th style={tableHeaderStyle}>
                            Categoría
                          </th>
                          <th
                            style={tableHeaderStyle}
                            className="text-end"
                          >
                            Total Recaudado
                          </th>
                          <th
                            style={tableHeaderStyle}
                            className="text-end"
                          >
                            # Productos Vendidos
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {ventasPorCategoria.map((c, i) => (
                          <tr
                            key={c.categoria}
                            style={rowStyle(i)}
                            onMouseEnter={(e) =>
                              (e.currentTarget.style.backgroundColor =
                                "#f8f9fa")
                            }
                            onMouseLeave={(e) =>
                              (e.currentTarget.style.backgroundColor =
                                rowStyle(i).backgroundColor)
                            }
                          >
                            <td>{c.categoria}</td>
                            <td className="text-end fw-bold text-info">
                              $
                              {c.totalRecaudado.toLocaleString("es-AR", {
                                minimumFractionDigits: 2,
                              })}
                            </td>
                            <td className="text-end">
                              <Badge bg="secondary" className="rounded-pill">
                                {c.cantidadProductos}
                              </Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                  </div>
                </Card>
              </Col>
            </Row>

            {/* TABLA: Gastos Detalle */}
            <Row className="g-4 mb-4">
              <Col lg={12}>
                <Card className="shadow-lg border-0 rounded-3">
                  {/* 🎨 COLOR PASTEL: Amarillo Claro (Warning) */}
                  <Card.Header 
                    className="fw-bold border-bottom text-warning"
                    style={{ backgroundColor: cardStyles.efectivo.backgroundColor }}
                  >
                    Detalle de Gastos por Categoría 🧾
                  </Card.Header>
                  <div className="table-responsive">
                    <Table bordered={false} hover size="sm" className="mb-0">
                      <thead>
                        <tr>
                          <th style={tableHeaderStyle}>
                            Categoría
                          </th>
                          <th
                            style={tableHeaderStyle}
                            className="text-end"
                          >
                            Total Gastado
                          </th>
                          <th
                            style={tableHeaderStyle}
                            className="text-end"
                          >
                            # Gastos
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {gastosPorCategoriaAlta.map((c, i) => (
                          <tr
                            key={c.categoria}
                            style={rowStyle(i)}
                            onMouseEnter={(e) =>
                              (e.currentTarget.style.backgroundColor =
                                "#f8f9fa")
                            }
                            onMouseLeave={(e) =>
                              (e.currentTarget.style.backgroundColor =
                                rowStyle(i).backgroundColor)
                            }
                          >
                            <td>{c.categoria}</td>
                            <td className="text-end fw-bold text-danger">
                              $
                              {c.total.toLocaleString("es-AR", {
                                minimumFractionDigits: 2,
                              })}
                            </td>
                            <td className="text-end">
                              <Badge bg="secondary" className="rounded-pill">{c.cantidadGastos}</Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                  </div>
                </Card>
              </Col>
            </Row>

          </>
        )}
      </Container>

      <FooterDashboard/>
    </>
  );
};

export default EstadisticasGenerales;