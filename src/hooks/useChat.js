// src/hooks/useChat.js
import { useState, useEffect } from 'react';
import { ref, push, onChildAdded, onValue, set, update, remove, off } from "firebase/database";
import { database } from './../database/firebase';

const useChat = () => {
  const [userId, setUserId] = useState(null);
  const [chatting, setChatting] = useState(false);
  const [waitingForPartner, setWaitingForPartner] = useState(false);
  const [conversationId, setConversationId] = useState(null);
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const [conversationEnded, setConversationEnded] = useState(false);
  const [typing, setTyping] = useState(false);
  const [partnerTyping, setPartnerTyping] = useState(false);

  // Générer ou récupérer un ID utilisateur unique lors de la première connexion
  useEffect(() => {
    let userId = localStorage.getItem('userId');
    if (!userId) {
      userId = `user_${Date.now()}`;
      localStorage.setItem('userId', userId);
    }
    setUserId(userId);
    addUser(userId);

    // Nettoyer les données utilisateur à la déconnexion
    return () => {
      if (userId) {
        removeUser(userId);
      }
    };
  }, []);

  // Ajouter un gestionnaire pour l'événement beforeunload
  useEffect(() => {
    const handleBeforeUnload = (event) => {
      if (chatting) {
        event.preventDefault();
        event.returnValue = ''; // Afficher un message de confirmation
        return '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [chatting]);

  // Écouter les changements d'état de l'utilisateur
  useEffect(() => {
    if (userId) {
      const userRef = ref(database, `users/${userId}`);
      const unsubscribe = onValue(userRef, (snapshot) => {
        const user = snapshot.val();
        if (user && user.chatting) {
          // Si l'utilisateur est en conversation, trouver la conversation existante
          findExistingConversation(userId);
        } else if (!user.waiting) {
          // Si l'utilisateur n'est pas en attente, chercher un partenaire
          findPartner(userId);
        }
      });
      // Nettoyer les écouteurs Firebase
      return () => off(userRef, unsubscribe);
    }
  }, [userId]);

  // Écouter les nouveaux messages et le statut de la conversation
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
        if (conversation.status === 'ended') {
          setChatting(false);
          setConversationEnded(true);
        }
        if (conversation.typing && conversation.typing !== userId) {
          setPartnerTyping(true);
        } else {
          setPartnerTyping(false);
        }
      });

      // Nettoyer les écouteurs Firebase
      return () => {
        off(messagesRef, unsubscribeMessages);
        off(conversationRef, unsubscribeConversation);
      };
    }
  }, [conversationId]);

  // Ajouter un nouvel utilisateur à la base de données
  const addUser = (userId) => {
    const userRef = ref(database, `users/${userId}`);
    set(userRef, { userId, active: true, chatting: false, partnerId: null });
  };

  // Supprimer un utilisateur de la base de données
  const removeUser = (userId) => {
    const userRef = ref(database, `users/${userId}`);
    remove(userRef);
  };

  // Mettre à jour le statut de l'utilisateur dans la base de données
  const updateUserStatus = (userId, status) => {
    const userRef = ref(database, `users/${userId}`);
    update(userRef, status);
  };

  // Trouver un partenaire disponible pour discuter
  const findPartner = (userId) => {
    const usersRef = ref(database, 'users');
    onValue(usersRef, (snapshot) => {
      const users = snapshot.val();
      const availableUsers = Object.keys(users).filter(id => id !== userId && !users[id].chatting);

      if (availableUsers.length > 0) {
        // Si un partenaire est disponible, démarrer une conversation
        const partnerId = availableUsers[Math.floor(Math.random() * availableUsers.length)];
        startConversation(userId, partnerId);
      } else {
        // Si aucun partenaire n'est disponible, mettre l'utilisateur en attente
        setWaitingForPartner(true);
        updateUserStatus(userId, { waiting: true });
      }
    }, { onlyOnce: true });
  };

  // Trouver une conversation existante pour l'utilisateur
  const findExistingConversation = (userId) => {
    const conversationsRef = ref(database, 'conversations');
    onValue(conversationsRef, (snapshot) => {
      const conversations = snapshot.val();
      for (let convId in conversations) {
        const conv = conversations[convId];
        if (conv.participants.includes(userId) && conv.status === 'active') {
          setConversationId(convId);
          setChatting(true);
          break;
        }
      }
    }, { onlyOnce: true });
  };

  // Démarrer une nouvelle conversation entre deux utilisateurs
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

  // Arrêter la conversation actuelle
  const stopConversation = () => {
    if (conversationId) {
      update(ref(database, `conversations/${conversationId}`), { status: 'ended' });
      updateUserStatus(userId, { chatting: false, partnerId: null, waiting: false });
      setConversationId(null);
      setChatting(false);
      setMessages([]);
      setWaitingForPartner(false);
    }
  };

  // Passer à une nouvelle conversation
  const switchConversation = () => {
    stopConversation();
    findPartner(userId);
  };

  // Envoyer un message dans la conversation
  const sendMessage = (e) => {
    e.preventDefault();
    if (message.trim() !== '' && conversationId) {
      const messagesRef = ref(database, `conversations/${conversationId}/messages`);
      const newMessageRef = push(messagesRef);
      set(newMessageRef, { text: message, userId });
      setMessage('');
      update(ref(database, `conversations/${conversationId}`), { typing: null });
    }
  };

  // Gérer la saisie du message
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
    switchConversation,
    handleTyping,
    partnerTyping
  };
};

export default useChat;
