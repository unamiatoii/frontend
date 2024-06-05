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
            {partnerTyping && <div className="message typing">Partner is typing...</div>}
          </div>
          <form onSubmit={sendMessage}>
            <input
              type="text"
              value={message}
              onChange={handleTyping}
              placeholder="Type your message..."
            />
            <button className='btn btn-success' type="submit">Send</button>
          </form>
          <div className='d-flex flex-direction-row justify-content-around mb-2'>  
            <button className="btn btn-danger" onClick={stopConversation}>Stop</button>
            <button className="btn btn-warning" onClick={switchConversation}>Skip</button>
          </div>
        </div>
      ) : conversationEnded ? (
        <div className="waiting">
          <p>Your partner has ended the chat.</p>
          <div className='d-flex flex-direction-row justify-content-around mb-2'>  
           <button className="btn btn-success" onClick={switchConversation}>Chatter à nouveau</button>
          </div>
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