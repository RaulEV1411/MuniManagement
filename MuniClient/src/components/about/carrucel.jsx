// import Carousel from 'react-bootstrap/Carousel';


function Carrucel() {
  return (

    <>
    <Carousel data-bs-theme="dark">
      <Carousel.Item>
        <img id='image'
          className="d-block w-100"
          src="https://lh5.googleusercontent.com/p/AF1QipPolJ8PljkqCDZGw7kYNMLeAK7_Fsmu8BlfaKXz=w810-h468-n-k-no"
          alt="First slide"/>
        <Carousel.Caption>
          <h5></h5>
          <p></p>
        </Carousel.Caption>
      </Carousel.Item>
      <Carousel.Item>
        <img id='image'
          className="d-block w-100"
          
          src="https://lh5.googleusercontent.com/p/AF1QipNSkakyFYpoIRtgh2Rb1k_xcZvguxjXDkTzS449=w810-h468-n-k-no"
          alt="Second slide"
        />
        <Carousel.Caption>
          <h5></h5>
          <p></p>
        </Carousel.Caption>
      </Carousel.Item>
      <Carousel.Item>
        <img id='image'
          className="d-block w-100"
          src="https://lh5.googleusercontent.com/p/AF1QipNEVHe-OOBYC4okRJxDODo2M_gm3o_QEVpn3LXh=w810-h468-n-k-no"
          alt="Third slide"
        />
        <Carousel.Caption>
          <h5></h5>
          <p>
           
          </p>
        </Carousel.Caption>
      </Carousel.Item>
    </Carousel>
    

    
    </>

  );
}

export default Carrucel;