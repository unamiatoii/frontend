import { useState, useEffect } from 'react';
import { ref, push, onChildAdded, onValue, set, update, off } from 'firebase/database';
import { database } from '../services/firebase';

// Fonction pour encoder une adresse IP
const encodeIp = (ip) => ip.replaceAll('.', '_');

// Fonction pour récupérer l'adresse IP
const fetchUserIp = async () => {
  try {
    const response = await fetch('https://api.ipify.org?format=json');
    const data = await response.json();
    return data.ip; // Retourne l'adresse IP
  } catch (error) {
    console.error("Erreur lors de la récupération de l'adresse IP:", error);
    return null;
  }
};

const useChat = () => {
  const [userIp, setUserIp] = useState(null); // Adresse IP brute
  const [conversationId, setConversationId] = useState(null); // ID de la conversation
  const [messages, setMessages] = useState([]); // Messages dans la conversation
  const [message, setMessage] = useState(''); // Nouveau message en cours d'écriture
  const [chatting, setChatting] = useState(false); // Indique si l'utilisateur est en train de discuter
  const [waitingForPartner, setWaitingForPartner] = useState(false); // En attente d'un partenaire

  // Initialisation de l'utilisateur
  useEffect(() => {
    const initializeUser = async () => {
      const ip = await fetchUserIp(); // Récupère l'adresse IP de l'utilisateur
      if (!ip) return;

      const encodedIp = encodeIp(ip); // Encode l'adresse IP pour Firebase
      setUserIp(ip);

      const userRef = ref(database, `users/${encodedIp}`);
      onValue(userRef, (snapshot) => {
        const user = snapshot.val();
        if (user && user.chatting) {
          // L'utilisateur est déjà en conversation active
          setConversationId(user.conversationId);
          setChatting(true);
        } else {
          // Recherche d'un partenaire
          findPartner(encodedIp);
        }
      }, { onlyOnce: true });
    };

    initializeUser();
  }, []);

  // Ajouter un utilisateur à Firebase
  const addUser = (encodedIp) => {
    const userRef = ref(database, `users/${encodedIp}`);
    set(userRef, { ip: encodedIp, chatting: false, waiting: true });
  };

  // Trouver un partenaire disponible
  const findPartner = (encodedIp) => {
    const usersRef = ref(database, 'users');
    onValue(usersRef, (snapshot) => {
      const users = snapshot.val();
      if (users) {
        // Trouve un utilisateur disponible
        const availableUsers = Object.keys(users).filter(uid =>
          uid !== encodedIp && !users[uid].chatting
        );

        if (availableUsers.length > 0) {
          const partnerIp = availableUsers[0]; // Prend le premier utilisateur disponible
          startConversation(encodedIp, partnerIp);
        } else {
          // Pas de partenaire disponible, attente
          setWaitingForPartner(true);
          addUser(encodedIp);
        }
      }
    }, { onlyOnce: true });
  };

  // Démarrer une nouvelle conversation
  const startConversation = (encodedIp, partnerIp) => {
    const conversationRef = push(ref(database, 'conversations'));
    const conversationId = conversationRef.key;

    // Initialise la conversation
    set(conversationRef, {
      participants: [encodedIp, partnerIp],
      messages: [],
      status: 'active',
    });

    // Met à jour l'état des utilisateurs
    update(ref(database, `users/${encodedIp}`), { chatting: true, conversationId });
    update(ref(database, `users/${partnerIp}`), { chatting: true, conversationId });

    setConversationId(conversationId);
    setChatting(true);
    setWaitingForPartner(false);
  };

  // Envoyer un message
  const sendMessage = (e) => {
    e.preventDefault();
    if (message.trim() && conversationId) {
      const messagesRef = ref(database, `conversations/${conversationId}/messages`);
      push(messagesRef, { text: message, userIp });
      setMessage(''); // Vide le champ de saisie après envoi
    }
  };

  // Charger les messages en temps réel
  useEffect(() => {
    if (conversationId) {
      const messagesRef = ref(database, `conversations/${conversationId}/messages`);
      const unsubscribe = onChildAdded(messagesRef, (snapshot) => {
        const newMessage = snapshot.val();
        setMessages((prevMessages) => [...prevMessages, newMessage]);
      });
      return () => off(messagesRef, unsubscribe);
    }
  }, [conversationId]);

  return {
    userIp,
    messages,
    message,
    setMessage,
    sendMessage,
    chatting,
    waitingForPartner,
  };
};

export default useChat;
