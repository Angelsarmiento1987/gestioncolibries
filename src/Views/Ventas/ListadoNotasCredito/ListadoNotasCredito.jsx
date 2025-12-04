import React, { useEffect, useState } from "react";
import { collection, getDocs, query, orderBy, Timestamp } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import { FIRESTORE_DB } from "../../../Database/Database";
import { NavBarDashboard } from "../../../Components/NavBarDashboard/NavBarDashboard";

import {
  Container,
  Row,
  Col,
  Card,
  Table,
  Spinner,
  Button,
  Form,
  Badge,
  Modal, 
} from "react-bootstrap";


const ListadoNotasCredito = () => {
  const [notasCredito, setNotasCredito] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtroEstado, setFiltroEstado] = useState("activas");
  // ✅ NUEVO ESTADO: Filtro por ID/Número de NC
  const [filtroNCID, setFiltroNCID] = useState(""); 
  const navigate = useNavigate();

  // ESTADOS DEL MODAL 
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

      const listaNC = snap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
        // Convertir Timestamp si es necesario
        fechaEmision: d.data().fechaEmision instanceof Timestamp ? d.data().fechaEmision.toDate() : d.data().fechaEmision,
      }));
      
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
  
  // HANDLERS DEL MODAL 
  const handleShowDetail = (nc) => {
    setSelectedNC(nc);
    setShowDetailModal(true);
  };
  const handleCloseDetail = () => {
    setSelectedNC(null);
    setShowDetailModal(false);
  };


  // ✅ FILTRO DINÁMICO COMPUESTO
  const notasCreditoFiltradas = notasCredito.filter((nc) => {
    // 1. Filtro por ID o Número de NC (búsqueda parcial)
    if (filtroNCID) {
        const idStr = String(nc.id).toLowerCase();
        // Usar nc.numeroNC o una cadena vacía si no existe
        const numStr = String(nc.numeroNC || "").toLowerCase(); 
        const filterStr = filtroNCID.toLowerCase();
        
        // Si el ID largo NO incluye el filtro Y el número corto NO incluye el filtro
        if (!idStr.includes(filterStr) && !numStr.includes(filterStr)) {
            return false;
        }
    }
    
    // 2. Filtro por Estado (lógica existente)
    if (filtroEstado === "todas") return true;
    if (filtroEstado === "activas") {
      return nc.estado !== "usada" && nc.montoRestante > 0;
    }
    if (filtroEstado === "usadas") {
      return nc.estado === "usada" || (nc.estado !== "emitida" && nc.montoRestante === 0);
    }
    return true;
  });

  // Helper para mostrar el estado como badge
  const estadoBadge = (estado, montoRestante) => {
    if (estado === "emitida" && montoRestante > 0) {
      return <Badge bg="success">Emitida (Disponible)</Badge>;
    }
    if (estado === "parcialmente_usada" && montoRestante > 0) {
      return <Badge bg="warning" text="dark">Uso Parcial (Disponible)</Badge>;
    }
    if (estado === "usada" || montoRestante === 0) {
      return <Badge bg="danger">Usada / Consumida</Badge>;
    }
    return <Badge bg="secondary">{estado}</Badge>;
  };

  const totalCreditoActivo = notasCreditoFiltradas
    .filter(nc => nc.montoRestante > 0)
    .reduce((sum, nc) => sum + nc.montoRestante, 0)
    .toFixed(2);
    
  return (
    <>
      <NavBarDashboard />
      <Container fluid className="py-4">
        <Row className="mb-4">
          <Col>
            <h2>Gestión de Notas de Crédito</h2>
          </Col>
        </Row>
        
        {/* RESUMEN Y FILTROS */}
        <Row className="mb-4 g-3">
            {/* Columna de Resumen */}
            <Col md={4}>
                <Card className="shadow-sm p-3 border-0">
                    <h6>Total Crédito Activo</h6>
                    <h3 className="text-success">${totalCreditoActivo}</h3>
                    <small className="text-muted">Saldo restante de las NC filtradas.</small>
                </Card>
            </Col>
            {/* Columna de Filtros */}
            <Col md={8}>
                <Card className="shadow-sm p-3 border-0 h-100">
                    <Row>
                        <Col md={6}>
                             <Form.Group className="mb-3">
                                <Form.Label>Filtrar por Estado</Form.Label>
                                <Form.Select
                                    value={filtroEstado}
                                    onChange={(e) => setFiltroEstado(e.target.value)}>
                                    <option value="activas">Solo Activas (con saldo)</option>
                                    <option value="usadas">Solo Usadas / Consumidas</option>
                                    <option value="todas">Todas</option>
                                </Form.Select>
                            </Form.Group>
                        </Col>
                        {/* ✅ NUEVO: Campo para buscar por N° NC / ID */}
                        <Col md={6}>
                             <Form.Group className="mb-3">
                                <Form.Label>Buscar por N° NC o ID</Form.Label>
                                <Form.Control
                                    type="text"
                                    placeholder="Ej: NC-123456 o ID largo"
                                    value={filtroNCID}
                                    onChange={(e) => setFiltroNCID(e.target.value)}
                                />
                            </Form.Group>
                        </Col>
                    </Row>
                    <Button
                        variant="info"
                        className="mt-3"
                        onClick={() => alert("Función para reimprimir NC no implementada aún.")}
                        >
                        Reimprimir Nota de Crédito (por ID)
                    </Button>
                </Card>
            </Col>
        </Row>

        {loading ? (
          <div className="text-center mt-5">
            <Spinner animation="border" />
          </div>
        ) : (
          <Row>
            <Col xs={12}>
              <Card className="shadow-sm p-3">
                <Table striped bordered hover responsive size="sm" className="table-force-compact">
                  <thead>
                    <tr>
                      <th>N° NC</th> 
                      <th>Fecha Emisión</th>
                      <th>Venta Origen</th>
                      <th>Total Crédito</th>
                      <th>Saldo Restante</th>
                      <th>Estado</th>
                      <th>Detalle</th>
                    </tr>
                  </thead>
                  <tbody>
                    {notasCreditoFiltradas.map((nc) => (
                      <tr key={nc.id}>
                        {/* Mostrar N° NC o ID largo */}
                        <td className="fw-bold text-primary">{nc.numeroNC || nc.id}</td>
                        <td>
                          {nc.fechaEmision
                            ? new Date(nc.fechaEmision).toLocaleDateString("es-AR")
                            : "N/A"}
                        </td>
                        <td>{nc.idVentaOrigen}</td>
                        <td>${nc.totalCredito.toFixed(2)}</td>
                        <td className="fw-bold text-primary">${nc.montoRestante.toFixed(2)}</td>
                        <td>{estadoBadge(nc.estado, nc.montoRestante)}</td>
                        <td>
                          <Button
                            variant="outline-secondary"
                            size="sm"
                            onClick={() => handleShowDetail(nc)}
                          >
                            Ver Items
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
                {notasCreditoFiltradas.length === 0 && (
                    <p className="text-center text-muted mt-3">No se encontraron Notas de Crédito con el filtro seleccionado.</p>
                )}
              </Card>
            </Col>
          </Row>
        )}
      </Container>
      
      {/* RENDERIZADO DEL MODAL */}
      <ModalDetalleNC
        show={showDetailModal}
        handleClose={handleCloseDetail}
        nc={selectedNC}
      />

     
    </>
  );
};

// -------------------------------------------------------------
// COMPONENTE: MODAL PARA DETALLE DE ITEMS 
// -------------------------------------------------------------
const ModalDetalleNC = ({ show, handleClose, nc }) => {
    if (!nc) return null;

    return (
        <Modal show={show} onHide={handleClose} size="lg">
            <Modal.Header closeButton>
                {/* Mostrar N° NC o ID largo en el título del modal */}
                <Modal.Title>Detalle de Nota de Crédito: <span className="text-primary">{nc.numeroNC || nc.id}</span></Modal.Title>
            </Modal.Header>
            <Modal.Body>
                <h5>Resumen del Crédito</h5>
                <Row className="mb-4">
                    <Col>
                        <p className="m-0">
                            <strong>Fecha Emisión:</strong>{" "}
                            {nc.fechaEmision ? new Date(nc.fechaEmision).toLocaleDateString("es-AR") : "N/A"}
                        </p>
                        <p className="m-0">
                            <strong>Total Crédito Inicial:</strong> <span className="fw-bold text-danger">${nc.totalCredito?.toFixed(2)}</span>
                        </p>
                        <p className="m-0">
                            <strong>Saldo Restante:</strong> <span className="fw-bold text-success">${nc.montoRestante?.toFixed(2)}</span>
                        </p>
                    </Col>
                    <Col>
                        <p className="m-0">
                            <strong>Cliente:</strong> {nc.cliente?.nombre || 'Consumidor Final'}
                        </p>
                        <p className="m-0">
                            <strong>Venta Origen ID:</strong> {nc.idVentaOrigen}
                        </p>
                        <p className="m-0">
                             {nc.ventasDondeSeUso?.length > 0 && 
                                <strong>Usada {nc.ventasDondeSeUso.length} veces.</strong>
                             }
                        </p>
                    </Col>
                </Row>


                <h5 className="mt-4">Productos Devueltos</h5>
                <Table striped bordered hover size="sm" className="table-force-compact">
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
                        {nc.items && nc.items.map((item, index) => (
                            <tr key={index}>
                                <td>{item.codigoProducto}</td>
                                <td>{item.nombre}</td>
                                <td><Badge bg="secondary">{item.cantidad}</Badge></td>
                                <td>${item.precioFinalUnitario?.toFixed(2)}</td>
                                <td>${item.subtotal?.toFixed(2)}</td>
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

export { ListadoNotasCredito };