import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './ConversationsList.css';

const ConversationsList = ({ onSelectUser, selectedUserId, socket }) => {
  const [conversations, setConversations] = useState([]);
  const [staffMembers, setStaffMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('conversations'); // 'conversations' or 'staff'
  const [onlineUsers, setOnlineUsers] = useState([]);
  const currentUser = JSON.parse(localStorage.getItem('professionalUser'));

  useEffect(() => {
    fetchConversations();
    fetchStaffMembers();
  }, []);

  // Listen for online users
  useEffect(() => {
    if (!socket) return;

    socket.on('users:online', (users) => {
      setOnlineUsers(users);
    });

    return () => {
      socket.off('users:online');
    };
  }, [socket]);

  // Listen for new messages
  useEffect(() => {
    if (!socket) return;

    socket.on('message:received', (message) => {
      fetchConversations();
    });

    return () => {
      socket.off('message:received');
    };
  }, [socket]);

  const fetchConversations = async () => {
    try {
      setLoading(true);
      const response = await axios.get(
        'http://localhost:5000/api/chat/conversations',
        {
          headers: {
            Authorization: `Bearer ${currentUser.token}`
          }
        }
      );
      setConversations(response.data);
    } catch (error) {
      console.error('Error fetching conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStaffMembers = async () => {
    try {
      const response = await axios.get(
        'http://localhost:5000/api/chat/staff',
        {
          headers: {
            Authorization: `Bearer ${currentUser.token}`
          }
        }
      );
      setStaffMembers(response.data);
    } catch (error) {
      console.error('Error fetching staff members:', error);
    }
  };

  const formatLastMessageTime = (date) => {
    const messageDate = new Date(date);
    const now = new Date();
    const diffMs = now - messageDate;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'À l\'instant';
    if (diffMins < 60) return `${diffMins}m`;
    if (diffHours < 24) return `${diffHours}h`;
    if (diffDays < 7) return `${diffDays}j`;
    return messageDate.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
  };

  const isUserOnline = (userId) => {
    return onlineUsers.includes(userId);
  };

  const filteredConversations = conversations.filter(conv =>
    conv.participant.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredStaff = staffMembers.filter(staff =>
    staff.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="conversations-list">
      {/* Header */}
      <div className="conversations-header">
        <h2>
          <i className="fas fa-comments"></i>
          Messages
        </h2>
      </div>

      {/* Search */}
      <div className="conversations-search">
        <i className="fas fa-search"></i>
        <input
          type="text"
          placeholder="Rechercher..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Tabs */}
      <div className="conversations-tabs">
        <button
          className={`tab ${activeTab === 'conversations' ? 'active' : ''}`}
          onClick={() => setActiveTab('conversations')}
        >
          <i className="fas fa-comment-dots"></i>
          Conversations
          {conversations.reduce((sum, c) => sum + c.unreadCount, 0) > 0 && (
            <span className="tab-badge">
              {conversations.reduce((sum, c) => sum + c.unreadCount, 0)}
            </span>
          )}
        </button>
        <button
          className={`tab ${activeTab === 'staff' ? 'active' : ''}`}
          onClick={() => setActiveTab('staff')}
        >
          <i className="fas fa-users"></i>
          Personnel
        </button>
      </div>

      {/* List */}
      <div className="conversations-content">
        {loading ? (
          <div className="conversations-loading">
            <i className="fas fa-spinner fa-spin"></i>
            <p>Chargement...</p>
          </div>
        ) : activeTab === 'conversations' ? (
          filteredConversations.length === 0 ? (
            <div className="no-conversations">
              <i className="fas fa-inbox"></i>
              <p>Aucune conversation</p>
            </div>
          ) : (
            filteredConversations.map((conv) => (
              <div
                key={conv.participant._id}
                className={`conversation-item ${
                  selectedUserId === conv.participant._id ? 'active' : ''
                } ${conv.unreadCount > 0 ? 'unread' : ''}`}
                onClick={() => onSelectUser(conv.participant)}
              >
                <div className="conversation-avatar">
                  {conv.participant.avatar ? (
                    <img src={conv.participant.avatar} alt={conv.participant.name} />
                  ) : (
                    <i className="fas fa-user"></i>
                  )}
                  {isUserOnline(conv.participant._id) && (
                    <span className="online-indicator"></span>
                  )}
                </div>
                <div className="conversation-details">
                  <div className="conversation-header-row">
                    <h4>{conv.participant.name}</h4>
                    <span className="conversation-time">
                      {formatLastMessageTime(conv.lastMessage.createdAt)}
                    </span>
                  </div>
                  <div className="conversation-message-row">
                    <p className="conversation-last-message">
                      {conv.lastMessage.type === 'text' 
                        ? conv.lastMessage.content 
                        : '📎 Fichier'}
                    </p>
                    {conv.unreadCount > 0 && (
                      <span className="unread-badge">{conv.unreadCount}</span>
                    )}
                  </div>
                </div>
              </div>
            ))
          )
        ) : (
          filteredStaff.length === 0 ? (
            <div className="no-conversations">
              <i className="fas fa-user-slash"></i>
              <p>Aucun membre trouvé</p>
            </div>
          ) : (
            filteredStaff.map((staff) => (
              <div
                key={staff._id}
                className={`conversation-item ${
                  selectedUserId === staff._id ? 'active' : ''
                }`}
                onClick={() => onSelectUser(staff)}
              >
                <div className="conversation-avatar">
                  {staff.avatar ? (
                    <img src={staff.avatar} alt={staff.name} />
                  ) : (
                    <i className="fas fa-user"></i>
                  )}
                  {isUserOnline(staff._id) && (
                    <span className="online-indicator"></span>
                  )}
                </div>
                <div className="conversation-details">
                  <div className="conversation-header-row">
                    <h4>{staff.name}</h4>
                  </div>
                  <div className="conversation-message-row">
                    <p className="conversation-role">
                      {staff.role === 'admin' ? '👑 Administrateur' : '👤 Personnel'}
                    </p>
                  </div>
                </div>
              </div>
            ))
          )
        )}
      </div>
    </div>
  );
};

export default ConversationsList;
