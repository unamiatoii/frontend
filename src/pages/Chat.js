// src/pages/Chat.js
import React from 'react';
import useChat from '../hooks/useChat';
import './Chat.css';

const Chat = () => {
  const {
    userId,
    chatting,
    waitingForPartner,
    conversationEnded,
    messages,
    message,
    sendMessage,
    stopConversation,
    switchConversation,
    handleTyping,
    partnerTyping
  } = useChat();

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
            {partnerTyping && <div className="message typing">En train d'écrire...</div>}
          </div>
          <form onSubmit={sendMessage}>
            <input
              type="text"
              value={message}
              onChange={handleTyping}
              placeholder="Tapez votre message..."
            />
            <button className='btn btn-success' type="submit">Envoyer</button>
          </form>
          <div className='d-flex flex-direction-row justify-content-around mb-2'>  
            <button className="btn btn-danger" onClick={stopConversation}>Arrêter</button>
            <button className="btn btn-warning" onClick={switchConversation}>Passer</button>
          </div>
        </div>
      ) : conversationEnded ? (
        <div className="waiting">
          <p>Votre partenaire a mis fin à la conversation.</p>
          <button className="btn btn-success" onClick={switchConversation}>Nouvelle conversation</button>
        </div>
      ) : (
        <div className="waiting">
          {waitingForPartner ? (
            <p>En attente d'un partenaire...</p>
          ) : (
            <p>Recherche d'un partenaire...</p>
          )}
        </div>
      )}
    </div>
  );
};

export default Chat;
