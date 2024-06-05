// src/hooks/useChat.js
import { useState, useEffect } from 'react';
import { ref, push, onChildAdded, onValue, set, update, remove, off } from 'firebase/database';
import { database, auth, signInAnonymously, onAuthStateChanged } from './../database/firebase';

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

  useEffect(() => {
    signInAnonymously(auth).catch(error => {
      console.error('Error signing in anonymously:', error);
    });

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUserId(user.uid);
        addUser(user.uid);
      }
    });

    const handleBeforeUnload = () => {
      if (userId) {
        removeUser(userId);
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      if (userId) {
        removeUser(userId);
      }
      unsubscribe();
    };
  }, []);

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
          if (conversation.typing && conversation.typing !== userId) {
            setPartnerTyping(true);
          } else {
            setPartnerTyping(false);
          }
        }
      });

      return () => {
        off(messagesRef, unsubscribeMessages);
        off(conversationRef, unsubscribeConversation);
      };
    }
  }, [conversationId]);

  const addUser = (userId) => {
    const userRef = ref(database, `users/${userId}`);
    set(userRef, { userId, active: true, chatting: false, partnerId: null });
  };

  const removeUser = (userId) => {
    const userRef = ref(database, `users/${userId}`);
    remove(userRef);
  };

  const updateUserStatus = (userId, status) => {
    const userRef = ref(database, `users/${userId}`);
    update(userRef, status);
  };

  const findPartner = (userId) => {
    const usersRef = ref(database, 'users');
    onValue(usersRef, (snapshot) => {
      const users = snapshot.val();
      if (users) {
        const availableUsers = Object.keys(users).filter(id => id !== userId && !users[id].chatting);

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

  const stopConversation = () => {
    if (conversationId) {
      update(ref(database, `conversations/${conversationId}`), { status: 'ended' });

      const conversationRef = ref(database, `conversations/${conversationId}`);
      onValue(conversationRef, (snapshot) => {
        const conversation = snapshot.val();
        if (conversation) {
          conversation.participants.forEach(participantId => {
            updateUserStatus(participantId, { chatting: false, waiting: false, partnerId: null });
          });
        }
      });

      setConversationId(null);
      setChatting(false);
      setMessages([]);
      setWaitingForPartner(false);
    }
  };

  const switchConversation = () => {
    if (conversationId) {
      stopConversation();
      setTimeout(() => findPartner(userId), 1000);  // Ajout d'un léger délai pour éviter les conflits de synchronisation
    }
  };

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
