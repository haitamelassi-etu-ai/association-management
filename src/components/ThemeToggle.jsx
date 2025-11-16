import React from 'react';
import { useTheme } from '../contexts/ThemeContext';
import './ThemeToggle.css';

const ThemeToggle = () => {
  const { theme, toggleTheme } = useTheme();

  return (
    <button className="theme-toggle" onClick={toggleTheme} title={theme === 'light' ? 'الوضع الليلي' : 'الوضع النهاري'}>
      {theme === 'light' ? (
        <i className="fas fa-moon"></i>
      ) : (
        <i className="fas fa-sun"></i>
      )}
    </button>
  );
};

export default ThemeToggle;
