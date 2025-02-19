import React, { useEffect, useState } from 'react';
import { getUsuariosById } from '../../services/api';
import "../../styles/info.css";
import { useParams } from 'react-router-dom';
import AssignedProjects from './listaProyectos';
const defaultProfileImage = 'https://via.placeholder.com/130';

const UserProfile = () => {
  const [usuario, setUsuario] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { id } = useParams();

  useEffect(() => {
    const fetchUsuario = async () => {
      try {
        const data = await getUsuariosById(id);
        setUsuario(data);
        setLoading(false);
      } catch (error) {
        setError('Error al obtener los datos del usuario');
        setLoading(false);
      }
    };
    fetchUsuario();
  }, [id]);

  if (loading) return <div className="loading">Cargando...</div>;
  if (error) return <div className="error">{error}</div>;

  return (
    <div className="user-profile-container">
      <h1 className="user-profile-title">Información Personal</h1>

      <hr className="divider" />

      {/* Información Básica */}
      <div className="profile-section">
        <div className="photo-item">
          <img src={usuario?.user_photo || defaultProfileImage} alt="User Profile" className="profile-image" />
          <span className="info-label">Imagen de perfil</span>
        </div>
        <div className="section-title">Información básica</div>
        <div className="info-item">
          <span className="info-label">Nombre</span>
          <span className="info-value">{`${usuario?.first_name} ${usuario?.last_name}` || 'N/A'}</span>
        </div>
        <hr className='hr-divider-profile'/>
        <div className="info-item">
          <span className="info-label">Número de Cédula</span>
          <span className="info-value">{usuario?.cedula || 'N/A'}</span>
        </div>
        <hr />
        <div className="info-item">
          <span className="info-label">Fecha de Nacimiento</span>
          <span className="info-value">{usuario?.birthday || 'N/A'}</span>
        </div>
        <hr />
      </div>

      <hr className="divider" />

      {/* Contacto */}
      <div className="profile-section">
        <div className="section-title">Información de contacto</div>
        <div className="info-item">
          <span className="info-label">Correo Electrónico</span>
          <span className="info-value">{usuario?.email || 'N/A'}</span>
        </div>
        <hr />
        <div className="info-item">
          <span className="info-label">Número de Teléfono</span>
          <span className="info-value">{usuario?.phone_number || 'N/A'}</span>
        </div>
        <hr />
      </div>

      <hr className="divider" />

      {/* Trabajo */}
      <div className="profile-section">
        <div className="section-title">Información laboral</div>
        <div className="info-item">
          <span className="info-label">Puesto</span>
          <span className="info-value">{usuario?.puesto || 'N/A'}</span>
        </div>
        <hr />
      </div>

      <hr className="divider" />


      <div className="profile-section">
        <div className="section-title">Proyectos asignados</div>
        <div className="projects-item">
          <AssignedProjects/>
        </div>
      </div>
    </div>
  );
};

export default UserProfile;
