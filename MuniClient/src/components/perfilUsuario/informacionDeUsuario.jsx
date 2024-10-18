import React, { useEffect, useState } from 'react';
import { getUsuariosById } from '../../services/api';
import "../../styles/info.css";
import {  useNavigate } from 'react-router-dom';
import { jwtDecode } from "jwt-decode";
const defaultProfileImage = 'https://via.placeholder.com/100';

const UserProfile = () => {
  const [usuario, setUsuario] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const token = localStorage.getItem('refreshToken');
  const token2 = localStorage.getItem('accessToken');
  const decoded = jwtDecode(token);
  const decoded2 = jwtDecode(token2);
    //const userId = decoded.sub;
  const userID = decoded.user_ID;
  const navigate = useNavigate();
console.log(userID);


  useEffect(() => {
    const fetchUsuario = async () => {
      try {
        const data = await getUsuariosById(userID);
        setUsuario(data);
        setLoading(false);
      } catch (error) {
        setError('Error al obtener los datos del usuario');
        setLoading(false);
      }
    };

    fetchUsuario();
  }, [userID]);

  if (loading) return <div>Cargando...</div>;
  if (error) return <div>{error}</div>;

  return (
    <div className="user-profile-container">
      <div className="profile-header">
        <h2 className="user-profile-title">Information</h2>
      </div>
      <div className='container_img_info_user_profile'>
        <img 
          src={usuario?.profileImage || defaultProfileImage} 
          alt="User Profile" 
          className="profile-image" 
        />
        <div className='div_info_user_profile'>
          <div className="user-info">
            <div className="info-item">
              <span className="label">Cedule Number:</span>
              <span className="value">{usuario?.cedula || 'N/A'}</span>
            </div>
            <div className="info-item">
              <span className="label">Birthday:</span>
              <span className="value">{usuario?.birthday || 'N/A'}</span>
            </div>
            <div className="info-item">
              <span className="label">Email Address:</span>
              <span className="value">{usuario?.email || 'N/A'}</span>
            </div>
            <div className="info-item">
              <span className="label">Full Name:</span>
              <span className="value">{`${usuario?.first_name} ${usuario?.last_name}` || 'N/A'}</span>
            </div>
            <div className="info-item">
              <span className="label">Puesto:</span>
              <span className="value">{usuario?.puesto || 'N/A'}</span>
            </div>
            <div className="info-item">
              <span className="label">Phone Number:</span>
              <span className="value">{usuario?.phone_number || 'N/A'}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserProfile;
