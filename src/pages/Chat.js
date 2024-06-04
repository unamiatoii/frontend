// src/Chat.js
import React, { useState, useEffect } from 'react';
import { publicIpv4 } from 'public-ip';
import { ref, push, onChildAdded, onValue, set, update, remove } from "firebase/database";
import { database } from './../database/firebase';
import CryptoJS from 'crypto-js';
import './Chat.css';

const Chat = () => {
  const [userId, setUserId] = useState(null);
  const [chatting, setChatting] = useState(false);
  const [waitingForPartner, setWaitingForPartner] = useState(false);
  const [conversationId, setConversationId] = useState(null);
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([]);

  useEffect(() => {
    const fetchIp = async () => {
      const ip = await publicIpv4();
      const userId = generateUserId(ip);
      setUserId(userId);
      addUser(userId);
    };

    const generateUserId = (ipAddress) => {
      return CryptoJS.MD5(ipAddress).toString();
    };

    fetchIp();

    return () => {
      if (userId) {
        removeUser(userId);
      }
    };
  }, []);

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
      const availableUsers = Object.keys(users).filter(id => id !== userId && !users[id].chatting);
      
      if (availableUsers.length > 0) {
        const partnerId = availableUsers[Math.floor(Math.random() * availableUsers.length)];
        startConversation(userId, partnerId);
      } else {
        setWaitingForPartner(true);
        const userRef = ref(database, `users/${userId}`);
        update(userRef, { waiting: true });
      }
    });
  };

  const startConversation = (userId, partnerId) => {
    const conversationRef = push(ref(database, 'conversations'));
    const conversationId = conversationRef.key;
    set(conversationRef, {
      participants: [userId, partnerId],
      messages: [],
    });
    updateUserStatus(userId, { chatting: true, partnerId, waiting: false });
    updateUserStatus(partnerId, { chatting: true, partnerId: userId, waiting: false });
    setConversationId(conversationId);
    setChatting(true);
  };

  useEffect(() => {
    if (userId) {
      const userRef = ref(database, `users/${userId}`);
      onValue(userRef, (snapshot) => {
        const user = snapshot.val();
        if (user.chatting) {
          const conversationsRef = ref(database, 'conversations');
          onValue(conversationsRef, (snapshot) => {
            const conversations = snapshot.val();
            for (let convId in conversations) {
              const conv = conversations[convId];
              if (conv.participants.includes(userId)) {
                setConversationId(convId);
                setChatting(true);
                break;
              }
            }
          });
        } else if (!user.waiting) {
          findPartner(userId);
        }
      });
    }
  }, [userId]);

  useEffect(() => {
    if (conversationId) {
      const messagesRef = ref(database, `conversations/${conversationId}/messages`);
      onChildAdded(messagesRef, (snapshot) => {
        const newMessage = snapshot.val();
        setMessages((prevMessages) => [...prevMessages, newMessage]);
      });
    }
  }, [conversationId]);

  const sendMessage = (e) => {
    e.preventDefault();
    if (message.trim() !== '' && conversationId) {
      const messagesRef = ref(database, `conversations/${conversationId}/messages`);
      const newMessageRef = push(messagesRef);
      set(newMessageRef, { text: message, userId });
      setMessage('');
    }
  };

  return (
    <div className="chat-container">
      {chatting ? (
        <div className="chat-box">
          <div className="messages">
            {messages.map((msg, index) => (
              <div key={index} className={`message ${msg.userId === userId ? 'own' : ''}`}>
                {msg.text}
              </div>
            ))}
          </div>
          <form onSubmit={sendMessage}>
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Type your message..."
            />
            <button type="submit">Send</button>
          </form>
        </div>
      ) : (
        <div className="waiting">
          {waitingForPartner ? (
            <p>Waiting for a partner to join...</p>
          ) : (
            <p>Finding a partner...</p>
          )}
        </div>
      )}
    </div>
  );
};

export default Chat;
