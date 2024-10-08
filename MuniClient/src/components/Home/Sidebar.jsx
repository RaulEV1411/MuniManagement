import React, { useState } from "react";
import "../../styles/Sidebar.css";
import { useNavigate } from "react-router-dom";

const Sidebar = ({children}) => {
  const [isClosed, setIsClosed] = useState(true);
  const navigate = useNavigate();

  const toggleSidebar = () => {
    setIsClosed(!isClosed);
  };

  const goHome = () => {
    navigate("/home");
  };

  const goCreateUser = () => {
    navigate("/Users");
  };

  const goTask = () => {
    navigate("/proyectos");
  };

  return (
    <div>
      <nav className={`sidebar ${isClosed ? "close" : ""}`}>
        <header>
          <div className="image-text">
            <span className="image"></span>
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
            <li className="search-box" onClick={goCreateUser}>
              <img
                src="src/assets/agregar-usuario.png"
                alt="Usuario de perfil"
                className="icon-img"
              />
              <input type="text" placeholder="" />
            </li>

            <ul className="menu-links">
              <li className="nav-link">
                <a href="#">
                  <img
                    src="src/assets/correo.png"
                    alt="Usuario de perfil"
                    className="icon-img"
                  />
                  <span className="text nav-text">Dashboard</span>
                </a>
              </li>

              <li className="nav-link" onClick={goHome}>
                <div className="divs_img_sidebar">
                  <img
                    src="src/assets/hogar.png"
                    alt="Revenue"
                    className="icon-img"
                  />
                  <span className="text nav-text">Revenue</span>
                </div>
              </li>

              <li className="nav-link" onClick={goTask}>
                <a href="#">
                  <img
                    src="src/assets/anadir-lista.png"
                    alt="Notifications"
                    className="icon-img"
                  />
                  <span className="text nav-text">Notifications</span>
                </a>
              </li>

              <li className="nav-link">
                <a href="#">
                  <img
                    src="src/assets/boton-de-informacion.png"
                    alt="Notifications"
                    className="icon-img"
                  />
                  <span className="text nav-text">Analytics</span>
                </a>
              </li>

              <li className="nav-link">
                <a href="#">
                  <img
                    src="src/assets/usuario (1).png"
                    alt="Notifications"
                    className="icon-img"
                  />
                  <span className="text nav-text">Likes</span>
                </a>
              </li>
            </ul>
          </div>

          <div className="bottom-content">
            <li>
              <a href="#">
                <img src= "src/assets/salida.png"alt="Logout" className="icon-img" />
                <span className="text nav-text">Logout</span>
              </a>
            </li>
          </div>
        </div>
      </nav>

      <section className={`${isClosed ? "close" : ""}`}>
          {children}
      </section>
    </div>
  );
};

export default Sidebar;

