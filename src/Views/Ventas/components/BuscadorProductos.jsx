

import React, { useMemo } from "react";
import { Row, Col, Form, Button } from "react-bootstrap";

/**
 * Props:
 * - filtros: { codigo, categoria, proveedor, nombre }
 * - setFiltros
 * - categorias (array)
 * - proveedores (array)
 * - onClear
 */
export const BuscadorProductos = ({ filtros, setFiltros, categorias, proveedores, onClear }) => {
  const handleChange = (field, value) => setFiltros({ ...filtros, [field]: value });

  return (
    <Row className="mb-3">
      <Col md={3}>
        <Form.Label className="small text-muted">Código</Form.Label>
        <Form.Control value={filtros.codigo} onChange={(e) => handleChange("codigo", e.target.value)} placeholder="Código" />
      </Col>

      <Col md={3}>
        <Form.Label className="small text-muted">Categoría</Form.Label>
        <Form.Select value={filtros.categoria} onChange={(e) => handleChange("categoria", e.target.value)}>
          <option value="">Todas</option>
          {categorias.map((c) => <option key={c} value={c}>{c}</option>)}
        </Form.Select>
      </Col>

      <Col md={3}>
        <Form.Label className="small text-muted">Proveedor</Form.Label>
        <Form.Select value={filtros.proveedor} onChange={(e) => handleChange("proveedor", e.target.value)}>
          <option value="">Todos</option>
          {proveedores.map((p) => <option key={p} value={p}>{p}</option>)}
        </Form.Select>
      </Col>

      <Col md={3}>
        <Form.Label className="small text-muted">Nombre</Form.Label>
        <div className="d-flex">
          <Form.Control value={filtros.nombre} onChange={(e) => handleChange("nombre", e.target.value)} placeholder="Buscar por nombre" />
          <Button variant="outline-secondary" className="ms-2" onClick={onClear}>Limpiar</Button>
        </div>
      </Col>
    </Row>
  );
};
