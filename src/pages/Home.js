// src/Home.js
import React from 'react';
import { useNavigate } from 'react-router-dom';
import './Home.css';

const Home = () => {
  const navigate = useNavigate();

  const startChat = () => {
    navigate('/chat');
  };

  return (
    <div className="container p-4 d-flex flex-column justify-content-center align-items-center text-center" style={styles.container}>
      <h3 className="mb-4 title">
        Faites-vous des ami(e)s, et bien plus encore, partout et à tout moment
      </h3>
      <button className="btn btn-dark btn-lg" onClick={startChat} style={styles.button}>
        Commencer à chatter
      </button>
    </div>
  );
};

const styles = {
  container: {
    height: '100vh',
  },
  button: {
    backgroundColor: 'var(--color-yellow)',
    borderColor: 'var(--color-yellow)',
    color: 'var(--color-black)',
  },
};

export default Home;
