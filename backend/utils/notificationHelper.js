const Notification = require('../models/Notification');

// Helper function to create notifications
const createNotification = async (recipientId, data) => {
  try {
    const notification = await Notification.create({
      recipient: recipientId,
      type: data.type || 'info',
      title: data.title,
      message: data.message,
      icon: data.icon || '🔔',
      link: data.link,
      metadata: data.metadata,
      createdBy: data.createdBy
    });
    return notification;
  } catch (error) {
    console.error('Create notification error:', error);
    return null;
  }
};

// Create notification for all staff
const notifyAllStaff = async (data) => {
  try {
    const User = require('../models/User');
    const staff = await User.find({ 
      role: { $in: ['staff', 'manager', 'admin'] },
      statut: 'actif'
    }).select('_id');
    
    const notifications = staff.map(user => ({
      recipient: user._id,
      type: data.type || 'info',
      title: data.title,
      message: data.message,
      icon: data.icon || '🔔',
      link: data.link,
      metadata: data.metadata,
      createdBy: data.createdBy
    }));
    
    await Notification.insertMany(notifications);
    return true;
  } catch (error) {
    console.error('Notify all staff error:', error);
    return false;
  }
};

// Predefined notification templates
const notificationTemplates = {
  newBeneficiary: (beneficiaryName, createdBy) => ({
    type: 'success',
    title: 'Nouveau Bénéficiaire',
    message: `${beneficiaryName} a été ajouté au système`,
    icon: '👤',
    link: '/professional/beneficiaries'
  }),
  
  newAnnouncement: (title, createdBy) => ({
    type: 'announcement',
    title: 'Nouvelle Annonce',
    message: title,
    icon: '📢',
    link: '/professional/announcements'
  }),
  
  urgentAnnouncement: (title, createdBy) => ({
    type: 'urgent',
    title: '⚠️ Annonce Urgente',
    message: title,
    icon: '🚨',
    link: '/professional/announcements'
  }),
  
  beneficiaryExit: (beneficiaryName, createdBy) => ({
    type: 'info',
    title: 'Sortie de Bénéficiaire',
    message: `${beneficiaryName} a quitté la structure`,
    icon: '🚪',
    link: '/professional/beneficiaries'
  }),
  
  documentUploaded: (beneficiaryName, documentType, createdBy) => ({
    type: 'info',
    title: 'Document Ajouté',
    message: `Nouveau document (${documentType}) pour ${beneficiaryName}`,
    icon: '📄',
    link: '/professional/beneficiaries'
  }),
  
  attendanceReminder: () => ({
    type: 'warning',
    title: 'Rappel Pointage',
    message: 'N\'oubliez pas de pointer votre départ',
    icon: '⏰',
    link: '/professional/attendance'
  })
};

module.exports = {
  createNotification,
  notifyAllStaff,
  notificationTemplates
};
