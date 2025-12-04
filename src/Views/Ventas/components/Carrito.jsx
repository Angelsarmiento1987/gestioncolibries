import React from "react";
import { Card, Button, Form, Badge } from "react-bootstrap";
import { formatARS } from "../helpers/formatearDinero";

/**
 * Props:
 * - carrito (array)
 * - cambiarCantidad(id, cantidad)
 * - quitarDelCarrito(id)
 * - totalSinDescuento (number)
 */
export const Carrito = ({ carrito, cambiarCantidad, quitarDelCarrito, totalSinDescuento }) => {
  return (
    <>
      {carrito.length === 0 && (
        <div className="text-center text-muted py-4">Carrito vacío</div>
      )}

      {carrito.map((item) => (
        <Card key={item.id} className="mb-2 border-0 bg-light">
          <Card.Body className="d-flex justify-content-between align-items-center">
            <div>
              <div className="fw-semibold">{item.nombreProducto}</div>
              <div className="text-muted small">
                Código: {item.codigoProducto || "—"} • {item.categoria || "—"}
              </div>
            </div>

            <div className="d-flex align-items-center gap-2">
              <Form.Control
                type="number"
                min={1}
                value={item.cantidad}
                onChange={(e) => cambiarCantidad(item.id, Number(e.target.value))}
                style={{ width: 80 }}
              />

              <Badge bg="dark">
                {formatARS(item.precioFinal * item.cantidad)}
              </Badge>

              <Button
                variant="outline-danger"
                size="sm"
                onClick={() => quitarDelCarrito(item.id)}
              >
                X
              </Button>
            </div>
          </Card.Body>
        </Card>
      ))}

      {carrito.length > 0 && (
        <>
          <hr />

          {/* BOX ESTILIZADO DEL CARRITO */}
          <div
            className="carrito-box d-flex justify-content-between align-items-center"
            style={{
              backgroundColor: "#f2f2f2",
              padding: "12px 16px",
              borderRadius: "8px",
              border: "2px solid #ccc",
              marginTop: "8px"
            }}
          >
            <div>
              <div className="small text-muted">Subtotal</div>
              <div className="fw-bold">{formatARS(totalSinDescuento)}</div>
            </div>
          </div>
        </>
      )}
    </>
  );
};
