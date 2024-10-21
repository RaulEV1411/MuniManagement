import React, { useState } from "react";
import "../../styles/Sidebar.css";
import { useNavigate } from "react-router-dom";
import { jwtDecode } from "jwt-decode";

const Sidebar = ({children}) => {
  const [isClosed, setIsClosed] = useState(true);
  const navigate = useNavigate();
  const token = localStorage.getItem('refreshToken');
  const token2 = localStorage.getItem('accessToken');
  const decoded = jwtDecode(token);
  const decoded2 = jwtDecode(token2);
    //const userId = decoded.sub;
  const userId = decoded;
  console.log(userId);
  

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

  const goperfil = () => {
    navigate(`/perfil/${userId}`);
  };

  return (
    <div className="sidebar_container">
      <nav className={`sidebar ${isClosed ? "close" : ""}`}>
        <header>
          <div className="image-text">
            <span className="image"></span>
            <div className="text logo-text">
              <span className="name"></span>
              <span className="profession"></span>
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
             <span className="text nav-text"> agregar usuario</span>
            </li>

            <ul className="menu-links">
              <li className="nav-link">
                <a href="#">
                  <img
                    src="src/assets/correo.png"
                    alt="Usuario de perfil"
                    className="icon-img"
                  />
                  <span className="text nav-text">     correo</span>
                </a>
              </li>

              <li className="nav-link" onClick={goHome}>
                <div className="divs_img_sidebar">
                  <img
                    src="src/assets/hogar.png"
                    alt="Revenue"
                    className="icon-img"
                  />
                  <span className="text nav-text">pagina principal</span>
                </div>
              </li>

              <li className="nav-link" onClick={goTask}>
                <a href="#">
                  <img
                    src="src/assets/anadir-lista.png"
                    alt="Notifications"
                    className="icon-img"
                  />
                  <span className="text nav-text">agregar tarea</span>
                </a>
              </li>

              <li className="nav-link">
                <a href="#">
                  <img
                    src="src/assets/boton-de-informacion.png"
                    alt="Notifications"
                    className="icon-img"
                  />
                  <span className="text nav-text">informacion</span>
                </a>
              </li>

              <li className="nav-link"onClick={goperfil}>
                <a href="#">
                  <img
                    src="src/assets/usuario (1).png"
                    alt="Notifications"
                    className="icon-img"
                  />
                  <span className="text nav-text">usuario</span>
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

      <section className={`${isClosed ? "close" : ""} section_bar`}>
          {children}
      </section>
    </div>
  );
};

export default Sidebar;

