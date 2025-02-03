import React, { useState, useEffect } from 'react';
import SearchBar from './searchbar';
import ProjectCard from './cards';
import { getProyectos } from '../../services/api'; // Importa el método de axios
import "../../styles/cards.css";

const ProjectHome = () => {
  const [projects, setProjects] = useState([]); // Inicialmente vacío
  const [filteredProjects, setFilteredProjects] = useState([]);
  const [loading, setLoading] = useState(true); // Estado de carga

  // Obtener los proyectos desde la API
  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const data = await getProyectos(); // Llamada a la API
        setProjects(data); // Guarda los proyectos en el estado
        setFilteredProjects(data); // Inicialmente, los proyectos filtrados son los mismos
      } catch (error) {
        console.error('Error al obtener los proyectos:', error);
      } finally {
        setLoading(false); // Finaliza la carga, ya sea éxito o error
      }
    };

    fetchProjects(); // Llamada inicial al cargar el componente
  }, []);

  // Filtrar los proyectos en función de la búsqueda
  const handleSearch = (query) => {
    const result = projects.filter((project) =>
      project.name.toLowerCase().startsWith(query.toLowerCase())
    );
    setFilteredProjects(result);
  };

  return (
    <div className="project-home">
      <SearchBar onSearch={handleSearch} />

      {/* Mostrar loader mientras carga */}
      {loading ? (
        <div className="loader">Cargando proyectos...</div>
      ) : (
        <div className="project-list">
          {filteredProjects.length > 0 ? (
            filteredProjects.map((project) => (
              <ProjectCard key={project.proyect_ID} project={project} />
            ))
          ) : (
            <div className="no-projects">No hay proyectos existentes.</div>
          )}
        </div>
      )}
    </div>
  );
};

export default ProjectHome;
