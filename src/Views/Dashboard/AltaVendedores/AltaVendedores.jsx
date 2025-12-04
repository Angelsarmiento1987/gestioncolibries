

import React, { useEffect, useState } from "react";
import { Form, Button, Table, Container, Row, Col, Badge } from "react-bootstrap";
import { collection, addDoc, getDocs, updateDoc, doc } from "firebase/firestore";
import { FIRESTORE_DB } from "../../../Database/Database"
import { NavBarDashboard } from "../../../Components/NavBarDashboard/NavBarDashboard";
import { FooterDashboard } from "../../../Components/FooterDashboard/FooterDashboard";
import '../AltaVendedores/AltaVendedores.css'

const AltaVendedores = () => {
  const [nombre, setNombre] = useState("");
  const [vendedores, setVendedores] = useState([]);

  // 🔥 Cargar vendedores al inicio
  const getVendedores = async () => {
    const querySnapshot = await getDocs(collection(FIRESTORE_DB, "vendedores"));
    const data = querySnapshot.docs.map((d) => ({
      id: d.id,
      ...d.data(),
    }));
    setVendedores(data);
  };

  useEffect(() => {
    getVendedores();
  }, []);

  // ➕ Agregar vendedor
  const handleAddVendedor = async (e) => {
    e.preventDefault();
    if (!nombre.trim()) return;

    await addDoc(collection(FIRESTORE_DB, "vendedores"), {
      nombre,
      estadoLaboral: "activo", // por defecto
      creado: new Date(),
    });

    setNombre("");
    getVendedores();
  };

  // 🔄 Cambiar estado laboral
  const toggleEstado = async (id, estadoActual) => {
    const ref = doc(FIRESTORE_DB, "vendedores", id);
    await updateDoc(ref, {
      estadoLaboral: estadoActual === "activo" ? "inactivo" : "activo",
    });

    getVendedores();
  };

  return (

    <>

    <NavBarDashboard/>
    
     <Container className="mt-4 contVendedores" >
      <h2>Administración de Vendedores</h2>

      {/* FORMULARIO ALTA */}
      <Row className="mt-4">
        <Col md={6}>
          <Form onSubmit={handleAddVendedor}>
            <Form.Group>
              <Form.Label>Nombre del vendedor</Form.Label>
              <Form.Control
                type="text"
                placeholder="Ej: Claudia"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
              />
            </Form.Group>

            <Button variant="primary" type="submit" className="mt-2">
              Agregar vendedor
            </Button>
          </Form>
        </Col>
      </Row>

      {/* LISTADO */}
      <Row className="mt-5">
        <Col md={10}>
          <h4>Listado de Vendedores</h4>
          <Table striped bordered hover>
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Estado</th>
                <th>Acción</th>
              </tr>
            </thead>

            <tbody>
              {vendedores.map((v) => (
                <tr key={v.id}>
                  <td>{v.nombre}</td>

                  <td>
                    {v.estadoLaboral === "activo" ? (
                      <Badge bg="success">Activo</Badge>
                    ) : (
                      <Badge bg="secondary">Inactivo</Badge>
                    )}
                  </td>

                  <td>
                    <Button
                      variant={v.estadoLaboral === "activo" ? "warning" : "success"}
                      size="sm"
                      onClick={() => toggleEstado(v.id, v.estadoLaboral)}
                    >
                      {v.estadoLaboral === "activo" ? "Inactivar" : "Activar"}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>

          </Table>
        </Col>
      </Row>
    </Container>
    
    
    <FooterDashboard/>
    
    </>
   
  );
};

export default AltaVendedores;
