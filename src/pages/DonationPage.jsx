import React, { useState } from 'react';
import '../styles/DonationPage.css';

const DonationPage = () => {
  const [copiedText, setCopiedText] = useState('');

  const bankInfo = {
    bankName: "Banque Populaire",
    accountName: "Association Solidarité Maroc",
    rib: "123 456 789012345678901234",
    iban: "MA64 123456789012345678901234",
    swift: "BCPOMAMC"
  };

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
            <p>Votre générosité peut changer des vies</p>
          </div>
        </div>
      </section>

      <div className="container">
        {/* Impact Section */}
        <section className="impact-section">
          <h2>L'Impact de Votre Don</h2>
          <div className="impact-grid">
            <div className="impact-card">
              <div className="impact-icon">🏠</div>
              <h3>100 DH</h3>
              <p>Aide alimentaire pour une famille pendant une semaine</p>
            </div>
            <div className="impact-card">
              <div className="impact-icon">❤️</div>
              <h3>500 DH</h3>
              <p>Soutien psychologique et accompagnement juridique</p>
            </div>
            <div className="impact-card">
              <div className="impact-icon">🛡️</div>
              <h3>1000 DH</h3>
              <p>Hébergement d'urgence pour une personne pendant un mois</p>
            </div>
            <div className="impact-card">
              <div className="impact-icon">✨</div>
              <h3>2000 DH</h3>
              <p>Programme complet de réinsertion sociale</p>
            </div>
          </div>
        </section>

        {/* Donation Methods */}
        <section className="donation-methods">
          <h2>Méthodes de Don</h2>
          
          {/* Bank Transfer */}
          <div className="method-card">
            <div className="method-header">
              <div className="method-icon">🏦</div>
              <div>
                <h3>Virement Bancaire</h3>
                <p>Méthode sécurisée et directe</p>
              </div>
            </div>
            <div className="bank-details">
              <div className="detail-row">
                <span className="detail-label">Banque</span>
                <div className="detail-value">
                  <span>{bankInfo.bankName}</span>
                </div>
              </div>
              <div className="detail-row">
                <span className="detail-label">Titulaire</span>
                <div className="detail-value">
                  <span>{bankInfo.accountName}</span>
                </div>
              </div>
              <div className="detail-row">
                <span className="detail-label">RIB</span>
                <div className="detail-value">
                  <span className="detail-code">{bankInfo.rib}</span>
                  <button 
                    className="copy-btn"
                    onClick={() => copyToClipboard(bankInfo.rib, 'RIB')}
                  >
                    {copiedText === 'RIB' ? '✓ Copié' : '📋 Copier'}
                  </button>
                </div>
              </div>
              <div className="detail-row">
                <span className="detail-label">IBAN</span>
                <div className="detail-value">
                  <span className="detail-code">{bankInfo.iban}</span>
                  <button 
                    className="copy-btn"
                    onClick={() => copyToClipboard(bankInfo.iban, 'IBAN')}
                  >
                    {copiedText === 'IBAN' ? '✓ Copié' : '📋 Copier'}
                  </button>
                </div>
              </div>
              <div className="detail-row">
                <span className="detail-label">Code SWIFT</span>
                <div className="detail-value">
                  <span className="detail-code">{bankInfo.swift}</span>
                  <button 
                    className="copy-btn"
                    onClick={() => copyToClipboard(bankInfo.swift, 'SWIFT')}
                  >
                    {copiedText === 'SWIFT' ? '✓ Copié' : '📋 Copier'}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Cash Donation */}
          <div className="method-card">
            <div className="method-header">
              <div className="method-icon">💵</div>
              <div>
                <h3>Don en Espèces</h3>
                <p>Visitez notre siège social</p>
              </div>
            </div>
            <div className="cash-info">
              <p><strong>📍 Adresse:</strong> 123 Rue de la Solidarité, Casablanca</p>
              <p><strong>🕐 Horaires:</strong> Lun-Ven: 9h-17h, Sam: 9h-13h</p>
              <p><strong>📞 Contact:</strong> +212 5XX-XXXXXX</p>
            </div>
          </div>

          {/* Material Donation */}
          <div className="method-card">
            <div className="method-header">
              <div className="method-icon">📦</div>
              <div>
                <h3>Don en Nature</h3>
                <p>Vêtements, nourriture, produits d'hygiène</p>
              </div>
            </div>
            <div className="material-info">
              <ul>
                <li>🧥 Vêtements en bon état (femmes, enfants)</li>
                <li>🍝 Produits alimentaires non périssables</li>
                <li>🧴 Produits d'hygiène et de soins</li>
                <li>📚 Livres et matériel éducatif</li>
                <li>🛏️ Articles de literie neufs</li>
              </ul>
            </div>
          </div>
        </section>

        {/* Tax Deduction */}
        <section className="tax-section">
          <div className="tax-card">
            <div className="tax-icon">📄</div>
            <div className="tax-content">
              <h3>Déduction Fiscale</h3>
              <p>
                Vos dons sont déductibles des impôts conformément à la législation marocaine. 
                Un reçu fiscal vous sera envoyé pour tout don égal ou supérieur à 100 DH.
              </p>
            </div>
          </div>
        </section>

        {/* Trust Section */}
        <section className="trust-section">
          <h2>Votre Don en Toute Confiance</h2>
          <div className="trust-grid">
            <div className="trust-item">
              <div className="trust-icon">✓</div>
              <h4>Transparence Totale</h4>
              <p>Rapports financiers annuels disponibles</p>
            </div>
            <div className="trust-item">
              <div className="trust-icon">✓</div>
              <h4>100% Sécurisé</h4>
              <p>Vos données sont protégées</p>
            </div>
            <div className="trust-item">
              <div className="trust-icon">✓</div>
              <h4>Impact Direct</h4>
              <p>Chaque dirham aide directement les bénéficiaires</p>
            </div>
            <div className="trust-item">
              <div className="trust-icon">✓</div>
              <h4>Suivi Régulier</h4>
              <p>Recevez des nouvelles de nos actions</p>
            </div>
          </div>
        </section>

        {/* Contact CTA */}
        <section className="contact-cta">
          <h2>Des Questions?</h2>
          <p>Notre équipe est disponible pour répondre à toutes vos questions sur les dons</p>
          <div className="cta-buttons">
            <a href="tel:+212XXXXXXXXX" className="btn-primary">
              📞 Appelez-nous
            </a>
            <a href="mailto:contact@association.ma" className="btn-secondary">
              ✉️ Envoyez un Email
            </a>
          </div>
        </section>
      </div>
    </div>
  );
};

export default DonationPage;
