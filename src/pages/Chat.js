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
    restartChat,
    handleTyping,
    partnerTyping
  } = useChat();

  return (
    <div className="chat-container">
      {chatting ? (
        <div className="chat-box fade-in">
          <div className="messages">
            {messages.map((msg, index) => (
              <div
                key={index}
                className={`message ${msg.userId === userId ? 'own slide-in-right' : 'slide-in-left'}`}
              >
                {msg.text}
              </div>
            ))}
            {partnerTyping && (
              <div className="message typing fade-in">
                Entrain d'ecrire...
              </div>
            )}
          </div>
          <form onSubmit={sendMessage} className="chat-form">
            <input
              type="text"
              value={message}
              onChange={handleTyping}
              placeholder="Entre ton message..."
              className="input-message"
            />
            <button className="btn btn-success" type="submit">
              Envoyer
            </button>
          </form>
          <div className="controls d-flex flex-direction-row justify-content-around mb-2">
            <button className="btn btn-danger" onClick={stopConversation}>
              Arreter
            </button>
            <button className="btn btn-warning" onClick={restartChat}>
              Suivant
            </button>
          </div>
        </div>
      ) : conversationEnded ? (
        <div className="waiting fade-in">
          <p>Votre partenaire a mis fin au chat.</p>
          <div className="controls d-flex flex-direction-row justify-content-around mb-2">
            <button className="btn btn-success" onClick={restartChat}>
              Chatter à nouveau
            </button>
          </div>
        </div>
      ) : (
        <div className="waiting fade-in">
          {waitingForPartner ? (
            <p>Patience...</p>
          ) : (
            <p>En attente d'un partenaire...</p>
          )}
        </div>
      )}
    </div>
  );
};

export default Chat;
