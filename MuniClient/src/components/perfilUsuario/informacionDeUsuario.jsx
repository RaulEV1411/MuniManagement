import React from 'react';
import "../../styles/info.css";

// URL de imagen predeterminada
const defaultProfileImage = 'https://via.placeholder.com/100';

const UserProfile = () => {
  return (
    <div className="user-profile-container">
      <div className="profile-header">
        <h2 className="user-profile-title">Information</h2>
      </div>
      <div className='container_img_info_user_profile'>
        <img src={defaultProfileImage} alt="User Profile" className="profile-image" />
        <div className='div_info_user_profile'>
          <div className="user-info">
            <div className="info-item">
              <span className="label">Cedule Number:</span>
              <span className="value">6-0483-0006</span>
            </div>
            <div className="info-item">
              <span className="label">Birthday:</span>
              <span className="value">12/07/2005</span>
            </div>
            <div className="info-item">
              <span className="label">Email Address:</span>
              <span className="value">acahill@fwd.com</span>
            </div>
            <div className="info-item">
              <span className="label">Full Name:</span>
              <span className="value">Alexia Nicolle Cahill Navarro</span>
            </div>
            <div className="info-item">
              <span className="label">Puesto:</span>
              <span className="value">Estudiante</span>
            </div>
            <div className="info-item">
              <span className="label">Phone Number:</span>
              <span className="value">6249-6933</span>
            </div>
        </div>
      </div>
      </div>
    </div>
  );
};

export default UserProfile;
