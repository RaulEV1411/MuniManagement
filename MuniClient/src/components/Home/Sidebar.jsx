import React, { useState } from "react";
import "../../styles/Sidebar.css";
import { useNavigate } from "react-router-dom";
import { jwtDecode } from "jwt-decode";
import { getCookie } from "../../services/read_cookie";


const Sidebar = ({ children }) => {
  const [isClosed, setIsClosed] = useState(true);
  const navigate = useNavigate();
  const token = getCookie('accessToken');
  const decoded = token ? jwtDecode(token) : null;
  const userID = decoded?.user_ID;
  const UserPhoto = decoded?.user_photo;
  console.log(decoded);


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
    navigate(`/perfil/${userID}`);
  };

  const goabout = () => {
    navigate("/about");
  };

  return (
    <div className="sidebar_container">
      <nav className={`sidebar ${isClosed ? "close" : ""}`}             onClick={toggleSidebar}>
        <header>
          <div className="image-text">
            <span className="image"></span>
            <div className="text logo-text">
              <span className="name"></span>
              <span className="profession"></span>
            </div>
          </div>
        </header>


        <div className="menu-bar">
          <div className="menu">
                {
                  UserPhoto ? 
                  <li className="search-box" onClick={goperfil}>
                    <a href="#">
                      <img className="UserPhoto_Sidebar" src={UserPhoto} alt="User"/> 
                      <span className="text nav-text"> Perfil</span>
                    </a>
                  </li>
                  :
                  <li className="nav-link" onClick={goperfil}>
                    <a href="#">
                      <svg xmlns="http://www.w3.org/2000/svg" className="icon-img" height="40px" viewBox="0 -960 960 960" width="40px" fill="#CF8B78"><path d="M226-262q59-42.33 121.33-65.5 62.34-23.17 132.67-23.17 70.33 0 133 23.17T734.67-262q41-49.67 59.83-103.67T813.33-480q0-141-96.16-237.17Q621-813.33 480-813.33t-237.17 96.16Q146.67-621 146.67-480q0 60.33 19.16 114.33Q185-311.67 226-262Zm253.88-184.67q-58.21 0-98.05-39.95Q342-526.58 342-584.79t39.96-98.04q39.95-39.84 98.16-39.84 58.21 0 98.05 39.96Q618-642.75 618-584.54t-39.96 98.04q-39.95 39.83-98.16 39.83ZM480.31-80q-82.64 0-155.64-31.5-73-31.5-127.34-85.83Q143-251.67 111.5-324.51T80-480.18q0-82.82 31.5-155.49 31.5-72.66 85.83-127Q251.67-817 324.51-848.5T480.18-880q82.82 0 155.49 31.5 72.66 31.5 127 85.83Q817-708.33 848.5-635.65 880-562.96 880-480.31q0 82.64-31.5 155.64-31.5 73-85.83 127.34Q708.33-143 635.65-111.5 562.96-80 480.31-80Zm-.31-66.67q54.33 0 105-15.83t97.67-52.17q-47-33.66-98-51.5Q533.67-284 480-284t-104.67 17.83q-51 17.84-98 51.5 47 36.34 97.67 52.17 50.67 15.83 105 15.83Zm0-366.66q31.33 0 51.33-20t20-51.34q0-31.33-20-51.33T480-656q-31.33 0-51.33 20t-20 51.33q0 31.34 20 51.34 20 20 51.33 20Zm0-71.34Zm0 369.34Z"/></svg>
                      <span className="text nav-text"> Perfil</span>
                    </a>
                  </li>
                }

            <ul className="menu-links">

              <li className="nav-link" onClick={goHome}>
                  <a href="#">
                    <svg xmlns="http://www.w3.org/2000/svg" className="icon-img" height="40px" viewBox="0 -960 960 960" width="40px" fill="#0C3958"><path d="M226.67-186.67h140v-246.66h226.66v246.66h140v-380L480-756.67l-253.33 190v380ZM160-120v-480l320-240 320 240v480H526.67v-246.67h-93.34V-120H160Zm320-352Z"/></svg>
                    <span className="text nav-text">Pagina principal</span>
                  </a>
              </li>

              <li className="nav-link" onClick={goCreateUser}>
                <a href="#">
                <svg xmlns="http://www.w3.org/2000/svg" className="icon-img" height="40px" viewBox="0 -960 960 960" width="40px" fill="#9E1D18"><path d="M38.67-160v-100q0-34.67 17.83-63.17T105.33-366q69.34-31.67 129.67-46.17 60.33-14.5 123.67-14.5 63.33 0 123.33 14.5T611.33-366q31 14.33 49.17 42.83T678.67-260v100h-640Zm706.66 0v-102.67q0-56.66-29.5-97.16t-79.16-66.84q63 7.34 118.66 22.5 55.67 15.17 94 35.5 34 19.34 53 46.17 19 26.83 19 59.83V-160h-176ZM358.67-480.67q-66 0-109.67-43.66Q205.33-568 205.33-634T249-743.67q43.67-43.66 109.67-43.66t109.66 43.66Q512-700 512-634t-43.67 109.67q-43.66 43.66-109.66 43.66ZM732-634q0 66-43.67 109.67-43.66 43.66-109.66 43.66-11 0-25.67-1.83-14.67-1.83-25.67-5.5 25-27.33 38.17-64.67Q578.67-590 578.67-634t-13.17-80q-13.17-36-38.17-66 12-3.67 25.67-5.5 13.67-1.83 25.67-1.83 66 0 109.66 43.66Q732-700 732-634ZM105.33-226.67H612V-260q0-14.33-8.17-27.33-8.16-13-20.5-18.67-66-30.33-117-42.17-51-11.83-107.66-11.83-56.67 0-108 11.83-51.34 11.84-117.34 42.17-12.33 5.67-20.16 18.67-7.84 13-7.84 27.33v33.33Zm253.34-320.66q37 0 61.83-24.84Q445.33-597 445.33-634t-24.83-61.83q-24.83-24.84-61.83-24.84t-61.84 24.84Q272-671 272-634t24.83 61.83q24.84 24.84 61.84 24.84Zm0 320.66Zm0-407.33Z"/></svg>
                  <span className="text nav-text"> Todos los Usuarios</span>
                </a>
              </li>

              <li className="nav-link" onClick={()=>navigate("/directions")}>
                <a href="#">
                  <svg xmlns="http://www.w3.org/2000/svg" className="icon-img" height="40px" viewBox="0 -960 960 960" width="40px" fill="#CF8B78"><path d="M208-254v-319.33h66.67V-254H208Zm241.33 0v-319.33H516V-254h-66.67ZM80-120.67v-66.66h800v66.66H80ZM685.33-254v-319.33H752V-254h-66.67ZM80-640v-62l400-218.67L880-702v62H80Zm148.67-66.67h502.66-502.66Zm0 0h502.66L480-844.67l-251.33 138Z"/></svg>
                  <span className="text nav-text">Direcciones</span>
                </a>
              </li>

              <li className="nav-link" onClick={()=>navigate("/departamentos")}>
                <a href="#">
                  <svg xmlns="http://www.w3.org/2000/svg" className="icon-img" height="40px" viewBox="0 -960 960 960" width="40px" fill="#0C3958"><path d="M120-120v-556.67h163.33V-840h393.34v326.67H840V-120H528.67v-163.33h-97.34V-120H120Zm66.67-66.67h96.66v-96.66h-96.66v96.66Zm0-163.33h96.66v-96.67h-96.66V-350Zm0-163.33h96.66V-610h-96.66v96.67ZM350-350h96.67v-96.67H350V-350Zm0-163.33h96.67V-610H350v96.67Zm0-163.34h96.67v-96.66H350v96.66ZM513.33-350H610v-96.67h-96.67V-350Zm0-163.33H610V-610h-96.67v96.67Zm0-163.34H610v-96.66h-96.67v96.66Zm163.34 490h96.66v-96.66h-96.66v96.66Zm0-163.33h96.66v-96.67h-96.66V-350Z"/></svg>
                  <span className="text nav-text">Departamentos</span>
                </a>
              </li>

              <li className="nav-link" onClick={goabout}>
                <a href="#">
                <svg xmlns="http://www.w3.org/2000/svg" className="icon-img" height="40px" viewBox="0 -960 960 960" width="40px" fill="#F3951B"><path d="M448.67-280h66.66v-240h-66.66v240Zm31.32-316q15.01 0 25.18-9.97 10.16-9.96 10.16-24.7 0-15.3-10.15-25.65-10.16-10.35-25.17-10.35-15.01 0-25.18 10.35-10.16 10.35-10.16 25.65 0 14.74 10.15 24.7 10.16 9.97 25.17 9.97Zm.19 516q-82.83 0-155.67-31.5-72.84-31.5-127.18-85.83Q143-251.67 111.5-324.56T80-480.33q0-82.88 31.5-155.78Q143-709 197.33-763q54.34-54 127.23-85.5T480.33-880q82.88 0 155.78 31.5Q709-817 763-763t85.5 127Q880-563 880-480.18q0 82.83-31.5 155.67Q817-251.67 763-197.46q-54 54.21-127 85.84Q563-80 480.18-80Zm.15-66.67q139 0 236-97.33t97-236.33q0-139-96.87-236-96.88-97-236.46-97-138.67 0-236 96.87-97.33 96.88-97.33 236.46 0 138.67 97.33 236 97.33 97.33 236.33 97.33ZM480-480Z"/></svg>
                  <span className="text nav-text">Informacion</span>
                </a>
              </li>

            </ul>
          </div>

          <div className="bottom-content">
            <li>
              <a href="#">
                <img src="src/assets/salida.png" alt="Logout" className="icon-img" />
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

