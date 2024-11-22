// src/hooks/useChat.js
import { useState, useEffect } from 'react';
import { ref, push, onChildAdded, onValue, set, update, remove, off } from 'firebase/database';
import { database } from '../database/firebase';

// Générer un identifiant unique pour chaque utilisateur
const generateUniqueId = () => '_' + Math.random().toString(36).substr(2, 9);

const useChat = () => {
  // États pour gérer les informations et la logique de chat
  const [userId, setUserId] = useState(null);
  const [chatting, setChatting] = useState(false);
  const [waitingForPartner, setWaitingForPartner] = useState(false);
  const [conversationId, setConversationId] = useState(null);
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const [conversationEnded, setConversationEnded] = useState(false);
  const [partnerTyping, setPartnerTyping] = useState(false);

  // Initialiser l'utilisateur à la première utilisation
  useEffect(() => {
    let storedUserId = localStorage.getItem('userId');
    if (!storedUserId) {
      storedUserId = generateUniqueId();
      localStorage.setItem('userId', storedUserId);
    }
    setUserId(storedUserId);

    // Ajouter l'utilisateur à la base de données
    addUser(storedUserId);

    // Nettoyage lors du déchargement de la page
    const handleBeforeUnload = () => removeUser(storedUserId);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      removeUser(storedUserId);
    };
  }, []);

  // Chercher un partenaire ou gérer une conversation existante
  useEffect(() => {
    if (userId) {
      const userRef = ref(database, `users/${userId}`);
      const unsubscribe = onValue(userRef, (snapshot) => {
        const user = snapshot.val();
        if (user && user.chatting) {
          findExistingConversation(userId);
        } else if (!user.waiting) {
          findPartner(userId);
        }
      });
      return () => off(userRef, unsubscribe);
    }
  }, [userId]);

  // Charger les messages et surveiller l'état de la conversation
  useEffect(() => {
    if (conversationId) {
      const messagesRef = ref(database, `conversations/${conversationId}/messages`);
      const unsubscribeMessages = onChildAdded(messagesRef, (snapshot) => {
        const newMessage = snapshot.val();
        setMessages((prevMessages) => [...prevMessages, newMessage]);
      });

      const conversationRef = ref(database, `conversations/${conversationId}`);
      const unsubscribeConversation = onValue(conversationRef, (snapshot) => {
        const conversation = snapshot.val();
        if (conversation) {
          if (conversation.status === 'ended') {
            setChatting(false);
            setConversationEnded(true);
          }
          setPartnerTyping(conversation.typing && conversation.typing !== userId);
        }
      });

      return () => {
        off(messagesRef, unsubscribeMessages);
        off(conversationRef, unsubscribeConversation);
      };
    }
  }, [conversationId]);

  // Ajouter un utilisateur à la base
  const addUser = (userId) => {
    const userRef = ref(database, `users/${userId}`);
    set(userRef, { userId, active: true, chatting: false, waiting: false });
  };

  // Supprimer un utilisateur de la base
  const removeUser = (userId) => {
    const userRef = ref(database, `users/${userId}`);
    remove(userRef);
  };

  // Mettre à jour le statut d'un utilisateur
  const updateUserStatus = (userId, status) => {
    const userRef = ref(database, `users/${userId}`);
    update(userRef, status);
  };

  // Trouver un partenaire de chat
  const findPartner = (userId) => {
    const usersRef = ref(database, 'users');
    onValue(usersRef, (snapshot) => {
      const users = snapshot.val();
      if (users) {
        const availableUsers = Object.keys(users).filter(id => 
          id !== userId && users[id].active && !users[id].chatting);

        if (availableUsers.length > 0) {
          const partnerId = availableUsers[Math.floor(Math.random() * availableUsers.length)];
          startConversation(userId, partnerId);
        } else {
          setWaitingForPartner(true);
          updateUserStatus(userId, { waiting: true });
        }
      }
    }, { onlyOnce: true });
  };

  // Trouver une conversation existante
  const findExistingConversation = (userId) => {
    const conversationsRef = ref(database, 'conversations');
    onValue(conversationsRef, (snapshot) => {
      const conversations = snapshot.val();
      if (conversations) {
        for (let convId in conversations) {
          const conv = conversations[convId];
          if (conv.participants.includes(userId) && conv.status === 'active') {
            setConversationId(convId);
            setChatting(true);
            break;
          }
        }
      }
    }, { onlyOnce: true });
  };

  // Démarrer une nouvelle conversation
  const startConversation = (userId, partnerId) => {
    const conversationRef = push(ref(database, 'conversations'));
    const conversationId = conversationRef.key;
    set(conversationRef, {
      participants: [userId, partnerId],
      messages: [],
      status: 'active',
      typing: null,
    });
    updateUserStatus(userId, { chatting: true, partnerId, waiting: false });
    updateUserStatus(partnerId, { chatting: true, partnerId: userId, waiting: false });
    setConversationId(conversationId);
    setChatting(true);
    setConversationEnded(false);
  };

  // Arrêter une conversation
  const stopConversation = () => {
    if (conversationId) {
      update(ref(database, `conversations/${conversationId}`), { status: 'ended' });
      setConversationId(null);
      setChatting(false);
      setMessages([]);
      setWaitingForPartner(false);
    }
  };

  // Envoyer un message
  const sendMessage = (e) => {
    e.preventDefault();
    if (message.trim() && conversationId) {
      const messagesRef = ref(database, `conversations/${conversationId}/messages`);
      const newMessageRef = push(messagesRef);
      set(newMessageRef, { text: message, userId });
      setMessage('');
      update(ref(database, `conversations/${conversationId}`), { typing: null });
    }
  };

  // Surveiller la saisie
  const handleTyping = (e) => {
    setMessage(e.target.value);
    if (conversationId) {
      update(ref(database, `conversations/${conversationId}`), { typing: userId });
    }
  };

  return {
    userId,
    chatting,
    waitingForPartner,
    conversationEnded,
    messages,
    message,
    setMessage,
    sendMessage,
    stopConversation,
    handleTyping,
    partnerTyping
  };
};

export default useChat;
