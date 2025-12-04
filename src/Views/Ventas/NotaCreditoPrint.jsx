import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Button, Table } from "react-bootstrap";

const NotaCreditoPrint = () => {
  const location = useLocation();
  const navigate = useNavigate();

  // 🚨 CAMBIO: Se añaden idNotaCredito (largo) y numeroNotaCredito (corto, práctico)
  const { 
    ventaOriginal, 
    itemsDevueltos, 
    totalDevuelto, 
    idNotaCredito, 
    numeroNotaCredito 
  } = location.state || {};

  if (!ventaOriginal) {
    return (
      <div className="container mt-5">
        <h3>No hay datos para generar la nota de crédito</h3>
        <Button onClick={() => navigate(-1)}>Volver</Button>
      </div>
    );
  }

  return (
    <div className="container mt-4" id="nota-credito">
      <h2 className="text-center mb-4">NOTA DE CRÉDITO</h2>

      {/* ✅ CAMBIO: Mostrar el número práctico de NC generado */}
      <h3 className="text-primary mb-3 text-center">N° NC: {numeroNotaCredito}</h3>
      <p className="text-center text-muted">ID Interno: {idNotaCredito}</p>
      
      <hr />

      <p><b>Venta original:</b> {ventaOriginal.ticketId || ventaOriginal.id}</p>
      {/* Nota: Usamos la fecha de la venta original, que puede ser un objeto Timestamp */}
      <p><b>Fecha de venta:</b> {ventaOriginal.fecha?.toDate ? ventaOriginal.fecha.toDate().toLocaleDateString("es-AR") : "N/A"}</p>
      <p><b>Vendedor:</b> {ventaOriginal.vendedor?.nombre}</p>

      <hr />

      <Table bordered size="sm">
        <thead>
          <tr>
            <th>Producto</th>
            <th>Cant.</th>
            <th>Precio Final Unit.</th>
            <th>Subtotal</th>
          </tr>
        </thead>
        <tbody>
          {itemsDevueltos.map((p, index) => (
            <tr key={index}>
              <td>{p.nombre}</td>
              <td>{p.cantidad}</td>
              <td>${p.precioFinalUnitario.toFixed(2)}</td>
              <td>${p.subtotal.toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </Table>

      <h4 className="text-end mt-3">
        TOTAL NOTA DE CRÉDITO: ${totalDevuelto.toFixed(2)}
      </h4>

      <div className="d-flex justify-content-between mt-4">
        <Button variant="secondary" onClick={() => navigate(-1)}>
          Volver
        </Button>

        <Button variant="primary" onClick={() => window.print()}>
          Imprimir
        </Button>
      </div>
    </div>
  );
};

export default NotaCreditoPrint;