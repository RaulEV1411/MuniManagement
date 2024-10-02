import React, { useState } from 'react';
import { login } from '../../services/api'; // Importamos el método desde api.js
import "../../styles/LoginForm.css";
import logo from '/src/assets/Logo Circular Blanco (Fondo Transparente).png';

const LoginForm = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      // Intentamos hacer login con los datos proporcionados
      await login(email, password);
      setError(null);
      alert('Login exitoso!');
      // Aquí puedes redirigir al usuario a otra página o mostrar el contenido protegido
    } catch (error) {
      setError('Credenciales inválidas. Por favor, inténtelo de nuevo.');
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <img src={logo} alt="Puntarenas Costa Rica" className="login-logo" />
        </div>
        <form onSubmit={handleSubmit}>
          <div className="coolinput">
            <label htmlFor="email" className="text">Usuario:</label>
            <input 
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              id="email"
              name="email"
              placeholder="Usuario"
              className="input"
            />
          </div>
          <div className="coolinput">
            <label htmlFor="password" className="text">Contraseña:</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="Contraseña"
              className="input"
              id="password"
            />
          </div>
          <button type="submit" className="login-button">Entrar</button>
        </form>
        {error && <p className="login-error">{error}</p>}
      </div>
    </div>
  );
};

export default LoginForm;
