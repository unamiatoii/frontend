import { useState, useEffect, useCallback } from 'react';
import { ref, push, onChildAdded, onValue, set, update, remove, off, get } from "firebase/database";
import { database } from './../database/firebase';
import useLogin from './loginHook';

const useChat = () => {
  const { user } = useLogin();
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
      setPartnerTyping(conversation?.typing && conversation.typing !== user?.uid);
    });

    return () => {
      off(messagesRef, unsubscribeMessages);
      off(conversationRef, unsubscribeConversation);
    };
  }, [user?.uid]);

  useEffect(() => {
    if (user) {
      const userId = user.uid;
      addUser(userId);

      return () => {
        removeUser(userId);
      };
    }
  }, [user, addUser, removeUser]);

  useEffect(() => {
    if (user?.uid) {
      const userRef = ref(database, `users/${user.uid}`);
      const unsubscribe = onValue(userRef, (snapshot) => {
        const userData = snapshot.val();
        if (userData?.conversationId) {
          setConversationId(userData.conversationId);
          setChatting(true);
          listenToConversation(userData.conversationId);
        } else if (!userData?.chatting && !userData?.waiting) {
          findPartner(user.uid);
        }
      });

      return () => off(userRef, unsubscribe);
    }
  }, [user?.uid, findPartner, listenToConversation]);

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

  const sendMessage = (e) => {
    e.preventDefault();
    if (message.trim() && conversationId) {
      const messagesRef = ref(database, `conversations/${conversationId}/messages`);
      const newMessageRef = push(messagesRef);
      set(newMessageRef, { text: message, userId: user?.uid });
      setMessage('');
      update(ref(database, `conversations/${conversationId}`), { typing: null });
    }
  };

  const handleTyping = (e) => {
    setMessage(e.target.value);
    if (conversationId) {
      update(ref(database, `conversations/${conversationId}`), { typing: user?.uid });
    }
  };

  const stopSearchingPartner = async () => {
    try {
      await update(ref(database, `users/${user?.uid}`), {
        active: false,
        chatting: false,
        waiting: false,
        conversationId: null,
        partnerId: null,
      });

      console.log("Recherche arrêtée.");

      setWaitingForPartner(false);
      setChatting(false);
      setConversationEnded(false);
      setMessages([]);

      off(ref(database, `users/${user?.uid}`));

      console.log("Écouteurs Firebase supprimés.");
    } catch (error) {
      console.error("Erreur lors de l'arrêt de la recherche :", error);
    }
  };

  const restartChat = async () => {
    try {
      await update(ref(database, `users/${user?.uid}`), {
        active: true,
        chatting: false,
        waiting: true,
        conversationId: null,
        partnerId: null,
      });

      setChatting(false);
      setWaitingForPartner(true);
      setConversationEnded(false);
      setMessages([]);
      setPartnerTyping(false);

      const usersRef = ref(database, 'users');
      const snapshot = await get(usersRef);

      if (snapshot.exists()) {
        const users = snapshot.val();
        const availableUsers = Object.keys(users).filter(
          (id) =>
            id !== user?.uid &&
            users[id]?.active &&
            !users[id]?.chatting &&
            users[id]?.waiting
        );

        if (availableUsers.length > 0) {
          setWaitingForPartner(false);
          const partnerId = availableUsers[Math.floor(Math.random() * availableUsers.length)];
          await startConversation(user?.uid, partnerId);
        } else {
          setWaitingForPartner(true);
        }
      }
    } catch (error) {
      console.error("Erreur lors du redémarrage du chat :", error);
    }
  };

  return {
    userId: user?.uid,
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
