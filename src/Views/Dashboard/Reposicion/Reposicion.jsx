import React, { useEffect, useState, useMemo } from "react";
import {
  collection,
  getDocs,
  doc,
  writeBatch,
  query,
  orderBy,
  limit,
  where,
} from "firebase/firestore";
// Asegúrate de que esta ruta sea correcta
import { FIRESTORE_DB } from "../../../Database/Database";
import { NavBarDashboard } from "../../../Components/NavBarDashboard/NavBarDashboard";
import { FooterDashboard } from "../../../Components/FooterDashboard/FooterDashboard";

// Importaciones de React-Bootstrap
import {
  Container,
  Row,
  Col,
  Card,
  Form,
  Button,
  InputGroup,
  Spinner,
  Alert,
  ListGroup,
  Table,
  Badge,
  Accordion,
} from "react-bootstrap";

import { FaSearch, FaWarehouse, FaCheckCircle, FaExclamationTriangle, FaHistory, FaCalendarAlt, FaDollarSign, FaBoxes, FaChartBar } from "react-icons/fa";

// ----------------------------------------------------
// IMPORTS Y REGISTRO PARA GRÁFICOS (CHART.JS)
// ----------------------------------------------------
import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  BarElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
} from "chart.js";

ChartJS.register(
  BarElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend
);


// ----------------------------------------------------
// UTILITIES (mantienen la lógica de precios y fechas)
// ----------------------------------------------------

const roundToAttractivePrice = (num) => {
  if (num <= 1000) return Math.ceil(num / 100) * 100;
  const roundedUp = Math.ceil(num / 1000) * 1000;
  return roundedUp - 100;
};

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

const parseFecha = (f) => {
    if (!f && f !== 0) return null;
    try {
      if (typeof f.toDate === "function") return f.toDate();
      if (f instanceof Date) return f;
      return null;
    } catch {
      return null;
    }
};

// ----------------------------------------------------
// COMPONENTE INTERNO: DASHBOARD DE RESUMEN DE INVENTARIO
// ----------------------------------------------------

const ResumenInventarioDashboard = () => {
    const [topStock, setTopStock] = useState([]);
    const [movimientosRecientes, setMovimientosRecientes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            setError(null);
            try {
                // 1. Cargar Top 5 de Productos por Stock (Ranking de Inventario)
                // Se cargan todos los productos y se ordena localmente para ser eficientes con Firestore
                const productosRef = collection(FIRESTORE_DB, "productos");
                const productosSnapshot = await getDocs(productosRef);
                
                let allProducts = productosSnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data(),
                    stock: parseFloat(doc.data().stock) || 0,
                }));

                // Ordenar localmente por stock descendente y tomar el Top 5
                allProducts.sort((a, b) => b.stock - a.stock);
                setTopStock(allProducts.slice(0, 5));


                // 2. Cargar Últimos 5 Movimientos de Reposición/Ajuste
                const reposicionesQuery = query(
                    collection(FIRESTORE_DB, "reposiciones"),
                    orderBy("fecha", "desc"),
                    limit(5)
                );
                const reposicionesSnapshot = await getDocs(reposicionesQuery);

                const movimientos = reposicionesSnapshot.docs.map(doc => {
                    const data = doc.data();
                    return {
                        id: doc.id,
                        ...data,
                        fechaObj: parseFecha(data.fecha),
                        tipoAccion: data.tipoAccion || "Reposición",
                    };
                });
                setMovimientosRecientes(movimientos);

            } catch (err) {
                console.error("Error al cargar datos del dashboard de inventario:", err);
                setError("Error al cargar los datos. Revisa la consola para más detalles.");
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    // Configuración del gráfico de barras
    const chartData = {
        labels: topStock.map(p => p.codigoProducto), 
        datasets: [
            {
                label: 'Stock Actual',
                data: topStock.map(p => p.stock),
                backgroundColor: 'rgba(75, 192, 192, 0.6)',
                borderColor: 'rgba(75, 192, 192, 1)',
                borderWidth: 1,
            },
        ],
    };

    const chartOptions = {
        responsive: true,
        plugins: {
            legend: {
                display: false,
            },
            title: {
                display: true,
                text: 'Top 5 Productos con Más Stock',
            },
        },
        scales: {
            y: {
                beginAtZero: true,
                title: {
                    display: true,
                    text: 'Unidades en Stock',
                },
            },
            x: {
                title: {
                    display: true,
                    text: 'Código de Producto',
                },
            },
        },
    };


    if (loading) {
        return <div className="text-center py-5"><Spinner animation="border" /> Cargando Resumen de Inventario...</div>;
    }

    if (error) {
        return <Alert variant="danger" className="mt-4">{error}</Alert>;
    }

    return (
        <Row className="g-4 mt-4">
            {/* Gráfico de Top Stock */}
            <Col lg={6}>
                <Card className="shadow h-100">
                    <Card.Body>
                        <Card.Title className="text-info mb-4">
                            <FaChartBar className="me-2" /> Top 5 de Stock
                        </Card.Title>
                        {topStock.length > 0 ? (
                            <Bar data={chartData} options={chartOptions} />
                        ) : (
                            <Alert variant="info" className="text-center">No hay datos de productos para el ranking.</Alert>
                        )}
                    </Card.Body>
                </Card>
            </Col>

            {/* Tabla de Movimientos Recientes */}
            <Col lg={6}>
                <Card className="shadow h-100">
                    <Card.Body>
                        <Card.Title className="text-secondary mb-4">
                            <FaHistory className="me-2" /> 5 Movimientos Recientes
                        </Card.Title>
                        {movimientosRecientes.length > 0 ? (
                            <div className="table-responsive">
                                <Table striped bordered hover size="sm" className="mb-0 small">
                                    <thead>
                                        <tr>
                                            <th><FaCalendarAlt /> Fecha</th>
                                            <th>Producto</th>
                                            <th className="text-center">Acción</th>
                                            <th className="text-end">Cantidad</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {movimientosRecientes.map((r) => (
                                            <tr key={r.id}>
                                                <td>{r.fechaObj ? r.fechaObj.toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' }) : '—'}</td>
                                                <td>{r.codigoProducto} - {r.nombreProducto.substring(0, 20)}...</td>
                                                <td className="text-center">
                                                    <Badge bg={r.tipoAccion === "Ajuste de Inventario" ? "info" : "warning"}>
                                                        {r.tipoAccion}
                                                    </Badge>
                                                </td>
                                                <td className="text-end fw-bold">
                                                    <Badge bg={r.cantidadIngresada > 0 ? "success" : "danger"}>
                                                        {(r.cantidadIngresada > 0 ? `+` : '')}{r.cantidadIngresada} u 
                                                    </Badge>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </Table>
                            </div>
                        ) : (
                            <Alert variant="secondary" className="text-center">No hay movimientos de reposición registrados.</Alert>
                        )}
                    </Card.Body>
                </Card>
            </Col>
        </Row>
    );
};

// ----------------------------------------------------
// COMPONENTE PRINCIPAL: REPOSICION
// ----------------------------------------------------

const Reposicion = () => {
  const [products, setProducts] = useState([]);
  const [productHistory, setProductHistory] = useState([]); 
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [alert, setAlert] = useState({ show: false, message: "", type: "" });
  
  const [formData, setFormData] = useState({
    cantidadRecibida: "",
    costoUnitarioNuevo: "",
  });

  // Controla si es Reposición o Ajuste
  const [modoOperacion, setModoOperacion] = useState("reposicion"); 

  // --- Data Loading ---
  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    setLoading(true);
    try {
      const ref = collection(FIRESTORE_DB, "productos");
      const snapshot = await getDocs(ref);

      const list = snapshot.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          ...data,
          multiplicador: parseNumber(data.multiplicador) || 1, 
          stock: parseNumber(data.stock) || 0,
          precioCosto: parseNumber(data.precioCosto) || 0,
        };
      });

      setProducts(list);
    } catch (error) {
      console.error("Error cargando productos:", error);
      setAlert({
        show: true,
        message: "Error al cargar la lista de productos.",
        type: "danger",
      });
    } finally {
      setLoading(false);
    }
  };

  // --- Carga el historial de un producto específico ---
  const fetchProductHistory = async (productId) => {
    setLoadingHistory(true);
    try {
        const q = query(
            collection(FIRESTORE_DB, "reposiciones"),
            where("idProducto", "==", productId),
            orderBy("fecha", "desc"), 
            limit(10) 
        );
        const snapshot = await getDocs(q);

        const historyList = snapshot.docs.map((d) => {
            const data = d.data();
            return {
                id: d.id,
                ...data,
                // Si el registro es antiguo, no tendrá tipoAccion, asumimos que es Reposición
                tipoAccion: data.tipoAccion || "Reposición", 
                fechaObj: parseFecha(data.fecha), 
            };
        });
        
        setProductHistory(historyList);
    } catch (error) {
        // Mensaje de advertencia para el usuario si falta el índice
        console.error("Error al cargar historial del producto. Revise la consola de Firebase para crear el índice compuesto requerido.", error);
        setProductHistory([]);
    } finally {
        setLoadingHistory(false);
    }
  };


  // --- Filtering ---
  const filteredProducts = useMemo(() => {
    if (searchTerm.trim() === "") return [];

    const term = searchTerm.toLowerCase();

    return products.filter(
      (p) =>
        p.codigoProducto?.toLowerCase().includes(term) ||
        p.nombreProducto?.toLowerCase().includes(term) ||
        p.categoria?.toLowerCase().includes(term)
    ).slice(0, 10);
  }, [searchTerm, products]);


  // --- Handlers ---
  const handleSelectProduct = (product) => {
    setSelectedProduct(product);
    setFormData({
        cantidadRecibida: "",
        costoUnitarioNuevo: product.precioCosto.toString() || "", 
    });
    setModoOperacion("reposicion"); // Resetear a Reposición al seleccionar nuevo producto
    setSearchTerm("");
    fetchProductHistory(product.id);
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    if (value === "" || /^[0-9.,]+$/.test(value)) { 
        setFormData({ ...formData, [name]: value });
    }
  };


  // ----------------------------------------------------
  // CORE: REGISTRAR REPOSICIÓN / AJUSTE (TRANSACCIÓN)
  // ----------------------------------------------------
  const registrarReposicion = async (e) => {
    e.preventDefault();
    if (saving || !selectedProduct) return;

    setSaving(true);
    setAlert({ show: false, message: "", type: "" });

    const costoNuevo = parseNumber(formData.costoUnitarioNuevo);
    const valorInput = parseNumber(formData.cantidadRecibida); // Cantidad recibida O Stock Real

    // VALIDACIONES ESPECÍFICAS POR MODO
    if (modoOperacion === "reposicion" && valorInput <= 0) {
      setAlert({
        show: true,
        message: "En Reposición: La Cantidad debe ser mayor a 0.",
        type: "warning",
      });
      setSaving(false);
      return;
    }

    if (modoOperacion === "reposicion" && costoNuevo <= 0 && selectedProduct.precioCosto <= 0) {
        setAlert({
            show: true,
            message: "En Reposición: Debe ingresar un Costo Unitario válido.",
            type: "warning",
        });
        setSaving(false);
        return;
    }
    
    if (modoOperacion === "ajuste" && valorInput < 0) {
      setAlert({
        show: true,
        message: "En Ajuste: El stock real debe ser un número positivo o cero.",
        type: "warning",
      });
      setSaving(false);
      return;
    }


    try {
      // Uso de writeBatch para asegurar atomicidad
      const batch = writeBatch(FIRESTORE_DB);
      const productRef = doc(FIRESTORE_DB, "productos", selectedProduct.id);
      const reposicionRef = doc(collection(FIRESTORE_DB, "reposiciones"));

      // 1. CÁLCULOS BASE
      const stockActual = selectedProduct.stock;
      const multiplicador = selectedProduct.multiplicador;
      let nuevoStock;
      let cantidadIngresadaParaRegistro;
      let descripcionAccion;
      
      // LÓGICA DE MODOS
      if (modoOperacion === "reposicion") {
          // Modo Reposición: Suma el input al stock actual
          nuevoStock = stockActual + valorInput;
          cantidadIngresadaParaRegistro = valorInput;
          descripcionAccion = "Reposición";
      } else { // modoOperacion === "ajuste"
          // Modo Ajuste: El input es el stock final deseado (stock real)
          nuevoStock = valorInput;
          cantidadIngresadaParaRegistro = nuevoStock - stockActual; // Puede ser positivo o negativo
          descripcionAccion = "Ajuste de Inventario";
      }

      // Definir el costo a usar y si habrá recálculo de precios
      const costoFinalUsar = (costoNuevo > 0) ? costoNuevo : selectedProduct.precioCosto;
      const debeActualizarPrecio = costoNuevo > 0;
      
      const precioVentaBruta = costoFinalUsar * multiplicador;
      const nuevoPrecioFinal = roundToAttractivePrice(precioVentaBruta);

      // 2. ACTUALIZAR PRODUCTO MAESTRO (productos)
      const updateData = {
        stock: nuevoStock,
        fechaUltimaReposicion: new Date(),
      };

      // Solo actualizamos el costo y precio si el usuario ingresó un costo nuevo válido.
      if (debeActualizarPrecio) {
          updateData.precioCosto = costoNuevo;
          updateData.precioVenta = Number(precioVentaBruta.toFixed(2));
          updateData.precioFinal = nuevoPrecioFinal;
      }


      batch.update(productRef, updateData);

      // 3. CREAR REGISTRO HISTÓRICO (reposiciones)
      batch.set(reposicionRef, {
        fecha: new Date(),
        tipoAccion: descripcionAccion, // NUEVO CAMPO
        idProducto: selectedProduct.id, 
        codigoProducto: selectedProduct.codigoProducto,
        nombreProducto: selectedProduct.nombreProducto,
        proveedor: selectedProduct.proveedor || "N/A",
        // Si es reposición, es la cantidad comprada. Si es ajuste, es la diferencia.
        cantidadIngresada: cantidadIngresadaParaRegistro, 
        costoUnitarioCompra: costoFinalUsar,
        stockAnterior: stockActual,
        stockNuevo: nuevoStock,
        precioFinalActualizado: nuevoPrecioFinal,
      });

      await batch.commit();

      // Éxito
      setAlert({
        show: true,
        message: `¡${descripcionAccion} registrado con éxito! Stock: ${stockActual} -> ${nuevoStock}. Precio final: $${nuevoPrecioFinal.toLocaleString('es-AR')}.`,
        type: "success",
      });
      
      // Recargar datos para reflejar los cambios
      loadProducts(); 
      fetchProductHistory(selectedProduct.id); 
      
      // Limpiar formulario y resetear modo
      setFormData({
        cantidadRecibida: "",
        costoUnitarioNuevo: "",
      });
      setModoOperacion("reposicion"); 

    } catch (error) {
      console.error("Error al registrar reposición/ajuste:", error);
      setAlert({
        show: true,
        message: "Error al guardar la operación. Intente nuevamente.",
        type: "danger",
      });
    } finally {
      setSaving(false);
    }
  };
  // ----------------------------------------------------

  const cantidadIngresada = parseNumber(formData.cantidadRecibida);
  const costoUnitarioNuevo = parseNumber(formData.costoUnitarioNuevo);
  const costoFinalUsar = (costoUnitarioNuevo > 0) ? costoUnitarioNuevo : selectedProduct?.precioCosto;
  const nuevoPrecioFinalEstimado = selectedProduct ? roundToAttractivePrice(costoFinalUsar * selectedProduct.multiplicador) : 0;


  return (
    <>
      <NavBarDashboard />
      <Container className="py-4">
        <h2 className="mb-4 text-success">
            <FaWarehouse className="me-2" />
            Registro de Reposición y Ajuste de Stock
        </h2>

        <Row className="g-4 mb-4">
            {/* Columna de Búsqueda y Selección */}
            <Col lg={4}>
                <Card className="shadow-lg border-success h-100">
                    <Card.Body>
                        <Card.Title className="text-success mb-3">
                            <FaSearch className="me-2" />
                            Buscar Producto
                        </Card.Title>
                        
                        <InputGroup className="mb-3">
                            <Form.Control
                                placeholder="Código, Nombre o Categoría"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                disabled={loading}
                                className="rounded-start-pill"
                            />
                        </InputGroup>

                        {loading ? (
                            <div className="text-center"><Spinner animation="border" size="sm" /></div>
                        ) : (
                            filteredProducts.length > 0 && (
                                <ListGroup className="shadow-sm">
                                    {filteredProducts.map((p) => (
                                        <ListGroup.Item
                                            key={p.id}
                                            action
                                            onClick={() => handleSelectProduct(p)}
                                            className="small"
                                            active={selectedProduct && selectedProduct.id === p.id}
                                        >
                                            <strong className="text-primary me-2">{p.codigoProducto}</strong>
                                            {p.nombreProducto}
                                            <span className="text-muted ms-2 float-end">Stock: {p.stock}u</span>
                                        </ListGroup.Item>
                                    ))}
                                </ListGroup>
                            )
                        )}
                        {searchTerm.length > 0 && filteredProducts.length === 0 && !loading && (
                            <Alert variant="info" className="small mt-3">
                                No se encontraron productos.
                            </Alert>
                        )}
                    </Card.Body>
                </Card>
            </Col>

            {/* Columna de Formulario, Resumen e HISTORIAL */}
            <Col lg={8}>
                <Card className="shadow-lg h-100">
                    <Card.Body>
                        {selectedProduct ? (
                            <>
                                <Form onSubmit={registrarReposicion}>
                                    <Card.Title className="text-dark mb-4">
                                        <FaCheckCircle className="me-2 text-primary" />
                                        Producto Seleccionado
                                    </Card.Title>

                                    {/* Resumen del Producto */}
                                    <Alert variant="light" className="border">
                                        <h5 className="mb-1 text-primary">{selectedProduct.nombreProducto}</h5>
                                        <p className="mb-1 small">
                                            **Código:** {selectedProduct.codigoProducto} | **Categoría:** {selectedProduct.categoria}
                                        </p>
                                        <p className="mb-1 small">
                                            **Stock Actual:** <strong className="text-success me-3">{selectedProduct.stock} unidades</strong> 
                                            **Costo Actual:** <strong className="text-danger me-3">${selectedProduct.precioCosto.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</strong>
                                            **Multiplicador:** <strong className="text-info">{selectedProduct.multiplicador}</strong>
                                        </p>
                                    </Alert>
                                    
                                    {/* Selector de Modo */}
                                    <Form.Group className="mb-4">
                                        <Form.Label className="fw-bold"><FaBoxes className="me-2"/>Seleccione el tipo de operación</Form.Label>
                                        <div className="d-flex justify-content-around bg-light p-2 rounded">
                                            <Form.Check
                                                type="radio"
                                                label="Reposición de Compra (SUMA)"
                                                name="operationMode"
                                                id="modeReposicion"
                                                value="reposicion"
                                                checked={modoOperacion === "reposicion"}
                                                onChange={() => {
                                                    setModoOperacion("reposicion");
                                                    setFormData({ ...formData, cantidadRecibida: "" });
                                                }}
                                                inline
                                            />
                                            <Form.Check
                                                type="radio"
                                                label="Ajuste de Inventario (CONTEO FÍSICO)"
                                                name="operationMode"
                                                id="modeAjuste"
                                                value="ajuste"
                                                checked={modoOperacion === "ajuste"}
                                                onChange={() => {
                                                    setModoOperacion("ajuste");
                                                    setFormData({ ...formData, cantidadRecibida: selectedProduct.stock.toString() });
                                                }}
                                                inline
                                            />
                                        </div>
                                    </Form.Group>


                                    {/* Formulario de Reposición / Ajuste */}
                                    <Row className="mb-4 g-3">
                                        {/* Campo de Cantidad (depende del modo) */}
                                        <Col md={6}>
                                            <Form.Group controlId="cantidadRecibida">
                                                <Form.Label className="fw-bold">
                                                    {modoOperacion === "reposicion" ? 
                                                        "Cantidad Recibida (Unidades a SUMAR)" : 
                                                        "Stock Físico REAL (Conteo Total)"
                                                    }
                                                </Form.Label>
                                                <Form.Control
                                                    type="text"
                                                    name="cantidadRecibida"
                                                    value={formData.cantidadRecibida}
                                                    onChange={handleFormChange}
                                                    required
                                                    placeholder={modoOperacion === "reposicion" ? "Ej: 50" : selectedProduct.stock.toString()}
                                                    className="fw-bold text-primary"
                                                />
                                                {modoOperacion === "ajuste" && (
                                                    <Form.Text className="text-muted">
                                                        El stock actual ({selectedProduct.stock}) se corregirá a este valor.
                                                    </Form.Text>
                                                )}
                                            </Form.Group>
                                        </Col>
                                        
                                        {/* Campo de Costo Unitario */}
                                        <Col md={6}>
                                            <Form.Group controlId="costoUnitarioNuevo">
                                                <Form.Label className="fw-bold">Costo Unitario <span className="text-danger">(Opcional / Nuevo)</span></Form.Label>
                                                <InputGroup>
                                                    <InputGroup.Text>$</InputGroup.Text>
                                                    <Form.Control
                                                        type="text"
                                                        name="costoUnitarioNuevo"
                                                        value={formData.costoUnitarioNuevo}
                                                        onChange={handleFormChange}
                                                        placeholder={`Actual: ${selectedProduct.precioCosto.toLocaleString('es-AR')}`}
                                                        className="fw-bold text-danger"
                                                    />
                                                </InputGroup>
                                                <Form.Text className="text-muted">
                                                    Déjelo vacío para mantener el costo actual. Si lo ingresa, los precios de venta se recalcularán.
                                                </Form.Text>
                                            </Form.Group>
                                        </Col>
                                    </Row>

                                    {/* Resumen de Impacto */}
                                    {cantidadIngresada > 0 && (
                                        <Alert variant="warning" className="small">
                                            <FaExclamationTriangle className="me-2" />
                                            **Impacto de la Operación:**
                                            <ul className="mt-1 mb-0 ps-3">
                                                {modoOperacion === "reposicion" ? (
                                                    <>
                                                        <li>**Nuevo Stock Total:** {selectedProduct.stock} + {cantidadIngresada} = <strong className="text-success">{selectedProduct.stock + cantidadIngresada} unidades</strong></li>
                                                        <li>**Costo Total de Compra:** <strong className="text-danger">${(costoFinalUsar * cantidadIngresada).toLocaleString('es-AR', { minimumFractionDigits: 2 })}</strong></li>
                                                    </>
                                                ) : (
                                                    <>
                                                        <li>**Stock Actual:** {selectedProduct.stock} u.</li>
                                                        <li>**Stock Físico (REAL):** <strong className="text-primary">{cantidadIngresada} unidades</strong></li>
                                                        {/* Calcula la diferencia para el resumen de ajuste */}
                                                        {cantidadIngresada !== selectedProduct.stock && (
                                                            <li>**Ajuste por Diferencia:** <strong className={cantidadIngresada > selectedProduct.stock ? "text-success" : "text-danger"}>
                                                                {cantidadIngresada - selectedProduct.stock} unidades
                                                            </strong></li>
                                                        )}
                                                    </>
                                                )}
                                                
                                                {/* Solo muestra el recálculo si el costo fue modificado */}
                                                {costoUnitarioNuevo > 0 && (
                                                    <li>**Nuevo Precio Final Sugerido:** <strong className="text-primary">${nuevoPrecioFinalEstimado.toLocaleString('es-AR')}</strong> (Aplicado por cambio de costo).</li>
                                                )}
                                            </ul>
                                        </Alert>
                                    )}

                                    {alert.show && <Alert variant={alert.type}>{alert.message}</Alert>}

                                    <Button
                                        variant={modoOperacion === "reposicion" ? "success" : "primary"}
                                        type="submit"
                                        className="w-100 fw-bold mt-3"
                                        // Desactivar si no cumple con las condiciones básicas
                                        disabled={
                                            saving || 
                                            cantidadIngresada <= 0 || 
                                            (modoOperacion === "reposicion" && costoFinalUsar <= 0) || // Reposición sin costo válido
                                            (modoOperacion === "ajuste" && cantidadIngresada === selectedProduct.stock && costoUnitarioNuevo <= 0) // Ajuste sin cambio
                                        }
                                    >
                                        {saving ? <Spinner animation="border" size="sm" /> : 
                                            modoOperacion === "reposicion" ? "Registrar Reposición y Actualizar Precios" : "Registrar Ajuste de Inventario"
                                        }
                                    </Button>
                                </Form>
                                
                                <hr className="my-4" />

                                {/* ACORDEÓN DE HISTORIAL */}
                                <Accordion defaultActiveKey="0">
                                    <Accordion.Item eventKey="0">
                                        <Accordion.Header>
                                            <FaHistory className="me-2 text-primary" />
                                            Historial de Reposiciones y Ajustes de **{selectedProduct.codigoProducto}**
                                        </Accordion.Header>
                                        <Accordion.Body className="p-0">
                                            {loadingHistory ? (
                                                <div className="text-center py-4"><Spinner animation="border" size="sm" /> Cargando historial...</div>
                                            ) : productHistory.length > 0 ? (
                                                <div className="table-responsive" style={{ maxHeight: '250px', overflowY: 'auto' }}>
                                                    <Table striped hover size="sm" className="mb-0 small">
                                                        <thead>
                                                            <tr>
                                                                <th><FaCalendarAlt /> Fecha</th>
                                                                <th>Acción</th> {/* NUEVA COLUMNA */}
                                                                <th className="text-end">Cantidad</th>
                                                                <th className="text-end">Costo Unit.</th>
                                                                <th className="text-end">Stock Final</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {productHistory.map((r) => (
                                                                <tr key={r.id}>
                                                                    <td>
                                                                        {r.fechaObj ? r.fechaObj.toLocaleString('es-AR', { dateStyle: 'short' }) : '—'}
                                                                    </td>
                                                                    <td> 
                                                                        <Badge bg={r.tipoAccion === "Ajuste de Inventario" ? "info" : "warning"}>
                                                                            {r.tipoAccion}
                                                                        </Badge>
                                                                    </td>
                                                                    <td className="text-end fw-bold">
                                                                        {/* Mostrar +/- para el ajuste */}
                                                                        <Badge bg={r.cantidadIngresada > 0 ? "success" : r.cantidadIngresada < 0 ? "danger" : "secondary"}>
                                                                            {(r.cantidadIngresada > 0 ? `+` : '')}{r.cantidadIngresada} u 
                                                                        </Badge>
                                                                    </td>
                                                                    <td className="text-end fw-bold text-danger">
                                                                        <FaDollarSign size={10} className="me-1" />{r.costoUnitarioCompra.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                                                                    </td>
                                                                    <td className="text-end text-muted">{r.stockNuevo} u</td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </Table>
                                                </div>
                                            ) : (
                                                <p className="p-3 text-center text-muted small fst-italic">
                                                    No hay registros de reposición para este producto. **Recuerda crear el Índice Compuesto en Firebase.**
                                                </p>
                                            )}
                                        </Accordion.Body>
                                    </Accordion.Item>
                                </Accordion>
                                {/* FIN ACORDEÓN DE HISTORIAL */}

                            </>
                        ) : (
                            <div className="text-center py-5">
                                <h4 className="text-muted fw-light">Busque y seleccione un producto para comenzar la reposición.</h4>
                            </div>
                        )}
                    </Card.Body>
                </Card>
            </Col>
        </Row>
        
        <hr className="my-5" />

        {/* COMPONENTE INTERNO: DASHBOARD DE RESUMEN */}
        <ResumenInventarioDashboard /> 

      </Container>
      
      <FooterDashboard/>
    </>
  );
};

export default Reposicion;