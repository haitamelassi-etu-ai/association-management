import React from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/EmergencyPage.css';

const EmergencyPage = () => {
  const navigate = useNavigate();

  const emergencyContacts = [
    {
      title: "Ligne d'Urgence 24/7",
      number: "+212 5XX-XXXXXX",
      description: "Disponible jour et nuit pour toute urgence",
      icon: "🆘"
    },
    {
      title: "WhatsApp Urgence",
      number: "+212 6XX-XXXXXX",
      description: "Réponse rapide via WhatsApp",
      icon: "💬"
    },
    {
      title: "Email Urgence",
      email: "urgence@association.ma",
      description: "Pour situations nécessitant documentation",
      icon: "📧"
    }
  ];

  const emergencyTypes = [
    {
      title: "Violence Immédiate",
      description: "Si vous êtes en danger maintenant",
      action: "Appelez immédiatement",
      icon: "🚨",
      urgent: true
    },
    {
      title: "Besoin d'Hébergement",
      description: "Hébergement d'urgence disponible 24h/24",
      action: "Contactez-nous",
      icon: "🏠",
      urgent: true
    },
    {
      title: "Aide Psychologique",
      description: "Soutien psychologique immédiat",
      action: "Assistance disponible",
      icon: "❤️",
      urgent: false
    },
    {
      title: "Assistance Juridique",
      description: "Conseils juridiques d'urgence",
      action: "Consultation rapide",
      icon: "⚖️",
      urgent: false
    }
  ];

  const safetyTips = [
    "Préparez un sac d'urgence avec documents importants",
    "Mémorisez les numéros d'urgence",
    "Identifiez un lieu sûr où aller",
    "Informez une personne de confiance",
    "Gardez votre téléphone chargé"
  ];

  return (
    <div className="emergency-page">
      {/* Alert Header */}
      <div className="emergency-alert">
        <div className="container">
          <div className="alert-content">
            <span className="alert-icon">⚠️</span>
            <div>
              <strong>Besoin d'aide immédiate?</strong>
              <p>Si vous êtes en danger, appelez le 19 (police) ou contactez-nous directement</p>
            </div>
          </div>
        </div>
      </div>

      {/* Hero Section */}
      <section className="emergency-hero">
        <div className="container">
          <button className="back-btn" onClick={() => navigate('/')}>
            ← Retour
          </button>
          <div className="hero-content">
            <h1>🆘 Aide d'Urgence</h1>
            <p>Nous sommes là pour vous, 24h/24 et 7j/7</p>
          </div>
        </div>
      </section>

      <div className="container">
        {/* Emergency Contacts */}
        <section className="emergency-contacts">
          <h2>Contacts d'Urgence</h2>
          <div className="contacts-grid">
            {emergencyContacts.map((contact, index) => (
              <div key={index} className="contact-card">
                <div className="contact-icon">{contact.icon}</div>
                <h3>{contact.title}</h3>
                <div className="contact-number">
                  {contact.number || contact.email}
                </div>
                <p>{contact.description}</p>
                {contact.number && (
                  <a href={`tel:${contact.number}`} className="btn-call">
                    📞 Appeler Maintenant
                  </a>
                )}
                {contact.email && (
                  <a href={`mailto:${contact.email}`} className="btn-email">
                    ✉️ Envoyer Email
                  </a>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* Emergency Types */}
        <section className="emergency-types">
          <h2>Types d'Urgence</h2>
          <div className="types-grid">
            {emergencyTypes.map((type, index) => (
              <div key={index} className={`type-card ${type.urgent ? 'urgent' : ''}`}>
                <div className="type-icon">{type.icon}</div>
                <h3>{type.title}</h3>
                <p>{type.description}</p>
                <div className="type-action">{type.action}</div>
                {type.urgent && <span className="urgent-badge">Urgent</span>}
              </div>
            ))}
          </div>
        </section>

        {/* Safety Tips */}
        <section className="safety-tips">
          <h2>Conseils de Sécurité</h2>
          <div className="tips-card">
            <div className="tips-icon">🛡️</div>
            <ul className="tips-list">
              {safetyTips.map((tip, index) => (
                <li key={index}>
                  <span className="tip-bullet">✓</span>
                  {tip}
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Police & Medical */}
        <section className="official-numbers">
          <h2>Numéros Officiels</h2>
          <div className="official-grid">
            <div className="official-card police">
              <div className="official-icon">🚔</div>
              <h3>Police</h3>
              <div className="official-number">19</div>
              <a href="tel:19" className="btn-official">Appeler</a>
            </div>
            <div className="official-card medical">
              <div className="official-icon">🚑</div>
              <h3>SAMU</h3>
              <div className="official-number">15</div>
              <a href="tel:15" className="btn-official">Appeler</a>
            </div>
            <div className="official-card fire">
              <div className="official-icon">🚒</div>
              <h3>Pompiers</h3>
              <div className="official-number">150</div>
              <a href="tel:150" className="btn-official">Appeler</a>
            </div>
          </div>
        </section>

        {/* Confidentiality */}
        <section className="confidentiality">
          <div className="confidentiality-card">
            <div className="conf-icon">🔒</div>
            <h3>Confidentialité Garantie</h3>
            <p>
              Tous vos contacts avec notre association sont strictement confidentiels. 
              Nous respectons votre vie privée et votre sécurité est notre priorité absolue.
            </p>
          </div>
        </section>

        {/* Location */}
        <section className="emergency-location">
          <h2>Notre Localisation</h2>
          <div className="location-card">
            <div className="location-info">
              <h3>📍 Adresse</h3>
              <p>123 Rue de la Solidarité<br/>Casablanca, Maroc</p>
            </div>
            <div className="location-info">
              <h3>🕐 Disponibilité</h3>
              <p>24 heures sur 24<br/>7 jours sur 7</p>
            </div>
            <div className="location-info">
              <h3>🚗 Accès</h3>
              <p>Accessible en transport<br/>Parking disponible</p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default EmergencyPage;
