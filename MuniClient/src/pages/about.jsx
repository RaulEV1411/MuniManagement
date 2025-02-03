import About from "../components/about/about"; 
import Map from "../components/about/map";
import Sidebar from "../components/Home/Sidebar";
function AboutPages() {
  return (
    <div>
      <Sidebar>
        <div>
          <Map /> 
          <About /> 
        </div>
      </Sidebar>
    </div>
  );
}

export default AboutPages;
