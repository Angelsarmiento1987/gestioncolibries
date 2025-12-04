import React, { useState } from 'react';
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth, FIRESTORE_DB } from "../../Database/Database";
import { doc, getDoc } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import "./Login.css";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      console.log("Login exitoso!");

      // 📌 Obtener rol del usuario desde Firestore
      const userRef = doc(FIRESTORE_DB, "users", user.uid);
      const userSnap = await getDoc(userRef);

      console.log("UID:", user.uid);
console.log("Documento encontrado:", userSnap.data());

      

      if (userSnap.exists()) {
        const { role } = userSnap.data();

        if (!role) {
          setError("Este usuario no tiene un rol asignado");
          return;
        }

        // Guardar rol para usar en rutas protegidas
        localStorage.setItem("role", role);

        // 📌 Redirigir según rol
        if (role === "administrador") {
          navigate("/verProductos");
        } else if (role === "empleado") {
          navigate("/ventas");
        } else {
          setError("Rol desconocido");
        }

      } else {
        setError("El usuario no tiene un documento en Firestore");
      }

    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="login-container">
      <h2>Iniciar sesión</h2>

      <form onSubmit={handleLogin} className="login-form">

        <input
          type="email"
          placeholder="Correo electrónico"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <input
          type="password"
          placeholder="Contraseña"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        {error && <p className="login-error">{error}</p>}

        <button type="submit" className="btn-login">
          Ingresar
        </button>
      </form>
    </div>
  );
};

export default Login;
