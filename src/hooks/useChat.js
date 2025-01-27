import { useState, useEffect, useCallback } from 'react';
import { ref, push, onChildAdded, onValue, set, update, remove, off, get } from "firebase/database";
import { database } from './../database/firebase';

const useChat = () => {
  const [userId, setUserId] = useState(null);
  const [chatting, setChatting] = useState(false);
  const [waitingForPartner, setWaitingForPartner] = useState(false);
  const [conversationId, setConversationId] = useState(null);
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const [conversationEnded, setConversationEnded] = useState(false);
  const [partnerTyping, setPartnerTyping] = useState(false);

  const addUser = useCallback((userId) => {
    const userRef = ref(database, `users/${userId}`);
    set(userRef, { active: true, chatting: false, partnerId: null, conversationId: null });
  }, []);

  const removeUser = useCallback((userId) => {
    const userRef = ref(database, `users/${userId}`);
    remove(userRef);
  }, []);

  const findPartner = useCallback(async (userId) => {
    const usersRef = ref(database, 'users');

    onValue(usersRef, async (snapshot) => {
      const users = snapshot.val();
      const availableUsers = Object.keys(users).filter((id) =>
        id !== userId && users[id]?.active && !users[id]?.chatting && users[id]?.waiting
      );

      if (availableUsers.length > 0) {
        const partnerId = availableUsers[Math.floor(Math.random() * availableUsers.length)];
        await startConversation(userId, partnerId);
      } else {
        setWaitingForPartner(true);
        await update(ref(database, `users/${userId}`), { waiting: true });
      }
    }, { onlyOnce: true });
  }, []);

  const listenToConversation = useCallback((conversationId) => {
    const messagesRef = ref(database, `conversations/${conversationId}/messages`);
    const conversationRef = ref(database, `conversations/${conversationId}`);

    const unsubscribeMessages = onChildAdded(messagesRef, (snapshot) => {
      const newMessage = snapshot.val();
      setMessages((prevMessages) => [...prevMessages, newMessage]);
    });

    const unsubscribeConversation = onValue(conversationRef, (snapshot) => {
      const conversation = snapshot.val();
      if (conversation?.status === 'ended') {
        setChatting(false);
        setConversationEnded(true);
      }
      setPartnerTyping(conversation?.typing && conversation.typing !== userId);
    });

    return () => {
      off(messagesRef, unsubscribeMessages);
      off(conversationRef, unsubscribeConversation);
    };
  }, [userId]);

  // Generate or fetch a unique user ID on first render
  useEffect(() => {
    let userId = localStorage.getItem('userId');
    if (!userId) {
      userId = `user_${Date.now()}`;
      localStorage.setItem('userId', userId);
    }
    setUserId(userId);
    addUser(userId);

    return () => {
      if (userId) {
        removeUser(userId);
      }
    };
  }, [addUser, removeUser]);

  // Listen for user state changes
  useEffect(() => {
    if (userId) {
      const userRef = ref(database, `users/${userId}`);
      const unsubscribe = onValue(userRef, (snapshot) => {
        const user = snapshot.val();
        if (user?.conversationId) {
          setConversationId(user.conversationId);
          setChatting(true);
          listenToConversation(user.conversationId);
        } else if (!user?.chatting && !user?.waiting) {
          findPartner(userId);
        }
      });

      return () => off(userRef, unsubscribe);
    }
  }, [userId, findPartner, listenToConversation]);

  const startConversation = async (userId, partnerId) => {
    try {
      const conversationRef = push(ref(database, 'conversations'));
      const conversationId = conversationRef.key;

      const updates = {
        [`conversations/${conversationId}`]: {
          participants: { [userId]: true, [partnerId]: true },
          messages: [],
          status: 'active',
          typing: null,
        },
        [`users/${userId}`]: { chatting: true, waiting: false, partnerId, conversationId },
        [`users/${partnerId}`]: { chatting: true, waiting: false, partnerId: userId, conversationId },
      };

      await update(ref(database), updates);

      setConversationId(conversationId);
      setChatting(true);
      setConversationEnded(false);
      setWaitingForPartner(false);
    } catch (error) {
      console.error("Erreur lors de la création de la conversation :", error);
    }
  };


  // Arrêter la conversation
  const stopConversation = async () => {
    if (conversationId) {
      try {
        const conversationRef = ref(database, `conversations/${conversationId}`);
        const snapshot = await get(conversationRef);

        if (snapshot.exists()) {
          const conversationData = snapshot.val();
          const participants = Object.keys(conversationData.participants || {});

          const updates = {};
          participants.forEach((id) => {
            updates[`users/${id}`] = { chatting: false, partnerId: null, conversationId: null };
          });
          updates[`conversations/${conversationId}/status`] = 'ended';

          await update(ref(database), updates);

          setConversationId(null);
          setChatting(false);
          setMessages([]);
          setWaitingForPartner(false);
          setConversationEnded(true);
        }
      } catch (error) {
        console.error("Erreur lors de l'arrêt de la conversation :", error);
      }
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

  // Gérer la saisie
  const handleTyping = (e) => {
    setMessage(e.target.value);
    if (conversationId) {
      update(ref(database, `conversations/${conversationId}`), { typing: userId });
    }
  };

const stopSearchingPartner = async () => {
  try {
    // Réinitialiser l'état utilisateur dans Firebase
    await update(ref(database, `users/${userId}`), {
      active: false,
      chatting: false,
      waiting: false,
      conversationId: null,
      partnerId: null,
    });

    console.log("Recherche arrêtée.");

    // Réinitialiser les états locaux
    setWaitingForPartner(false); // Arrête l'attente localement
    setChatting(false); // Assure que l'utilisateur n'est pas considéré comme en chat
    setConversationEnded(false); // Réinitialise les états terminaux
    setMessages([]); // Vide les messages

    // Supprimer tout écouteur Firebase
    off(ref(database, `users/${userId}`));

    console.log("Écouteurs Firebase supprimés.");
  } catch (error) {
    console.error("Erreur lors de l'arrêt de la recherche :", error);
  }
};

  
  const restartChat = async () => {
    console.log("Redémarrage du chat...");
    try {
      // Réinitialiser l'état utilisateur dans Firebase
      await update(ref(database, `users/${userId}`), {
        active: true,
        chatting: false,
        waiting: true,
        conversationId: null,
        partnerId: null,
      });
      console.log("Mise à jour Firebase réussie.");
  
      // Réinitialiser les états locaux
      setChatting(false);
      setWaitingForPartner(true);
      setConversationEnded(false);
      setMessages([]);
      setPartnerTyping(false);
  
      console.log("État local réinitialisé.");
  
      // Recherche directe d'un nouveau partenaire
      const usersRef = ref(database, 'users');
      const snapshot = await get(usersRef);
  
      if (snapshot.exists()) {
        const users = snapshot.val();
        const availableUsers = Object.keys(users).filter(
          (id) =>
            id !== userId &&
            users[id]?.active &&
            !users[id]?.chatting &&
            users[id]?.waiting
        );
  
        if (availableUsers.length > 0) {
          setWaitingForPartner(false); // Arrêter l'indicateur de recherche
          const partnerId = availableUsers[Math.floor(Math.random() * availableUsers.length)];
          await startConversation(userId, partnerId);
        } else {
          console.log("Aucun partenaire disponible, attente...");
          setWaitingForPartner(true); // Indiquer que l'utilisateur est en attente
        }        
      } else {
        console.log("Aucun utilisateur trouvé dans Firebase.");
      }
    } catch (error) {
      console.error("Erreur lors du redémarrage du chat :", error);
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
    restartChat,
    stopConversation,
    handleTyping,
    stopSearchingPartner,
    partnerTyping,
  };
};

export default useChat;
