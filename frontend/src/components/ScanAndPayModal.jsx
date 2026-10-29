import React, { useState, useEffect, useRef } from 'react';
import {
  QrCode,
  Camera,
  X,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  Send,
  Wallet,
  CreditCard,
  Sparkles,
  RefreshCw,
  Share2,
  Store,
  UserCheck,
  UploadCloud,
  Download,
  Zap,
  ArrowRight,
  ShieldCheck
} from 'lucide-react';
import QRCode from 'qrcode';
import jsQR from 'jsqr';
import { apiRequest } from '../api';

const formatINR = (val) => {
  const num = Math.abs(parseFloat(val) || 0);
  return '₹ ' + num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

// Preset scannable UPI merchants
const SAMPLE_QR_PRESETS = [
  { name: 'Starbucks Coffee', upiId: 'starbucks@upi', defaultAmount: 380.0, category: 'Cafe & Dining', icon: '☕' },
  { name: 'Reliance Supermart', upiId: 'reliancefresh@upi', defaultAmount: 1450.0, category: 'Groceries', icon: '🛒' },
  { name: 'Rahul S (Contact)', upiId: 'rahul@nexora', defaultAmount: 500.0, category: 'Personal Transfer', icon: '👤' },
  { name: 'Swiggy Food Order', upiId: 'swiggy@upi', defaultAmount: 420.0, category: 'Food Delivery', icon: '🍕' }
];

export default function ScanAndPayModal({
  isOpen,
  onClose,
  currentUser,
  accounts = [],
  cardData,
  onPaymentSuccess
}) {
  const [activeTab, setActiveTab] = useState('scan'); // 'scan' | 'my_qr'
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [scanPulse, setScanPulse] = useState(false);
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);

  // Scanned Merchant State
  const [selectedMerchant, setSelectedMerchant] = useState(null);
  const [customUpi, setCustomUpi] = useState('');
  const [amount, setAmount] = useState('500');
  const [note, setNote] = useState('UPI Scan & Pay');
  const [paymentMethod, setPaymentMethod] = useState('DEBIT'); // 'DEBIT' | 'CREDIT'
  const [paying, setPaying] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successResult, setSuccessResult] = useState(null);

  // My QR State
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [requestAmount, setRequestAmount] = useState('');
  const [copied, setCopied] = useState(false);

  const userUpi = currentUser?.email
    ? `${currentUser.email.split('@')[0]}@nexora`
    : 'alex.mathew@nexora';

  // Play synthetic subtle chime on QR hit
  const playSuccessChime = () => {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.setValueAtTime(880, ctx.currentTime + 0.08); // A5
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.28);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.28);
    } catch (e) {
      // Audio not permitted or blocked
    }
  };

  // Process raw decoded QR text (from camera, image upload, or preset)
  const processScannedData = (rawText) => {
    if (!rawText) return;
    playSuccessChime();
    setScanPulse(true);
    setTimeout(() => setScanPulse(false), 600);
    if (navigator.vibrate) {
      try { navigator.vibrate(100); } catch (e) {}
    }

    let upiId = rawText.trim();
    let payeeName = 'Merchant / Contact';
    let scannedAmount = '';
    let noteText = 'UPI Scan & Pay';

    // Parse standard UPI URI: upi://pay?pa=...&pn=...&am=...
    if (rawText.startsWith('upi://pay') || rawText.includes('pa=')) {
      try {
        const queryString = rawText.includes('?') ? rawText.split('?')[1] : rawText;
        const params = new URLSearchParams(queryString);
        if (params.get('pa')) upiId = params.get('pa');
        if (params.get('pn')) payeeName = decodeURIComponent(params.get('pn'));
        if (params.get('am')) scannedAmount = params.get('am');
        if (params.get('tn')) noteText = decodeURIComponent(params.get('tn'));
      } catch (e) {
        console.warn('Error parsing UPI URI:', e);
      }
    } else {
      payeeName = upiId.includes('@') ? upiId.split('@')[0].toUpperCase() : 'Nexora Beneficiary';
    }

    setSelectedMerchant({
      name: payeeName,
      upiId: upiId,
      category: 'Scanned UPI Payee'
    });
    if (scannedAmount && parseFloat(scannedAmount) > 0) {
      setAmount(scannedAmount);
    }
    setNote(noteText);
    setErrorMsg('');
    stopCamera();
  };

  // Generate User's UPI QR Code
  useEffect(() => {
    if (activeTab === 'my_qr') {
      const upiUrl = requestAmount && parseFloat(requestAmount) > 0
        ? `upi://pay?pa=${encodeURIComponent(userUpi)}&pn=${encodeURIComponent(currentUser?.name || 'Nexora Customer')}&am=${parseFloat(requestAmount)}&cu=INR`
        : `upi://pay?pa=${encodeURIComponent(userUpi)}&pn=${encodeURIComponent(currentUser?.name || 'Nexora Customer')}&cu=INR`;

      QRCode.toDataURL(upiUrl, {
        width: 280,
        margin: 2,
        color: {
          dark: '#0f172a',
          light: '#ffffff'
        }
      })
        .then(url => setQrDataUrl(url))
        .catch(err => console.error('QR Gen error:', err));
    }
  }, [activeTab, requestAmount, userUpi, currentUser]);

  // Handle Camera Stream
  const startCamera = async () => {
    setCameraError('');
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' }
        });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.setAttribute('playsinline', 'true');
          await videoRef.current.play();
        }
        setCameraActive(true);
      } else {
        setCameraError('Camera access not supported on this device/browser.');
      }
    } catch (err) {
      setCameraError('Camera access denied or unavailable. You can use the Quick Payees or upload a QR image.');
      setCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  // Real-time Camera Frame Decoder using jsQR
  useEffect(() => {
    let animId = null;
    const scanVideoFrame = () => {
      if (cameraActive && videoRef.current && videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA) {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        if (canvas) {
          const ctx = canvas.getContext('2d', { willReadFrequently: true });
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const code = jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: 'dontInvert'
          });
          if (code && code.data) {
            processScannedData(code.data);
            return;
          }
        }
      }
      if (cameraActive && !selectedMerchant) {
        animId = requestAnimationFrame(scanVideoFrame);
      }
    };

    if (cameraActive && !selectedMerchant) {
      animId = requestAnimationFrame(scanVideoFrame);
    }
    return () => {
      if (animId) cancelAnimationFrame(animId);
    };
  }, [cameraActive, selectedMerchant]);

  // Handle QR code image file upload
  const handleImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = canvasRef.current || document.createElement('canvas');
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height);
        if (code && code.data) {
          processScannedData(code.data);
        } else {
          setErrorMsg('No QR code detected in the selected image. Please try another image.');
        }
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Download generated QR image
  const handleDownloadQr = () => {
    if (!qrDataUrl) return;
    const a = document.createElement('a');
    a.href = qrDataUrl;
    a.download = `Nexora-UPI-${userUpi.replace(/[^a-zA-Z0-9]/g, '_')}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // Test scan the user's generated QR code
  const handleTestScanThisQr = () => {
    const upiUri = requestAmount && parseFloat(requestAmount) > 0
      ? `upi://pay?pa=${encodeURIComponent(userUpi)}&pn=${encodeURIComponent(currentUser?.name || 'Alex Mathew')}&am=${parseFloat(requestAmount)}&tn=Direct+Nexora+Transfer`
      : `upi://pay?pa=${encodeURIComponent(userUpi)}&pn=${encodeURIComponent(currentUser?.name || 'Alex Mathew')}&tn=Direct+Nexora+Transfer`;

    setActiveTab('scan');
    processScannedData(upiUri);
  };

  useEffect(() => {
    if (!isOpen) {
      stopCamera();
      setSelectedMerchant(null);
      setSuccessResult(null);
      setErrorMsg('');
      setAmount('500');
    }
    return () => stopCamera();
  }, [isOpen]);

  if (!isOpen) return null;

  // Handle Scan of a Preset
  const handleSelectPreset = (preset) => {
    setSelectedMerchant({
      name: preset.name,
      upiId: preset.upiId,
      category: preset.category
    });
    setAmount(preset.defaultAmount.toString());
    setNote(`Payment to ${preset.name}`);
    setErrorMsg('');
  };

  const handleCustomUpiSubmit = (e) => {
    e.preventDefault();
    if (!customUpi.trim()) return;
    const cleanUpi = customUpi.trim().toLowerCase();
    setSelectedMerchant({
      name: cleanUpi.split('@')[0].toUpperCase(),
      upiId: cleanUpi,
      category: 'Direct UPI Payee'
    });
    setNote(`Transfer to ${cleanUpi}`);
    setErrorMsg('');
  };

  // Execute Scan & Pay Transfer
  const handleConfirmPayment = async (e) => {
    e.preventDefault();
    const numAmount = parseFloat(amount);
    if (!numAmount || numAmount <= 0) {
      setErrorMsg('Please enter a valid amount to pay.');
      return;
    }

    setPaying(true);
    setErrorMsg('');

    try {
      const res = await apiRequest('/accounts/transfer', 'POST', {
        fromAccountId: accounts[0]?.id || 4,
        recipientAccountNumber: selectedMerchant.upiId,
        amount: numAmount,
        description: `${note} (${selectedMerchant.upiId})`,
        paymentMethod // 'DEBIT' | 'CREDIT'
      });

      setSuccessResult({
        referenceId: res.referenceId || `TXN-UPI-${Date.now()}`,
        amount: numAmount,
        merchantName: selectedMerchant.name,
        upiId: selectedMerchant.upiId,
        paymentMethod,
        date: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' })
      });

      onPaymentSuccess && onPaymentSuccess(res);
    } catch (err) {
      setErrorMsg(err.message || 'Payment processing failed.');
    } finally {
      setPaying(false);
    }
  };

  const copyUpiId = () => {
    navigator.clipboard.writeText(userUpi);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(15, 23, 42, 0.75)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '16px'
    }}>
      {/* Hidden offscreen canvas for frame decoding */}
      <canvas ref={canvasRef} style={{ display: 'none' }} />
      {/* Hidden file input for uploading QR image */}
      <input
        type="file"
        ref={fileInputRef}
        accept="image/*"
        onChange={handleImageUpload}
        style={{ display: 'none' }}
      />

      <div style={{
        background: '#ffffff',
        width: '100%',
        maxWidth: '490px',
        borderRadius: '24px',
        boxShadow: '0 25px 60px rgba(0, 0, 0, 0.35)',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        maxHeight: '92vh',
        animation: 'modalSlideUp 0.25s ease'
      }}>
        {/* Modal Top Header */}
        <div style={{
          padding: '18px 22px',
          borderBottom: '1px solid #f1f5f9',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: '#ffffff'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
              color: '#2563eb',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 2px 8px rgba(37, 99, 235, 0.15)'
            }}>
              <QrCode size={22} />
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: '1.15rem', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span>Scan & Pay (UPI)</span>
                <span style={{ fontSize: '0.65rem', background: '#ecfdf5', color: '#059669', padding: '2px 8px', borderRadius: '999px', fontWeight: 700 }}>
                  LIVE
                </span>
              </div>
              <div style={{ fontSize: '0.76rem', color: '#64748b' }}>
                Instant QR payments with Debit or Credit Line
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: '#f8fafc',
              border: 'none',
              borderRadius: '50%',
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: '#64748b'
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Tab Toggle: Scan QR vs My QR Code */}
        {!successResult && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            padding: '12px 20px 4px 20px',
            gap: '8px'
          }}>
            <button
              type="button"
              onClick={() => { setActiveTab('scan'); setSelectedMerchant(null); }}
              style={{
                padding: '10px 12px',
                borderRadius: '12px',
                border: 'none',
                background: activeTab === 'scan' ? '#2563eb' : '#f1f5f9',
                color: activeTab === 'scan' ? '#ffffff' : '#64748b',
                fontWeight: 700,
                fontSize: '0.88rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                transition: 'all 0.2s ease',
                boxShadow: activeTab === 'scan' ? '0 4px 12px rgba(37, 99, 235, 0.25)' : 'none'
              }}
            >
              <Camera size={16} />
              <span>Scan QR Code</span>
            </button>
            <button
              type="button"
              onClick={() => { setActiveTab('my_qr'); stopCamera(); }}
              style={{
                padding: '10px 12px',
                borderRadius: '12px',
                border: 'none',
                background: activeTab === 'my_qr' ? '#2563eb' : '#f1f5f9',
                color: activeTab === 'my_qr' ? '#ffffff' : '#64748b',
                fontWeight: 700,
                fontSize: '0.88rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                transition: 'all 0.2s ease',
                boxShadow: activeTab === 'my_qr' ? '0 4px 12px rgba(37, 99, 235, 0.25)' : 'none'
              }}
            >
              <QrCode size={16} />
              <span>My UPI QR</span>
            </button>
          </div>
        )}

        {/* Scrollable Body Content */}
        <div style={{ padding: '16px 22px 24px 22px', overflowY: 'auto' }}>
          {/* ========================================================== */}
          {/* 1. SUCCESS RECEIPT SCREEN                                  */}
          {/* ========================================================== */}
          {successResult ? (
            <div style={{ textAlign: 'center', padding: '16px 8px' }}>
              <div style={{
                width: '72px',
                height: '72px',
                borderRadius: '50%',
                background: '#ecfdf5',
                color: '#059669',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px',
                boxShadow: '0 8px 24px rgba(5, 150, 105, 0.2)'
              }}>
                <CheckCircle2 size={44} />
              </div>
              <h3 style={{ fontSize: '1.45rem', fontWeight: 800, color: '#0f172a', margin: '0 0 6px 0' }}>
                Payment Successful!
              </h3>
              <div style={{ fontSize: '2.1rem', fontWeight: 800, color: '#2563eb', margin: '10px 0 16px 0' }}>
                {formatINR(successResult.amount)}
              </div>

              {/* Receipt Summary Card */}
              <div style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '16px',
                padding: '16px',
                textAlign: 'left',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
                fontSize: '0.88rem'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b' }}>Paid to:</span>
                  <span style={{ fontWeight: 700, color: '#0f172a' }}>{successResult.merchantName}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b' }}>UPI ID:</span>
                  <span style={{ fontWeight: 600, color: '#2563eb', fontFamily: 'monospace' }}>{successResult.upiId}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b' }}>Payment Source:</span>
                  <span style={{
                    fontWeight: 700,
                    color: successResult.paymentMethod === 'CREDIT' ? '#7c3aed' : '#2563eb',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}>
                    {successResult.paymentMethod === 'CREDIT' ? '🟣 Nexora Credit Line' : '🔵 Primary Debit Account'}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b' }}>Reference ID:</span>
                  <span style={{ fontFamily: 'monospace', color: '#0f172a' }}>{successResult.referenceId}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b' }}>Timestamp:</span>
                  <span style={{ color: '#0f172a' }}>{successResult.date}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b' }}>Cloud Ledger:</span>
                  <span style={{ color: '#059669', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <ShieldCheck size={14} /> Synced to Supabase
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setSuccessResult(null);
                  setSelectedMerchant(null);
                  onClose();
                }}
                style={{
                  marginTop: '22px',
                  width: '100%',
                  padding: '13px',
                  borderRadius: '12px',
                  border: 'none',
                  background: '#2563eb',
                  color: '#ffffff',
                  fontWeight: 700,
                  fontSize: '0.96rem',
                  cursor: 'pointer',
                  boxShadow: '0 4px 14px rgba(37, 99, 235, 0.3)'
                }}
              >
                Done
              </button>
            </div>
          ) : activeTab === 'scan' ? (
            /* ======================================================== */
            /* 2. SCAN QR CODE TAB                                      */
            /* ======================================================== */
            <div>
              {/* If no merchant scanned yet, show Viewfinder and Preset QR items */}
              {!selectedMerchant ? (
                <div>
                  {/* High-Tech Scanner Viewfinder Frame */}
                  <div style={{
                    width: '100%',
                    height: '240px',
                    borderRadius: '20px',
                    background: '#090d16',
                    position: 'relative',
                    overflow: 'hidden',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: 'inset 0 0 40px rgba(0,0,0,0.6)'
                  }}>
                    {/* Live Camera Video (if active) */}
                    <video
                      ref={videoRef}
                      playsInline
                      muted
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        display: cameraActive ? 'block' : 'none'
                      }}
                    />

                    {/* Camera Simulation Grid (if real webcam off) */}
                    {!cameraActive && (
                      <div style={{
                        position: 'absolute',
                        inset: 0,
                        backgroundImage: 'radial-gradient(rgba(37, 99, 235, 0.15) 1px, transparent 1px)',
                        backgroundSize: '16px 16px',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#94a3b8',
                        gap: '8px'
                      }}>
                        <Camera size={34} color="#60a5fa" />
                        <span style={{ fontSize: '0.84rem', color: '#cbd5e1' }}>
                          Align QR code inside frame
                        </span>
                        <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                          <button
                            type="button"
                            onClick={startCamera}
                            style={{
                              padding: '7px 16px',
                              borderRadius: '999px',
                              background: 'rgba(37, 99, 235, 0.4)',
                              border: '1.5px solid #60a5fa',
                              color: '#ffffff',
                              fontSize: '0.78rem',
                              fontWeight: 700,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px'
                            }}
                          >
                            <Camera size={14} /> Turn On Camera
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Viewfinder Reticle Corners */}
                    <div style={{
                      position: 'absolute',
                      width: '170px',
                      height: '170px',
                      border: scanPulse ? '3px solid #10b981' : '2px solid rgba(56, 189, 248, 0.6)',
                      borderRadius: '16px',
                      pointerEvents: 'none',
                      transition: 'border-color 0.2s ease',
                      boxShadow: scanPulse ? '0 0 25px rgba(16, 185, 129, 0.6)' : 'none'
                    }}>
                      {/* Animated Laser Beam */}
                      <div style={{
                        position: 'absolute',
                        left: 0,
                        right: 0,
                        height: '2.5px',
                        background: 'linear-gradient(90deg, transparent, #38bdf8, #60a5fa, transparent)',
                        boxShadow: '0 0 12px #38bdf8',
                        animation: 'scannerLaser 2s infinite ease-in-out'
                      }} />
                    </div>

                    <style>{`
                      @keyframes scannerLaser {
                        0% { top: 10%; opacity: 0.8; }
                        50% { top: 85%; opacity: 1; }
                        100% { top: 10%; opacity: 0.8; }
                      }
                    `}</style>
                  </div>

                  {/* Camera Controls & Image Upload Bar */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginTop: '10px',
                    gap: '8px'
                  }}>
                    {cameraActive ? (
                      <button
                        type="button"
                        onClick={stopCamera}
                        style={{
                          flex: 1,
                          padding: '7px 12px',
                          borderRadius: '10px',
                          border: '1px solid #fee2e2',
                          background: '#fef2f2',
                          color: '#dc2626',
                          fontSize: '0.78rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px'
                        }}
                      >
                        <X size={14} /> Turn Off Camera
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={startCamera}
                        style={{
                          flex: 1,
                          padding: '7px 12px',
                          borderRadius: '10px',
                          border: '1px solid #bfdbfe',
                          background: '#eff6ff',
                          color: '#2563eb',
                          fontSize: '0.78rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px'
                        }}
                      >
                        <Camera size={14} /> Open Live Camera
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      style={{
                        flex: 1,
                        padding: '7px 12px',
                        borderRadius: '10px',
                        border: '1px solid #e2e8f0',
                        background: '#f8fafc',
                        color: '#475569',
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px'
                      }}
                    >
                      <UploadCloud size={14} /> Upload QR Image
                    </button>
                  </div>

                  {cameraError && (
                    <div style={{
                      fontSize: '0.78rem',
                      color: '#d97706',
                      background: '#fffbeb',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      marginTop: '10px'
                    }}>
                      {cameraError}
                    </div>
                  )}

                  {/* Preset Scannable QR Codes (Instant 1-Click Scan) */}
                  <div style={{ marginTop: '16px' }}>
                    <div style={{
                      fontSize: '0.82rem',
                      fontWeight: 700,
                      color: '#475569',
                      marginBottom: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}>
                      <Sparkles size={14} color="#2563eb" />
                      <span>Instant Scan Quick Payees:</span>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                      {SAMPLE_QR_PRESETS.map((p, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => handleSelectPreset(p)}
                          style={{
                            padding: '10px 12px',
                            borderRadius: '12px',
                            border: '1.5px solid #e2e8f0',
                            background: '#f8fafc',
                            cursor: 'pointer',
                            textAlign: 'left',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                            transition: 'all 0.15s ease'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.borderColor = '#93c5fd';
                            e.currentTarget.style.background = '#eff6ff';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.borderColor = '#e2e8f0';
                            e.currentTarget.style.background = '#f8fafc';
                          }}
                        >
                          <span style={{ fontSize: '1.4rem' }}>{p.icon}</span>
                          <div>
                            <div style={{ fontWeight: 700, fontSize: '0.86rem', color: '#0f172a' }}>{p.name}</div>
                            <div style={{ fontSize: '0.72rem', color: '#2563eb' }}>{p.upiId}</div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Enter Custom UPI ID */}
                  <form onSubmit={handleCustomUpiSubmit} style={{ marginTop: '14px' }}>
                    <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>
                      Or Enter Payee UPI ID:
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <input
                        type="text"
                        placeholder="e.g. merchant@icici or 9876543210@upi"
                        value={customUpi}
                        onChange={(e) => setCustomUpi(e.target.value)}
                        style={{
                          flex: 1,
                          padding: '10px 14px',
                          borderRadius: '10px',
                          border: '1.5px solid #e2e8f0',
                          fontSize: '0.88rem',
                          background: '#f8fafc',
                          outline: 'none'
                        }}
                      />
                      <button
                        type="submit"
                        disabled={!customUpi.trim()}
                        style={{
                          padding: '10px 18px',
                          borderRadius: '10px',
                          border: 'none',
                          background: customUpi.trim() ? '#2563eb' : '#cbd5e1',
                          color: '#ffffff',
                          fontWeight: 700,
                          fontSize: '0.88rem',
                          cursor: customUpi.trim() ? 'pointer' : 'not-allowed'
                        }}
                      >
                        Scan
                      </button>
                    </div>
                  </form>
                </div>
              ) : (
                /* Checkout Form for Scanned Merchant */
                <form onSubmit={handleConfirmPayment}>
                  {/* Scanned Payee Header */}
                  <div style={{
                    background: '#eff6ff',
                    border: '1.5px solid #bfdbfe',
                    borderRadius: '16px',
                    padding: '14px 16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '16px'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{
                        width: '42px',
                        height: '42px',
                        borderRadius: '12px',
                        background: '#2563eb',
                        color: '#ffffff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 700,
                        fontSize: '1.1rem'
                      }}>
                        {selectedMerchant.name[0]}
                      </div>
                      <div>
                        <div style={{ fontWeight: 800, fontSize: '0.98rem', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span>{selectedMerchant.name}</span>
                          <UserCheck size={16} color="#059669" />
                        </div>
                        <div style={{ fontSize: '0.78rem', color: '#2563eb', fontFamily: 'monospace' }}>
                          {selectedMerchant.upiId}
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedMerchant(null)}
                      style={{
                        background: '#ffffff',
                        border: '1px solid #dbeafe',
                        padding: '5px 10px',
                        borderRadius: '8px',
                        fontSize: '0.76rem',
                        fontWeight: 700,
                        color: '#2563eb',
                        cursor: 'pointer'
                      }}
                    >
                      Rescan
                    </button>
                  </div>

                  {errorMsg && (
                    <div style={{
                      padding: '10px 14px',
                      borderRadius: '10px',
                      background: '#fef2f2',
                      border: '1px solid #fecaca',
                      color: '#b91c1c',
                      fontSize: '0.84rem',
                      marginBottom: '14px'
                    }}>
                      {errorMsg}
                    </div>
                  )}

                  {/* Payment Amount */}
                  <div style={{ marginBottom: '14px' }}>
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>
                      Amount to Pay (₹)
                    </label>
                    <input
                      type="number"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      required
                      min="1"
                      style={{
                        width: '100%',
                        padding: '12px 14px',
                        borderRadius: '12px',
                        border: '1.5px solid #e2e8f0',
                        fontSize: '1.3rem',
                        fontWeight: 800,
                        color: '#0f172a',
                        background: '#f8fafc',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>

                  {/* Payment Funding Source: Debit vs Credit Line */}
                  <div style={{ marginBottom: '16px' }}>
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#475569', marginBottom: '8px' }}>
                      Pay From (Debit Account / Credit Line)
                    </label>
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr',
                      gap: '8px',
                      background: '#f1f5f9',
                      padding: '4px',
                      borderRadius: '12px',
                      marginBottom: '8px'
                    }}>
                      <button
                        type="button"
                        onClick={() => setPaymentMethod('DEBIT')}
                        style={{
                          padding: '9px 12px',
                          borderRadius: '10px',
                          border: 'none',
                          background: paymentMethod === 'DEBIT' ? '#ffffff' : 'transparent',
                          color: paymentMethod === 'DEBIT' ? '#2563eb' : '#64748b',
                          fontWeight: 700,
                          fontSize: '0.86rem',
                          boxShadow: paymentMethod === 'DEBIT' ? '0 2px 6px rgba(0,0,0,0.06)' : 'none',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px'
                        }}
                      >
                        <Wallet size={15} />
                        <span>Debit Account</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setPaymentMethod('CREDIT')}
                        style={{
                          padding: '9px 12px',
                          borderRadius: '10px',
                          border: 'none',
                          background: paymentMethod === 'CREDIT' ? '#ffffff' : 'transparent',
                          color: paymentMethod === 'CREDIT' ? '#7c3aed' : '#64748b',
                          fontWeight: 700,
                          fontSize: '0.86rem',
                          boxShadow: paymentMethod === 'CREDIT' ? '0 2px 6px rgba(0,0,0,0.06)' : 'none',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px'
                        }}
                      >
                        <CreditCard size={15} />
                        <span>Credit Line</span>
                      </button>
                    </div>

                    <div style={{
                      fontSize: '0.78rem',
                      color: paymentMethod === 'CREDIT' ? '#6d28d9' : '#059669',
                      fontWeight: 600,
                      padding: '6px 10px',
                      borderRadius: '8px',
                      background: paymentMethod === 'CREDIT' ? '#f5f3ff' : '#ecfdf5'
                    }}>
                      {paymentMethod === 'CREDIT'
                        ? `Available Credit: ${formatINR(cardData?.available_credit ?? 150000)} (0% Interest for 45 Days)`
                        : `Available Balance: ${formatINR(accounts[0]?.balance ?? 102450)}`}
                    </div>
                  </div>

                  {/* Payment Note */}
                  <div style={{ marginBottom: '18px' }}>
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>
                      Add Note
                    </label>
                    <input
                      type="text"
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      placeholder="e.g. Dinner, Shopping"
                      style={{
                        width: '100%',
                        padding: '10px 14px',
                        borderRadius: '10px',
                        border: '1.5px solid #e2e8f0',
                        fontSize: '0.88rem',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>

                  {/* Pay Now Button */}
                  <button
                    type="submit"
                    disabled={paying}
                    style={{
                      width: '100%',
                      padding: '13px',
                      borderRadius: '12px',
                      border: 'none',
                      background: paying ? '#93c5fd' : 'linear-gradient(135deg, #1d4ed8 0%, #2563eb 100%)',
                      color: '#ffffff',
                      fontWeight: 700,
                      fontSize: '0.98rem',
                      cursor: paying ? 'not-allowed' : 'pointer',
                      boxShadow: '0 4px 14px rgba(37, 99, 235, 0.35)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px'
                    }}
                  >
                    <span>{paying ? 'Processing UPI Payment...' : `Pay ${formatINR(amount || 0)} Now`}</span>
                    {!paying && <Send size={16} />}
                  </button>
                </form>
              )}
            </div>
          ) : (
            /* ======================================================== */
            /* 3. MY UPI QR CODE TAB                                    */
            /* ======================================================== */
            <div style={{ textAlign: 'center', padding: '8px 0' }}>
              <div style={{
                background: '#ffffff',
                border: '2px dashed #bfdbfe',
                borderRadius: '20px',
                padding: '20px',
                display: 'inline-block',
                boxShadow: '0 8px 24px rgba(37, 99, 235, 0.08)',
                marginBottom: '16px'
              }}>
                {qrDataUrl ? (
                  <img
                    src={qrDataUrl}
                    alt="My UPI QR Code"
                    style={{ width: '220px', height: '220px', display: 'block', margin: '0 auto' }}
                  />
                ) : (
                  <div style={{ width: '220px', height: '220px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <RefreshCw className="animate-spin" size={24} color="#2563eb" />
                  </div>
                )}
                <div style={{ marginTop: '10px', fontSize: '0.78rem', color: '#64748b' }}>
                  Scan with any UPI app (GPay, PhonePe, Paytm, Nexora)
                </div>
              </div>

              {/* User UPI ID with Copy Button */}
              <div style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '12px',
                padding: '10px 14px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                maxWidth: '360px',
                margin: '0 auto 14px'
              }}>
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontSize: '0.72rem', color: '#64748b' }}>My Nexora UPI ID</div>
                  <div style={{ fontWeight: 700, fontSize: '0.92rem', color: '#0f172a', fontFamily: 'monospace' }}>
                    {userUpi}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={copyUpiId}
                  style={{
                    background: copied ? '#ecfdf5' : '#ffffff',
                    border: '1px solid #e2e8f0',
                    color: copied ? '#059669' : '#2563eb',
                    padding: '6px 12px',
                    borderRadius: '8px',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  {copied ? <Check size={14} /> : <Copy size={14} />}
                  <span>{copied ? 'Copied' : 'Copy'}</span>
                </button>
              </div>

              {/* Request Specific Amount */}
              <div style={{ maxWidth: '360px', margin: '0 auto 16px', textAlign: 'left' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>
                  Set Specific Amount to Request (Optional):
                </label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="number"
                    placeholder="Enter amount in ₹ (e.g. 750)"
                    value={requestAmount}
                    onChange={(e) => setRequestAmount(e.target.value)}
                    style={{
                      flex: 1,
                      padding: '9px 12px',
                      borderRadius: '10px',
                      border: '1.5px solid #e2e8f0',
                      fontSize: '0.88rem'
                    }}
                  />
                  {requestAmount && (
                    <button
                      type="button"
                      onClick={() => setRequestAmount('')}
                      style={{
                        padding: '9px 12px',
                        borderRadius: '10px',
                        border: '1px solid #e2e8f0',
                        background: '#f8fafc',
                        color: '#64748b',
                        fontSize: '0.82rem',
                        cursor: 'pointer'
                      }}
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>

              {/* Actions: Download QR Code & Test Scan This QR */}
              <div style={{ maxWidth: '360px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <button
                  type="button"
                  onClick={handleTestScanThisQr}
                  style={{
                    width: '100%',
                    padding: '11px 16px',
                    borderRadius: '12px',
                    border: 'none',
                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                    color: '#ffffff',
                    fontWeight: 700,
                    fontSize: '0.9rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    boxShadow: '0 4px 12px rgba(16, 185, 129, 0.25)'
                  }}
                >
                  <Zap size={16} />
                  <span>Simulate Scan & Pay This QR</span>
                </button>

                <button
                  type="button"
                  onClick={handleDownloadQr}
                  style={{
                    width: '100%',
                    padding: '9px 16px',
                    borderRadius: '12px',
                    border: '1.5px solid #e2e8f0',
                    background: '#f8fafc',
                    color: '#475569',
                    fontWeight: 600,
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px'
                  }}
                >
                  <Download size={15} />
                  <span>Download QR Code Image</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
