import React from 'react';
import { useTranslation } from 'react-i18next';
import './LanguageSwitcher.css';

const LanguageSwitcher = () => {
  const { i18n, t } = useTranslation();

  const languages = [
    { code: 'ar', name: 'العربية', flag: '🇲🇦', dir: 'rtl' },
    { code: 'fr', name: 'Français', flag: '🇫🇷', dir: 'ltr' },
    { code: 'en', name: 'English', flag: '🇬🇧', dir: 'ltr' }
  ];

  const changeLanguage = (langCode, direction) => {
    i18n.changeLanguage(langCode);
    localStorage.setItem('language', langCode);
    document.documentElement.setAttribute('dir', direction);
    document.documentElement.setAttribute('lang', langCode);
  };

  const currentLang = languages.find(lang => lang.code === i18n.language) || languages[0];

  return (
    <div className="language-switcher">
      <button className="lang-button" title={t('language.selectLanguage')}>
        <span className="lang-flag">{currentLang.flag}</span>
        <span className="lang-code">{currentLang.code.toUpperCase()}</span>
        <i className="fas fa-chevron-down"></i>
      </button>
      <div className="lang-dropdown">
        {languages.map((lang) => (
          <button
            key={lang.code}
            className={`lang-option ${i18n.language === lang.code ? 'active' : ''}`}
            onClick={() => changeLanguage(lang.code, lang.dir)}
          >
            <span className="lang-flag">{lang.flag}</span>
            <span className="lang-name">{lang.name}</span>
            {i18n.language === lang.code && (
              <i className="fas fa-check"></i>
            )}
          </button>
        ))}
      </div>
    </div>
  );
};

export default LanguageSwitcher;
