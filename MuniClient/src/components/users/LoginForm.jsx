import React, { useState } from 'react';
import { login } from '../../services/api';  // Importamos el método desde api.js

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
    <div>
      <h2>Login</h2>
      <form onSubmit={handleSubmit}>
        <div>
          <label>Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            id="email"
            name="email"
            placeholder="Ingresa tu email"
          />
        </div>
        <div>
          <label>Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        <button type="submit">Login</button>
      </form>
      {error && <p style={{ color: 'red' }}>{error}</p>}
    </div>
  );
};

export default LoginForm;
