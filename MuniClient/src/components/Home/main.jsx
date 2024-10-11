import React, { useState, useEffect } from 'react';
import SearchBar from './searchbar';
import ProjectCard from './cards';
import { getProyectos } from '../../services/api'; // Importa el método de axios
import "../../styles/cards.css";

const ProjectHome = () => {
  const [projects, setProjects] = useState([]); // Inicialmente vacío
  const [filteredProjects, setFilteredProjects] = useState([]);

  // Obtener los proyectos desde la API
  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const data = await getProyectos(); // Llamada a la API
        setProjects(data); // Guarda los proyectos en el estado
        setFilteredProjects(data); // Inicialmente, los proyectos filtrados son los mismos
      } catch (error) {
        console.error('Error al obtener los proyectos:', error);
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
    console.log(filteredProjects);
  };
  
  return (
    <div className="project-home">
      <SearchBar onSearch={handleSearch} />
      <div className="project-list">
        {filteredProjects.map((projects) => (
          <ProjectCard key={projects.proyect_ID} project={projects} />
        ))}
      </div>
    </div>
  );
};

export default ProjectHome;
