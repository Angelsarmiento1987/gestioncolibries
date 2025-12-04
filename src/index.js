import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import 'bootstrap/dist/css/bootstrap.min.css';


import { HashRouter as Router, Routes, Route } from "react-router-dom";

import { CargarProductos } from './Views/Dashboard/CargarProductos/CargarProductos';
import { VerEditarProductos } from './Views/Dashboard/VerEditarProductos/VerEditarProductos';
import { CargarProductosExcel } from './Views/Dashboard/CargarProductosExcel/CargarProductosExcel';
import { Ventas } from './Views/Ventas/Ventas';
import { ReporteVentas } from './Views/Ventas/ReporteVentas';
import { Home } from './Views/Home/Home';
import { VentasDelDia } from './Views/Ventas/VentasDelDia';
import Login from './Views/Login/Login';
import AltaVendedores from './Views/Dashboard/AltaVendedores/AltaVendedores';
import GastosManager from './Views/Dashboard/GastosManager/GastosManager';
import EstadisticasGenerales from './Views/Dashboard/EstadisticasGenerales/EstadisticasGenerales';
import { Devoluciones } from './Views/Ventas/Devoluciones';
import NotaCreditoPrint from './Views/Ventas/NotaCreditoPrint';
import { ListadoNotasCredito } from './Views/Ventas/ListadoNotasCredito/ListadoNotasCredito';
import { ReporteDevoluciones } from './Views/Ventas/ReporteDevoluciones';
import Reposicion from './Views/Dashboard/Reposicion/Reposicion';
import { DescargarTemplateExcel } from './Views/Dashboard/DescargarTemplateExcel/DescargarTemplateExcel';

import ProtectedRoute from "./Routes/ProtectedRoute"; //al envolver las rutas solo me deja entrar si estoy logueado

const root = ReactDOM.createRoot(document.getElementById('root'));

root.render(
  <React.StrictMode>
    <Router>
      <Routes>

        {/* RUTA PUBLICA */}

         <Route path="/" element={
       
            <Home />
    
        } />


        <Route path="/login" element={<Login />} />

        {/* RUTAS PROTEGIDAS */}
       

        <Route path="/verProductos" element={
          <ProtectedRoute roles={["administrador"]}>
            <VerEditarProductos />
          </ProtectedRoute>
        } />

         <Route path="/altaVendedores" element={
          <ProtectedRoute roles={["administrador"]}>
            <AltaVendedores />
          </ProtectedRoute>
        } />

        <Route path="/cargarProductos" element={
          <ProtectedRoute roles={["administrador"]}>
            <CargarProductosExcel />
          </ProtectedRoute>
        } />

        <Route path="/ventas" element={
          <ProtectedRoute roles={["administrador","empleado"]}>
            <Ventas />
          </ProtectedRoute>
        } />

        <Route path="/ventasDelDia" element={
          <ProtectedRoute roles={["administrador","empleado"]}>
            <VentasDelDia />
          </ProtectedRoute>
        } />

        <Route path="/reporteVentas" element={
          <ProtectedRoute roles={["administrador"]}>
            <ReporteVentas />
          </ProtectedRoute>
        } />

        <Route path="/gastosManager" element={
          <ProtectedRoute roles={["administrador"]}>
            <GastosManager />
          </ProtectedRoute>
        } />

         <Route path="/estadisticasGenerales" element={
          <ProtectedRoute roles={["administrador"]}>
            <EstadisticasGenerales />
          </ProtectedRoute>
        } />

        <Route path="/devoluciones" element={
          <ProtectedRoute roles={["administrador","empleado"]}>
            <Devoluciones/>
          </ProtectedRoute>
        } />

        <Route path="/imprimir-nota-credito" element={
          <ProtectedRoute roles={["administrador","empleado"]}>
            <NotaCreditoPrint/>
          </ProtectedRoute>
        } />

        <Route path="/listadoNotasCredito" element={
          <ProtectedRoute roles={["administrador","empleado"]}>
            <ListadoNotasCredito/>
          </ProtectedRoute>
        } />

         <Route path="/reporteDevoluciones" element={
          <ProtectedRoute roles={["administrador"]}>
            <ReporteDevoluciones/>
          </ProtectedRoute>
        } />

          <Route path="/reposicion" element={
          <ProtectedRoute roles={["administrador"]}>
            <Reposicion/>
          </ProtectedRoute>
        } />
         <Route path="/descargarExcelCarga" element={
          <ProtectedRoute roles={["administrador"]}>
            <DescargarTemplateExcel/>
          </ProtectedRoute>
        } />

      </Routes>
    </Router>
  </React.StrictMode>
);
