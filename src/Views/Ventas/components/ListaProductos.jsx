

import React from "react";
import { ListGroup, Button } from "react-bootstrap";

/**
 * Props:
 * - productos (array)
 * - onAgregar(product)
 */
export const ListaProductos = ({ productos, onAgregar }) => {
  return (
    <ListGroup variant="flush" style={{ maxHeight: 520, overflowY: "auto" }}>
      {productos.length === 0 && (
        <div className="text-center text-muted py-4">Sin productos</div>
      )}

      {productos.map((p) => (
        <ListGroup.Item key={p.id} className="d-flex justify-content-between align-items-center">
          <div style={{ minWidth: 0 }}>
            <div className="fw-semibold">{p.nombreProducto}</div>
            <div className="small text-muted">
              {p.codigoProducto ? `Código: ${p.codigoProducto}` : "Sin código"} • {p.categoria || "Sin categoría"} • {p.proveedor || "Sin proveedor"}
            </div>
          </div>

          <div className="text-end">
            <div className="fw-bold">{p.precioFinal ? `ARS ${p.precioFinal}` : `ARS ${p.precioVenta || 0}`}</div>
            <div className="small text-muted">{p.stock ?? 0} u.</div>
            <Button size="sm" variant="primary" className="mt-2" onClick={() => onAgregar(p)}>Agregar</Button>
          </div>
        </ListGroup.Item>
      ))}
    </ListGroup>
  );
};
