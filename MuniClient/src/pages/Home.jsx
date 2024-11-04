import React from 'react';
import Sidebar from '../components/Home/Sidebar';
import ProjectHome from '../components/Home/main';

function Homepages() {
  return (
    <div className="app-container">
      <Sidebar>
        <ProjectHome />
      </Sidebar>
    </div>
  );
}

export default Homepages;

