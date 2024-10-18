import React, { useState } from 'react';
import "../../styles/searchbar.css";
const SearchBar = ({ onSearch }) => {
  const [query, setQuery] = useState('');

  const handleSearch = (e) => {
    setQuery(e.target.value);
    onSearch(e.target.value); // Llama a la función para filtrar proyectos
  };

  return (
    <div className="search-bar">
      <input
        type="text"
        value={query}
        onChange={handleSearch}
        placeholder="Buscar proyectos..."
      />
    </div>
  );
};

export default SearchBar
