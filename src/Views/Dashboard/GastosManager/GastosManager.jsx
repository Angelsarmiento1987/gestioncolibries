import React, { useEffect, useState } from "react";
import {
  collection,
  addDoc,
  getDocs,
  serverTimestamp,
  deleteDoc,
  doc,
} from "firebase/firestore";
import { FIRESTORE_DB } from "../../../Database/Database";
import {
  Container,
  Row,
  Col,
  Card,
  Form,
  Button,
  Table,
  Spinner,
} from "react-bootstrap";
import { NavBarDashboard } from "../../../Components/NavBarDashboard/NavBarDashboard";
import { FooterDashboard } from "../../../Components/FooterDashboard/FooterDashboard";
import '../GastosManager/GastosManager.css'

const categorias = {
  Fijos: [
    "Sueldos",
    "Alquiler",
    "Expensas",
    "Municipalidad",
    "ARCA MONOT",
    "ARCA SUSS",
    "ARCA MORST",
    "Honorarios",
    "Edenor",
  ],
  Variables: [
    "Proveedores",
    "Compras",
    "Embalaje",
    "Librería",
    "Reparaciones",
    "Otro (personalizado)",
  ],
};

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

const añosDisponibles = [];
for (let año = 2022; año <= new Date().getFullYear() + 1; año++) {
  añosDisponibles.push(año);
}

const GastosManager = () => {
  const [categoria, setCategoria] = useState("Fijos");
  const [subcategoria, setSubcategoria] = useState("");
  const [subcategoriaPersonalizada, setSubcategoriaPersonalizada] =
    useState("");
  const [monto, setMonto] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [fecha, setFecha] = useState("");
  const [loading, setLoading] = useState(false);

  const [gastos, setGastos] = useState([]);
  const [cargandoGastos, setCargandoGastos] = useState(true);

  const [mesFiltro, setMesFiltro] = useState(new Date().getMonth() + 1);
  const [anioFiltro, setAnioFiltro] = useState(new Date().getFullYear());

  const cargarGastos = async () => {
    setCargandoGastos(true);
    try {
      const snap = await getDocs(collection(FIRESTORE_DB, "gastos"));
      const lista = snap.docs
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
      setGastos(lista);
    } catch (err) {
      console.error("Error cargando gastos:", err);
    }
    setCargandoGastos(false);
  };

  useEffect(() => {
    cargarGastos();
  }, []);

  const registrarGasto = async () => {
    if (!subcategoria || !monto || !fecha) {
      alert("Completá los campos obligatorios.");
      return;
    }

    const subcatFinal =
      subcategoria === "Otro (personalizado)"
        ? subcategoriaPersonalizada.trim()
        : subcategoria;

    if (subcategoria === "Otro (personalizado)" && subcatFinal === "") {
      alert("Escribí la subcategoría personalizada.");
      return;
    }

    const montoNum = Number(monto);
    if (isNaN(montoNum)) {
      alert("El monto debe ser un número válido.");
      return;
    }

    setLoading(true);

    try {
      const [yyyy, mm, dd] = fecha.split("-");
      const fechaSinTZ = new Date(yyyy, mm - 1, dd, 12, 0, 0);

      await addDoc(collection(FIRESTORE_DB, "gastos"), {
        categoria,
        subcategoria: subcatFinal,
        monto: montoNum,
        descripcion: descripcion || "",
        fecha: fechaSinTZ,
        creadoEl: serverTimestamp(),
      });

      setMonto("");
      setDescripcion("");
      setFecha("");
      setSubcategoria("");
      setSubcategoriaPersonalizada("");

      await cargarGastos();
    } catch (error) {
      console.error("Error al registrar gasto:", error);
      alert("Ocurrió un error al guardar el gasto.");
    }

    setLoading(false);
  };

  // ------------------------------------------------------------------
  // ELIMINAR GASTO
  // ------------------------------------------------------------------
  const eliminarGasto = async (id) => {
    const confirmar = window.confirm("¿Seguro que querés eliminar este gasto?");
    if (!confirmar) return;

    try {
      await deleteDoc(doc(FIRESTORE_DB, "gastos", id));
      await cargarGastos();
    } catch (error) {
      console.error("Error eliminando gasto:", error);
      alert("No se pudo eliminar el gasto.");
    }
  };

  const gastosFiltrados = gastos.filter((g) => {
    if (!g.fechaObj) return false;
    const m = g.fechaObj.getMonth() + 1;
    const a = g.fechaObj.getFullYear();
    return m === Number(mesFiltro) && a === Number(anioFiltro);
  });

  const totalMes = gastosFiltrados.reduce(
    (acc, g) => acc + Number(g.monto || 0),
    0
  );

  return (
    <>
      <NavBarDashboard />

      <Container className="py-4 contGastosManager">
        <Row>
          <Col md={4}>
            <Card className="p-3 shadow-sm">
              <h5 className="mb-3">Registrar Gasto</h5>

              <Form.Group className="mb-3">
                <Form.Label>Categoría</Form.Label>
                <Form.Select
                  value={categoria}
                  onChange={(e) => {
                    setCategoria(e.target.value);
                    setSubcategoria("");
                  }}
                >
                  <option>Fijos</option>
                  <option>Variables</option>
                </Form.Select>
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label>Subcategoría</Form.Label>
                <Form.Select
                  value={subcategoria}
                  onChange={(e) => setSubcategoria(e.target.value)}
                >
                  <option value="">Seleccionar…</option>
                  {categorias[categoria].map((c, i) => (
                    <option key={i} value={c}>
                      {c}
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>

              {subcategoria === "Otro (personalizado)" && (
                <Form.Group className="mb-3">
                  <Form.Label>Nombre del gasto</Form.Label>
                  <Form.Control
                    type="text"
                    placeholder="Ej: Herramientas, Pintura…"
                    value={subcategoriaPersonalizada}
                    onChange={(e) =>
                      setSubcategoriaPersonalizada(e.target.value)
                    }
                  />
                </Form.Group>
              )}

              <Form.Group className="mb-3">
                <Form.Label>Monto ($)</Form.Label>
                <Form.Control
                  type="number"
                  value={monto}
                  onChange={(e) => setMonto(e.target.value)}
                />
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label>Descripción</Form.Label>
                <Form.Control
                  type="text"
                  value={descripcion}
                  onChange={(e) => setDescripcion(e.target.value)}
                />
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label>Fecha</Form.Label>
                <Form.Control
                  type="date"
                  value={fecha}
                  onChange={(e) => setFecha(e.target.value)}
                />
              </Form.Group>

              <Button
                variant="primary"
                className="w-100"
                onClick={registrarGasto}
                disabled={loading}
              >
                {loading ? "Guardando..." : "Registrar Gasto"}
              </Button>
            </Card>
          </Col>

          <Col md={8}>
            <Card className="p-3 shadow-sm">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h5 className="mb-0">Historial de Gastos</h5>
                {cargandoGastos && <Spinner animation="border" size="sm" />}
              </div>

              <div className="d-flex gap-3 mb-3">
                <Form.Group>
                  <Form.Label>Mes</Form.Label>
                  <Form.Select
                    value={mesFiltro}
                    onChange={(e) => setMesFiltro(e.target.value)}
                  >
                    <option value="1">Enero</option>
                    <option value="2">Febrero</option>
                    <option value="3">Marzo</option>
                    <option value="4">Abril</option>
                    <option value="5">Mayo</option>
                    <option value="6">Junio</option>
                    <option value="7">Julio</option>
                    <option value="8">Agosto</option>
                    <option value="9">Septiembre</option>
                    <option value="10">Octubre</option>
                    <option value="11">Noviembre</option>
                    <option value="12">Diciembre</option>
                  </Form.Select>
                </Form.Group>

                <Form.Group>
                  <Form.Label>Año</Form.Label>
                  <Form.Select
                    value={anioFiltro}
                    onChange={(e) => setAnioFiltro(e.target.value)}
                  >
                    {añosDisponibles.map((a) => (
                      <option key={a} value={a}>
                        {a}
                      </option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </div>

              <Card className="p-2 mb-3 bg-light">
                <strong>Total del mes:</strong> $
                {totalMes.toLocaleString("es-AR")}
              </Card>

              {gastosFiltrados.length === 0 && !cargandoGastos ? (
                <p className="text-muted">No hay gastos en este mes.</p>
              ) : (
                <Table bordered hover size="sm">
                  <thead>
                    <tr>
                      <th>Fecha</th>
                      <th>Cat.</th>
                      <th>Subcat.</th>
                      <th>Descripción</th>
                      <th>Monto</th>
                      <th>Acción</th>
                    </tr>
                  </thead>

                  <tbody>
                    {gastosFiltrados.map((g) => (
                      <tr key={g.id}>
                        <td>
                          {g.fechaObj
                            ? g.fechaObj.toLocaleDateString("es-AR")
                            : "--"}
                        </td>
                        <td>{g.categoria}</td>
                        <td>{g.subcategoria}</td>
                        <td>{g.descripcion || "-"}</td>
                        <td>${Number(g.monto).toLocaleString("es-AR")}</td>
                        <td>
                          <Button
                            variant="danger"
                            size="sm"
                            onClick={() => eliminarGasto(g.id)}
                          >
                            Eliminar
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              )}
            </Card>
          </Col>
        </Row>
      </Container>

      <FooterDashboard/>
    </>
  );
};

export default GastosManager;
