import React, { useEffect, useState } from 'react';
import { getUsuariosById, updateUsuario, deleteUsuario } from '../../services/api';
import { getCookie } from '../../services/read_cookie';
import "../../styles/info.css";
import { useNavigate } from 'react-router-dom';
import { jwtDecode } from "jwt-decode";
import Swal from 'sweetalert2'; // Import SweetAlert2

const defaultProfileImage = 'https://via.placeholder.com/100';

const UserProfile = () => {
  const [usuario, setUsuario] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [updatedUser, setUpdatedUser] = useState({});
  const token = getCookie('accessToken');
  const decoded = token ? jwtDecode(token) : null;
  const userID = decoded?.user_ID;
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUsuario = async () => {
      try {
        const data = await getUsuariosById(userID);
        setUsuario(data);
        setUpdatedUser(data); // Inicializamos el estado de edición con los datos actuales
        setLoading(false);
      } catch (error) {
        setError('Error al obtener los datos del usuario');
        setLoading(false);
      }
    };

    fetchUsuario();
  }, [userID]);

  const handleEditClick = () => {
    setIsEditing(true);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setUpdatedUser((prevData) => ({
      ...prevData,
      [name]: value,
    }));
  };

  const handleSaveClick = async () => {
    try {
      await updateUsuario(userID, updatedUser);
      setUsuario(updatedUser); // Actualiza el estado del usuario con los datos editados
      setIsEditing(false);
      Swal.fire({
        icon: 'success',
        title: 'Datos actualizados',
        text: 'Los datos se han actualizado exitosamente.',
      });
    } catch (error) {
      console.error('Error al actualizar el usuario:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Error al actualizar los datos.',
      });
    }
  };

  const handleDeleteClick = async () => {
    const result = await Swal.fire({
      title: '¿Estás seguro?',
      text: 'Esta acción no se puede deshacer.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
    });

    if (result.isConfirmed) {
      try {
        await deleteUsuario(userID);
        Swal.fire({
          icon: 'success',
          title: 'Usuario eliminado',
          text: 'Tu cuenta ha sido eliminada exitosamente.',
        });
        navigate('/login'); // Redirige a la página de inicio de sesión o a donde desees
      } catch (error) {
        console.error('Error al eliminar el usuario:', error);
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: 'Error al eliminar el usuario.',
        });
      }
    }
  };

  if (loading) return <div>Cargando...</div>;
  if (error) return <div>{error}</div>;

  return (
    <div className="user-profile-container">
      <div className="profile-header">
        <h2 className="user-profile-title">Information</h2>
      </div>
      <div className='container_img_info_user_profile'>
        <img 
          src={usuario?.user_photo || defaultProfileImage} 
          alt="User Profile" 
          className="profile-image" 
        />
        <div className='div_info_user_profile'>
          <div className="user-info">
            <div className="info-item">
              <span className="label">Cedule Number:</span>
              {isEditing ? (
                <input
                  type="text"
                  name="cedula"
                  value={updatedUser.cedula || ''}
                  onChange={handleChange}
                />
              ) : (
                <span className="value">{usuario?.cedula || 'N/A'}</span>
              )}
            </div>
            <div className="info-item">
              <span className="label">Birthday:</span>
              {isEditing ? (
                <input
                  type="date"
                  name="birthday"
                  value={updatedUser.birthday || ''}
                  onChange={handleChange}
                />
              ) : (
                <span className="value">{usuario?.birthday || 'N/A'}</span>
              )}
            </div>
            <div className="info-item">
              <span className="label">Email Address:</span>
              {isEditing ? (
                <input
                  type="email"
                  name="email"
                  value={updatedUser.email || ''}
                  onChange={handleChange}
                />
              ) : (
                <span className="value">{usuario?.email || 'N/A'}</span>
              )}
            </div>
            <div className="info-item">
              <span className="label">Full Name:</span>
              {isEditing ? (
                <>
                  <input
                    type="text"
                    name="first_name"
                    value={updatedUser.first_name || ''}
                    onChange={handleChange}
                  />
                  <input
                    type="text"
                    name="last_name"
                    value={updatedUser.last_name || ''}
                    onChange={handleChange}
                  />
                </>
              ) : (
                <span className="value">{`${usuario?.first_name} ${usuario?.last_name}` || 'N/A'}</span>
              )}
            </div>
            <div className="info-item">
              <span className="label">Puesto:</span>
              {isEditing ? (
                <input
                  type="text"
                  name="puesto"
                  value={updatedUser.puesto || ''}
                  onChange={handleChange}
                />
              ) : (
                <span className="value">{usuario?.puesto || 'N/A'}</span>
              )}
            </div>
            <div className="info-item">
              <span className="label">Phone Number:</span>
              {isEditing ? (
                <input
                  type="text"
                  name="phone_number"
                  value={updatedUser.phone_number || ''}
                  onChange={handleChange}
                />
              ) : (
                <span className="value">{usuario?.phone_number || 'N/A'}</span>
              )}
            </div>
          </div>
        </div>
      </div>
      {isEditing ? (
        <button onClick={handleSaveClick}>Guardar</button>
      ) : (
        <button onClick={handleEditClick}>Editar</button>
      )}
      <button onClick={handleDeleteClick} className="delete-button">Eliminar Cuenta</button>
    </div>
  );
};

export default UserProfile;

