import React from 'react';
import { NavBarDashboard } from '../../Components/NavBarDashboard/NavBarDashboard';
import Lottie from "lottie-react";
import colibriesAnim from "../../Lottie/Hummingbird no Background.json";
import '../Home/Home.css';

const Home = () => {
  return (
    <>


      <div className='contCentral'>

        <div className='contTitulo'>
          <h1 className="tituloModerno">Bienvenido a Gestión Colibríes</h1>
          <p className="subtituloModerno">
            Sistema inteligente para administrar tu negocio con rapidez y simplicidad
          </p>
        </div>

        <div className='contLottie lottieBg'>
          <Lottie 
            animationData={colibriesAnim} 
            loop 
            style={{ width: 380, height: 380 }}
          />
        </div>

      </div>
    </>
  );
};

export { Home };

