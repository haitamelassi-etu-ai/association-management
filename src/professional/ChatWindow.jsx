import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import './ChatWindow.css';

const ChatWindow = ({ selectedUser, socket, onClose }) => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const currentUser = JSON.parse(localStorage.getItem('professionalUser'));

  // Scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Fetch messages
  useEffect(() => {
    if (selectedUser) {
      fetchMessages();
      markMessagesAsRead();
    }
  }, [selectedUser]);

  const fetchMessages = async () => {
    try {
      setLoading(true);
      const response = await axios.get(
        `http://localhost:5000/api/chat/messages/${selectedUser._id}`,
        {
          headers: {
            Authorization: `Bearer ${currentUser.token}`
          }
        }
      );
      setMessages(response.data.messages);
    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const markMessagesAsRead = async () => {
    try {
      await axios.put(
        `http://localhost:5000/api/chat/messages/read/${selectedUser._id}`,
        {},
        {
          headers: {
            Authorization: `Bearer ${currentUser.token}`
          }
        }
      );
    } catch (error) {
      console.error('Error marking messages as read:', error);
    }
  };

  // Socket listeners
  useEffect(() => {
    if (!socket) return;

    socket.on('message:received', (message) => {
      if (message.sender._id === selectedUser._id) {
        setMessages(prev => [...prev, message]);
        markMessagesAsRead();
      }
    });

    socket.on('message:sent', (message) => {
      setMessages(prev => [...prev, message]);
    });

    socket.on('typing:user', (data) => {
      if (data.userId === selectedUser._id) {
        setIsTyping(data.isTyping);
      }
    });

    return () => {
      socket.off('message:received');
      socket.off('message:sent');
      socket.off('typing:user');
    };
  }, [socket, selectedUser]);

  // Handle typing indicator
  const handleTyping = () => {
    if (!socket) return;

    socket.emit('typing:start', { receiverId: selectedUser._id });

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      socket.emit('typing:stop', { receiverId: selectedUser._id });
    }, 1000);
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    
    if (!newMessage.trim() || !socket) return;

    socket.emit('message:send', {
      receiverId: selectedUser._id,
      content: newMessage,
      type: 'text'
    });

    setNewMessage('');
    
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      socket.emit('typing:stop', { receiverId: selectedUser._id });
    }
  };

  const formatTime = (date) => {
    const messageDate = new Date(date);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (messageDate.toDateString() === today.toDateString()) {
      return messageDate.toLocaleTimeString('fr-FR', { 
        hour: '2-digit', 
        minute: '2-digit' 
      });
    } else if (messageDate.toDateString() === yesterday.toDateString()) {
      return 'Hier ' + messageDate.toLocaleTimeString('fr-FR', { 
        hour: '2-digit', 
        minute: '2-digit' 
      });
    } else {
      return messageDate.toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      }) + ' ' + messageDate.toLocaleTimeString('fr-FR', { 
        hour: '2-digit', 
        minute: '2-digit' 
      });
    }
  };

  if (!selectedUser) {
    return (
      <div className="chat-window">
        <div className="no-chat-selected">
          <i className="fas fa-comments"></i>
          <p>Sélectionnez une conversation pour commencer</p>
        </div>
      </div>
    );
  }

  return (
    <div className="chat-window">
      {/* Header */}
      <div className="chat-header">
        <div className="chat-user-info">
          <div className="chat-avatar">
            {selectedUser.avatar ? (
              <img src={selectedUser.avatar} alt={selectedUser.name} />
            ) : (
              <i className="fas fa-user"></i>
            )}
          </div>
          <div className="chat-user-details">
            <h3>{selectedUser.name}</h3>
            <span className="chat-user-role">{selectedUser.role === 'admin' ? 'Administrateur' : 'Personnel'}</span>
          </div>
        </div>
        <button className="chat-close-btn" onClick={onClose}>
          <i className="fas fa-times"></i>
        </button>
      </div>

      {/* Messages */}
      <div className="chat-messages">
        {loading ? (
          <div className="chat-loading">
            <i className="fas fa-spinner fa-spin"></i>
            <p>Chargement des messages...</p>
          </div>
        ) : messages.length === 0 ? (
          <div className="no-messages">
            <i className="fas fa-comment-dots"></i>
            <p>Aucun message. Commencez la conversation!</p>
          </div>
        ) : (
          <>
            {messages.map((message) => (
              <div
                key={message._id}
                className={`message ${
                  message.sender._id === currentUser.id ? 'sent' : 'received'
                }`}
              >
                <div className="message-content">
                  <p>{message.content}</p>
                  <div className="message-info">
                    <span className="message-time">{formatTime(message.createdAt)}</span>
                    {message.sender._id === currentUser.id && (
                      <i className={`fas ${message.isRead ? 'fa-check-double read' : 'fa-check'}`}></i>
                    )}
                  </div>
                </div>
              </div>
            ))}
            {isTyping && (
              <div className="typing-indicator">
                <span></span>
                <span></span>
                <span></span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input */}
      <form className="chat-input-form" onSubmit={handleSendMessage}>
        <input
          type="text"
          value={newMessage}
          onChange={(e) => {
            setNewMessage(e.target.value);
            handleTyping();
          }}
          placeholder="Tapez votre message..."
          className="chat-input"
        />
        <button type="submit" className="chat-send-btn" disabled={!newMessage.trim()}>
          <i className="fas fa-paper-plane"></i>
        </button>
      </form>
    </div>
  );
};

export default ChatWindow;
