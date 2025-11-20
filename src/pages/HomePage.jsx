import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import emailjs from '@emailjs/browser'
import '../App.css'

function HomePage() {
  const navigate = useNavigate()
  const [formData, setFormData] = useState({
    nom: '',
    email: '',
    telephone: '',
    message: ''
  })
  const [formSubmitted, setFormSubmitted] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [isScrolled, setIsScrolled] = useState(false)
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [lastScrollY, setLastScrollY] = useState(0)
  const [headerVisible, setHeaderVisible] = useState(true)
  const formRef = useRef()

  // Handle scroll for sticky header and auto-hide
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY
      
      // Add scrolled class after 50px
      setIsScrolled(currentScrollY > 50)
      
      // Auto-hide on scroll down, show on scroll up
      if (currentScrollY > lastScrollY && currentScrollY > 100) {
        setHeaderVisible(false) // Scrolling down
      } else {
        setHeaderVisible(true) // Scrolling up
      }
      
      setLastScrollY(currentScrollY)
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [lastScrollY])

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
    setError('')
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    // EmailJS Configuration
    // Service ID: service_xxxxxxx
    // Template ID: template_xxxxxxx
    // Public Key: your_public_key
    
    emailjs.sendForm(
      'service_xxxxxxx',  // سنستبدل هذا بـ Service ID الحقيقي
      'template_xxxxxxx', // سنستبدل هذا بـ Template ID الحقيقي
      formRef.current,
      'your_public_key'   // سنستبدل هذا بـ Public Key الحقيقي
    )
    .then((result) => {
      console.log('Email sent successfully:', result.text)
      setFormSubmitted(true)
      setIsLoading(false)
      setTimeout(() => {
        setFormSubmitted(false)
        setFormData({ nom: '', email: '', telephone: '', message: '' })
      }, 5000)
    })
    .catch((error) => {
      console.error('Error sending email:', error.text)
      setError('حدث خطأ في إرسال الرسالة. حاول مرة أخرى.')
      setIsLoading(false)
    })
  }

  return (
    <>
      {/* Header / Navigation */}
      <header className={`header ${isScrolled ? 'scrolled' : ''} ${headerVisible ? 'visible' : 'hidden'}`}>
        <div className="header-content">
          <a href="#accueil" className="logo-container">
            <img src="/images/logo.png" alt="Logo Adel Elouerif" className="logo-image" />
          </a>
          
          {/* Hamburger Menu Button */}
          <button 
            className="mobile-menu-btn"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            aria-label="Toggle menu"
          >
            <span></span>
            <span></span>
            <span></span>
          </button>
          
          <nav className={`nav ${isMenuOpen ? 'mobile-open' : ''}`}>
            <a href="#accueil" className="nav-link" onClick={() => setIsMenuOpen(false)}>Accueil</a>
            <a href="#a-propos" className="nav-link" onClick={() => setIsMenuOpen(false)}>À propos</a>
            <a href="#services" className="nav-link" onClick={() => setIsMenuOpen(false)}>Services</a>
            <a href="#aider" className="nav-link" onClick={() => setIsMenuOpen(false)}>Aider</a>
            <a href="#galerie" className="nav-link" onClick={() => setIsMenuOpen(false)}>Actualités</a>
            <a href="#contact" className="nav-link" onClick={() => setIsMenuOpen(false)}>Contact</a>
          </nav>

          <div className="header-image-container">
            <img src="/images/initiative.png" alt="المبادرة" className="header-initiative-image" />
          </div>
        </div>
      </header>

      {/* Mobile Menu Overlay */}
      {isMenuOpen && (
        <div 
          className="mobile-overlay" 
          onClick={() => setIsMenuOpen(false)}
        />
      )}

      {/* Section Accueil / Hero */}
      <section id="accueil" className="hero-section" style={{
        backgroundImage: 'url(/images/hero-background.jpg)',
        backgroundSize: 'cover',
        backgroundPosition: 'center'
      }}>
        <div className="hero-overlay"></div>
        <div className="hero-content">
          <h1 className="hero-title">Un toit, une chance, une dignité</h1>
          <p className="hero-subtitle">
            Ensemble, offrons une seconde chance à ceux qui en ont le plus besoin
          </p>
          <div className="hero-buttons">
            <button className="btn-primary">Faire un Don</button>
            <button className="btn-secondary">Devenir Bénévole</button>
          </div>
          <div className="hero-stats">
            <div className="stat-item">
              <span className="stat-number">500+</span>
              <span className="stat-label">Personnes aidées</span>
            </div>
            <div className="stat-item">
              <span className="stat-number">15</span>
              <span className="stat-label">Années d'expérience</span>
            </div>
            <div className="stat-item">
              <span className="stat-number">100+</span>
              <span className="stat-label">Bénévoles actifs</span>
            </div>
          </div>
        </div>
      </section>

      {/* Section À propos */}
      <section id="a-propos" className="section about-section">
        <div className="container">
          <h2 className="section-title">À Propos de Notre Association</h2>
          <p className="section-subtitle">
            Depuis 15 ans au service des plus démunis
          </p>
          
          <div className="about-content">
            <div className="about-grid">
              <div className="about-card">
                <div className="about-icon">📖</div>
                <h3>Notre Histoire</h3>
                <p>
                  Fondée en 2010, l'association Adel Elouerif est née d'une conviction profonde : 
                  <strong> chaque être humain mérite un toit et une chance de reconstruire sa vie</strong>. 
                  Partant d'un petit centre d'hébergement de 20 places, nous sommes aujourd'hui une 
                  référence régionale dans l'accompagnement des personnes sans abri, avec plus de 
                  <strong> 500 personnes aidées chaque année</strong>.
                </p>
                <p>
                  Notre parcours est marqué par un engagement constant auprès des plus vulnérables, 
                  dans le respect de leur dignité et de leurs choix de vie.
                </p>
              </div>
              
              <div className="about-card">
                <div className="about-icon">🎯</div>
                <h3>Notre Mission</h3>
                <p>
                  <strong>Offrir bien plus qu'un toit</strong> : nous proposons un hébergement temporaire 
                  sécurisé accompagné d'un soutien social global et personnalisé. Notre objectif est 
                  d'accompagner chaque personne vers la réinsertion sociale et professionnelle durable.
                </p>
                <p>
                  Nous croyons fermement en la <strong>dignité humaine</strong> et au droit fondamental 
                  de chacun à une seconde chance, quels que soient son parcours et ses difficultés.
                </p>
              </div>
              
              <div className="about-card">
                <div className="about-icon">🌟</div>
                <h3>Notre Vision</h3>
                <p>
                  Construire une société où <strong>personne n'est laissé pour compte</strong>. 
                  Nous aspirons à un monde où chaque individu, quelle que soit sa situation, 
                  bénéficie du soutien nécessaire pour retrouver autonomie et dignité.
                </p>
                <p>
                  Notre vision : <em>Un avenir où l'exclusion sociale n'existe plus</em>.
                </p>
              </div>
            </div>
            
            <div className="values-section">
              <h3 className="values-title">Nos Valeurs Fondamentales</h3>
              <div className="values-grid">
                <div className="value-item">
                  <span className="value-icon">🤝</span>
                  <strong>Solidarité</strong>
                  <p>Agir ensemble pour un impact durable. La force du collectif au service de l'individu.</p>
                </div>
                <div className="value-item">
                  <span className="value-icon">💎</span>
                  <strong>Dignité</strong>
                  <p>Respect inconditionnel de chaque personne. Chacun mérite considération et écoute.</p>
                </div>
                <div className="value-item">
                  <span className="value-icon">❤️</span>
                  <strong>Bienveillance</strong>
                  <p>Soutien mutuel et empathie. Créer un environnement chaleureux et sécurisant.</p>
                </div>
                <div className="value-item">
                  <span className="value-icon">⚖️</span>
                  <strong>Équité</strong>
                  <p>Sans jugement ni discrimination. Accueil ouvert à tous, dans le respect des différences.</p>
                </div>
                <div className="value-item">
                  <span className="value-icon">�</span>
                  <strong>Confidentialité</strong>
                  <p>Protection de la vie privée. Respect total du secret et de l'anonymat.</p>
                </div>
                <div className="value-item">
                  <span className="value-icon">💪</span>
                  <strong>Autonomie</strong>
                  <p>Accompagner vers l'indépendance. Redonner pouvoir et confiance en soi.</p>
                </div>
              </div>
            </div>
            
            <div className="stats-banner">
              <div className="stat-box">
                <div className="stat-number">500+</div>
                <div className="stat-text">Personnes aidées par an</div>
              </div>
              <div className="stat-box">
                <div className="stat-number">15</div>
                <div className="stat-text">Années d'expérience</div>
              </div>
              <div className="stat-box">
                <div className="stat-number">100+</div>
                <div className="stat-text">Bénévoles engagés</div>
              </div>
              <div className="stat-box">
                <div className="stat-number">24/7</div>
                <div className="stat-text">Accueil d'urgence</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Section Nos Services */}
      <section id="services" className="section services-section">
        <div className="container">
          <h2 className="section-title">Nos Services</h2>
          <p className="section-subtitle">
            Un accompagnement complet pour une réinsertion réussie
          </p>
          <div className="services-grid">
            <div className="service-card">
              <div className="service-icon">🏡</div>
              <h3>Hébergement d'Urgence</h3>
              <p>
                Accueil 24h/24 avec chambres sécurisées, lits confortables et installations 
                sanitaires complètes. Hébergement temporaire jusqu'à 6 mois.
              </p>
            </div>
            
            <div className="service-card">
              <div className="service-icon">🍽️</div>
              <h3>Distribution Alimentaire</h3>
              <p>
                Trois repas chauds et équilibrés par jour. Distribution de colis alimentaires 
                et vêtements selon les besoins.
              </p>
            </div>
            
            <div className="service-card">
              <div className="service-icon">📋</div>
              <h3>Orientation Sociale</h3>
              <p>
                Aide aux démarches administratives : papiers d'identité, droits sociaux, 
                allocations, carte vitale, etc.
              </p>
            </div>
            
            <div className="service-card">
              <div className="service-icon">💼</div>
              <h3>Réinsertion Professionnelle</h3>
              <p>
                Ateliers CV, formations professionnelles, mise en relation avec employeurs, 
                coaching emploi personnalisé.
              </p>
            </div>
            
            <div className="service-card">
              <div className="service-icon">🏥</div>
              <h3>Assistance Psychologique</h3>
              <p>
                Soutien psychologique avec psychologues bénévoles, groupes de parole, 
                écoute active et orientation vers les services spécialisés.
              </p>
            </div>
            
            <div className="service-card">
              <div className="service-icon">👨‍👩‍👧</div>
              <h3>Accompagnement Familial</h3>
              <p>
                Accueil des familles, médiation familiale, aide à la parentalité et 
                reconstruction des liens sociaux.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Section Comment Aider */}
      <section id="aider" className="section help-section">
        <div className="container">
          <h2 className="section-title">Comment Nous Aider ?</h2>
          <p className="section-subtitle">
            Votre soutien fait toute la différence
          </p>
          
          <div className="help-grid">
            <div className="help-card">
              <div className="help-icon">💰</div>
              <h3>Faire un Don</h3>
              <p>
                Vos dons financiers nous permettent de maintenir nos services et d'accueillir 
                plus de personnes dans le besoin. Chaque euro compte.
              </p>
              <ul className="help-list">
                <li>✓ Don ponctuel ou mensuel</li>
                <li>✓ Déduction fiscale 66%</li>
                <li>✓ Paiement sécurisé</li>
              </ul>
              <button className="btn-primary">Je Fais un Don</button>
            </div>
            
            <div className="help-card">
              <div className="help-icon">🙋</div>
              <h3>Devenir Bénévole</h3>
              <p>
                Rejoignez notre équipe de bénévoles et donnez de votre temps pour aider 
                ceux qui en ont besoin.
              </p>
              <ul className="help-list">
                <li>✓ Accueil et écoute</li>
                <li>✓ Distribution de repas</li>
                <li>✓ Accompagnement administratif</li>
                <li>✓ Animation d'ateliers</li>
              </ul>
              <button className="btn-secondary">Je Deviens Bénévole</button>
            </div>
            
            <div className="help-card">
              <div className="help-icon">🤝</div>
              <h3>Partenariats</h3>
              <p>
                Entreprises, associations, collectivités : ensemble, créons des synergies 
                pour plus d'impact social.
              </p>
              <ul className="help-list">
                <li>✓ Mécénat d'entreprise</li>
                <li>✓ Partenariats stratégiques</li>
                <li>✓ Actions solidaires</li>
              </ul>
              <button className="btn-secondary">Nous Contacter</button>
            </div>
            
            <div className="help-card">
              <div className="help-icon">📦</div>
              <h3>Dons Matériels</h3>
              <p>
                Nous acceptons les dons de vêtements, nourriture non périssable, couvertures, 
                produits d'hygiène...
              </p>
              <ul className="help-list">
                <li>✓ Vêtements propres et en bon état</li>
                <li>✓ Produits d'hygiène neufs</li>
                <li>✓ Denrées alimentaires</li>
                <li>✓ Couvertures et literie</li>
              </ul>
              <button className="btn-secondary">Liste des Besoins</button>
            </div>
          </div>
        </div>
      </section>

      {/* Section Galerie / Actualités */}
      <section id="galerie" className="section news-section">
        <div className="container">
          <h2 className="section-title">Actualités & Événements</h2>
          <div className="news-grid">
            <article className="news-card">
              <div className="news-image">
                <img src="/images/actualites/news-1.jpg" alt="Grande collecte d'hiver" onError={(e) => e.target.parentElement.innerHTML = '📸'} />
              </div>
              <div className="news-content">
                <span className="news-date">10 Novembre 2025</span>
                <h3>Grande collecte d'hiver réussie !</h3>
                <p>
                  Grâce à votre générosité, nous avons collecté plus de 2000 vêtements chauds 
                  et 500 couvertures pour affronter l'hiver.
                </p>
                <a href="#" className="news-link">Lire la suite →</a>
              </div>
            </article>
            
            <article className="news-card">
              <div className="news-image">
                <img src="/images/actualites/news-2.jpg" alt="Partenariat entreprises" onError={(e) => e.target.parentElement.innerHTML = '📸'} />
              </div>
              <div className="news-content">
                <span className="news-date">25 Octobre 2025</span>
                <h3>Nouveau partenariat avec des entreprises locales</h3>
                <p>
                  5 entreprises s'engagent à nos côtés pour faciliter l'insertion professionnelle 
                  de nos bénéficiaires.
                </p>
                <a href="#" className="news-link">Lire la suite →</a>
              </div>
            </article>
            
            <article className="news-card">
              <div className="news-image">
                <img src="/images/actualites/news-3.jpg" alt="Témoignage Mohamed" onError={(e) => e.target.parentElement.innerHTML = '📸'} />
              </div>
              <div className="news-content">
                <span className="news-date">15 Octobre 2025</span>
                <h3>Témoignage : Le parcours de Mohamed</h3>
                <p>
                  Hébergé pendant 4 mois, Mohamed a retrouvé un emploi stable et un logement. 
                  Découvrez son parcours inspirant.
                </p>
                <a href="#" className="news-link">Lire la suite →</a>
              </div>
            </article>

            <article className="news-card">
              <div className="news-image">
                <img src="/images/actualites/news-4.jpg" alt="Journée portes ouvertes" onError={(e) => e.target.parentElement.innerHTML = '📸'} />
              </div>
              <div className="news-content">
                <span className="news-date">5 Octobre 2025</span>
                <h3>Journée portes ouvertes : un succès !</h3>
                <p>
                  Plus de 200 visiteurs sont venus découvrir nos installations et rencontrer 
                  notre équipe lors de cette belle journée de partage.
                </p>
                <a href="#" className="news-link">Lire la suite →</a>
              </div>
            </article>

            <article className="news-card">
              <div className="news-image">
                <img src="/images/actualites/news-5.jpg" alt="Atelier cuisine" onError={(e) => e.target.parentElement.innerHTML = '📸'} />
              </div>
              <div className="news-content">
                <span className="news-date">20 Septembre 2025</span>
                <h3>Lancement des ateliers cuisine solidaire</h3>
                <p>
                  Nos nouveaux ateliers cuisine permettent aux bénéficiaires d'apprendre 
                  et de partager autour de repas conviviaux.
                </p>
                <a href="#" className="news-link">Lire la suite →</a>
              </div>
            </article>

            <article className="news-card">
              <div className="news-image">
                <img src="/images/actualites/news-6.jpg" alt="Formation professionnelle" onError={(e) => e.target.parentElement.innerHTML = '📸'} />
              </div>
              <div className="news-content">
                <span className="news-date">10 Septembre 2025</span>
                <h3>Nouvelle formation en rénovation</h3>
                <p>
                  12 bénéficiaires suivent actuellement une formation qualifiante en 
                  rénovation du bâtiment avec nos partenaires.
                </p>
                <a href="#" className="news-link">Lire la suite →</a>
              </div>
            </article>
          </div>
        </div>
      </section>

      {/* Section Contact */}
      <section id="contact" className="section contact-section">
        <div className="container">
          <h2 className="section-title">Contactez-Nous</h2>
          <div className="contact-grid">
            <div className="contact-info">
              <h3>Coordonnées</h3>
              
              <div className="contact-item">
                <span className="contact-icon">📞</span>
                <div>
                  <strong>Téléphone d'urgence</strong>
                  <p>0800 123 456 (gratuit, 24h/24)</p>
                </div>
              </div>
              
              <div className="contact-item">
                <span className="contact-icon">📧</span>
                <div>
                  <strong>Email</strong>
                  <p>contact@adelelouerif.org</p>
                </div>
              </div>
              
              <div className="contact-item">
                <span className="contact-icon">📍</span>
                <div>
                  <strong>Adresse</strong>
                  <p>123 Rue de la Solidarité<br/>75000 Paris, France</p>
                </div>
              </div>
              
              <div className="contact-item">
                <span className="contact-icon">🕐</span>
                <div>
                  <strong>Horaires d'accueil</strong>
                  <p>Lundi - Dimanche : 24h/24<br/>Permanence téléphonique 24h/24</p>
                </div>
              </div>
              
              <div className="social-links">
                <h3>Suivez-nous</h3>
                <div className="social-icons">
                  <a href="#" className="social-icon" aria-label="Facebook">📘</a>
                  <a href="#" className="social-icon" aria-label="Twitter">🐦</a>
                  <a href="#" className="social-icon" aria-label="Instagram">📷</a>
                  <a href="#" className="social-icon" aria-label="LinkedIn">💼</a>
                </div>
              </div>
              
              <div className="map-placeholder">
                <div className="map-content">
                  🗺️
                  <p>Carte Google Maps</p>
                  <small>(Intégration disponible)</small>
                </div>
              </div>
            </div>
            
            <div className="contact-form-container">
              <h3>Envoyez-nous un message</h3>
              <form ref={formRef} className="contact-form" onSubmit={handleSubmit}>
                <div className="form-group">
                  <label htmlFor="nom">Nom complet *</label>
                  <input 
                    type="text" 
                    id="nom" 
                    name="nom"
                    value={formData.nom}
                    onChange={handleInputChange}
                    required 
                    placeholder="Votre nom"
                  />
                </div>
                
                <div className="form-group">
                  <label htmlFor="email">Email *</label>
                  <input 
                    type="email" 
                    id="email" 
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    required 
                    placeholder="votre@email.com"
                  />
                </div>
                
                <div className="form-group">
                  <label htmlFor="telephone">Téléphone</label>
                  <input 
                    type="tel" 
                    id="telephone" 
                    name="telephone"
                    value={formData.telephone}
                    onChange={handleInputChange}
                    placeholder="06 12 34 56 78"
                  />
                </div>
                
                <div className="form-group">
                  <label htmlFor="message">Message *</label>
                  <textarea 
                    id="message" 
                    name="message"
                    value={formData.message}
                    onChange={handleInputChange}
                    rows="5" 
                    required
                    placeholder="Votre message..."
                  ></textarea>
                </div>
                
                <button type="submit" className="btn-primary btn-submit" disabled={isLoading}>
                  {isLoading ? '⏳ جاري الإرسال...' : 'Envoyer le message'}
                </button>
                
                {error && (
                  <div className="form-error">
                    ⚠️ {error}
                  </div>
                )}
                
                {formSubmitted && (
                  <div className="form-success">
                    ✓ Message envoyé avec succès ! Nous vous répondrons rapidement.
                  </div>
                )}
              </form>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="footer">
        <div className="container">
          <div className="footer-content">
            <div className="footer-section">
              <h4>Association Adel Elouerif</h4>
              <p>Un toit, une chance, une dignité</p>
              <p className="footer-mission">
                Depuis 15 ans, nous œuvrons pour offrir hébergement, 
                dignité et espoir aux personnes sans abri.
              </p>
            </div>
            
            <div className="footer-section">
              <h4>Liens Rapides</h4>
              <ul className="footer-links">
                <li><a href="#accueil">Accueil</a></li>
                <li><a href="#a-propos">À propos</a></li>
                <li><a href="#services">Services</a></li>
                <li><a href="#aider">Comment aider</a></li>
                <li><a href="#contact">Contact</a></li>
              </ul>
            </div>
            
            <div className="footer-section">
              <h4>Contact</h4>
              <p>📞 0800 123 456</p>
              <p>📧 contact@adelelouerif.org</p>
              <p>📍 Paris, France</p>
            </div>
            
            <div className="footer-section">
              <h4>Newsletter</h4>
              <p>Recevez nos actualités</p>
              <div className="newsletter-form">
                <input type="email" placeholder="Votre email" />
                <button>S'inscrire</button>
              </div>
            </div>
          </div>
          
          <div className="footer-bottom">
            <p>© 2025 Association Adel Elouerif - Tous droits réservés</p>
            <div className="footer-legal">
              <a href="#">Mentions légales</a>
              <a href="#">Politique de confidentialité</a>
              <a href="#">CGU</a>
              <a href="/login" style={{color: '#667eea', fontWeight: 'bold'}}>🔐 Espace Connexion</a>
            </div>
          </div>
        </div>
      </footer>

      {/* Bouton Don Flottant */}
      <button className="floating-don-btn" title="Faire un don">
        💛 Don
      </button>
    </>
  )
}

export default HomePage
