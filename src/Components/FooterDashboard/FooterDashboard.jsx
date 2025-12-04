import React from 'react';
import { Navbar, Container } from 'react-bootstrap';
import { FaCode } from 'react-icons/fa';
// Asumo que tu ruta de importación de logo es correcta:
// import logo from '../../Img/logo.png' 

/**
 * Componente de Pie de Página fijo para el Dashboard.
 * Muestra el nombre de la gestión y la atribución de desarrollo.
 */
const FooterDashboard = ({ logo }) => {
    
    // ----------------------------------------------------
    // CONSTANTES DE VERSIÓN Y COPYRIGHT
    // ----------------------------------------------------
    const VERSION = "1.0.0"; // ⬅️ Puedes cambiar la versión aquí
    const currentYear = new Date().getFullYear(); // Obtiene el año actual automáticamente

    // Definimos el estilo inline para asegurar que se ancla abajo y es discreto.
    const footerStyle = {
        width: '100%',
        height: '40px',
        backgroundColor: '#202B38',
        borderTop: '1px solid #202B38',
        padding: '0 15px',
   
        bottom: 0,
        left: 0,
        zIndex: 1000, 
        display: 'flex',
        alignItems: 'center',
        fontSize: '0.8rem',
        color: '#f8f9fa' 
    };

    return (
        <Navbar style={footerStyle} data-bs-theme="dark"> 
            <Container fluid className="d-flex justify-content-between align-items-center">
                
                {/* Lado Izquierdo: Título principal, Versión y Copyright */}
                <div className="d-flex align-items-center">
                    
                    {/* Opción para logo si lo necesitas:
                    <img src={logo} alt="Logo" style={{ height: '30px', marginRight: '30px' }}/>
                    */}
                    
                    <strong className="text-light me-3">Gestión COLIBRIES</strong>
                    
                    {/* AÑADIDO: Versión y Año */}
                    <span className="text-muted small">
                        v{VERSION} | &copy; {currentYear}
                    </span>
                    
                </div>

                {/* Lado Derecho: Atribución */}
                <div className="text-end">
                    <span className="me-2 text-light">Desarrollado y mantenido por</span>
                    <a 
                        href="https://www.websinvueltas.com.ar" 
                        target="_blank"
                        rel="noopener noreferrer" // 🔒 Seguridad
                        className="text-decoration-none" // Para quitar el subrayado si lo tiene por defecto
                    >
                        <strong className="text-info">
                             <FaCode className="me-1" />Web sin Vueltas
                        </strong>
                    </a>
                </div>

            </Container>
        </Navbar>
    );
};

export { FooterDashboard };