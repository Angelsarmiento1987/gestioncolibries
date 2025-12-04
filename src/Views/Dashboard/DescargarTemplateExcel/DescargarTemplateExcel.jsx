

import React from 'react';
import * as XLSX from 'xlsx';
import { Button, Alert } from 'react-bootstrap';
import { FaDownload, FaFileExcel } from 'react-icons/fa';

/**
 * Componente para descargar el template de Excel de carga de productos.
 * Genera un archivo XLSX con los encabezados requeridos para CargarProductosExcel.jsx.
 */
const DescargarTemplateExcel = () => {
    
    // ----------------------------------------------------
    // 1. DEFINICIÓN DE ENCABEZADOS REQUERIDOS
    // ----------------------------------------------------
    const headers = [
        "codigoProducto",
        "nombreProducto",
        "categoria",
        "stock",
        "precioCosto",
        "multiplicador",
        "proveedor",
        "descripcion",
        // Campos opcionales que tu sistema soporta.
        // Asegúrate de que estos nombres coincidan con cómo los procesa tu lógica.
    ];

    const dataSheet = [
        // Fila de ejemplo 1 (para ilustrar el formato)
        ["COD001", "Botella de Agua 500ml", "Bebidas", 100, 1500, 1.5, "Distribuidora A", "Botella de plástico sin gas"],
        // Fila de ejemplo 2
        ["COD002", "Alfajor Triple Chocolate", "Snacks", 50, 800, 1.8, "Fábrica B", "Alfajor grande de chocolate"],
        // Deja una fila en blanco para que el usuario pueda empezar a escribir
        [],
    ];

    const generateExcel = () => {
        try {
            // 1. Crear la hoja de cálculo
            const ws = XLSX.utils.aoa_to_sheet([headers, ...dataSheet]);
            
            // 2. Aplicar estilos y anchos a las columnas (opcional, pero ayuda a la presentación)
            const wscols = [
                { wch: 15 }, // codigoProducto
                { wch: 30 }, // nombreProducto
                { wch: 15 }, // categoria
                { wch: 8 },  // stock
                { wch: 15 }, // precioCosto
                { wch: 15 }, // multiplicador
                { wch: 20 }, // proveedor
                { wch: 35 }, // descripcion
            ];
            ws['!cols'] = wscols;

            // 3. Crear el libro de trabajo
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "Productos");

            // 4. Escribir y descargar el archivo
            XLSX.writeFile(wb, "Template_Carga_Productos.xlsx");

        } catch (error) {
            console.error("Error al generar el archivo Excel:", error);
            alert("Hubo un error al generar el archivo. Asegúrate de tener la librería XLSX instalada.");
        }
    };

    return (
        <Alert variant="info" className="d-flex align-items-center justify-content-between p-3 shadow-sm">
            <div>
                <FaFileExcel className="me-2 fs-4" />
                <span className="fw-bold">Descarga el Template para la Carga Masiva:</span>
                <p className="mb-0 small text-muted">Utiliza este archivo para asegurar que los encabezados son correctos.</p>
            </div>
            
            <Button 
                variant="success" 
                onClick={generateExcel}
                className="fw-bold shadow-sm"
            >
                <FaDownload className="me-2" />
                Descargar Template
            </Button>
        </Alert>
    );
};

export { DescargarTemplateExcel };