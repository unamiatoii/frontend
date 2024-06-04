// src/Chat.js
import React, { useState, useEffect } from 'react';
import { ref, push, onChildAdded, onValue, set, update, remove } from "firebase/database";
import { database } from './../database/firebase';
import './Chat.css';

const Chat = () => {
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const [chatting, setChatting] = useState(false);
  const [conversationId, setConversationId] = useState(null);
  const [userId, setUserId] = useState(null);
  const [waitingForPartner, setWaitingForPartner] = useState(false);

  useEffect(() => {
    // Generate a unique user ID for this session
    const userId = `user_${Date.now()}`;
    setUserId(userId);

    // Add the user to the list of active users with inChat set to false
    const userRef = ref(database, `activeUsers/${userId}`);
    set(userRef, { inChat: false });

    // Clean up on unmount
    return () => {
      remove(userRef);
    };
  }, []);

  useEffect(() => {
    if (userId) {
      // Wait for a few seconds before checking for active users
      const timer = setTimeout(() => {
        // Check for active users and start a chat
        const activeUsersRef = ref(database, 'activeUsers');
        onValue(activeUsersRef, (snapshot) => {
          const activeUsers = snapshot.val();
          if (activeUsers) {
            const availableUsers = Object.keys(activeUsers).filter(id => id !== userId && !activeUsers[id].inChat);

            if (availableUsers.length > 0) {
              // Start a chat with a random available user
              const partnerId = availableUsers[Math.floor(Math.random() * availableUsers.length)];
              startChat(partnerId);
            } else {
              // No other users available, wait for a partner
              setWaitingForPartner(true);
            }
          } else {
            // No active users found
            setWaitingForPartner(true);
          }
        });
      }, 5000); // Wait for 5 seconds

      // Clean up the timer if the component unmounts
      return () => clearTimeout(timer);
    }
  }, [userId]);

  useEffect(() => {
    if (conversationId) {
      // Listen for new messages in the conversation
      const messagesRef = ref(database, `conversations/${conversationId}/messages`);
      onChildAdded(messagesRef, (snapshot) => {
        const newMessage = snapshot.val();
        setMessages((prevMessages) => [...prevMessages, newMessage]);
      });
    }
  }, [conversationId]);

  const sendMessage = (e) => {
    e.preventDefault();
    if (message.trim() && conversationId) {
      const messagesRef = ref(database, `conversations/${conversationId}/messages`);
      push(messagesRef, { userId, text: message });
      setMessage('');
    }
  };

  const startChat = (partnerId) => {
    const conversationRef = push(ref(database, 'conversations'));
    const conversationId = conversationRef.key;
    set(conversationRef, {
      users: { [userId]: true, [partnerId]: true },
      messages: []
    });
    setConversationId(conversationId);
    setChatting(true);

    // Update both users to indicate they are in a chat
    update(ref(database, `activeUsers/${userId}`), { inChat: true });
    update(ref(database, `activeUsers/${partnerId}`), { inChat: true });
  };

  return (
    <div className="container mt-5">
      {chatting ? (
        <>
          <h2>Conversation</h2>
          <div className="chat-box border bg-white p-3 mb-3" style={{ height: '400px', overflowY: 'scroll' }}>
            {messages.map((msg, index) => (
            
              <div key={index} className="message mb-2">{msg.text}</div>
            ))}
          </div>
          <form onSubmit={sendMessage} className="d-flex">
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="form-control me-2"
              placeholder="Écrire un message..."
            />
            <button type="submit" className="btn btn-primary">Envoyer</button>
          </form>
        </>
      ) : waitingForPartner ? (
        <div className="d-flex flex-column align-items-center">
          <h2>En attente d'un partenaire...</h2>
          <p>Veuillez patienter pendant que nous trouvons quelqu'un avec qui chatter.</p>
          <button onClick={() => setWaitingForPartner(false)} className="btn btn-secondary mt-3">Annuler</button>
        </div>
      ) : (
        <div className="d-flex flex-column align-items-center">
          <h2>Appuyez sur le bouton pour commencer à chatter</h2>
          <button onClick={() => setChatting(true)} className="btn btn-primary btn-lg mt-3">Commencer à chatter</button>
        </div>
      )}
    </div>
  );
};

export default Chat;
