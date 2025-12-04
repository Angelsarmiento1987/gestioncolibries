import React from 'react';
import Button from 'react-bootstrap/Button';
import Container from 'react-bootstrap/Container';
import Form from 'react-bootstrap/Form';
import Nav from 'react-bootstrap/Nav';
import Navbar from 'react-bootstrap/Navbar';
import NavDropdown from 'react-bootstrap/NavDropdown';
import Offcanvas from 'react-bootstrap/Offcanvas';
import { Link, useNavigate, useLocation } from "react-router-dom";
import { signOut } from "firebase/auth";
import { auth } from "../../Database/Database";
import VendedorSelector from '../VendedorSelector/VendedorSelector';


import "./NavBarDashboard.css";
import "../NavBarDashboard/NavBarDashboard.css";

const NavBarDashboard = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const role = localStorage.getItem("role");

  const isVentasPage = location.pathname === "/ventas"; // ← SOLO VENTAS

  const handleLogout = async () => {
    try {
      await signOut(auth);
      localStorage.removeItem("role");
      localStorage.removeItem("vendedorActivo"); // Limpia vendedor al salir
      navigate("/login");
    } catch (error) {
      console.error("Error al cerrar sesión:", error);
    }
  };

  return (
    <>
      {[false].map((expand) => (
        <Navbar key={expand} expand={expand} className="dashboard-navbar mb-3">
          <Container fluid>
             
            <Navbar.Brand className="dashboard-brand">Gestión Colibríes</Navbar.Brand>

            {/* MOSTRAR SELECTOR SOLO EN /ventas */}
            {isVentasPage && (
              <div style={{ width: "200px", marginRight: "10px" }}>
                <VendedorSelector />
              </div>
            )}

            <Navbar.Toggle aria-controls={`offcanvasNavbar-expand-${expand}`} />

            <Navbar.Offcanvas
              id={`offcanvasNavbar-expand-${expand}`}
              aria-labelledby={`offcanvasNavbarLabel-expand-${expand}`}
              placement="end"
              className="dashboard-offcanvas"
            >
              <Offcanvas.Header closeButton className="dashboard-offcanvas-header">
                <Offcanvas.Title className="dashboard-offcanvas-title">
                  Menú
                </Offcanvas.Title>
              </Offcanvas.Header>

              <Offcanvas.Body className="dashboard-offcanvas-body">
                <Nav className="justify-content-end flex-grow-1 pe-3 dashboard-nav">

                  {/* SOLO ADMINISTRADOR */}
                  {role === "administrador" && (
                    <>
                      <Nav.Link as={Link} to="/verProductos" className="dashboard-link">
                        Ver/Editar Productos
                      </Nav.Link>

                      <Nav.Link as={Link} to="/cargarProductos" className="dashboard-link">
                        Cargar Productos
                      </Nav.Link>

                        <Nav.Link as={Link} to="/reposicion" className="dashboard-link">
                        Reposición de productos
                      </Nav.Link>


                      <Nav.Link as={Link} to="/altaVendedores" className="dashboard-link">
                        Alta de Vendedores
                      </Nav.Link>

                        <Nav.Link as={Link} to="/gastosManager" className="dashboard-link">
                        Gastos Manager
                      </Nav.Link>

                      <Nav.Link as={Link} to="/estadisticasGenerales" className="dashboard-link">
                        Estadisticas Generales
                      </Nav.Link>
                      <Nav.Link as={Link} to="/reporteDevoluciones" className="dashboard-link">
                        Reporte Devoluciones
                      </Nav.Link>

                      <NavDropdown
                    title="Descargas"
                    id={`offcanvasNavbarDropdown-expand-${expand}`}
                    className="dashboard-dropdown"
                  >
                    <NavDropdown.Item className="dashboard-dropdown-item">
                   <Nav.Link as={Link} to="/descargarExcelCarga" className="dashboard-link">
                        Descargar Excel Productos
                      </Nav.Link>
                    </NavDropdown.Item>
                   
                    <NavDropdown.Divider />
                   
                  </NavDropdown>

                    <NavDropdown.Divider 
                          className="my-2" 
                          style={{ 
                              backgroundColor: 'black', 
                              height: '1px',           
                              opacity: 1               
                          }} 
                      />


                     
                    </>
                  )}

                  
                  {/* COMPARTIDOS (Empleado + Admin) */}
                  <Nav.Link as={Link} to="/ventas" className="dashboard-link">
                    Ventas
                  </Nav.Link>

                  <Nav.Link as={Link} to="/ventasDelDia" className="dashboard-link">
                    Ventas del día
                  </Nav.Link>
                   <Nav.Link as={Link} to="/listadoNotasCredito" className="dashboard-link">
                    Listado Notas Credito
                  </Nav.Link>

                  
                  {/* LOGOUT */}
                  <Button variant="danger" className="mt-3" onClick={handleLogout}>
                    Cerrar sesión
                  </Button>
                </Nav>

          
              </Offcanvas.Body>
            </Navbar.Offcanvas>
          </Container>
        </Navbar>
      ))}
    </>
  );
};

export { NavBarDashboard };
