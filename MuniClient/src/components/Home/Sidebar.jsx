import React, { useState } from "react";
import "../../styles/Sidebar.css";
import {useNavigate} from "react-router-dom";


const Sidebar = () => {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isClosed, setIsClosed] = useState(true);
  const navigate = useNavigate()

  const toggleSidebar = () => {
    setIsClosed(!isClosed);
  };

  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode);
  };

  const goHome = () => {
    navigate("/home")
  }
  const goCreateUser = () => {
    navigate("/Users")
  }

  const gotask = () => {
    navigate("/Tasks")
  }



  return (
    <div className={isDarkMode ? "dark" : ""}>
      <nav className={`sidebar ${isClosed ? "close" : ""}`}>
        <header>
          <div className="image-text">
            <span className="image">
        
            </span>
            <div className="text logo-text">
              <span className="name">Codinglab</span>
              <span className="profession">Web developer</span>
            </div>
          </div>
          <img
            src="src/assets/menu.png" 
            alt="Toggle"
            className="icon-img toggle"
            onClick={toggleSidebar}
          />
        </header>

        <div className="menu-bar">
          <div className="menu">
            <li className="search-box"onClick={goCreateUser}>
            <img src="src/assets/agregar-usuario.png" alt="Usuario de perfil" className="icon-img" />

              <input type="text" placeholder="" />
            </li>

            <ul className="menu-links">
              <li className="nav-link">
                <a href="#">
                <img src="src/assets/correo.png" alt="Usuario de perfil" className="icon-img" />
                  <span className="text nav-text">Dashboard</span>
                </a>
              </li>

              <li className="nav-link" onClick={goHome}>
                <div className="divs_img_sidebar" >
                  <img src="src/assets/hogar.png" alt="Revenue" className="icon-img" />
                  <span className="text nav-text">Revenue</span>
                </div>
              </li>

              <li className="nav-link"onClick={gotask}>
                <a href="#">
                  <img src="src/assets/anadir-lista.png" alt="Notifications" className="icon-img" />
                  <span className="text nav-text">Notifications</span>
                </a>
              </li>

              <li className="nav-link">
                <a href="#">
                  <img src="analytics-icon.png" alt="Analytics" className="icon-img" />
                  <span className="text nav-text">Analytics</span>
                </a>
              </li>

              <li className="nav-link">
                <a href="#">
                  <img src="likes-icon.png" alt="Likes" className="icon-img" />
                  <span className="text nav-text">Likes</span>
                </a>
              </li>

              <li className="nav-link">
                <a href="#">
                  <img src="wallet-icon.png" alt="Wallets" className="icon-img" />
                  <span className="text nav-text">Wallets</span>
                </a>
              </li>
            </ul>
          </div>

          <div className="bottom-content">
            <li>
              <a href="#">
                <img src="logout-icon.png" alt="Logout" className="icon-img" />
                <span className="text nav-text">Logout</span>
              </a>
            </li>

            <li className="mode">
              <div className="sun-moon">
                <img
                  src={isDarkMode ? "sun-icon.png" : "moon-icon.png"}
                  alt={isDarkMode ? "Light mode" : "Dark mode"}
                  className="icon-img"
                />
              </div>
              <span className="mode-text text">
                {isDarkMode ? "Light mode" : "Dark mode"}
              </span>

              <div className="toggle-switch" onClick={toggleDarkMode}>
                <span className="switch"></span>
              </div>
            </li>
          </div>
        </div>
      </nav>

      <section className={`home ${isClosed ? "close" : ""}`}>
        <div className="text"></div>
      </section>
    </div>
  );
};

export default Sidebar;
