import React, { useState, useEffect } from "react";
import { Form, Row, Col } from "react-bootstrap";
import { formatARS } from "../helpers/formatearDinero";

export const MetodoPago = ({
  metodoPago,
  setMetodoPago,
  cliente,
  setCliente,
  estado,
  setEstado,
  totalSinDescuento,
  descuentoAplicado,
  setDescuentoAplicado,
  promoDescuento,
  setPromoDescuento,
  motivoPromo,
  setMotivoPromo
}) => {

  // Controla si el descuento por efectivo es 10% o 0%
  const [efectivoDiscountPercentage, setEfectivoDiscountPercentage] = useState(10);

  useEffect(() => {
    if (metodoPago === "efectivo") {
      const discountPercent = efectivoDiscountPercentage / 100;
      const disc = Math.round(totalSinDescuento * discountPercent);
      setDescuentoAplicado(disc);
    } else {
      setDescuentoAplicado(0);

      // Opcional: si cambian a otro método, resetea a 10%
      if (efectivoDiscountPercentage !== 10) {
        setEfectivoDiscountPercentage(10);
      }
    }
  }, [
    metodoPago,
    totalSinDescuento,
    setDescuentoAplicado,
    efectivoDiscountPercentage
  ]);

  const totalFinal = Math.max(
    0,
    totalSinDescuento -
      (descuentoAplicado || 0) -
      Math.round(totalSinDescuento * ((promoDescuento || 0) / 100))
  );

  return (
    <div>
      <Row className="g-2">

        {/* MÉTODO DE PAGO */}
        <Col md={6}>
          <Form.Group>
            <Form.Label className="small text-muted">Método de pago</Form.Label>
            <Form.Select
              value={metodoPago}
              onChange={(e) => setMetodoPago(e.target.value)}
            >
              <option value="efectivo">Efectivo</option>
              <option value="tarjeta">Tarjeta</option>
              <option value="transferencia">Transferencia</option>
              <option value="mercadopago">MercadoPago</option>
              <option value="modo">MODO</option>
            </Form.Select>
          </Form.Group>
        </Col>

        

        {/* SELECTOR DE DESCUENTO POR EFECTIVO */}
        {metodoPago === "efectivo" && (
          <Col md={12} className="mt-2">
            <Form.Group>
              <Form.Label className="small text-muted fw-bold">
                Descuento por Efectivo
              </Form.Label>
              <Form.Select
                value={efectivoDiscountPercentage}
                onChange={(e) =>
                  setEfectivoDiscountPercentage(Number(e.target.value))
                }
              >
                <option value={10}>
                  Aplicar 10% ( {formatARS(Math.round(totalSinDescuento * 0.10))} )
                </option>
                <option value={0}>No aplicar 10% (0% descuento)</option>
              </Form.Select>
            </Form.Group>
          </Col>
        )}

        {/* CLIENTE */}
        <Col md={8} className="mt-2">
          <Form.Group>
            <Form.Label className="small text-muted">Cliente (opcional)</Form.Label>
            <Form.Control
              value={cliente}
              onChange={(e) => setCliente(e.target.value)}
              placeholder="Nombre del cliente"
            />
          </Form.Group>
        </Col>

        {/* TOTAL FINAL */}
        <Col md={4} className="mt-2">
          <div className="p-2 border rounded bg-white h-100">
            <div className="small text-muted">Total final</div>
            <div className="fw-bold" style={{ fontSize: 18 }}>
              {formatARS(totalFinal)}
            </div>

            {/* Info de descuentos */}
            {descuentoAplicado > 0 && (
              <div className="small text-muted">
                Desc. efectivo: {formatARS(descuentoAplicado)} ({efectivoDiscountPercentage}%)
              </div>
            )}

            {promoDescuento > 0 && (
              <div className="small text-muted">Promo: {promoDescuento}%</div>
            )}
          </div>
        </Col>

        {/* DESCUENTO PROMO (%) */}
        <Col md={6} className="mt-2">
          <Form.Group>
            <Form.Label className="small">Descuento promoción (%)</Form.Label>
            <Form.Control
              type="number"
              value={promoDescuento}
              onChange={(e) => {
                let val = Number(e.target.value);
                if (val < 0) val = 0;
                if (val > 100) val = 100;
                setPromoDescuento(val);
              }}
              placeholder="0"
            />
          </Form.Group>
        </Col>

        {/* MOTIVO PROMO */}
        <Col md={6} className="mt-2">
          <Form.Group>
            <Form.Label className="small">Motivo</Form.Label>
            <Form.Control
              type="text"
              value={motivoPromo}
              onChange={(e) => setMotivoPromo(e.target.value)}
              placeholder="Ej: falla en producto"
            />
          </Form.Group>
        </Col>
      </Row>
    </div>
  );
};
