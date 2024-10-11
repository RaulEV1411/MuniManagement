import React, { useState } from 'react';
import { login } from '../../services/api'; // Importamos el método desde api.js
import styles from '../../styles/LoginForm.module.css'; // Importación de CSS Module
import { useNavigate } from 'react-router-dom';
import logo from '/src/assets/Logo Circular Blanco (Fondo Transparente).png';

const LoginForm = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      await login(email, password);
      setError(null);
      alert('Login exitoso!');
      navigate('/home');
    } catch (error) {
      setError('Credenciales inválidas. Por favor, inténtelo de nuevo.');
    }
  };

  return (
    <div className={styles['login-container']}>
      <div className={styles['login-card']}>
        <div className={styles['login-header']}>
          <img src={logo} alt="Puntarenas Costa Rica" className={styles['login-logo']} />
        </div>
        <form onSubmit={handleSubmit}>
          <div className={styles['coolinput']}>
            <label htmlFor="email" className={styles['text']}>Usuario:</label>
            <input 
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              id="email"
              name="email"
              placeholder="Usuario"
              className={styles['input']}
            />
          </div>
          <div className={styles['coolinput']}>
            <label htmlFor="password" className={styles['text']}>Contraseña:</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="Contraseña"
              className={styles['input']}
              id="password"
            />
          </div>
          <button type="submit" className={styles['login-button']}>Entrar</button>
        </form>
        {error && <p className={styles['login-error']}>{error}</p>}
      </div>
    </div>
  );
};

export default LoginForm;
