import React, { useEffect, useState } from "react";
import {
  collection,
  getDocs,
  updateDoc,
  deleteDoc,
  doc,
  writeBatch,
} from "firebase/firestore";
import { FIRESTORE_DB } from "../../../Database/Database";
import { NavBarDashboard } from "../../../Components/NavBarDashboard/NavBarDashboard";
import { FooterDashboard } from "../../../Components/FooterDashboard/FooterDashboard";

// Importaciones de React-Bootstrap para la estética moderna
import {
  Container,
  Row,
  Col,
  Card,
  Table,
  Form,
  Button,
  InputGroup,
  Spinner,
  ProgressBar,
  Badge
} from "react-bootstrap";

import { FaSave, FaTrash, FaSearch, FaDollarSign } from "react-icons/fa";
import '../VerEditarProductos/VerEditarProductos.css'

// ----------------------------------------------------
// UTILITIES (mantienen la lógica de precios)
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

// ----------------------------------------------------
// COMPONENT
// ----------------------------------------------------

const VerEditarProductos = () => {
  const [products, setProducts] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [search, setSearch] = useState({
    codigo: "",
    nombre: "",
    categoria: "",
    proveedor: "",
  });

  const [inflacion, setInflacion] = useState("");
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);

  // --- Data Loading ---
  useEffect(() => {
    loadProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadProducts = async () => {
    const ref = collection(FIRESTORE_DB, "productos");
    const snapshot = await getDocs(ref);

    const list = snapshot.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        ...data,
        multiplicador:
          data.multiplicador !== undefined ? data.multiplicador.toString() : "1",
      };
    });

    setProducts(list);
    setFiltered(list);
  };

  // --- Filtering ---
  const applyFilters = () => {
    let f = [...products];
    Object.entries(search).forEach(([key, value]) => {
      if (value.trim() !== "") {
        const field =
          key === "codigo"
            ? "codigoProducto"
            : key === "nombre"
            ? "nombreProducto"
            : key;
        f = f.filter((p) =>
          p[field]?.toString().toLowerCase().includes(value.toLowerCase())
        );
      }
    });
    setFiltered(f);
  };

  useEffect(() => {
    applyFilters();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, products]);

  // --- CRUD Operations ---
  const updateProduct = async (p) => {
    await updateDoc(doc(FIRESTORE_DB, "productos", p.id), p);
  };

  const deleteProduct = async (id) => {
    if (!window.confirm("¿Desea eliminar este producto?")) return;
    await deleteDoc(doc(FIRESTORE_DB, "productos", id));
    loadProducts();
  };

  const handleChange = (id, field, value) => {
    setFiltered((prev) =>
      prev.map((p) => {
        if (p.id !== id) return p;

        const updated = { ...p, [field]: value };

        if (["precioCosto", "multiplicador"].includes(field)) {
          const costo = parseNumber(updated.precioCosto);
          const mult = parseNumber(updated.multiplicador) || 1;

          updated.precioVenta = Number((costo * mult).toFixed(2));
          updated.precioFinal = roundToAttractivePrice(costo * mult);
        }
        
        return updated;
      })
    );
  };

  const calculateAutoValues = (product) => {
    const costo = parseNumber(product.precioCosto);
    const mult = parseNumber(product.multiplicador) || 1;
    const autoVenta = Number((costo * mult).toFixed(2));
    const autoFinal = roundToAttractivePrice(autoVenta);
    return { autoVenta, autoFinal };
  };

  const save = async (product) => {
    const costo = parseNumber(product.precioCosto);
    const mult = parseNumber(product.multiplicador) || 1;
    
    // Se respetan los valores del estado (manuales o auto-calculados)
    const updatedToSave = {
      ...product,
      multiplicador: mult,
      precioCosto: costo,
      precioVenta: parseNumber(product.precioVenta),
      precioFinal: parseNumber(product.precioFinal),
      stock: parseNumber(product.stock),
    };
    
    await updateProduct(updatedToSave);
    alert("Producto actualizado");
    loadProducts();
  };

  // --- Inflation (Batch Writes) ---
  const aplicarInflacion = async () => {
    const porcentaje = parseNumber(inflacion);
    if (!porcentaje || porcentaje <= 0) {
      alert("Ingrese un porcentaje válido y positivo");
      return;
    }

    setLoading(true);
    setProgress(0);

    const factor = 1 + porcentaje / 100;
    const total = products.length;
    let count = 0;
    
    let batch = writeBatch(FIRESTORE_DB);
    const batchSize = 499;

    try {
      for (const p of products) {
        const costo = parseNumber(p.precioCosto);
        const mult = parseNumber(p.multiplicador) || 1;

        // Calcular el nuevo precio de Venta Bruta
        const precioVentaBruta = costo * mult * factor;
        
        // Aplicar el nuevo redondeo
        const nuevoPrecioFinal = roundToAttractivePrice(precioVentaBruta);

        const productRef = doc(FIRESTORE_DB, "productos", p.id);
        
        // Solo actualizamos el precioFinal.
        batch.update(productRef, {
            precioFinal: nuevoPrecioFinal,
        });

        count++;

        if (count % batchSize === 0) {
            await batch.commit();
            batch = writeBatch(FIRESTORE_DB);
            setProgress(Math.round((count / total) * 100));
        }
      }

      if (count % batchSize !== 0) {
          await batch.commit();
      }
      
      setProgress(100); 

      alert("Inflación aplicada correctamente");
      loadProducts();
    } catch (error) {
        console.error("Error al aplicar inflación:", error);
        alert("Ocurrió un error al aplicar la inflación. Revise la consola.");
    } finally {
      setLoading(false);
      setProgress(0);
    }
  };

  // ----------------------------------------------------
  // RENDER (Estética Moderna)
  // ----------------------------------------------------

  return (
    <>
      <NavBarDashboard />
      <Container fluid className="py-4 px-4 bg-light contEditar">
        <h2 className="mb-4 text-primary">Gestión y Edición de Productos</h2>
        <p className="text-muted">Edita en tiempo real, aplica filtros y gestiona la inflación masiva.</p>

        <Row className="mb-4 g-4">
          {/* Card: Inflación Masiva */}
          <Col lg={4}>
            <Card className="shadow-sm h-100 border-info">
              <Card.Body>
                <Card.Title className="text-info">
                    <FaDollarSign className="me-2" />
                    Aplicar Inflación Masiva
                </Card.Title>
                <Card.Text className="small text-muted">
                    Aplica un porcentaje solo al **Precio Final** de todos los productos y redondea al `X900`.
                </Card.Text>

                <InputGroup className="mt-2">
                  <Form.Control
                    type="text"
                    placeholder="Ej: 15.5"
                    value={inflacion}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === "" || /^[0-9.,]+$/.test(val)) setInflacion(val);
                    }}
                    disabled={loading}
                    className="border-end-0"
                  />
                  <InputGroup.Text>%</InputGroup.Text>
                  <Button 
                    variant="info" 
                    onClick={aplicarInflacion} 
                    disabled={loading || parseNumber(inflacion) <= 0}
                    className="fw-bold"
                  >
                    {loading ? <Spinner animation="border" size="sm" /> : "Aplicar"}
                  </Button>
                </InputGroup>

                {loading && (
                  <ProgressBar 
                    now={progress} 
                    label={`${progress}%`} 
                    variant="info" 
                    className="mt-3" 
                    animated 
                  />
                )}
              </Card.Body>
            </Card>
          </Col>

          {/* Card: Filtros de Búsqueda */}
          <Col lg={8}>
            <Card className="shadow-sm h-100 border-primary">
              <Card.Body>
                <Card.Title className="text-primary"><FaSearch className="me-2" />Filtros de Búsqueda</Card.Title>
                <Row className="mt-3 g-2">
                  {["codigo", "nombre", "categoria", "proveedor"].map((key) => (
                    <Col sm={6} lg={3} key={key}>
                      <Form.Control
                        size="sm"
                        placeholder={`Buscar por ${key}`}
                        value={search[key]}
                        onChange={(e) =>
                          setSearch({ ...search, [key]: e.target.value })
                        }
                        className="rounded-pill"
                      />
                    </Col>
                  ))}
                </Row>
              </Card.Body>
            </Card>
          </Col>
        </Row>

        {/* Card: Tabla de Productos */}
        <Card className="shadow-lg border-0">
            <Card.Body className="p-0">
            <div className="table-responsive" style={{ maxHeight: '65vh', overflowY: 'auto' }}>
                <Table striped hover responsive className="mb-0 small align-middle">
                    <thead className="table-dark sticky-top" style={{ top: 0 }}>
                    <tr>
                        <th style={{ width: '8%' }}>Código</th>
                        <th style={{ width: '20%' }}>Nombre</th>
                        <th style={{ width: '12%' }}>Categoría</th>
                        <th style={{ width: '12%' }}>Proveedor</th>
                        <th style={{ width: '8%' }}>Stock</th>
                        <th style={{ width: '10%' }}>Costo</th>
                        <th style={{ width: '10%' }}>Multiplicador</th>
                        <th style={{ width: '10%' }}>Venta</th>
                        <th style={{ width: '10%' }}>Final</th>
                        <th style={{ width: '10%' }}>Acciones</th>
                    </tr>
                    </thead>
                    <tbody>
                    {filtered.map((p) => {
                        const { autoVenta, autoFinal } = calculateAutoValues(p);
                        return (
                        <tr key={p.id}>
                            <td className="text-muted">{p.codigoProducto}</td>
                            <td>
                            <Form.Control
                                size="sm"
                                value={p.nombreProducto}
                                onChange={(e) => handleChange(p.id, "nombreProducto", e.target.value)}
                            />
                            </td>
                            <td>
                            <Form.Control
                                size="sm"
                                value={p.categoria}
                                onChange={(e) => handleChange(p.id, "categoria", e.target.value)}
                            />
                            </td>
                            <td>
                            <Form.Control
                                size="sm"
                                value={p.proveedor}
                                onChange={(e) => handleChange(p.id, "proveedor", e.target.value)}
                            />
                            </td>
                            <td>
                            <Form.Control
                                size="sm"
                                type="number"
                                value={p.stock}
                                onChange={(e) => handleChange(p.id, "stock", e.target.value)}
                            />
                            </td>
                            <td>
                            <Form.Control
                                size="sm"
                                type="text"
                                value={p.precioCosto}
                                onChange={(e) => handleChange(p.id, "precioCosto", e.target.value)}
                                className="text-danger fw-bold"
                            />
                            </td>
                            <td>
                            <Form.Control
                                size="sm"
                                type="text"
                                value={p.multiplicador}
                                onChange={(e) => handleChange(p.id, "multiplicador", e.target.value)}
                                className="fw-bold"
                            />
                            </td>
                            <td>
                            <Form.Control
                                size="sm"
                                type="text"
                                value={p.precioVenta || autoVenta}
                                onChange={(e) => handleChange(p.id, "precioVenta", e.target.value)}
                                className={`text-end ${Math.abs(parseNumber(p.precioVenta) - autoVenta) > 0.01 ? 'bg-warning bg-opacity-10' : ''}`}
                                title={`Cálculo automático: $${autoVenta.toLocaleString('es-AR')}. Edita para anular.`}
                            />
                            </td>
                            <td>
                            <Form.Control
                                size="sm"
                                type="text"
                                value={p.precioFinal || autoFinal}
                                onChange={(e) => handleChange(p.id, "precioFinal", e.target.value)}
                                className={`text-end fw-bold ${Math.abs(parseNumber(p.precioFinal) - autoFinal) > 0.01 ? 'bg-danger bg-opacity-10 text-danger' : 'text-success'}`}
                                title={`Cálculo automático: $${autoFinal.toLocaleString('es-AR')}. Edita para anular.`}
                            />
                            </td>
                            <td>
                            <Button 
                                variant="success" 
                                size="sm" 
                                onClick={() => save(p)}
                                className="me-1"
                                title="Guardar cambios"
                            >
                                <FaSave />
                            </Button>

                            <Button
                                variant="danger"
                                size="sm"
                                onClick={() => deleteProduct(p.id)}
                                title="Eliminar producto"
                            >
                                <FaTrash />
                            </Button>
                            </td>
                        </tr>
                        );
                    })}
                    </tbody>
                </Table>
            </div>
            </Card.Body>
        </Card>

      </Container>
      <FooterDashboard/>
    </>
  );
};

export { VerEditarProductos };