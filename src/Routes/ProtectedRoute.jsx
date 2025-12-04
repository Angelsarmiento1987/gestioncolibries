import React from "react";
import { Navigate } from "react-router-dom";
import { auth } from "../Database/Database";

const ProtectedRoute = ({ children, roles }) => {
  const user = auth.currentUser;

  // Si no está logueado → fuera
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Traer rol guardado en el login
  const userRole = localStorage.getItem("role");

  // Si la ruta requiere roles específicos y el usuario no tiene permiso
  if (roles && !roles.includes(userRole)) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

export default ProtectedRoute;

//con esta forma puedo restringir quien entra a determinada vista de mi app, para eso tuve q crear los usuarios en firebase y ademas tuve q crear una coleccion donde cada usuario tiene su email y su rol luego todo eso se va a colocar en el index js para saber a q ruta/vista de la app le corresponde cada rol creado. no obstante la idea es q cada rol tenga su propio navbar ya q a pesar de q las rutas no se van a mostrar si acceden por url si se muestran los nombres en el nav cosa q no queremos tampoco.