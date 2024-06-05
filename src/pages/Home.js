// src/Home.js
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ref, onValue, off } from 'firebase/database';
import { database } from './../database/firebase';
import './Home.css';
import logo from '../assets/Logo_wtbg.png';

const Home = () => {
  const navigate = useNavigate();
  const [chattingCount, setChattingCount] = useState(0);

  useEffect(() => {
    const usersRef = ref(database, 'users');
    const unsubscribe = onValue(usersRef, (snapshot) => {
      const users = snapshot.val();
      const activeUsers = Object.keys(users).filter(id => users[id].chatting);
      setChattingCount(activeUsers.length);
    });

    // Clean up the subscription
    return () => off(usersRef, unsubscribe);
  }, []);

  const startChat = () => {
    navigate('/chat');
  };

  return (
    <div className="home-container">
      <div className="logo-container">
        <img src={logo} alt="Logo" className="logo" />
      </div>
      <h3 className="title">
        Faites-vous des ami(e)s, et bien plus encore, partout et à tout moment
      </h3>
      <button className="btn btn-dark btn-lg start-chat-button" onClick={startChat}>
        Commencer à chatter
      </button>
      <div className="chatting-count mt-4">
        <h1>{chattingCount}</h1>
        <h2>Personnes connectées</h2>
      </div>
    </div>
  );
};

export default Home;
