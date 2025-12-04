/**
 * CargarProductosExcel.jsx
 *
 * Componente completo y listo para pegar.
 * - Estética "dashboard" profesional (azul / gris) usando React-Bootstrap.
 * - Mantiene toda tu lógica (parseos, cálculos, subida a Firestore).
 * - Modal elegante para carga individual con validaciones sencillas.
 *
 * Requisitos:
 * npm install react-bootstrap bootstrap xlsx
 * import 'bootstrap/dist/css/bootstrap.min.css' en tu entry (index.js)
 */

import React, { useState, useEffect } from "react";
import * as XLSX from "xlsx";
import { FIRESTORE_DB } from "../../../Database/Database";
import {
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  doc
} from "firebase/firestore";
import { NavBarDashboard } from "../../../Components/NavBarDashboard/NavBarDashboard";
import { FooterDashboard } from "../../../Components/FooterDashboard/FooterDashboard";

// React-Bootstrap
import {
  Container,
  Row,
  Col,
  Card,
  Button,
  Modal,
  Form,
  ProgressBar,
  ListGroup,
  Badge,
  Spinner
} from "react-bootstrap";

const CargarProductosExcel = () => {
  // -------------------------
  // Estados principales
  // -------------------------
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState([]);
  const [progress, setProgress] = useState(0);
  const [existingProducts, setExistingProducts] = useState([]);
  const [selectedToDelete, setSelectedToDelete] = useState([]);

  // Modal para carga individual
  const [showModal, setShowModal] = useState(false);
  const [productoIndividual, setProductoIndividual] = useState({
    codigoProducto: "",
    nombreProducto: "",
    categoria: "",
    proveedor: "",
    stock: "",
    precioCosto: "",
    multiplicador: "",
  });

  // -------------------------
  // Utilidades: parseo y cálculos
  // -------------------------
  // Parseo seguro de números (acepta "4.569,50", "4569.5", "4 569,50", etc.)
  const parseNumber = (value) => {
    if (value === null || value === undefined) return 0;
    if (typeof value === "number") return Number(value.toFixed(2));
    let str = String(value).trim();
    // si tiene ambos, es probable que el punto sea separador de miles
    if (str.includes(",") && str.includes(".")) {
      str = str.replace(/\./g, "").replace(",", ".");
    } else if (str.includes(",")) {
      str = str.replace(",", ".");
    } else {
      str = str.replace(/ /g, "");
    }
    const n = Number(str);
    return isNaN(n) ? 0 : Number(n.toFixed(2));
  };

  // 1. FUNCIÓN DE REDONDEO ATRACTIVO (Nuevo)
  const roundToAttractivePrice = (num) => {
    if (num <= 1000) return Math.ceil(num / 100) * 100; // Para valores chicos, redondea a la centena
    
    // Redondea al próximo múltiplo de 1000 y resta 100 (ej: 9001 -> 10000 -> 9900)
    const roundedUp = Math.ceil(num / 1000) * 1000;
    return roundedUp - 100;
  };

  // 2. LÓGICA DE CÁLCULO SIMPLIFICADA (Siempre calcula a partir de Costo/Multiplicador)
  const calcularPrecios = (costo, multiplicador) => {
    const costoNum = parseNumber(costo);
    const multNum = parseNumber(multiplicador) || 1;
    
    // Se calcula siempre el precio de venta y el precio final
    const precioVenta = Number((costoNum * multNum).toFixed(2));
    const precioFinal = roundToAttractivePrice(precioVenta); // Usa el nuevo redondeo
    
    return { precioVenta, precioFinal };
  };

  // -------------------------
  // Lectura de archivo Excel (XLSX)
  // -------------------------
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const binaryStr = evt.target.result;
      const workbook = XLSX.read(binaryStr, { type: "binary" });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const data = XLSX.utils.sheet_to_json(sheet);
      setRows(data);
    };
    reader.readAsBinaryString(file);
  };

  // -------------------------
  // Subir rows del Excel a Firebase
  // -------------------------
  const uploadToFirebase = async () => {
    if (rows.length === 0) return alert("No hay datos para subir");

    setLoading(true);
    setProgress(0);
    const productsRef = collection(FIRESTORE_DB, "productos");

    try {
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        
        // USO DE LA FUNCIÓN DE CÁLCULO MEJORADA
        const { precioVenta, precioFinal } = calcularPrecios(
          row.precioCosto,
          row.multiplicador
        );

        await addDoc(productsRef, {
          codigoProducto: row.codigoProducto || "",
          nombreProducto: row.nombreProducto || "",
          categoria: row.categoria || "",
          proveedor: row.proveedor || "",
          stock: parseNumber(row.stock),
          precioCosto: parseNumber(row.precioCosto),
          multiplicador: parseNumber(row.multiplicador) || 1,
          precioVenta,
          precioFinal,
          // Eliminamos cantidadVendida si no es un campo necesario en la carga inicial
          cantidadVendida: 0, 
        });

        setProgress(Math.round(((i + 1) / rows.length) * 100));
      }

      alert("Datos subidos correctamente");
      await loadExistingProducts();
      setRows([]);
    } catch (error) {
      console.error(error);
      alert("Error al subir los datos");
    }

    setLoading(false);
  };

  // -------------------------
  // Cargar productos existentes desde Firestore
  // -------------------------
  const loadExistingProducts = async () => {
    try {
      const snapshot = await getDocs(collection(FIRESTORE_DB, "productos"));
      const list = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      setExistingProducts(list);
      setSelectedToDelete([]);
    } catch (error) {
      console.error("Error loadExistingProducts:", error);
    }
  };

  useEffect(() => {
    loadExistingProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // -------------------------
  // Selección y eliminación
  // -------------------------
  const toggleSelect = (id) => {
    setSelectedToDelete((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const deleteSelected = async () => {
    if (selectedToDelete.length === 0) return alert("No se seleccionó ningún producto");
    if (!window.confirm("¿Desea eliminar los productos seleccionados?")) return;

    setLoading(true);
    try {
      for (const id of selectedToDelete) {
        await deleteDoc(doc(FIRESTORE_DB, "productos", id));
      }
      alert("Productos eliminados correctamente");
      await loadExistingProducts();
    } catch (error) {
      console.error(error);
      alert("Error al eliminar productos");
    }
    setLoading(false);
  };

  const deleteAll = async () => {
    if (!window.confirm("¿Desea eliminar todos los productos?")) return;
    setLoading(true);
    try {
      for (const p of existingProducts) {
        await deleteDoc(doc(FIRESTORE_DB, "productos", p.id));
      }
      alert("Todos los productos fueron eliminados");
      await loadExistingProducts();
    } catch (error) {
      console.error(error);
      alert("Error al eliminar productos");
    }
    setLoading(false);
  };

  // -------------------------
  // Cargar producto individual (desde modal)
  // -------------------------
  // Función para manejar cambios en el modal, con autocálculo
  const handleChangeIndividual = (e) => {
    const { name, value } = e.target;
    
    setProductoIndividual((prev) => {
        const newState = { ...prev, [name]: value };

        // Recalcular precios si Costo o Multiplicador cambian
        if (["precioCosto", "multiplicador"].includes(name)) {
            const { precioVenta, precioFinal } = calcularPrecios(
                newState.precioCosto,
                newState.multiplicador
            );
            newState.precioVenta = precioVenta;
            newState.precioFinal = precioFinal;
        }
        
        return newState;
    });
  };

  const cargarProductoIndividual = async () => {
    const { codigoProducto, nombreProducto, categoria, proveedor, stock, precioCosto, multiplicador } =
      productoIndividual;

    // Validación mínima
    if (!nombreProducto || !precioCosto || !multiplicador) {
      return alert("El nombre, precio costo y multiplicador son obligatorios");
    }

    setLoading(true);

    // USO DE LA FUNCIÓN DE CÁLCULO MEJORADA
    const { precioVenta, precioFinal } = calcularPrecios(
      precioCosto,
      multiplicador
    );

    try {
      await addDoc(collection(FIRESTORE_DB, "productos"), {
        codigoProducto: codigoProducto || "",
        nombreProducto: nombreProducto || "",
        categoria: categoria || "",
        proveedor: proveedor || "",
        stock: parseNumber(stock) || 0,
        precioCosto: parseNumber(precioCosto) || 0,
        multiplicador: parseNumber(multiplicador) || 1,
        precioVenta,
        precioFinal,
        cantidadVendida: 0,
      });

      // Feedback y limpieza
      alert("Producto cargado correctamente");

      setProductoIndividual({
        codigoProducto: "",
        nombreProducto: "",
        categoria: "",
        proveedor: "",
        stock: "",
        precioCosto: "",
        multiplicador: "",
        // Restablecer precios calculados
        precioVenta: 0,
        precioFinal: 0,
      });

      setShowModal(false);
      await loadExistingProducts();
    } catch (error) {
      console.error(error);
      alert("Error al cargar producto");
    }

    setLoading(false);
  };

  // -------------------------
  // Render
  // -------------------------
  return (
    <>
      {/* Navbar (ya existente) */}
      <NavBarDashboard />

      <Container fluid className="py-4" style={{ background: "#f5f7fb", minHeight: "100vh" }}>
        <Row className="mb-3">
          <Col>
            <h3 className="text-primary">Panel de administración - Productos</h3>
            <p className="text-muted">Carga masiva desde Excel y carga individual.</p>
          </Col>
        </Row>

        <Row className="g-4">
          {/* LEFT: Upload card */}
          <Col xs={12} md={6} lg={5}>
            <Card className="shadow-sm border-0">
              <Card.Body>
                <div className="d-flex justify-content-between align-items-start">
                  <div>
                    <Card.Title className="mb-1">Cargar desde Excel</Card.Title>
                    <Card.Subtitle className="text-muted">Subí un .xlsx/.xls con tus productos</Card.Subtitle>
                  </div>

                  <Badge bg="secondary" pill className="align-self-start">
                    {rows.length} filas
                  </Badge>
                </div>

                <Form className="mt-3">
                  {/* File input */}
                  <Form.Group controlId="formFile" className="mb-3">
                    <Form.Label className="small text-muted">Archivo Excel</Form.Label>
                    <Form.Control
                      type="file"
                      accept=".xlsx, .xls"
                      onChange={handleFileUpload}
                      disabled={loading}
                    />
                  </Form.Group>

                  {/* Acciones */}
                  <div className="d-flex gap-2">
                    <Button
                      variant="primary"
                      onClick={() => setShowModal(true)}
                      disabled={loading}
                    >
                      Cargar producto individual
                    </Button>

                    <Button
                      variant="outline-primary"
                      onClick={uploadToFirebase}
                      disabled={loading || rows.length === 0}
                    >
                      {loading ? (
                        <>
                          <Spinner animation="border" size="sm" className="me-2" /> Subiendo...
                        </>
                      ) : (
                        "Subir a Firebase"
                      )}
                    </Button>

                    <Button
                      variant="outline-secondary"
                      onClick={() => setRows([])}
                      disabled={loading || rows.length === 0}
                    >
                      Limpiar filas
                    </Button>
                  </div>

                  {/* Barra de progreso */}
                  {loading && (
                    <div className="mt-3">
                      <ProgressBar now={progress} label={`${progress}%`} variant="info" />
                    </div>
                  )}

                  {/* Preview simple */}
                  {rows.length > 0 && (
                    <Card.Text className="small text-muted mt-3">
                      Filas listas para subir: <strong>{rows.length}</strong>. Asegurate que las
                      columnas coincidan (codigoProducto, nombreProducto, precioCosto, multiplicador, etc).
                    </Card.Text>
                  )}
                </Form>
              </Card.Body>
            </Card>
          </Col>

          {/* RIGHT: Existing products */}
          <Col xs={12} md={6} lg={7}>
            <Card className="shadow-sm border-0">
              <Card.Body>
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <div>
                    <Card.Title className="mb-0">Productos existentes</Card.Title>
                    <Card.Subtitle className="text-muted small">Listado y acciones</Card.Subtitle>
                  </div>

                  <div className="d-flex gap-2">
                    <Button variant="danger" size="sm" onClick={deleteAll} disabled={loading || existingProducts.length === 0}>
                      Borrar todos
                    </Button>

                    <Button variant="outline-danger" size="sm" onClick={deleteSelected} disabled={loading || selectedToDelete.length === 0}>
                      Borrar seleccionados
                    </Button>
                  </div>
                </div>

                <hr />

                <ListGroup variant="flush" style={{ maxHeight: 420, overflowY: "auto" }}>
                  {existingProducts.length === 0 && (
                    <div className="text-center text-muted py-4">No hay productos</div>
                  )}

                  {existingProducts.map((p) => (
                    <ListGroup.Item key={p.id} className="d-flex align-items-center justify-content-between">
                      <div className="d-flex align-items-center gap-3">
                        <Form.Check
                          type="checkbox"
                          id={`chk-${p.id}`}
                          checked={selectedToDelete.includes(p.id)}
                          onChange={() => toggleSelect(p.id)}
                        />
                        <div>
                          <div className="fw-semibold">{p.nombreProducto || "— sin nombre —"}</div>
                          <div className="small text-muted">
                            {p.codigoProducto ? `Código: ${p.codigoProducto}` : "Sin código"} • {p.categoria || "Sin categoría"}
                          </div>
                        </div>
                      </div>

                      <div className="text-end small">
                        <div className="fw-bold">ARS {p.precioFinal ? p.precioFinal.toLocaleString('es-AR') : (p.precioVenta || 0).toLocaleString('es-AR')}</div>
                        <div className="text-muted">{p.stock ?? 0} u.</div>
                      </div>
                    </ListGroup.Item>
                  ))}
                </ListGroup>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Container>

      {/* ---------------------------
          MODAL: Carga individual
         --------------------------- */}
      <Modal
        show={showModal}
        onHide={() => setShowModal(false)}
        centered
        size="lg"
        backdrop="static"
        keyboard={false}
      >
        <Modal.Header closeButton className="bg-light">
          <Modal.Title className="text-primary">Cargar producto individual</Modal.Title>
        </Modal.Header>

        <Modal.Body>
          <Form>
            <Row className="g-2">
              <Col md={6}>
                <Form.Group className="mb-3" controlId="codigoProducto">
                  <Form.Label className="small text-muted">Código</Form.Label>
                  <Form.Control
                    type="text"
                    placeholder="Código del producto"
                    value={productoIndividual.codigoProducto}
                    onChange={handleChangeIndividual}
                    name="codigoProducto"
                    disabled={loading}
                  />
                </Form.Group>
              </Col>

              <Col md={6}>
                <Form.Group className="mb-3" controlId="nombreProducto">
                  <Form.Label className="small text-muted">Nombre *</Form.Label>
                  <Form.Control
                    type="text"
                    placeholder="Nombre del producto"
                    value={productoIndividual.nombreProducto}
                    onChange={handleChangeIndividual}
                    name="nombreProducto"
                    disabled={loading}
                  />
                </Form.Group>
              </Col>

              <Col md={6}>
                <Form.Group className="mb-3" controlId="categoria">
                  <Form.Label className="small text-muted">Categoría</Form.Label>
                  <Form.Control
                    type="text"
                    placeholder="Categoría"
                    value={productoIndividual.categoria}
                    onChange={handleChangeIndividual}
                    name="categoria"
                    disabled={loading}
                  />
                </Form.Group>
              </Col>

              <Col md={6}>
                <Form.Group className="mb-3" controlId="proveedor">
                  <Form.Label className="small text-muted">Proveedor</Form.Label>
                  <Form.Control
                    type="text"
                    placeholder="Proveedor"
                    value={productoIndividual.proveedor}
                    onChange={handleChangeIndividual}
                    name="proveedor"
                    disabled={loading}
                  />
                </Form.Group>
              </Col>

              <Col md={4}>
                <Form.Group className="mb-3" controlId="stock">
                  <Form.Label className="small text-muted">Stock</Form.Label>
                  <Form.Control
                    type="text"
                    placeholder="0"
                    value={productoIndividual.stock}
                    onChange={handleChangeIndividual}
                    name="stock"
                    disabled={loading}
                  />
                </Form.Group>
              </Col>

              <Col md={4}>
                <Form.Group className="mb-3" controlId="precioCosto">
                  <Form.Label className="small text-muted">Precio costo *</Form.Label>
                  <Form.Control
                    type="text"
                    placeholder="Ej: 4569,50"
                    value={productoIndividual.precioCosto}
                    onChange={handleChangeIndividual}
                    name="precioCosto"
                    disabled={loading}
                  />
                </Form.Group>
              </Col>

              <Col md={4}>
                <Form.Group className="mb-3" controlId="multiplicador">
                  <Form.Label className="small text-muted">Multiplicador *</Form.Label>
                  <Form.Control
                    type="text"
                    placeholder="Ej: 1.5"
                    value={productoIndividual.multiplicador}
                    onChange={handleChangeIndividual}
                    name="multiplicador"
                    disabled={loading}
                  />
                </Form.Group>
              </Col>
            </Row>

            {/* Preview rápido de cálculos */}
            <Row>
              <Col>
                <Card className="mt-2 border-0" style={{ background: "#f8fafc" }}>
                  <Card.Body className="py-2 px-3">
                    <small className="text-muted">Previsualización</small>
                    <div className="d-flex justify-content-between align-items-center">
                      <div>
                        <div className="fw-semibold">
                          Precio venta (Base):{" "}
                          {(() => {
                            const pv = calcularPrecios(productoIndividual.precioCosto, productoIndividual.multiplicador).precioVenta;
                            return `ARS ${Number(pv || 0).toLocaleString("es-AR", {minimumFractionDigits: 2})}`;
                          })()}
                        </div>
                        <div className="small text-muted">Precio final (Redondeo 900): {(() => {
                          const pf = calcularPrecios(productoIndividual.precioCosto, productoIndividual.multiplicador).precioFinal;
                          return `ARS ${Number(pf || 0).toLocaleString("es-AR")}`;
                        })()}</div>
                      </div>

                      <div>
                        <Badge bg="info" className="text-dark">Cálculo instantáneo</Badge>
                      </div>
                    </div>
                  </Card.Body>
                </Card>
              </Col>
            </Row>
          </Form>
        </Modal.Body>

        <Modal.Footer>
          <div className="d-flex w-100 justify-content-between align-items-center">
            <small className="text-muted">Campos con * son obligatorios</small>

            <div>
              <Button variant="outline-secondary" onClick={() => setShowModal(false)} disabled={loading}>
                Cancelar
              </Button>
              <Button
                variant="primary"
                className="ms-2"
                onClick={cargarProductoIndividual}
                disabled={loading}
              >
                {loading ? <><Spinner animation="border" size="sm" className="me-2" />Guardando...</> : "Guardar producto"}
              </Button>
            </div>
          </div>
        </Modal.Footer>
      </Modal>
      <FooterDashboard/>
    </>
  );
};

export { CargarProductosExcel };