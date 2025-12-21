import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import emailjs from '@emailjs/browser'
import '../App.css'
import { SITE_INFO, COPYRIGHT_YEAR } from '../config/siteInfo'
import { API_URL } from '../utils/api'

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
  const [newsItems, setNewsItems] = useState([])
  const formRef = useRef()

  const goToSection = (id) => {
    setIsMenuOpen(false)
    const el = document.getElementById(id)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
    window.location.hash = `#${id}`
  }

  const defaultNews = [
    {
      _id: 'default-1',
      date: '2025-11-10',
      title: "Grande collecte d'hiver réussie !",
      description:
        "Grâce à votre générosité, nous avons collecté plus de 2000 vêtements chauds et 500 couvertures pour affronter l'hiver.",
      image: '/images/actualites/news-1.jpg',
    },
    {
      _id: 'default-2',
      date: '2025-10-25',
      title: 'Nouveau partenariat avec des entreprises locales',
      description:
        "5 entreprises s'engagent à nos côtés pour faciliter l'insertion professionnelle de nos bénéficiaires.",
      image: '/images/actualites/news-2.jpg',
    },
    {
      _id: 'default-3',
      date: '2025-10-15',
      title: 'Témoignage : Le parcours de Mohamed',
      description:
        "Hébergé pendant 4 mois, Mohamed a retrouvé un emploi stable et un logement. Découvrez son parcours inspirant.",
      image: '/images/actualites/news-3.jpg',
    },
    {
      _id: 'default-4',
      date: '2025-10-05',
      title: 'Journée portes ouvertes : un succès !',
      description:
        "Plus de 200 visiteurs sont venus découvrir nos installations et rencontrer notre équipe lors de cette belle journée de partage.",
      image: '/images/actualites/news-4.jpg',
    },
    {
      _id: 'default-5',
      date: '2025-09-20',
      title: 'Lancement des ateliers cuisine solidaire',
      description:
        "Nos nouveaux ateliers cuisine permettent aux bénéficiaires d'apprendre et de partager autour de repas conviviaux.",
      image: '/images/actualites/news-5.jpg',
    },
    {
      _id: 'default-6',
      date: '2025-09-10',
      title: 'Nouvelle formation en rénovation',
      description:
        '12 bénéficiaires suivent actuellement une formation qualifiante en rénovation du bâtiment avec nos partenaires.',
      image: '/images/actualites/news-6.jpg',
    },
  ]

  useEffect(() => {
    let mounted = true
    const load = async () => {
      try {
        const res = await fetch(`${API_URL}/news?limit=6`, { method: 'GET' })
        if (!res.ok) throw new Error('Bad response')
        const json = await res.json()
        const data = Array.isArray(json?.data) ? json.data : []
        if (!mounted) return
        setNewsItems(data.length ? data : defaultNews)
      } catch (e) {
        if (!mounted) return
        setNewsItems(defaultNews)
      }
    }

    load()
    return () => {
      mounted = false
    }
  }, [])

  const formatDateFr = (value) => {
    try {
      const d = new Date(value)
      if (Number.isNaN(d.getTime())) return ''
      return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
    } catch {
      return ''
    }
  }

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
      setError("Une erreur s'est produite lors de l'envoi. Veuillez réessayer.")
      setIsLoading(false)
    })
  }

  return (
    <>
      {/* Header / Navigation */}
      <header className={`header ${isScrolled ? 'scrolled' : ''} ${headerVisible ? 'visible' : 'hidden'}`}>
        <div className="header-content">
          <a href="#accueil" className="logo-container">
            <img src="/images/logo.png" alt={`Logo ${SITE_INFO.name}`} className="logo-image" />
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
            <img src="/images/initiative.png" alt="Initiative" className="header-initiative-image" />
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
            <button className="btn-primary" onClick={() => navigate('/don')}>Faire un Don</button>
            <button className="btn-secondary" onClick={() => window.location.hash = '#contact'}>Nous contacter</button>
          </div>
          <div className="hero-stats">
            <div className="stat-item">
              <span className="stat-number">{SITE_INFO.stats.beneficiariesCurrent}+</span>
              <span className="stat-label">Bénéficiaires (actuellement)</span>
            </div>
            <div className="stat-item">
              <span className="stat-number">{SITE_INFO.stats.foundedYear}</span>
              <span className="stat-label">Centre créé</span>
            </div>
            <div className="stat-item">
              <span className="stat-number">{SITE_INFO.location.city}</span>
              <span className="stat-label">{SITE_INFO.location.country}</span>
            </div>
          </div>
        </div>
      </section>

      {/* Section À propos */}
      <section id="a-propos" className="section about-section">
        <div className="container">
          <h2 className="section-title">À Propos de Notre Association</h2>
          <p className="section-subtitle">
            {SITE_INFO.story.summaryFr}
          </p>
          
          <div className="about-content">
            <div className="about-grid">
              <div className="about-card">
                <div className="about-icon">📖</div>
                <h3>Notre Histoire</h3>
                <p>
                  <strong>{SITE_INFO.name}</strong> est active à <strong>{SITE_INFO.location.city}</strong>.
                  {` `}
                  {SITE_INFO.story.establishedContextFr}
                </p>
                <p>
                  Président : {SITE_INFO.leadership.president}.
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
                  <span className="value-icon">🔒</span>
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
                <div className="stat-number">{SITE_INFO.stats.beneficiariesMin}+</div>
                <div className="stat-text">Plus de 100 bénéficiaires</div>
              </div>
              <div className="stat-box">
                <div className="stat-number">{SITE_INFO.stats.beneficiariesCurrent}</div>
                <div className="stat-text">Jusqu'à 160 bénéficiaires</div>
              </div>
              <div className="stat-box">
                <div className="stat-number">{SITE_INFO.stats.foundedYear}</div>
                <div className="stat-text">Mise en place du centre</div>
              </div>
              <div className="stat-box">
                <div className="stat-number">24/7</div>
                <div className="stat-text">Hébergement & prise en charge</div>
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
              <h3>Hébergement & prise en charge</h3>
              <p>
                Centres d'hébergement pour les personnes en situation de rue, avec prise en charge et repas,
                notamment en période hivernale.
              </p>
            </div>
            
            <div className="service-card">
              <div className="service-icon">🍽️</div>
              <h3>Repas & aide alimentaire</h3>
              <p>
                Distribution de repas et de dons en nature (denrées, vêtements) selon les besoins.
              </p>
            </div>
            
            <div className="service-card">
              <div className="service-icon">📋</div>
              <h3>Accompagnement social & psychologique</h3>
              <p>
                Aide sociale et accompagnement pour les personnes en situation de grande précarité.
              </p>
            </div>
            
            <div className="service-card">
              <div className="service-icon">💼</div>
              <h3>Partenariats INDH</h3>
              <p>
                Actions de solidarité menées avec l'INDH et les autorités locales.
              </p>
            </div>
            
            <div className="service-card">
              <div className="service-icon">🏥</div>
              <h3>Lutte contre l'addiction</h3>
              <p>
                Sensibilisation et accompagnement social pour faire face aux problèmes d'addiction.
              </p>
            </div>
            
            <div className="service-card">
              <div className="service-icon">👨‍👩‍👧</div>
              <h3>Accompagnement humain</h3>
              <p>
                Orientation et mise en relation avec les services et institutions partenaires.
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
                Nous privilégions les <strong>dons en nature</strong> (repas, denrées, vêtements...).
                Contactez-nous pour organiser le dépôt.
              </p>
              <ul className="help-list">
                <li>✓ Repas</li>
                <li>✓ Vêtements & couvertures</li>
                <li>✓ Denrées & hygiène</li>
              </ul>
              <button className="btn-primary" onClick={() => navigate('/don')}>Je fais un don</button>
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
              <button className="btn-secondary" type="button" onClick={() => goToSection('contact')}>
                Je Deviens Bénévole
              </button>
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
              <button className="btn-secondary" type="button" onClick={() => goToSection('contact')}>
                Nous Contacter
              </button>
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
              <button className="btn-secondary" type="button" onClick={() => navigate('/don')}>
                Liste des Besoins
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Section Galerie / Actualités */}
      <section id="galerie" className="section news-section">
        <div className="container">
          <h2 className="section-title">Actualités & Événements</h2>
          <div className="news-grid">
            {newsItems.map((item) => (
              <article key={item._id || item.id} className="news-card">
                <div className="news-image">
                  {item.image ? (
                    <img
                      src={item.image}
                      alt={item.title}
                      onError={(e) => (e.currentTarget.parentElement.innerHTML = '📸')}
                    />
                  ) : (
                    '📸'
                  )}
                </div>
                <div className="news-content">
                  <span className="news-date">{formatDateFr(item.date)}</span>
                  <h3>{item.title}</h3>
                  <p>{item.description}</p>
                </div>
              </article>
            ))}
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
                  <strong>{SITE_INFO.contact.emergencyPhoneLabel}</strong>
                  <p>
                    {SITE_INFO.contact.emergencyPhone} {SITE_INFO.contact.emergencyPhoneNote}
                  </p>
                </div>
              </div>
              
              <div className="contact-item">
                <span className="contact-icon">📧</span>
                <div>
                  <strong>Email</strong>
                  <p>{SITE_INFO.contact.email}</p>
                </div>
              </div>
              
              <div className="contact-item">
                <span className="contact-icon">📍</span>
                <div>
                  <strong>Adresse</strong>
                  <p>
                    {SITE_INFO.contact.addressLines[0]}
                    <br />
                    {SITE_INFO.contact.addressLines[1]}
                  </p>
                </div>
              </div>
              
              <div className="contact-item">
                <span className="contact-icon">🕐</span>
                <div>
                  <strong>{SITE_INFO.contact.hoursTitle}</strong>
                  <p>
                    {SITE_INFO.contact.hoursLines[0]}
                    <br />
                    {SITE_INFO.contact.hoursLines[1]}
                  </p>
                </div>
              </div>
              
              <div className="social-links">
                <h3>Suivez-nous</h3>
                <div className="social-icons">
                  <a href={SITE_INFO.social.facebook} className="social-icon" aria-label="Facebook">📘</a>
                  <a href={SITE_INFO.social.twitter} className="social-icon" aria-label="Twitter">🐦</a>
                  <a href={SITE_INFO.social.instagram} className="social-icon" aria-label="Instagram">📷</a>
                  <a href={SITE_INFO.social.linkedin} className="social-icon" aria-label="LinkedIn">💼</a>
                </div>
              </div>
              
              <div className="map-container">
                <iframe
                  src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d106538.6494803!2d-7.6816!3d33.5731!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0xda7cd4778aa113b%3A0xb06c1d84f310fd3!2sCasablanca%2C%20Morocco!5e0!3m2!1sen!2s!4v1650000000000!5m2!1sen!2s"
                  width="100%"
                  height="300"
                  style={{ border: 0, borderRadius: '12px' }}
                  allowFullScreen=""
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  title="Localisation de l'association"
                ></iframe>
                <a
                  href={SITE_INFO.contact.googleMapsUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="map-link"
                >
                  📍 Ouvrir dans Google Maps
                </a>
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
                  {isLoading ? '⏳ Envoi...' : 'Envoyer le message'}
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
              <h4>{SITE_INFO.name}</h4>
              <p>{SITE_INFO.heroTagline}</p>
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
              <p>📞 {SITE_INFO.contact.emergencyPhone}</p>
              <p>📧 {SITE_INFO.contact.email}</p>
              <p>📍 {SITE_INFO.contact.addressLines[SITE_INFO.contact.addressLines.length - 1]}</p>
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
            <p>© {COPYRIGHT_YEAR} {SITE_INFO.name} - Tous droits réservés</p>
            <div className="footer-legal">
              <a href="#">Mentions légales</a>
              <a href="#">Politique de confidentialité</a>
              <a href="#">CGU</a>
              <a href="/login" style={{color: '#667eea', fontWeight: 'bold'}}>🔐 Espace Connexion</a>
            </div>
          </div>
        </div>
      </footer>
    </>
  )
}

export default HomePage
