import React, { useEffect, useState, useMemo } from "react";
import { collection, getDocs, query, orderBy, Timestamp } from "firebase/firestore";
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
} from "react-bootstrap";

// Importaciones para gráficos
import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

// -------------------------------------------------------------
// COMPONENTE: MODAL PARA DETALLE DE ITEMS
// -------------------------------------------------------------
const ModalDetalleNC = ({ show, handleClose, nc }) => {
  if (!nc) return null;

  return (
    <Modal show={show} onHide={handleClose} size="lg">
      <Modal.Header closeButton>
        <Modal.Title>
          Detalle de Nota de Crédito:{" "}
          <span className="text-primary">{nc.numeroNC || nc.id}</span>
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <h5>Resumen del Crédito</h5>
        <Row className="mb-4">
          <Col>
            <p className="m-0">
              <strong>N° de NC:</strong>{" "}
              <span className="fw-bold">{nc.numeroNC || nc.id}</span>
            </p>
            <p className="m-0">
              <strong>Fecha Emisión:</strong>{" "}
              {nc.fechaEmision
                ? new Date(nc.fechaEmision).toLocaleDateString("es-AR")
                : "N/A"}
            </p>
            <p className="m-0">
              <strong>Total Crédito Inicial:</strong>{" "}
              <span className="fw-bold text-danger">
                ${Number(nc.totalCredito ?? 0).toFixed(2)}
              </span>
            </p>
            <p className="m-0">
              <strong>Saldo Restante:</strong>{" "}
              <span className="fw-bold text-success">
                ${Number(nc.montoRestante ?? 0).toFixed(2)}
              </span>
            </p>
          </Col>
          <Col>
            <p className="m-0">
              <strong>Cliente:</strong> {nc.cliente?.nombre || "Consumidor Final"}
            </p>
            <p className="m-0">
              <strong>Venta Origen ID:</strong> {nc.idVentaOrigen}
            </p>
            <p className="m-0">
              {nc.ventasDondeSeUso?.length > 0 && (
                <strong>Usada {nc.ventasDondeSeUso.length} veces.</strong>
              )}
            </p>
          </Col>
        </Row>

        <h5 className="mt-4">Productos Devueltos</h5>
        <Table striped bordered hover size="sm">
          <thead>
            <tr>
              <th>Código</th>
              <th>Producto</th>
              <th>Cant. Devuelta</th>
              <th>Precio Final Unit.</th>
              <th>Subtotal Crédito</th>
            </tr>
          </thead>
          <tbody>
            {nc.items &&
              nc.items.map((item, index) => (
                <tr key={index}>
                  <td>{item.codigoProducto}</td>
                  <td>{item.nombre}</td>
                  <td>
                    <Badge bg="secondary">{item.cantidad}</Badge>
                  </td>
                  <td>${Number(item.precioFinalUnitario ?? 0).toFixed(2)}</td>
                  <td>${Number(item.subtotal ?? 0).toFixed(2)}</td>
                </tr>
              ))}
          </tbody>
        </Table>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={handleClose}>
          Cerrar
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

// -------------------------------------------------------------

const ReporteDevoluciones = () => {
  const [notasCredito, setNotasCredito] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtroEstado, setFiltroEstado] = useState("activas");

  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedNC, setSelectedNC] = useState(null);

  const cargarNotasCredito = async () => {
    setLoading(true);
    try {
      const q = query(
        collection(FIRESTORE_DB, "notasCredito"),
        orderBy("fechaEmision", "desc")
      );
      const snap = await getDocs(q);

      const listaNC = snap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          ...data,
          fechaEmision:
            data.fechaEmision instanceof Timestamp
              ? data.fechaEmision.toDate()
              : data.fechaEmision,
        };
      });

      setNotasCredito(listaNC);
    } catch (e) {
      console.error("Error cargando Notas de Crédito:", e);
      setNotasCredito([]);
    }
    setLoading(false);
  };

  useEffect(() => {
    cargarNotasCredito();
  }, []);

  const handleShowDetail = (nc) => {
    setSelectedNC(nc);
    setShowDetailModal(true);
  };
  const handleCloseDetail = () => {
    setSelectedNC(null);
    setShowDetailModal(false);
  };

  const notasCreditoFiltradas = notasCredito.filter((nc) => {
    if (filtroEstado === "todas") return true;
    if (filtroEstado === "activas") {
      return nc.montoRestante > 0;
    }
    if (filtroEstado === "usadas") {
      return nc.montoRestante <= 0;
    }
    return true;
  });

  const {
    totalMontoDevuelto,
    totalMontoRestante,
    conteoNC,
    topProductosDevueltos,
    conteoNCUsadas,
  } = useMemo(() => {
    let totalDevuelto = 0;
    let totalRestante = 0;
    let conteo = 0;
    let conteoUsadas = 0;
    const productosDevueltos = {};

    notasCredito.forEach((nc) => {
      conteo++;
      totalDevuelto += Number(nc.totalCredito ?? 0);
      totalRestante += Number(nc.montoRestante ?? 0);

      if (Number(nc.montoRestante ?? 0) <= 0) {
        conteoUsadas++;
      }

      (nc.items || []).forEach((item) => {
        const id = item.idProducto;
        productosDevueltos[id] = {
          nombre: item.nombre,
          cantidad:
            (productosDevueltos[id]?.cantidad || 0) + Number(item.cantidad ?? 0),
        };
      });
    });

    const topProductos = Object.values(productosDevueltos)
      .sort((a, b) => b.cantidad - a.cantidad)
      .slice(0, 5);

    return {
      totalMontoDevuelto: totalDevuelto.toFixed(2),
      totalMontoRestante: totalRestante.toFixed(2),
      conteoNC: conteo,
      conteoNCUsadas: conteoUsadas,
      topProductosDevueltos: topProductos,
    };
  }, [notasCredito]);

  const dataTopProductos = {
    labels: topProductosDevueltos.map((p) => p.nombre),
    datasets: [
      {
        label: "Cantidad Devuelta",
        data: topProductosDevueltos.map((p) => p.cantidad),
        backgroundColor: [
          "rgba(255, 99, 132, 0.6)",
          "rgba(255, 159, 64, 0.6)",
          "rgba(255, 205, 86, 0.6)",
          "rgba(75, 192, 192, 0.6)",
          "rgba(54, 162, 235, 0.6)",
        ],
        borderColor: [
          "rgb(255, 99, 132)",
          "rgb(255, 159, 64)",
          "rgb(255, 205, 86)",
          "rgb(75, 192, 192)",
          "rgb(54, 162, 235)",
        ],
        borderWidth: 1,
      },
    ],
  };

  const estadoBadge = (montoRestante) => {
    if (Number(montoRestante ?? 0) > 0) {
      return <Badge bg="success">ACTIVA</Badge>;
    }
    return <Badge bg="danger">CONSUMIDA</Badge>;
  };

  return (
    <>
      <NavBarDashboard />
      <Container fluid className="py-4">
        <Row className="mb-4">
          <Col>
            <h2>📊 Reporte de Devoluciones y Notas de Crédito</h2>
          </Col>
        </Row>

        {loading ? (
          <div className="text-center mt-5">
            <Spinner animation="border" />
          </div>
        ) : (
          <>
            {/* Métricas */}
            <Row className="g-3 mb-4">
              <Col md={3}>
                <Card className="shadow-sm p-3 border-0">
                  <small className="text-muted">Total NC Emitidas</small>
                  <h4 className="text-info fw-bold">{conteoNC}</h4>
                </Card>
              </Col>
              <Col md={3}>
                <Card className="shadow-sm p-3 border-0">
                  <small className="text-muted">Total Consumidas</small>
                  <h4 className="text-danger fw-bold">{conteoNCUsadas}</h4>
                </Card>
              </Col>
              <Col md={3}>
                <Card className="shadow-sm p-3 border-0">
                  <small className="text-muted">Monto Crédito Emitido</small>
                  <h4 className="text-primary fw-bold">${totalMontoDevuelto}</h4>
                </Card>
              </Col>
              <Col md={3}>
                <Card className="shadow-sm p-3 border-0">
                  <small className="text-muted">Saldo de Crédito Activo</small>
                  <h4 className="text-success fw-bold">
                    ${totalMontoRestante}
                  </h4>
                </Card>
              </Col>
            </Row>

            {/* Gráfico y Filtro */}
            <Row className="g-3 mb-4">
              <Col md={8}>
                <Card className="shadow-sm p-3 border-0">
                  <h5 className="mb-3">
                    Top 5 Productos Devueltos por Cantidad
                  </h5>
                  {topProductosDevueltos.length > 0 ? (
                    <div style={{ height: "300px" }}>
                      <Bar
                        data={dataTopProductos}
                        options={{
                          responsive: true,
                          maintainAspectRatio: false,
                        }}
                      />
                    </div>
                  ) : (
                    <p className="text-center text-muted">
                      No hay datos de productos devueltos.
                    </p>
                  )}
                </Card>
              </Col>
              <Col md={4}>
                <Card className="shadow-sm p-3 border-0 h-100 d-flex flex-column justify-content-center">
                  <Form.Group className="mb-3">
                    <Form.Label>Filtrar Listado por Estado</Form.Label>
                    <Form.Select
                      value={filtroEstado}
                      onChange={(e) => setFiltroEstado(e.target.value)}
                    >
                      <option value="activas">Solo Activas (con saldo)</option>
                      <option value="usadas">Solo Consumidas</option>
                      <option value="todas">Todas</option>
                    </Form.Select>
                  </Form.Group>
                </Card>
              </Col>
            </Row>

            {/* LISTADO DE NOTAS DE CRÉDITO */}
            <Row>
              <Col xs={12}>
                <Card className="shadow-sm p-3 border-0">
                  <h5>
                    Detalle de Notas de Crédito ({notasCreditoFiltradas.length})
                  </h5>
                  <Table striped bordered hover responsive size="sm" className="mt-3">
                    <thead>
                      <tr>
                        <th>N° NC / ID</th>
                        <th>Fecha Emisión</th>
                        <th>Cliente</th>
                        <th>Total Crédito</th>
                        <th>Monto Usado</th>
                        <th>Saldo Restante</th>
                        <th>Estado</th>
                        <th>Detalle</th>
                      </tr>
                    </thead>
                    <tbody>
                      {notasCreditoFiltradas.map((nc) => {
                        const montoUsado = Number(
                          (nc.totalCredito ?? 0) - (nc.montoRestante ?? 0)
                        ).toFixed(2);

                        return (
                          <tr key={nc.id}>
                            <td className="fw-bold text-primary">
                              {nc.numeroNC || nc.id}
                            </td>
                            <td>
                              {nc.fechaEmision
                                ? new Date(nc.fechaEmision).toLocaleDateString("es-AR")
                                : "N/A"}
                            </td>
                            <td>{nc.cliente?.nombre || "Consumidor Final"}</td>
                            <td>
                              ${Number(nc.totalCredito ?? 0).toFixed(2)}
                            </td>
                            <td className="text-danger">-${montoUsado}</td>
                            <td className="fw-bold text-success">
                              ${Number(nc.montoRestante ?? 0).toFixed(2)}
                            </td>
                            <td>{estadoBadge(nc.montoRestante)}</td>
                            <td>
                              <Button
                                variant="outline-primary"
                                size="sm"
                                onClick={() => handleShowDetail(nc)}
                              >
                                Ver Items
                              </Button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </Table>
                  {notasCreditoFiltradas.length === 0 && (
                    <p className="text-center text-muted mt-3">
                      No se encontraron Notas de Crédito con el filtro seleccionado.
                    </p>
                  )}
                </Card>
              </Col>
            </Row>
          </>
        )}
      </Container>

      {/* MODAL */}
      <ModalDetalleNC
        show={showDetailModal}
        handleClose={handleCloseDetail}
        nc={selectedNC}
      />

      <FooterDashboard/>
    </>
  );
};

export { ReporteDevoluciones };
