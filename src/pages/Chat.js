// src/Chat.js
import React, { useState, useEffect } from 'react';
import { publicIpv4 } from 'public-ip';
import { ref, push, onChildAdded, onValue, set, update, remove } from "firebase/database";
import { database } from './../database/firebase';
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
      setUserId(ip.replace(/\./g, '_')); // Remplacer les points par des underscores pour éviter les problèmes de clé
      addUser(ip);
    };

    fetchIp();

    return () => {
      if (userId) {
        removeUser(userId);
      }
    };
  }, [userId]);

  const addUser = (userId) => {
    const userRef = ref(database, `users/${userId}`);
    set(userRef, { userId, active: true });
  };

  const removeUser = (userId) => {
    const userRef = ref(database, `users/${userId}`);
    remove(userRef);
  };

  const updateUserChatStatus = (userId, status) => {
    const userRef = ref(database, `users/${userId}`);
    update(userRef, { chatting: status });
  };

  const getAvailableUsers = (userId, callback) => {
    const usersRef = ref(database, 'users');
    onValue(usersRef, (snapshot) => {
      const users = snapshot.val();
      const availableUsers = Object.keys(users).filter((id) => id !== userId && !users[id].chatting);
      callback(availableUsers);
    });
  };

  const startConversation = (userId, partnerId, callback) => {
    const conversationsRef = ref(database, 'conversations');
    const newConversationRef = push(conversationsRef);
    const conversationId = newConversationRef.key;
    set(newConversationRef, {
      participants: [userId, partnerId],
      messages: [],
    });
    updateUserChatStatus(userId, true);
    updateUserChatStatus(partnerId, true);
    callback(conversationId);
  };

  useEffect(() => {
    if (userId) {
      const timer = setTimeout(() => {
        getAvailableUsers(userId, (availableUsers) => {
          if (availableUsers.length > 0) {
            const partnerId = availableUsers[Math.floor(Math.random() * availableUsers.length)];
            startConversation(userId, partnerId, (conversationId) => {
              setConversationId(conversationId);
              setChatting(true);
            });
          } else {
            setWaitingForPartner(true);
          }
        });
      }, 5000);
      return () => clearTimeout(timer);
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
