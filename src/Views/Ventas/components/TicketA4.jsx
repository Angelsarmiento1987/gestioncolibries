import React from "react";
import { formatARS } from "../helpers/formatearDinero";

/**
 * TicketA4: component that returns printable HTML.
 */
export const TicketA4 = ({ venta }) => {
  // venta: { ticketId, fecha, productos: [{nombre, cantidad, precioUnitario, subtotal}], totalSinDescuento, descuentoAplicado, promoDescuento, motivoPromo, totalFinal, cliente, metodoPago }

  const html = `
  <html>
    <head>
      <title>Ticket ${venta.ticketId}</title>
      <style>
        body { font-family: Arial, sans-serif; color: #222; padding: 20px; }
        .header { text-align: center; margin-bottom: 12px; }
        .header h2 { margin: 0; color: #0d47a1; }
        table { width: 100%; border-collapse: collapse; margin-top: 10px; }
        th, td { padding: 6px 4px; border-bottom: 1px solid #ddd; font-size: 14px; }
        .right { text-align: right; }
        .totals { margin-top: 12px; font-size: 16px; }
      </style>
    </head>
    <body>
      <div class="header">
        <h2>Tienda Colibries</h2>
        <div>Ticket: ${venta.ticketId}</div>
        <div>${new Date(venta.fecha.seconds ? venta.fecha.toDate() : venta.fecha).toLocaleString()}</div>
      </div>

      <table>
        <thead>
          <tr><th>Producto</th><th class="right">Cant</th><th class="right">Precio</th><th class="right">Subtotal</th></tr>
        </thead>
        <tbody>
          ${venta.productos.map(it => `<tr>
            <td>${it.nombre}</td>
            <td class="right">${it.cantidad}</td>
            <td class="right">ARS ${it.precioUnitario}</td>
            <td class="right">ARS ${it.subtotal}</td>
          </tr>`).join("")}
        </tbody>
      </table>

      <div class="totals">
        <div style="display:flex;justify-content:space-between"><div>Subtotal:</div><div>ARS ${venta.totalSinDescuento}</div></div>
        <div style="display:flex;justify-content:space-between"><div>Descuento por Nota de Credito:</div><div>ARS - ${venta.montoCreditoUsado}</div></div>
        ${venta.descuentoAplicado > 0 ? `<div style="display:flex;justify-content:space-between"><div>Desc. efectivo:</div><div>ARS ${venta.descuentoAplicado}</div></div>` : ""}
        ${venta.promoDescuento > 0 ? `<div style="display:flex;justify-content:space-between"><div>Promo (${venta.promoDescuento}%):</div><div>${venta.motivoPromo || ""}</div></div>` : ""}
        <div style="display:flex;justify-content:space-between;font-weight:700"><div>Total:</div><div>ARS ${venta.totalFinal}</div></div>
        <div style="margin-top:10px">Método de pago: ${venta.metodoPago}</div>
        <div>Cliente: ${venta.cliente || "-"}</div>
      </div>
    </body>
  </html>
  `;

  const print = () => {
    const w = window.open("", "_blank", "width=800,height=900");
    if (!w) return alert("Permitir popups para imprimir el ticket");
    w.document.open();
    w.document.write(html);
    w.document.close();
    w.focus();
    w.print();
  };

  return (
    <button className="btn btn-outline-primary" onClick={print}>
      Imprimir A4
    </button>
  );
};
