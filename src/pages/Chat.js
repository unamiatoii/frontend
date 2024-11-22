import React from 'react';
import useChat from '../hooks/useChat';

const ChatPage = () => {
  const { 
    chatting, 
    waitingForPartner, 
    messages, 
    message, 
    setMessage, 
    sendMessage 
  } = useChat();

  return (
    <div>
      {chatting ? (
        <div>
          <div>
            {messages.map((msg, index) => (
              <p key={index}>{msg.text}</p>
            ))}
          </div>
          <form onSubmit={sendMessage}>
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Votre message"
            />
            <button type="submit">Envoyer</button>
          </form>
        </div>
      ) : waitingForPartner ? (
        <p>Recherche d'un partenaire...</p>
      ) : (
        <p>Initialisation...</p>
      )}
    </div>
  );
};

export default ChatPage;
