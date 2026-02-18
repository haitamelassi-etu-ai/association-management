import { useEffect, useRef, useState, useCallback } from 'react';
import { BrowserMultiFormatReader } from '@zxing/browser';
import { DecodeHintType, BarcodeFormat } from '@zxing/library';
import './BarcodeScanner.css';

const BarcodeScanner = ({ onScanSuccess, onClose }) => {
  const videoRef = useRef(null);
  const controlsRef = useRef(null);
  const [scanning, setScanning] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [scannedCode, setScannedCode] = useState('');
  const [manualCode, setManualCode] = useState('');

  const stopScanning = useCallback(() => {
    if (controlsRef.current) {
      controlsRef.current.stop();
      controlsRef.current = null;
    }
    if (videoRef.current && videoRef.current.srcObject) {
      videoRef.current.srcObject.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setScanning(false);
  }, []);

  const startScanning = useCallback(async () => {
    try {
      setError('');
      setLoading(true);
      setScannedCode('');

      // Check camera availability
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Votre navigateur ne supporte pas l\'accès à la caméra. Utilisez Chrome ou Firefox.');
      }

      // Configure hints for common product barcode formats
      const hints = new Map();
      hints.set(DecodeHintType.POSSIBLE_FORMATS, [
        BarcodeFormat.EAN_13,
        BarcodeFormat.EAN_8,
        BarcodeFormat.UPC_A,
        BarcodeFormat.UPC_E,
        BarcodeFormat.CODE_128,
        BarcodeFormat.CODE_39,
        BarcodeFormat.QR_CODE,
      ]);

      const codeReader = new BrowserMultiFormatReader(hints);

      const controls = await codeReader.decodeFromVideoDevice(
        undefined,      // use default camera (rear on mobile)
        videoRef.current,
        (result, err) => {
          if (result) {
            const code = result.getText();
            setScannedCode(code);
            stopScanning();
            onScanSuccess(code);
          }
          // NotFoundException is expected while scanning — ignore it
        }
      );

      controlsRef.current = controls;
      setScanning(true);
      setLoading(false);
    } catch (err) {
      console.error('Scanner error:', err);
      setLoading(false);

      if (err.name === 'NotAllowedError') {
        setError('Permission caméra refusée. Veuillez autoriser l\'accès à la caméra dans les paramètres de votre navigateur.');
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setError('Aucune caméra détectée sur cet appareil.');
      } else if (err.name === 'NotReadableError') {
        setError('La caméra est déjà utilisée par une autre application.');
      } else {
        setError(err.message || 'Erreur lors de l\'accès à la caméra.');
      }
    }
  }, [onScanSuccess, stopScanning]);

  useEffect(() => {
    startScanning();
    return () => stopScanning();
  }, []);

  const handleManualSubmit = (e) => {
    e.preventDefault();
    if (manualCode.trim()) {
      stopScanning();
      onScanSuccess(manualCode.trim());
    }
  };

  const handleClose = () => {
    stopScanning();
    onClose();
  };

  return (
    <div className="barcode-scanner-overlay" onClick={handleClose}>
      <div className="barcode-scanner-modal" onClick={(e) => e.stopPropagation()}>
        <div className="scanner-header">
          <h2>📷 Scanner un Produit</h2>
          <button className="scanner-close" onClick={handleClose}>✕</button>
        </div>

        <div className="scanner-body">
          {/* Loading state */}
          {loading && (
            <div className="scanner-loading">
              <div className="scanner-spinner"></div>
              <p>Initialisation de la caméra...</p>
            </div>
          )}

          {/* Error state */}
          {error && (
            <div className="scanner-error">
              <span className="error-icon">⚠️</span>
              <p>{error}</p>
              <button className="btn-retry" onClick={startScanning}>
                🔄 Réessayer
              </button>
            </div>
          )}

          {/* Video preview */}
          <div className={`scanner-video-container ${loading || error ? 'hidden' : ''}`}>
            <video ref={videoRef} className="scanner-video" playsInline autoPlay muted />
            <div className="scanner-overlay-frame">
              <div className="scanner-corner top-left"></div>
              <div className="scanner-corner top-right"></div>
              <div className="scanner-corner bottom-left"></div>
              <div className="scanner-corner bottom-right"></div>
              <div className="scanner-line"></div>
            </div>
            <p className="scanner-hint">Placez le code-barres dans le cadre</p>
          </div>

          {/* Scanned code display */}
          {scannedCode && (
            <div className="scanner-success">
              <span className="success-icon">✅</span>
              <p>Code scanné : <strong>{scannedCode}</strong></p>
            </div>
          )}

          {/* Manual entry fallback */}
          <div className="scanner-manual">
            <p className="manual-label">Ou saisir le code manuellement :</p>
            <form onSubmit={handleManualSubmit} className="manual-form">
              <input
                type="text"
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                placeholder="Ex: 3017620422003"
                className="manual-input"
              />
              <button type="submit" className="btn-manual-submit" disabled={!manualCode.trim()}>
                🔍 Rechercher
              </button>
            </form>
          </div>
        </div>

        <div className="scanner-footer">
          <button className="btn-cancel-scanner" onClick={handleClose}>
            Annuler
          </button>
        </div>
      </div>
    </div>
  );
};

export default BarcodeScanner;
