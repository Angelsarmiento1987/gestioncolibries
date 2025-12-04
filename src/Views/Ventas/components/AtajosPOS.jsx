

import React, { useEffect } from "react";

/**
 * Props:
 * - refs / handlers for focusBuscar, finalizarVenta, limpiar
 * We'll accept handlers.
 */
export const AtajosPOS = ({ onFocusBuscar, onFinalizarVenta, onLimpiar }) => {
  useEffect(() => {
    const handler = (e) => {
      if (e.key === "F4") {
        e.preventDefault();
        onFocusBuscar && onFocusBuscar();
      }
      if (e.key === "F2") {
        e.preventDefault();
        onFinalizarVenta && onFinalizarVenta();
      }
      if (e.key === "Escape") {
        e.preventDefault();
        onLimpiar && onLimpiar();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onFocusBuscar, onFinalizarVenta, onLimpiar]);

  return null;
};
