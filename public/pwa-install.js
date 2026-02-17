// Register Service Worker and handle PWA installation
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then((registration) => {
        console.log('✅ Service Worker registered:', registration.scope);
        
        // Check for updates
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          console.log('🔄 New Service Worker found, updating...');
        });
      })
      .catch((error) => {
        console.error('❌ Service Worker registration failed:', error);
      });
  });
}

// PWA Install Prompt
let deferredPrompt;
const installButton = document.createElement('button');
installButton.id = 'pwa-install-button';
installButton.style.cssText = `
  position: fixed;
  bottom: 20px;
  right: 20px;
  padding: 15px 25px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 50px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
  z-index: 9999;
  display: none;
  transition: all 0.3s ease;
`;
installButton.innerHTML = '📱 Installer l\'application';
document.body.appendChild(installButton);

installButton.addEventListener('mouseenter', () => {
  installButton.style.transform = 'scale(1.05)';
  installButton.style.boxShadow = '0 6px 20px rgba(102, 126, 234, 0.6)';
});

installButton.addEventListener('mouseleave', () => {
  installButton.style.transform = 'scale(1)';
  installButton.style.boxShadow = '0 4px 15px rgba(102, 126, 234, 0.4)';
});

window.addEventListener('beforeinstallprompt', (e) => {
  // Prevent the default install prompt
  e.preventDefault();
  // Save the event
  deferredPrompt = e;
  // Show the install button
  installButton.style.display = 'block';
  
  console.log('💡 PWA installation available');
});

installButton.addEventListener('click', async () => {
  if (!deferredPrompt) {
    return;
  }
  
  // Show the install prompt
  deferredPrompt.prompt();
  
  // Wait for the user's response
  const { outcome } = await deferredPrompt.userChoice;
  console.log(`User response to install prompt: ${outcome}`);
  
  if (outcome === 'accepted') {
    console.log('✅ PWA installation accepted');
    // Show success message
    const successMsg = document.createElement('div');
    successMsg.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 15px 25px;
      background: #10b981;
      color: white;
      border-radius: 10px;
      font-weight: 600;
      z-index: 10000;
      animation: slideIn 0.3s ease;
    `;
    successMsg.textContent = '✅ Application installée avec succès!';
    document.body.appendChild(successMsg);
    
    setTimeout(() => {
      successMsg.style.animation = 'slideOut 0.3s ease';
      setTimeout(() => successMsg.remove(), 300);
    }, 3000);
  } else {
    console.log('❌ PWA installation rejected');
  }
  
  // Hide the install button
  installButton.style.display = 'none';
  deferredPrompt = null;
});

// Detect when PWA is successfully installed
window.addEventListener('appinstalled', () => {
  console.log('🎉 PWA installed successfully!');
  installButton.style.display = 'none';
  deferredPrompt = null;
});

// Detect if app is running in standalone mode
if (window.matchMedia('(display-mode: standalone)').matches) {
  console.log('📱 Running as PWA');
}

// Add animation styles
const style = document.createElement('style');
style.textContent = `
  @keyframes slideIn {
    from {
      transform: translateX(400px);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }
  
  @keyframes slideOut {
    from {
      transform: translateX(0);
      opacity: 1;
    }
    to {
      transform: translateX(400px);
      opacity: 0;
    }
  }
`;
document.head.appendChild(style);
