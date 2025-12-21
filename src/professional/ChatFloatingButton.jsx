import React, { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import ConversationsList from './ConversationsList';
import ChatWindow from './ChatWindow';
import axios from 'axios';
import { SOCKET_URL } from '../services/api';
import { API_URL } from '../utils/api';
import './ChatFloatingButton.css';

const ChatFloatingButton = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [socket, setSocket] = useState(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const currentUser = JSON.parse(localStorage.getItem('professionalUser'));

  // Initialize socket connection
  useEffect(() => {
    if (!currentUser) return;

    const newSocket = io(SOCKET_URL, {
      auth: {
        token: currentUser.token
      },
      transports: ['websocket', 'polling']
    });

    newSocket.on('connect', () => {
      console.log('✅ Socket connected');
    });

    newSocket.on('connect_error', (error) => {
      console.error('❌ Socket connection error:', error);
    });

    newSocket.on('disconnect', () => {
      console.log('🔌 Socket disconnected');
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, []);

  // Fetch unread count
  useEffect(() => {
    if (!currentUser) return;
    fetchUnreadCount();
    
    const interval = setInterval(fetchUnreadCount, 30000);
    return () => clearInterval(interval);
  }, []);

  // Listen for new messages
  useEffect(() => {
    if (!socket) return;

    socket.on('message:received', () => {
      fetchUnreadCount();
    });

    return () => {
      socket.off('message:received');
    };
  }, [socket]);

  const fetchUnreadCount = async () => {
    try {
      const response = await axios.get(
        `${API_URL}/chat/unread/count`,
        {
          headers: {
            Authorization: `Bearer ${currentUser.token}`
          }
        }
      );
      setUnreadCount(response.data.count);
    } catch (error) {
      console.error('Error fetching unread count:', error);
    }
  };

  const toggleChat = () => {
    setIsOpen(!isOpen);
  };

  const handleSelectUser = (user) => {
    setSelectedUser(user);
    fetchUnreadCount();
  };

  const handleCloseChat = () => {
    setSelectedUser(null);
  };

  return (
    <>
      {/* Floating Button */}
      <button className="chat-floating-btn" onClick={toggleChat}>
        <i className="fas fa-comments"></i>
        {unreadCount > 0 && (
          <span className="chat-floating-badge">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Chat Panel */}
      {isOpen && (
        <div className="chat-panel-overlay">
          <div className="chat-panel">
            <ConversationsList
              onSelectUser={handleSelectUser}
              selectedUserId={selectedUser?._id}
              socket={socket}
            />
            <ChatWindow
              selectedUser={selectedUser}
              socket={socket}
              onClose={handleCloseChat}
            />
          </div>
          <button className="chat-panel-close" onClick={toggleChat}>
            <i className="fas fa-times"></i>
          </button>
        </div>
      )}
    </>
  );
};

export default ChatFloatingButton;
