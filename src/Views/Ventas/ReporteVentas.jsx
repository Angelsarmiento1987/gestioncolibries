// ReporteVentas.jsx
import React, { useEffect, useState, useMemo } from "react";
import { FIRESTORE_DB } from "../../Database/Database";
import { collection, getDocs, addDoc, deleteDoc, doc } from "firebase/firestore";
import { NavBarDashboard } from "../../Components/NavBarDashboard/NavBarDashboard";
import {
  Container,
  Row,
  Col,
  Card,
  Table,
  Form,
  Button,
  Spinner,
  Modal,
  InputGroup,
  Alert,
} from "react-bootstrap";

/**
 * ReporteVentas (Opción B) - Versión extendida
 * - filtro por rango (inclusive)
 * - semanas reales selector (lunes-domingo)
 * - modal detalle con ventas, costo, ganancia bruta, venta neta, totales por mes, por vendedor
 * - modal gastos filtrado por rango
 * - export CSV / imprimir (PDF) del detalle
 * - banner de stock negativo (link a producto)
 */

const toDate = (value) => {
  if (!value) return null;
  if (value?.toDate) return value.toDate();
  return new Date(value);
};

const startOfDay = (d) => {
  const t = new Date(d);
  t.setHours(0, 0, 0, 0);
  return t;
};
const endOfDay = (d) => {
  const t = new Date(d);
  t.setHours(23, 59, 59, 999);
  return t;
};

// calcula inicio (lunes) y fin (domingo) de la semana que contiene "refDate"
const weekRangeForOffset = (refDate = new Date(), offsetWeeks = 0) => {
  // offsetWeeks: 0 = semana actual, -1 = semana anterior, -2 = 2 semanas atrás
  const d = new Date(refDate);
  // encontrar lunes de la semana actual (ISO-like Monday = 1)
  const day = d.getDay(); // 0=Sun,1=Mon...
  // calcular dias desde lunes: if Sunday (0) -> go back 6 days
  const diffToMonday = (day === 0 ? -6 : 1 - day);
  const monday = new Date(d);
  monday.setDate(d.getDate() + diffToMonday + (offsetWeeks * 7));
  monday.setHours(0, 0, 0, 0);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);
  return { start: monday, end: sunday };
};

const ReporteVentas = () => {
  const [ventas, setVentas] = useState([]);
  const [loading, setLoading] = useState(false);

  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaFin, setFechaFin] = useState("");
  const [vendedorFiltro, setVendedorFiltro] = useState("");
  const [soloHoy, setSoloHoy] = useState(false);

  // semana selector: "actual" | "anterior" | "dos"
  const [semanaSelector, setSemanaSelector] = useState("actual");

  // modales
  const [showDetalleGanancias, setShowDetalleGanancias] = useState(false);
  const [showGastos, setShowGastos] = useState(false);

  // gastos (local state + Firestore)
  const [gastos, setGastos] = useState([]);
  const [gastoForm, setGastoForm] = useState({
    tipo: "fijo",
    categoria: "Luz",
    monto: "",
    fecha: new Date().toISOString().slice(0, 10),
    nota: "",
  });
  const [gastosLoading, setGastosLoading] = useState(false);

  // cargar ventas
  const loadVentas = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(collection(FIRESTORE_DB, "ventas"));
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setVentas(list);
    } catch (err) {
      console.error("loadVentas", err);
      alert("Error cargando ventas (ver consola)");
    }
    setLoading(false);
  };

  // cargar gastos
  const loadGastos = async () => {
    setGastosLoading(true);
    try {
      const snap = await getDocs(collection(FIRESTORE_DB, "gastos"));
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setGastos(list);
    } catch (err) {
      console.error("loadGastos", err);
    }
    setGastosLoading(false);
  };

  useEffect(() => {
    loadVentas();
    loadGastos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // -------------------------
  // FILTRADO (rango inclusivo)
  // -------------------------
  const ventasFiltradas = useMemo(() => {
    let lista = ventas.slice();

    if (soloHoy) {
      const hoy = new Date();
      lista = lista.filter((v) => {
        const fecha = toDate(v.fecha);
        return fecha && fecha.toDateString() === hoy.toDateString();
      });
      return lista.sort((a, b) => toDate(b.fecha) - toDate(a.fecha));
    }

    lista = lista.filter((v) => {
      const fecha = toDate(v.fecha);
      if (!fecha) return false;

      if (fechaInicio) {
        const inicio = startOfDay(new Date(fechaInicio));
        if (fecha < inicio) return false;
      }

      if (fechaFin) {
        const fin = endOfDay(new Date(fechaFin));
        if (fecha > fin) return false;
      }

      if (vendedorFiltro && v.usuario !== vendedorFiltro) return false;

      return true;
    });

    // ordenar desc por fecha
    lista.sort((a, b) => toDate(b.fecha) - toDate(a.fecha));
    return lista;
  }, [ventas, fechaInicio, fechaFin, vendedorFiltro, soloHoy]);

  // -------------------------
  // Totales y ganancias
  // -------------------------
  const totalRango = ventasFiltradas.reduce((acc, v) => acc + Number(v.totalFinal || 0), 0);

  // Ganancia real para una lista (ventas - costo total)
  const calcularGananciaReal = (lista) =>
    lista.reduce((acc, v) => {
      const costoTotal = (v.productos || []).reduce((s, p) => s + Number(p.precioCosto || 0) * Number(p.cantidad || 0), 0);
      return acc + (Number(v.totalFinal || 0) - costoTotal);
    }, 0);

  // Ganancia total (del rango filtrado)
  const gananciaTotal = calcularGananciaReal(ventasFiltradas);

  // -------------------------
  // Semana REAL selector (Opción 1: lunes-domingo)
  // -------------------------
  const weekOffset = useMemo(() => {
    if (semanaSelector === "actual") return 0;
    if (semanaSelector === "anterior") return -1;
    return -2;
  }, [semanaSelector]);

  const semanaRange = useMemo(() => weekRangeForOffset(new Date(), weekOffset), [weekOffset]);
  const ventasSemana = useMemo(() => {
    const { start, end } = semanaRange;
    return ventas.filter((v) => {
      const fecha = toDate(v.fecha);
      return fecha && fecha >= start && fecha <= end;
    }).sort((a,b) => toDate(b.fecha) - toDate(a.fecha));
  }, [ventas, semanaRange]);

  const gananciaSemanaReal = useMemo(() => calcularGananciaReal(ventasSemana), [ventasSemana]);

  // -------------------------
  // Breakdown por método de pago (sobre ventasFiltradas)
  // -------------------------
  const breakdownMetodos = useMemo(() => {
    const map = { efectivo: 0, tarjeta: 0, transferencia: 0, otro: 0 };
    ventasFiltradas.forEach((v) => {
      const metodo = (v.metodoPago || "otro").toString().toLowerCase();
      if (map[metodo] !== undefined) map[metodo] += Number(v.totalFinal || 0);
      else map.otro += Number(v.totalFinal || 0);
    });
    return map;
  }, [ventasFiltradas]);

  // ventasHoy (según filtros actuales)
  const hoy = new Date();
  const ventasHoy = ventasFiltradas.filter((v) => {
    const fecha = toDate(v.fecha);
    return fecha && fecha.toDateString() === hoy.toDateString();
  });
  const cajaDia = ventasHoy.reduce((acc, v) => acc + Number(v.totalFinal || 0), 0);

  // productos con stock negativo (basado en ventasFiltradas)
  const productosVendidos = useMemo(() => {
    const map = {};
    ventasFiltradas.forEach((v) => {
      (v.productos || []).forEach((p) => {
        if (!map[p.idProducto]) map[p.idProducto] = { id: p.idProducto, nombre: p.nombre, cantidad: 0, stockActual: p.stock ?? p.stockActual ?? 0 };
        map[p.idProducto].cantidad += Number(p.cantidad || 0);
      });
    });
    return map;
  }, [ventasFiltradas]);
  const productosStockNegativo = Object.values(productosVendidos).filter((p) => p.stockActual < 0);

  // ranking mes (ventas dentro del mes actual respecto al rango filtrado)
  const ventasMes = useMemo(() => {
    const ahora = new Date();
    return ventasFiltradas.filter((v) => {
      const fecha = toDate(v.fecha);
      return fecha && fecha.getMonth() === ahora.getMonth() && fecha.getFullYear() === ahora.getFullYear();
    });
  }, [ventasFiltradas]);

  const productosMasVendidosMes = useMemo(() => {
    const map = {};
    ventasMes.forEach((v) => {
      (v.productos || []).forEach((p) => {
        if (!map[p.idProducto]) map[p.idProducto] = { nombre: p.nombre, cantidad: 0 };
        map[p.idProducto].cantidad += Number(p.cantidad || 0);
      });
    });
    return Object.values(map).sort((a, b) => b.cantidad - a.cantidad);
  }, [ventasMes]);

  // -------------------------
  // GASTOS (modal) - añadir/eliminar
  // -------------------------
  const handleGastoChange = (field, value) => setGastoForm((s) => ({ ...s, [field]: value }));

  const agregarGasto = async () => {
    const monto = Number(gastoForm.monto);
    if (!gastoForm.categoria || !monto || isNaN(monto)) return alert("Completá categoría y monto válido");
    setGastosLoading(true);
    try {
      const docRef = await addDoc(collection(FIRESTORE_DB, "gastos"), {
        tipo: gastoForm.tipo,
        categoria: gastoForm.categoria,
        monto: monto,
        fecha: gastoForm.fecha,
        nota: gastoForm.nota || "",
        createdAt: new Date().toISOString(),
      });
      setGastos((s) => [{ id: docRef.id, tipo: gastoForm.tipo, categoria: gastoForm.categoria, monto, fecha: gastoForm.fecha, nota: gastoForm.nota }, ...s]);
      setGastoForm({ tipo: "fijo", categoria: "Luz", monto: "", fecha: new Date().toISOString().slice(0, 10), nota: "" });
      alert("Gasto guardado");
    } catch (err) {
      console.error("agregarGasto", err);
      alert("Error guardando gasto");
    }
    setGastosLoading(false);
  };

  const eliminarGasto = async (id) => {
    if (!window.confirm("Eliminar gasto?")) return;
    try {
      await deleteDoc(doc(FIRESTORE_DB, "gastos", id));
      setGastos((s) => s.filter((g) => g.id !== id));
    } catch (err) {
      console.error("eliminarGasto", err);
      alert("Error eliminando gasto");
    }
  };

  // gasto total en el rango filtrado (si querés filtrar por fechas, podés ajustar)
  const totalGastosAll = gastos.reduce((s, g) => s + Number(g.monto || 0), 0);

  // Si hay fechaInicio/fechaFin, mostrar solo esos gastos en modal
  const gastosFiltradosPorRango = useMemo(() => {
    if (!fechaInicio && !fechaFin) return gastos.slice().sort((a,b) => (new Date(b.fecha)) - (new Date(a.fecha)));
    const inicio = fechaInicio ? startOfDay(new Date(fechaInicio)) : new Date(-8640000000000000);
    const fin = fechaFin ? endOfDay(new Date(fechaFin)) : new Date(8640000000000000);
    return gastos.filter((g) => {
      const f = toDate(g.fecha);
      return f && f >= inicio && f <= fin;
    }).sort((a,b) => new Date(b.fecha) - new Date(a.fecha));
  }, [gastos, fechaInicio, fechaFin]);

  const totalGastos = gastosFiltradosPorRango.reduce((s,g) => s + Number(g.monto || 0), 0);

  // Ganancia neta: gananciaTotal - gastos (simple) (usamos gastos filtrados por rango)
  const gananciaNeta = gananciaTotal - totalGastos;

  // -------------------------
  // detalle de ganancias por día (para modal)
  // -------------------------
  const detallePorDia = useMemo(() => {
    const map = {};
    ventasFiltradas.forEach((v) => {
      const fecha = toDate(v.fecha);
      if (!fecha) return;
      const key = fecha.toISOString().slice(0, 10);
      if (!map[key]) map[key] = { fecha: key, ventas: 0, costo: 0 };
      map[key].ventas += Number(v.totalFinal || 0);
      map[key].costo += (v.productos || []).reduce((s, p) => s + Number(p.precioCosto || 0) * Number(p.cantidad || 0), 0);
    });
    return Object.values(map).sort((a, b) => new Date(a.fecha) - new Date(b.fecha));
  }, [ventasFiltradas]);

  // totales acumulados por mes (sobre ventasFiltradas)
  const totalesPorMes = useMemo(() => {
    const map = {};
    ventasFiltradas.forEach((v) => {
      const fecha = toDate(v.fecha);
      if (!fecha) return;
      const key = `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, "0")}`;
      if (!map[key]) map[key] = { ventas: 0, gananciaBruta: 0 };
      map[key].ventas += Number(v.totalFinal || 0);
      const costo = (v.productos || []).reduce((s, p) => s + Number(p.precioCosto || 0) * Number(p.cantidad || 0), 0);
      map[key].gananciaBruta += Number(v.totalFinal || 0) - costo;
    });
    // convertir a array ordenada desc
    return Object.entries(map)
      .map(([k, v]) => ({ mes: k, ...v }))
      .sort((a, b) => b.mes.localeCompare(a.mes));
  }, [ventasFiltradas]);

  // ganancia por vendedor (sobre ventasFiltradas)
  const gananciaPorVendedor = useMemo(() => {
    const map = {};
    ventasFiltradas.forEach((v) => {
      const user = v.usuario || "Sin vendedor";
      if (!map[user]) map[user] = { ventas: 0, ganancia: 0 };
      map[user].ventas += Number(v.totalFinal || 0);
      const costo = (v.productos || []).reduce((s, p) => s + Number(p.precioCosto || 0) * Number(p.cantidad || 0), 0);
      map[user].ganancia += Number(v.totalFinal || 0) - costo;
    });
    return Object.entries(map).map(([user, val]) => ({ vendedor: user, ...val })).sort((a,b) => b.ventas - a.ventas);
  }, [ventasFiltradas]);

  // comparativa mes actual vs anterior (ventas y ganancia bruta)
  const comparativaMes = useMemo(() => {
    const now = new Date();
    const thisMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const prevMonthKey = `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, "0")}`;
    const find = (key) => totalesPorMes.find((t) => t.mes === key) || { ventas: 0, gananciaBruta: 0 };
    const actual = find(thisMonthKey);
    const anterior = find(prevMonthKey);
    const pctVentas = anterior.ventas === 0 ? (actual.ventas === 0 ? 0 : 100) : ((actual.ventas - anterior.ventas) / Math.abs(anterior.ventas)) * 100;
    const pctGanancia = anterior.gananciaBruta === 0 ? (actual.gananciaBruta === 0 ? 0 : 100) : ((actual.gananciaBruta - anterior.gananciaBruta) / Math.abs(anterior.gananciaBruta)) * 100;
    return { thisMonthKey, prevMonthKey, actual, anterior, pctVentas, pctGanancia };
  }, [totalesPorMes]);

  // -------------------------
  // helpers UI
  // -------------------------
  const formatMoney = (n) => {
    const num = Number(n || 0);
    if (isNaN(num)) return "$0";
    return `$${num.toLocaleString("es-AR", { maximumFractionDigits: 2 })}`;
  };

  // -------------------------
  // EXPORTS: CSV / PDF (print window)
  // -------------------------
  const exportDetalleCSV = () => {
    // detallePorDia rows: Fecha, Ventas, Costo, Ganancia Bruta
    const rows = [
      ["Fecha", "Ventas", "Costo", "Ganancia bruta"]
    ];
    detallePorDia.forEach(d => {
      rows.push([d.fecha, d.ventas, d.costo, (d.ventas - d.costo)]);
    });
    // totals
    rows.push([]);
    rows.push(["Total ventas (rango)", totalRango]);
    rows.push(["Total ganancia bruta (rango)", gananciaTotal]);
    rows.push(["Total gastos (rango seleccionado)", totalGastos]);
    rows.push(["Ganancia neta (rango)", gananciaNeta]);

    const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\r\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `detalle_ganancias_${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportGastosCSV = () => {
    const rows = [["Tipo","Categoria","Monto","Fecha","Nota"]];
    gastosFiltradosPorRango.forEach(g => {
      rows.push([g.tipo, g.categoria, g.monto, g.fecha, g.nota || ""]);
    });
    rows.push([]);
    rows.push(["Total gastos (mostrados)", totalGastos]);
    const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\r\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `gastos_${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const printDetalleAsPDF = () => {
    // genera una ventana con el resumen y tabla, luego llama print()
    const win = window.open("", "_blank", "width=900,height=700");
    if (!win) return alert("Permite ventanas emergentes para exportar PDF");
    const rowsHtml = detallePorDia.map(d => `
      <tr>
        <td>${new Date(d.fecha).toLocaleDateString()}</td>
        <td style="text-align:right">${Number(d.ventas).toFixed(2)}</td>
        <td style="text-align:right">${Number(d.costo).toFixed(2)}</td>
        <td style="text-align:right">${Number(d.ventas - d.costo).toFixed(2)}</td>
      </tr>
    `).join("");
    const html = `
      <html>
        <head>
          <title>Detalle ganancia</title>
        </head>
        <body>
          <h2>Detalle de ganancias por día</h2>
          <p>Rango: ${fechaInicio || "—"} / ${fechaFin || "—"}</p>
          <table border="1" cellpadding="6" cellspacing="0" style="border-collapse:collapse;width:100%">
            <thead>
              <tr>
                <th>Fecha</th><th>Ventas</th><th>Costo</th><th>Ganancia bruta</th>
              </tr>
            </thead>
            <tbody>${rowsHtml}</tbody>
          </table>
          <h3>Totales</h3>
          <p>Total vendido en rango: ${Number(totalRango).toFixed(2)}</p>
          <p>Total ganancia bruta: ${Number(gananciaTotal).toFixed(2)}</p>
          <p>Total gastos (rango): ${Number(totalGastos).toFixed(2)}</p>
          <p>Ganancia neta: ${Number(gananciaNeta).toFixed(2)}</p>
        </body>
      </html>
    `;
    win.document.write(html);
    win.document.close();
    win.focus();
    // Esperar un momento para que renderice (suficiente en la mayoría de casos)
    setTimeout(() => {
      win.print();
      // win.close(); // dejar para que usuario decida cerrar
    }, 500);
  };

  // -------------------------
  // RENDER
  // -------------------------
  return (
    <>
      <NavBarDashboard />

      <Container fluid className="py-4" style={{ background: "#f5f7fb", minHeight: "100vh" }}>
      

        {/* Header */}
        <Row className="mb-3">
          <Col>
            <h3 className="text-primary">Reporte de Ventas — Opción B (extendido)</h3>
            <p className="text-muted">Filtra por rango, revisá ganancias, gastos y métodos de pago. Semana real seleccionable (lunes–domingo).</p>
          </Col>
        </Row>

        {/* filtros */}
        <Row className="mb-3 g-2 align-items-end">
          <Col md={2}>
            <Form.Label>Fecha inicio</Form.Label>
            <Form.Control type="date" value={fechaInicio} onChange={(e) => setFechaInicio(e.target.value)} />
          </Col>
          <Col md={2}>
            <Form.Label>Fecha fin</Form.Label>
            <Form.Control type="date" value={fechaFin} onChange={(e) => setFechaFin(e.target.value)} />
          </Col>
          <Col md={2}>
            <Form.Label>Vendedor</Form.Label>
            <Form.Control type="text" value={vendedorFiltro} onChange={(e) => setVendedorFiltro(e.target.value)} placeholder="Nombre vendedor" />
          </Col>

          <Col md={3}>
            <Form.Label>Semana (real: lun-dom)</Form.Label>
            <Form.Select value={semanaSelector} onChange={(e) => setSemanaSelector(e.target.value)}>
              <option value="actual">Semana actual ({semanaRange.start.toLocaleDateString()} — {semanaRange.end.toLocaleDateString()})</option>
              <option value="anterior">Semana anterior</option>
              <option value="dos">2 semanas atrás</option>
            </Form.Select>
            <small className="text-muted">Semana seleccionada no depende del rango de fechas.</small>
          </Col>

          <Col md={3} className="d-flex gap-2">
            <Button variant={soloHoy ? "primary" : "outline-primary"} onClick={() => setSoloHoy(!soloHoy)} className="mt-2">
              {soloHoy ? "Ver todas" : "Hoy"}
            </Button>
            <Button onClick={loadVentas} disabled={loading} className="mt-2">
              {loading ? <Spinner animation="border" size="sm" /> : "Refrescar"}
            </Button>
            <Button variant="outline-secondary" onClick={() => { setFechaInicio(""); setFechaFin(""); setVendedorFiltro(""); setSoloHoy(false); }} className="mt-2">
              Limpiar
            </Button>
          </Col>
        </Row>

        {/* tarjetas resumen */}
        <Row className="g-3 mb-3">
          <Col md={3}>
            <Card className="shadow-sm p-3">
              <Card.Title className="small">Ganancia total (rango)</Card.Title>
              <h4>{formatMoney(gananciaTotal)}</h4>
              <small className="text-muted">Bruta (ventas - costo)</small>
              <div className="mt-2">
                <Button size="sm" variant="link" onClick={() => setShowDetalleGanancias(true)}>Ver detalle</Button>
                <Button size="sm" variant="outline-secondary" onClick={exportDetalleCSV} className="ms-2">Export CSV</Button>
                <Button size="sm" variant="outline-secondary" onClick={printDetalleAsPDF} className="ms-2">Export PDF</Button>
              </div>
            </Card>
          </Col>

          <Col md={3}>
            <Card className="shadow-sm p-3">
              <Card.Title className="small">Ganancia semana ({semanaSelector})</Card.Title>
              <h4>{formatMoney(gananciaSemanaReal)}</h4>
              <small className="text-muted">Semana: {semanaRange.start.toLocaleDateString()} — {semanaRange.end.toLocaleDateString()}</small>
            </Card>
          </Col>

          <Col md={3}>
            <Card className="shadow-sm p-3">
              <Card.Title className="small">Tickets (rango)</Card.Title>
              <h4>{ventasFiltradas.length}</h4>
              <small className="text-muted">Tickets que cumplen el filtro</small>
            </Card>
          </Col>

          <Col md={3}>
            <Card className="shadow-sm p-3">
              <Card.Title className="small">Caja del día</Card.Title>
              <h4>{formatMoney(cajaDia)}</h4>
              <small className="text-muted">Ventas del día (según filtro)</small>
            </Card>
          </Col>
        </Row>

        {/* breakdown de métodos y ganancia neta */}
        <Row className="g-3 mb-3">
          <Col md={6}>
            <Card className="shadow-sm p-3">
              <Card.Title className="small">Breakdown por método de pago (rango)</Card.Title>
              <Row>
                <Col>Efectivo<br /><b>{formatMoney(breakdownMetodos.efectivo)}</b></Col>
                <Col>Tarjeta<br /><b>{formatMoney(breakdownMetodos.tarjeta)}</b></Col>
                <Col>Transferencia<br /><b>{formatMoney(breakdownMetodos.transferencia)}</b></Col>
              </Row>
            </Card>
          </Col>

          <Col md={6}>
            <Card className="shadow-sm p-3">
              <Card.Title className="small">Gastos y Ganancia neta</Card.Title>
              <div className="d-flex justify-content-between">
                <div>Total gastos (rango o seleccionados)</div>
                <div><strong>{formatMoney(totalGastos)}</strong></div>
              </div>
              <div className="d-flex justify-content-between mt-2">
                <div>Ganancia neta (rango)</div>
                <div><strong>{formatMoney(gananciaNeta)}</strong></div>
              </div>
              <div className="mt-2 d-flex gap-2">
                <Button size="sm" variant="outline-primary" onClick={() => setShowGastos(true)}>Gestionar gastos</Button>
                <Button size="sm" variant="outline-secondary" onClick={exportGastosCSV}>Export gastos CSV</Button>
              </div>
            </Card>
          </Col>
        </Row>

        {/* ventas por producto (día) */}
        <Row className="g-4 mt-3">
          <Col>
            <Card className="shadow-sm p-3">
              <Card.Title>Ventas del día por producto</Card.Title>
              <Table striped bordered hover size="sm">
                <thead>
                  <tr>
                    <th>Ticket</th>
                    <th>Producto</th>
                    <th>Cantidad</th>
                    <th>Precio Unitario</th>
                    <th>Total Ticket</th>
                    <th>Método</th>
                  </tr>
                </thead>
                <tbody>
                  {ventasHoy.map((v) =>
                    (v.productos || []).map((p, idx) => (
                      <tr key={`${v.id}-${p.idProducto}`}>
                        <td>{idx === 0 ? v.ticketId : ""}</td>
                        <td>{p.nombre}</td>
                        <td>{p.cantidad}</td>
                        <td>{formatMoney(p.precioUnitario || p.precioVenta || 0)}</td>
                        <td>{idx === 0 ? formatMoney(v.totalFinal) : ""}</td>
                        <td>{idx === 0 ? v.metodoPago : ""}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </Table>
            </Card>
          </Col>
        </Row>

        {/* ventas rango */}
        <Row className="g-4 mt-4">
          <Col>
            <Card className="shadow-sm p-3">
              <Card.Title>Ventas según rango de fechas</Card.Title>
              <Table striped bordered hover size="sm">
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Ticket</th>
                    <th>Producto</th>
                    <th>Cant.</th>
                    <th>Precio U.</th>
                    <th>Total Ticket</th>
                    <th>Método</th>
                    <th>Vendedor</th>
                  </tr>
                </thead>
                <tbody>
                  {ventasFiltradas.map((v) =>
                    (v.productos || []).map((p, idx) => {
                      const fecha = toDate(v.fecha);
                      return (
                        <tr key={`${v.id}-${p.idProducto}-rango`}>
                          <td>{fecha ? fecha.toLocaleDateString() : ""}</td>
                          <td>{idx === 0 ? v.ticketId : ""}</td>
                          <td>{p.nombre}</td>
                          <td>{p.cantidad}</td>
                          <td>{formatMoney(p.precioUnitario || p.precioVenta || 0)}</td>
                          <td>{idx === 0 ? formatMoney(v.totalFinal) : ""}</td>
                          <td>{idx === 0 ? v.metodoPago : ""}</td>
                          <td>{idx === 0 ? v.usuario : ""}</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </Table>

              <h5 className="mt-3 text-end">Total vendido en rango: <strong>{formatMoney(totalRango)}</strong></h5>
            </Card>
          </Col>
        </Row>

        {/* stock negativo */}
<Row className="g-4 mt-3">
  <Col md={6}>
    <Card className="shadow-sm p-3">
      <Card.Title>Productos con stock negativo</Card.Title>
      <Table striped bordered hover size="sm">
        <thead>
          <tr>
            <th>Producto</th>
            <th>Código</th>
            <th>Cantidad vendida (rango)</th>
            <th>Stock actual</th>
          </tr>
        </thead>
        <tbody>
          {productosStockNegativo.map((p) => (
            <tr key={p.id || p.nombre}>
              {/* Quitado el link */}
              <td>{p.nombre}</td>

              {/* Agregado EL CÓDIGO DEL PRODUCTO */}
              <td>{p.codigo || p.codProducto || "—"}</td>

              <td>{p.cantidad}</td>

              <td style={{ color: "crimson" }}>
                {p.stockActual}
              </td>
            </tr>
          ))}
        </tbody>
      </Table>
    </Card>
  </Col>
</Row>


        {/* mas vendidos */}
        <Row className="g-4 mt-3">
          <Col>
            <Card className="shadow-sm p-3">
              <Card.Title>Productos más vendidos del mes</Card.Title>
              <Table striped bordered hover size="sm">
                <thead>
                  <tr>
                    <th>Producto</th>
                    <th>Cantidad</th>
                  </tr>
                </thead>
                <tbody>
                  {productosMasVendidosMes.map((p) => (
                    <tr key={p.nombre}>
                      <td>{p.nombre}</td>
                      <td>{p.cantidad}</td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </Card>
          </Col>
        </Row>
      </Container>

      {/* Modal: detalle de ganancias por día */}
<Modal show={showDetalleGanancias} onHide={() => setShowDetalleGanancias(false)} size="lg" centered>
  <Modal.Header closeButton>
    <Modal.Title>Detalle de ganancias por día (rango seleccionado)</Modal.Title>
  </Modal.Header>
  <Modal.Body>
    <Row className="mb-2">
      <Col>
        <div><strong>Total vendido (rango):</strong> {formatMoney(totalRango)}</div>
        <div><strong>Ganancia bruta (rango):</strong> {formatMoney(gananciaTotal)}</div>
        <div><strong>Total gastos (rango):</strong> {formatMoney(totalGastos)}</div>
        <div><strong>Ganancia neta (rango):</strong> {formatMoney(gananciaNeta)}</div>
      </Col>
    </Row>

    {/* Tabla: detalle por día */}
    <Table striped hover size="sm" style={{ tableLayout: "fixed", width: "100%" }}>
      <thead>
        <tr>
          <th>Fecha</th>
          <th>Ventas</th>
          <th>Costo</th>
          <th>Ganancia bruta</th>
        </tr>
      </thead>
      <tbody>
        {detallePorDia.length === 0 && <tr><td colSpan={4} className="text-center">No hay datos</td></tr>}
        {detallePorDia.map((d) => (
          <tr key={d.fecha}>
            <td>{new Date(d.fecha).toLocaleDateString()}</td>
            <td style={{ textAlign: "right" }}>{formatMoney(d.ventas)}</td>
            <td style={{ textAlign: "right" }}>{formatMoney(d.costo)}</td>
            <td style={{ textAlign: "right" }}>{formatMoney(d.ventas - d.costo)}</td>
          </tr>
        ))}
      </tbody>
    </Table>

    <hr />

    {/* Tabla: ganancia por vendedor */}
    <h5>Ganancia por vendedor</h5>
    <Table hover size="sm" style={{ tableLayout: "fixed", width: "100%" }}>
      <thead>
        <tr>
          <th>Vendedor</th>
          <th>Ventas</th>
          <th>Ganancia</th>
        </tr>
      </thead>
      <tbody>
        {gananciaPorVendedor.map(g => (
          <tr key={g.vendedor}>
            <td>{g.vendedor}</td>
            <td style={{ textAlign: "right" }}>{formatMoney(g.ventas)}</td>
            <td style={{ textAlign: "right" }}>{formatMoney(g.ganancia)}</td>
          </tr>
        ))}
      </tbody>
    </Table>

    <hr />

    {/* Tabla: totales acumulados por mes */}
    <h5>Totales acumulados por mes (ventas / ganancia bruta)</h5>
    <Table hover size="sm" style={{ tableLayout: "fixed", width: "100%" }}>
      <thead>
        <tr>
          <th>Mes (YYYY-MM)</th>
          <th>Ventas</th>
          <th>Ganancia bruta</th>
        </tr>
      </thead>
      <tbody>
        {totalesPorMes.map(t => (
          <tr key={t.mes}>
            <td>{t.mes}</td>
            <td style={{ textAlign: "right" }}>{formatMoney(t.ventas)}</td>
            <td style={{ textAlign: "right" }}>{formatMoney(t.gananciaBruta)}</td>
          </tr>
        ))}
      </tbody>
    </Table>

    <hr />

    {/* Comparativa */}
    <div>
      <strong>Comparativa mes actual ({comparativaMes.thisMonthKey}) vs anterior ({comparativaMes.prevMonthKey})</strong>
      <div>Ventas: {formatMoney(comparativaMes.actual.ventas)} vs {formatMoney(comparativaMes.anterior.ventas)} ({comparativaMes.pctVentas.toFixed(1)}%)</div>
      <div>Ganancia bruta: {formatMoney(comparativaMes.actual.gananciaBruta)} vs {formatMoney(comparativaMes.anterior.gananciaBruta)} ({comparativaMes.pctGanancia.toFixed(1)}%)</div>
    </div>
  </Modal.Body>
  <Modal.Footer>
    <Button variant="secondary" onClick={() => setShowDetalleGanancias(false)}>Cerrar</Button>
    <Button variant="outline-secondary" onClick={exportDetalleCSV}>Exportar CSV</Button>
    <Button variant="outline-secondary" onClick={printDetalleAsPDF}>Exportar PDF</Button>
  </Modal.Footer>
</Modal>


      {/* Modal: gastos */}
      <Modal show={showGastos} onHide={() => setShowGastos(false)} size="lg" centered>
        <Modal.Header closeButton>
          <Modal.Title>Gastos del local</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Row className="g-2 mb-3">
            <Col md={3}>
              <Form.Label>Tipo</Form.Label>
              <Form.Select value={gastoForm.tipo} onChange={(e) => handleGastoChange("tipo", e.target.value)}>
                <option value="fijo">Fijo</option>
                <option value="variable">Variable</option>
              </Form.Select>
            </Col>
            <Col md={3}>
              <Form.Label>Categoría</Form.Label>
              <Form.Control value={gastoForm.categoria} onChange={(e) => handleGastoChange("categoria", e.target.value)} />
            </Col>
            <Col md={2}>
              <Form.Label>Monto</Form.Label>
              <InputGroup>
                <InputGroup.Text>$</InputGroup.Text>
                <Form.Control value={gastoForm.monto} onChange={(e) => handleGastoChange("monto", e.target.value)} />
              </InputGroup>
            </Col>
            <Col md={2}>
              <Form.Label>Fecha</Form.Label>
              <Form.Control type="date" value={gastoForm.fecha} onChange={(e) => handleGastoChange("fecha", e.target.value)} />
            </Col>
            <Col md={2} className="d-flex align-items-end">
              <Button onClick={agregarGasto} disabled={gastosLoading}>Agregar</Button>
            </Col>
          </Row>

          <Table striped hover size="sm">
            <thead>
              <tr>
                <th>Tipo</th>
                <th>Categoria</th>
                <th>Monto</th>
                <th>Fecha</th>
                <th>Nota</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {gastosFiltradosPorRango.length === 0 && <tr><td colSpan={6} className="text-center">No hay gastos (en el rango seleccionado)</td></tr>}
              {gastosFiltradosPorRango.map((g) => (
                <tr key={g.id}>
                  <td>{g.tipo}</td>
                  <td>{g.categoria}</td>
                  <td style={{ textAlign: "right" }}>{formatMoney(g.monto)}</td>
                  <td>{new Date(g.fecha).toLocaleDateString()}</td>
                  <td>{g.nota}</td>
                  <td><Button size="sm" variant="outline-danger" onClick={() => eliminarGasto(g.id)}>Eliminar</Button></td>
                </tr>
              ))}
            </tbody>
          </Table>

          <div className="mt-3 d-flex justify-content-between">
            <div>
              <strong>Total gastos (mostrados): {formatMoney(totalGastos)}</strong>
            </div>
            <div className="d-flex gap-2">
              <Button size="sm" variant="outline-secondary" onClick={exportGastosCSV}>Export CSV</Button>
            </div>
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowGastos(false)}>Cerrar</Button>
        </Modal.Footer>
      </Modal>
    </>
  );
};

export { ReporteVentas };
