import React, { useState } from 'react';
import '../styles/DonationPage.css';
import { SITE_INFO } from '../config/siteInfo';

const DonationPage = () => {
  const [copiedText, setCopiedText] = useState('');

  const donationInfo = SITE_INFO.donation;

  const copyToClipboard = (text, label) => {
    navigator.clipboard.writeText(text);
    setCopiedText(label);
    setTimeout(() => setCopiedText(''), 2000);
  };

  return (
    <div className="donation-page">
      {/* Hero Section */}
      <section className="donation-hero">
        <div className="container">
          <div className="hero-content">
            <h1>Faire un Don</h1>
            <p>Les dons en nature font la différence</p>
          </div>
        </div>
      </section>

      <div className="container">
        {/* Impact Section */}
        <section className="impact-section">
          <h2>Quels dons acceptons-nous ?</h2>
          <div className="impact-grid">
            {donationInfo.kinds.map((kind) => (
              <div className="impact-card" key={kind}>
                <div className="impact-icon">🤲</div>
                <h3>{kind}</h3>
                <p>Pour les personnes en situation de précarité</p>
              </div>
            ))}
          </div>
        </section>

        {/* Donation Methods */}
        <section className="donation-methods">
          <h2>Comment déposer les dons ?</h2>

          <div className="method-card">
            <div className="method-header">
              <div className="method-icon">📦</div>
              <div>
                <h3>Dons en nature uniquement</h3>
                <p>Repas / denrées / vêtements / couvertures / hygiène</p>
              </div>
            </div>

            <div className="bank-details">
              <div className="detail-row">
                <span className="detail-label">Téléphone</span>
                <div className="detail-value">
                  <span className="detail-code">{SITE_INFO.contact.emergencyPhone}</span>
                  <button
                    className="copy-btn"
                    onClick={() => copyToClipboard(SITE_INFO.contact.emergencyPhone, 'PHONE')}
                  >
                    {copiedText === 'PHONE' ? '✓ Copié' : '📋 Copier'}
                  </button>
                </div>
              </div>

              <div className="detail-row">
                <span className="detail-label">Email</span>
                <div className="detail-value">
                  <span className="detail-code">{SITE_INFO.contact.email}</span>
                  <button
                    className="copy-btn"
                    onClick={() => copyToClipboard(SITE_INFO.contact.email, 'EMAIL')}
                  >
                    {copiedText === 'EMAIL' ? '✓ Copié' : '📋 Copier'}
                  </button>
                </div>
              </div>

              <div className="detail-row">
                <span className="detail-label">Ville</span>
                <div className="detail-value">
                  <span>{SITE_INFO.location.city} - {SITE_INFO.location.country}</span>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default DonationPage;
