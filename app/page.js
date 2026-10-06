'use client';

import { useState, useRef, useEffect } from 'react';
import Image from 'next/image';

const QUICK_AMOUNTS = [5000, 10000, 25000, 50000, 100000];

function formatRupiah(num) {
  if (!num || isNaN(num)) return '';
  return new Intl.NumberFormat('id-ID').format(num);
}

function parseRupiah(str) {
  if (!str) return 0;
  const clean = String(str).replace(/[^\d]/g, '');
  return parseInt(clean, 10) || 0;
}

function formatBytes(bytes, decimals = 1) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

export default function Home() {
  // Form state
  const [donorName, setDonorName] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [amountInput, setAmountInput] = useState('');
  const [numericAmount, setNumericAmount] = useState(0);
  const [message, setMessage] = useState('');
  const [honeypot, setHoneypot] = useState('');

  // File state
  const [selectedFile, setSelectedFile] = useState(null);
  const [compressedDataUrl, setCompressedDataUrl] = useState(null);
  const [compressedSizeBytes, setCompressedSizeBytes] = useState(0);
  const [isCompressing, setIsCompressing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  // Status state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState({});
  const [alertError, setAlertError] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submittedData, setSubmittedData] = useState({ name: '', amount: 0 });

  // Copy NMID feedback
  const [copiedNmid, setCopiedNmid] = useState(false);

  const fileInputRef = useRef(null);
  const canvasRef = useRef(null);

  // Handle ambient particle canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return;
    }

    const ctx = canvas.getContext('2d');
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);
    let animationFrameId;

    const PARTICLE_COUNT = 45;
    const particles = [];

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        radius: Math.random() * 1.2 + 0.3,
        speedX: (Math.random() - 0.5) * 0.15,
        speedY: (Math.random() - 0.5) * 0.15,
        alpha: Math.random() * 0.5 + 0.2,
      });
    }

    function render() {
      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = '#FFFFFF';

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.x += p.speedX;
        p.y += p.speedY;

        if (p.x < 0) p.x = width;
        if (p.x > width) p.x = 0;
        if (p.y < 0) p.y = height;
        if (p.y > height) p.y = 0;

        ctx.globalAlpha = p.alpha;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fill();
      }

      animationFrameId = requestAnimationFrame(render);
    }

    function handleResize() {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    }

    window.addEventListener('resize', handleResize);
    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // Copy NMID
  const handleCopyNmid = async () => {
    const nmid = 'ID1023245869376';
    try {
      await navigator.clipboard.writeText(nmid);
      setCopiedNmid(true);
      setTimeout(() => setCopiedNmid(false), 2000);
    } catch {
      setCopiedNmid(true);
      setTimeout(() => setCopiedNmid(false), 2000);
    }
  };

  // Handle Amount Input & Quick Chips
  const handleAmountChange = (valStr) => {
    const parsed = parseRupiah(valStr);
    setNumericAmount(parsed);
    setAmountInput(parsed > 0 ? formatRupiah(parsed) : '');
    if (errors.amount) {
      setErrors((prev) => ({ ...prev, amount: '' }));
    }
  };

  const handleChipSelect = (amount) => {
    setNumericAmount(amount);
    setAmountInput(formatRupiah(amount));
    if (errors.amount) {
      setErrors((prev) => ({ ...prev, amount: '' }));
    }
  };

  // Client-Side Canvas Image Compression
  const processImageFile = async (file) => {
    if (!file) return;

    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setErrors((prev) => ({
        ...prev,
        proof: 'Format tidak didukung. Harap unggah format JPG, PNG, atau WEBP.',
      }));
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setErrors((prev) => ({
        ...prev,
        proof: 'Ukuran file melebihi batas maksimal 5 MB.',
      }));
      return;
    }

    setErrors((prev) => ({ ...prev, proof: '' }));
    setIsCompressing(true);

    try {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new window.Image();
        img.onload = () => {
          let { width, height } = img;
          const maxDim = 1600;

          if (width > maxDim || height > maxDim) {
            if (width > height) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            } else {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');

          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, width, height);
          ctx.drawImage(img, 0, 0, width, height);

          const outputDataUrl = canvas.toDataURL('image/jpeg', 0.85);
          const base64Len = outputDataUrl.length - (outputDataUrl.indexOf(',') + 1);
          const compressedBytes = Math.round((base64Len * 3) / 4);

          setSelectedFile(file);
          setCompressedDataUrl(outputDataUrl);
          setCompressedSizeBytes(compressedBytes);
          setIsCompressing(false);
        };
        img.onerror = () => {
          setIsCompressing(false);
          setErrors((prev) => ({ ...prev, proof: 'Gagal memuat gambar.' }));
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    } catch {
      setIsCompressing(false);
      setErrors((prev) => ({ ...prev, proof: 'Gagal memproses gambar.' }));
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      processImageFile(e.target.files[0]);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processImageFile(e.dataTransfer.files[0]);
    }
  };

  const handleRemoveFile = (e) => {
    e.stopPropagation();
    setSelectedFile(null);
    setCompressedDataUrl(null);
    setCompressedSizeBytes(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    setErrors((prev) => ({ ...prev, proof: '' }));
  };

  // Form Validation & Submission
  const validate = () => {
    const errs = {};
    if (!donorName.trim()) {
      errs.name = 'Nama donatur wajib diisi.';
    } else if (donorName.trim().length < 2) {
      errs.name = 'Nama minimal 2 karakter.';
    } else if (donorName.trim().length > 60) {
      errs.name = 'Nama maksimal 60 karakter.';
    }

    if (!numericAmount || numericAmount < 1000) {
      errs.amount = 'Nominal donasi minimal Rp 1.000.';
    }

    if (!compressedDataUrl) {
      errs.proof = 'Wajib melampirkan bukti transfer pembayaran.';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setAlertError('');

    // Honeypot anti-spam
    if (honeypot.trim() !== '') {
      setIsSubmitted(true);
      setSubmittedData({ name: donorName || 'Sahabat', amount: numericAmount });
      return;
    }

    if (!validate()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await fetch('/api/confirm-donation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          name: donorName.trim(),
          isAnonymous,
          amount: numericAmount,
          message: message.trim(),
          imageBase64: compressedDataUrl,
          website_hp: honeypot,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Terjadi kesalahan saat mengirim konfirmasi.');
      }

      setSubmittedData({
        name: isAnonymous ? 'Donatur Anonim' : donorName.trim(),
        amount: numericAmount,
      });
      setIsSubmitted(true);
    } catch (err) {
      setAlertError(err.message || 'Koneksi gagal. Mohon periksa internet Anda atau coba lagi.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetForm = () => {
    setDonorName('');
    setIsAnonymous(false);
    setAmountInput('');
    setNumericAmount(0);
    setMessage('');
    setHoneypot('');
    setSelectedFile(null);
    setCompressedDataUrl(null);
    setCompressedSizeBytes(0);
    if (fileInputRef.current) fileInputRef.current.value = '';
    setErrors({});
    setAlertError('');
    setIsSubmitted(false);
  };

  return (
    <>
      {/* Ambient background canvas and gradient */}
      <div className="ambient-glow" aria-hidden="true" />
      <canvas ref={canvasRef} className="ambient-canvas" aria-hidden="true" />

      {/* Header */}
      <header className="site-header">
        <div className="container header-inner">
          <a href="#" className="brand-badge" aria-label="HekaLabs Beranda">
            <span className="brand-text">HEKALABS ™</span>
            <span className="status-indicator">
              <span className="pulse-dot" aria-hidden="true" />
              <span className="status-text">01 // LIVE GATEWAY</span>
            </span>
          </a>

          <nav className="nav-links" aria-label="Navigasi Halaman">
            <a href="#hero" className="nav-link">Tentang</a>
            <a href="#qris-section" className="nav-link">QRIS</a>
            <a href="#form-section" className="nav-link">Konfirmasi</a>
            <a href="#social-section" className="nav-link">Koneksi</a>
          </nav>

          <div className="header-action">
            <a href="#qris-section" className="btn-pill btn-pill-primary">
              <span>Donasi Sekarang</span>
              <svg className="icon-arrow" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><line x1="7" y1="17" x2="17" y2="7" /><polyline points="7 7 17 7 17 17" /></svg>
            </a>
          </div>
        </div>
      </header>

      <main>
        {/* Section 1: Hero */}
        <section id="hero" className="hero-section">
          <div className="container">
            <div className="hero-meta-strip">
              <span className="tech-tag">EST. 2025 // THE NEW FRONTIER</span>
              <span className="separator-dot" aria-hidden="true">•</span>
              <span className="tech-tag">QRIS NASIONAL // ID1023245869376</span>
              <span className="separator-dot" aria-hidden="true">•</span>
              <span className="tech-tag">100% INDEPENDEN</span>
            </div>

            <div className="hero-headline-wrap">
              <h1 className="hero-title">
                <span className="title-line">HEKALABS ™</span>
              </h1>
              <p className="hero-lead">
                Dukungan langsung untuk riset kreatif dan karya digital Heka — memberdayakan pengembangan{' '}
                <strong className="highlight-text">Heka Edit</strong>, video edukasi{' '}
                <strong className="highlight-text">Heka Edu</strong>, serta rangkaian proyek perangkat lunak{' '}
                <strong className="highlight-text">open source</strong> untuk semua.
              </p>
            </div>

            <div className="hero-actions">
              <a href="#qris-section" className="btn-primary" id="cta-donate-btn">
                <span>Donasi Sekarang</span>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><line x1="12" y1="5" x2="12" y2="19" /><polyline points="19 12 12 19 5 12" /></svg>
              </a>
              <a href="#form-section" className="btn-secondary" id="cta-confirm-btn">
                <span>Konfirmasi Bukti Transfer</span>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="2" ry="2" /><line x1="9" y1="9" x2="15" y2="9" /><line x1="9" y1="13" x2="15" y2="13" /><line x1="9" y1="17" x2="13" y2="17" /></svg>
              </a>
            </div>

            <div className="hero-badges">
              <div className="meta-card">
                <span className="meta-label">TRANSAKSI LANGSUNG</span>
                <span className="meta-value">Tanpa Potongan Pihak Ketiga</span>
              </div>
              <div className="meta-card">
                <span className="meta-label">KOMPATIBILITAS PENUH</span>
                <span className="meta-value">Semua Bank &amp; E-Wallet QRIS</span>
              </div>
              <div className="meta-card">
                <span className="meta-label">VERIFIKASI TRANSPARAN</span>
                <span className="meta-value">Notifikasi Email Otomatis</span>
              </div>
            </div>
          </div>
        </section>

        {/* Bento Grid */}
        <section className="bento-section" id="bento-container">
          <div className="container">
            <div className="bento-grid">

              {/* BENTO ITEM 1: KARTU QRIS (Focal Point) */}
              <article className="bento-card bento-qris-card" id="qris-section">
                <div className="qris-card-inner">
                  <div className="qris-card-header">
                    <div className="qris-header-left">
                      <span className="qris-mono-tag">01-A. // QRIS GATEWAY</span>
                      <div className="qris-merchant-badge">
                        <span className="merchant-dot" />
                        <span className="merchant-name-title">HekaStore</span>
                      </div>
                    </div>
                    <div className="qris-header-right">
                      <span className="qris-official-badge">
                        <span className="qris-logo-text">QRIS</span>
                        <span className="gpn-logo-text">GPN</span>
                      </span>
                    </div>
                  </div>

                  {/* Quiet zone container */}
                  <div className="qris-quiet-zone">
                    <div className="qris-image-wrapper">
                      <Image
                        src="/assets/qris.jpeg"
                        alt="Kode QRIS Donasi HekaStore NMID ID1023245869376"
                        width={420}
                        height={560}
                        className="qris-image"
                        priority
                      />
                    </div>
                  </div>

                  {/* Merchant Details & NMID */}
                  <div className="qris-details-block">
                    <div className="qris-detail-row">
                      <span className="qris-meta-kicker">NAMA MERCHANT</span>
                      <span className="qris-meta-text bold">HekaStore</span>
                    </div>
                    <div className="qris-detail-row">
                      <span className="qris-meta-kicker">NMID RESMI</span>
                      <div className="nmid-copy-group">
                        <code className="nmid-code">ID1023245869376</code>
                        <button
                          type="button"
                          className="btn-copy-nmid"
                          onClick={handleCopyNmid}
                          title="Salin NMID"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="9" y="9" width="13" height="13" rx="2" ry="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg>
                          <span>{copiedNmid ? 'Tersalin!' : 'Salin'}</span>
                        </button>
                      </div>
                    </div>
                    <div className="qris-detail-slogan">
                      <span className="slogan-badge">SATU QRIS UNTUK SEMUA</span>
                      <p className="slogan-sub">Bisa di-scan dari BCA, Mandiri, BRI, BNI, GoPay, OVO, Dana, ShopeePay, LinkAja, dsb.</p>
                    </div>
                  </div>

                  {/* Download Button */}
                  <div className="qris-actions">
                    <a
                      href="/assets/qris.jpeg"
                      download="qris-hekalabs-hekastore.jpeg"
                      className="btn-qris-download"
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
                      <span>Unduh Gambar QR</span>
                    </a>
                  </div>

                  {/* 3 Steps Instructions */}
                  <div className="qris-guide-box">
                    <div className="guide-title">
                      <span className="guide-tag">// PANDUAN PEMBAYARAN</span>
                      <span className="guide-step-count">3 Langkah Mudah</span>
                    </div>
                    <ol className="guide-steps-list">
                      <li className="guide-step-item">
                        <span className="step-num">01</span>
                        <div className="step-desc">
                          <strong>Buka Aplikasi</strong>
                          <p>Jalankan aplikasi m-Banking atau E-Wallet apa pun yang memiliki fitur scan QRIS.</p>
                        </div>
                      </li>
                      <li className="guide-step-item">
                        <span className="step-num">02</span>
                        <div className="step-desc">
                          <strong>Scan &amp; Periksa</strong>
                          <p>Arahkan kamera ke QR di atas. Pastikan nama merchant yang muncul adalah <strong>HekaStore</strong>.</p>
                        </div>
                      </li>
                      <li className="guide-step-item">
                        <span className="step-num">03</span>
                        <div className="step-desc">
                          <strong>Bayar &amp; Simpan Bukti</strong>
                          <p>Ketik jumlah donasi, konfirmasi PIN Anda, lalu simpan tangkapan layar (screenshot) bukti transfer.</p>
                        </div>
                      </li>
                    </ol>
                  </div>
                </div>
              </article>

              {/* BENTO ITEM 2: FORM KONFIRMASI DONASI */}
              <article className="bento-card bento-form-card" id="form-section">
                <div className="form-card-header">
                  <div className="form-header-meta">
                    <span className="tech-tag">02-B. // KONFIRMASI DONASI</span>
                    <span className="badge-accent">VERIFIKASI</span>
                  </div>
                  <h2 className="card-heading">Form Konfirmasi Pembayaran</h2>
                  <p className="card-subheading">
                    Sudah melakukan transfer? Isi formulir di bawah ini agar donasi Anda tercatat dan tim HekaLabs dapat menyampaikan apresiasi.
                  </p>
                </div>

                {!isSubmitted ? (
                  <form onSubmit={handleSubmit} className="donation-form" noValidate>
                    {/* Honeypot trap */}
                    <div className="hp-trap" aria-hidden="true">
                      <label htmlFor="website_hp">Jangan isi field ini:</label>
                      <input
                        type="text"
                        id="website_hp"
                        name="website_hp"
                        tabIndex={-1}
                        autoComplete="off"
                        value={honeypot}
                        onChange={(e) => setHoneypot(e.target.value)}
                      />
                    </div>

                    {/* Field 1: Nama */}
                    <div className="form-group">
                      <div className="label-row">
                        <label htmlFor="donor-name" className="form-label">
                          Nama Donatur <span className="required-mark">*</span>
                        </label>
                        <span className="label-hint">2–60 karakter</span>
                      </div>
                      <div className="input-wrapper">
                        <input
                          type="text"
                          id="donor-name"
                          className="form-input"
                          placeholder="Contoh: Budi Santoso / Nova"
                          minLength={2}
                          maxLength={60}
                          value={donorName}
                          onChange={(e) => {
                            setDonorName(e.target.value);
                            if (errors.name) setErrors((prev) => ({ ...prev, name: '' }));
                          }}
                          required
                          autoComplete="name"
                        />
                      </div>
                      <div className="checkbox-wrapper">
                        <label className="custom-checkbox-label" htmlFor="is-anonymous">
                          <input
                            type="checkbox"
                            id="is-anonymous"
                            className="custom-checkbox-input"
                            checked={isAnonymous}
                            onChange={(e) => setIsAnonymous(e.target.checked)}
                          />
                          <span className="checkbox-custom" aria-hidden="true" />
                          <span className="checkbox-text">Tampilkan sebagai donatur anonim (nama dirahasiakan di publik)</span>
                        </label>
                      </div>
                      {errors.name && <div className="field-error visible">{errors.name}</div>}
                    </div>

                    {/* Field 2: Nominal */}
                    <div className="form-group">
                      <div className="label-row">
                        <label htmlFor="donor-amount" className="form-label">
                          Nominal Donasi (IDR) <span className="required-mark">*</span>
                        </label>
                        <span className="label-hint">Minimum Rp 1.000</span>
                      </div>
                      <div className="input-wrapper input-with-icon">
                        <span className="input-prefix" aria-hidden="true">Rp</span>
                        <input
                          type="text"
                          id="donor-amount"
                          className="form-input input-currency"
                          placeholder="Contoh: 25.000"
                          inputMode="numeric"
                          value={amountInput}
                          onChange={(e) => handleAmountChange(e.target.value)}
                          required
                        />
                      </div>

                      {/* Quick Chips */}
                      <div className="amount-chips-wrapper">
                        <span className="chips-title">PILIH CEPAT:</span>
                        <div className="chips-list" role="group" aria-label="Pilihan Nominal Cepat">
                          {QUICK_AMOUNTS.map((amt) => (
                            <button
                              key={amt}
                              type="button"
                              className={`amount-chip ${numericAmount === amt ? 'active' : ''}`}
                              onClick={() => handleChipSelect(amt)}
                            >
                              Rp {formatRupiah(amt)}
                            </button>
                          ))}
                        </div>
                      </div>
                      {errors.amount && <div className="field-error visible">{errors.amount}</div>}
                    </div>

                    {/* Field 3: Upload Bukti */}
                    <div className="form-group">
                      <div className="label-row">
                        <label className="form-label" id="proof-label">
                          Bukti Pembayaran <span className="required-mark">*</span>
                        </label>
                        <span className="label-hint">JPG, PNG, WEBP (Maks 5 MB)</span>
                      </div>

                      <div
                        className={`dropzone-area ${isDragging ? 'drag-over' : ''} ${selectedFile ? 'has-file' : ''}`}
                        onClick={() => fileInputRef.current?.click()}
                        onDragOver={(e) => {
                          e.preventDefault();
                          setIsDragging(true);
                        }}
                        onDragLeave={() => setIsDragging(false)}
                        onDrop={handleDrop}
                        role="button"
                        tabIndex={0}
                        aria-labelledby="proof-label"
                      >
                        <input
                          type="file"
                          ref={fileInputRef}
                          accept="image/jpeg,image/png,image/webp"
                          className="file-input-hidden"
                          onChange={handleFileChange}
                        />

                        {!selectedFile ? (
                          <div className="dropzone-content">
                            <div className="dropzone-icon" aria-hidden="true">
                              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>
                            </div>
                            <div className="dropzone-text">
                              <span className="dropzone-primary-text">Klik untuk memilih file</span> atau seret gambar ke sini
                            </div>
                            <span className="dropzone-subtext">
                              {isCompressing ? 'Sedang mengompres gambar...' : 'Format: JPG, PNG, atau WEBP (Maksimal 5 MB)'}
                            </span>
                          </div>
                        ) : (
                          <div className="dropzone-preview">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={compressedDataUrl}
                              alt="Preview Bukti Pembayaran"
                              className="preview-thumbnail"
                            />
                            <div className="preview-info">
                              <span className="preview-filename">{selectedFile.name}</span>
                              <span className="preview-filesize">
                                Asli: {formatBytes(selectedFile.size)} → Hasil: {formatBytes(compressedSizeBytes)}
                              </span>
                              <span className="preview-compressed-badge">Terkonversi Optimal</span>
                            </div>
                            <button
                              type="button"
                              className="btn-remove-preview"
                              onClick={handleRemoveFile}
                              title="Hapus gambar"
                            >
                              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                              <span className="sr-only">Hapus gambar</span>
                            </button>
                          </div>
                        )}
                      </div>
                      {errors.proof && <div className="field-error visible">{errors.proof}</div>}
                    </div>

                    {/* Field 4: Pesan / Doa */}
                    <div className="form-group">
                      <div className="label-row">
                        <label htmlFor="donor-message" className="form-label">
                          Pesan / Kata Dukungan <span className="optional-tag">(Opsional)</span>
                        </label>
                        <span className="char-counter">{message.length} / 300</span>
                      </div>
                      <div className="textarea-wrapper">
                        <textarea
                          id="donor-message"
                          className="form-textarea"
                          placeholder="Tulis pesan, masukan fitur untuk Heka Edit, atau sekadar salam hangat..."
                          maxLength={300}
                          rows={3}
                          value={message}
                          onChange={(e) => setMessage(e.target.value)}
                        />
                      </div>
                    </div>

                    {/* Error Banner */}
                    {alertError && (
                      <div className="form-alert alert-error" role="alert">
                        <div className="alert-message">{alertError}</div>
                      </div>
                    )}

                    {/* Submit Button */}
                    <div className="form-submit-row">
                      <button
                        type="submit"
                        className="btn-submit"
                        disabled={isSubmitting || isCompressing}
                      >
                        <span className="btn-text">
                          {isSubmitting ? 'Mengirim & Memproses...' : 'Kirim Konfirmasi Donasi'}
                        </span>
                        {isSubmitting && (
                          <span className="btn-spinner" aria-hidden="true">
                            <span className="spinner-dot" />
                            <span className="spinner-dot" />
                            <span className="spinner-dot" />
                          </span>
                        )}
                        {!isSubmitting && (
                          <svg className="btn-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></svg>
                        )}
                      </button>
                    </div>

                    <div className="form-privacy-note">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
                      <span>Data Anda dikirim secara aman langsung ke email tim HekaLabs tanpa disimpan di server pihak ketiga.</span>
                    </div>
                  </form>
                ) : (
                  /* SUCCESS STATE */
                  <div className="success-state-container">
                    <div className="success-icon-wrap">
                      <div className="success-ring">
                        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12" /></svg>
                      </div>
                    </div>
                    <span className="tech-tag">// STATUS: TERKONFIRMASI</span>
                    <h3 className="success-title">
                      Terima Kasih, <span className="highlight-text">{submittedData.name}</span>!
                    </h3>
                    <p className="success-lead">
                      Konfirmasi donasi Anda sebesar <strong>Rp {formatRupiah(submittedData.amount)}</strong> telah berhasil kami terima.
                    </p>
                    <div className="success-box">
                      <p>Notifikasi email beserta bukti pembayaran telah diteruskan ke inbox <strong>hekoding@gmail.com</strong>.</p>
                      <p className="success-sub">Dukungan Anda merupakan energi besar bagi keberlanjutan riset, konten edukasi, dan aplikasi open source kami.</p>
                    </div>
                    <div className="success-actions">
                      <button
                        type="button"
                        className="btn-pill btn-pill-outline"
                        onClick={handleResetForm}
                      >
                        <span>Kirim Konfirmasi Lain</span>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="1 4 1 10 7 10" /><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" /></svg>
                      </button>
                    </div>
                  </div>
                )}
              </article>

              {/* BENTO ITEM 3: MEDIA SOSIAL & JEJARING */}
              <article className="bento-card bento-social-card" id="social-section">
                <div className="social-card-header">
                  <div className="social-header-meta">
                    <span className="tech-tag">03-C. // KONEKSI &amp; JEJARING</span>
                    <span className="status-indicator">
                      <span className="pulse-dot green" aria-hidden="true" />
                      <span className="status-text">KONTEN RUTIN AKTIF</span>
                    </span>
                  </div>
                  <h2 className="card-heading">Media Sosial &amp; Ekosistem Heka</h2>
                  <p className="card-subheading">
                    Ikuti seluruh rilis karya, tutorial video editing, edukasi pemrograman, hingga keseharian kreator di kanal resmi berikut:
                  </p>
                </div>

                <div className="social-grid">
                  {/* YouTube */}
                  <a
                    href="https://youtube.com/@Novemas12"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="social-item-card"
                    aria-label="YouTube @Novemas12"
                  >
                    <div className="social-item-top">
                      <div className="social-icon youtube-icon" aria-hidden="true">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" /></svg>
                      </div>
                      <span className="social-tag">YOUTUBE</span>
                      <svg className="external-arrow" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><line x1="7" y1="17" x2="17" y2="7" /><polyline points="7 7 17 7 17 17" /></svg>
                    </div>
                    <div className="social-item-main">
                      <span className="social-handle">@Novemas12</span>
                      <span className="social-desc">Kanal utama video tutorial, showcase proyek &amp; edukasi.</span>
                    </div>
                  </a>

                  {/* Instagram 1: novemash3kaa */}
                  <a
                    href="https://instagram.com/novemash3kaa"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="social-item-card"
                    aria-label="Instagram @novemash3kaa"
                  >
                    <div className="social-item-top">
                      <div className="social-icon instagram-icon" aria-hidden="true">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5" /><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" /><line x1="17.5" y1="6.5" x2="17.51" y2="6.5" /></svg>
                      </div>
                      <span className="social-tag">INSTAGRAM</span>
                      <svg className="external-arrow" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><line x1="7" y1="17" x2="17" y2="7" /><polyline points="7 7 17 7 17 17" /></svg>
                    </div>
                    <div className="social-item-main">
                      <span className="social-handle">@novemash3kaa</span>
                      <span className="social-desc">Personal developer &amp; behind the scenes karya.</span>
                    </div>
                  </a>

                  {/* Instagram 2: hekaedit */}
                  <a
                    href="https://instagram.com/hekaedit"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="social-item-card"
                    aria-label="Instagram @hekaedit"
                  >
                    <div className="social-item-top">
                      <div className="social-icon instagram-icon" aria-hidden="true">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5" /><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" /><line x1="17.5" y1="6.5" x2="17.51" y2="6.5" /></svg>
                      </div>
                      <span className="social-tag">HEKA EDIT</span>
                      <svg className="external-arrow" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><line x1="7" y1="17" x2="17" y2="7" /><polyline points="7 7 17 7 17 17" /></svg>
                    </div>
                    <div className="social-item-main">
                      <span className="social-handle">@hekaedit</span>
                      <span className="social-desc">Preset, motion graphic, dan update aplikasi Heka Edit.</span>
                    </div>
                  </a>

                  {/* Instagram 3: hekaedu */}
                  <a
                    href="https://instagram.com/hekaedu"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="social-item-card"
                    aria-label="Instagram @hekaedu"
                  >
                    <div className="social-item-top">
                      <div className="social-icon instagram-icon" aria-hidden="true">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5" /><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" /><line x1="17.5" y1="6.5" x2="17.51" y2="6.5" /></svg>
                      </div>
                      <span className="social-tag">HEKA EDU</span>
                      <svg className="external-arrow" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><line x1="7" y1="17" x2="17" y2="7" /><polyline points="7 7 17 7 17 17" /></svg>
                    </div>
                    <div className="social-item-main">
                      <span className="social-handle">@hekaedu</span>
                      <span className="social-desc">Edukasi digital, koding, dan tips produktivitas.</span>
                    </div>
                  </a>

                  {/* TikTok 1: novemas_id */}
                  <a
                    href="https://tiktok.com/@novemas_id"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="social-item-card"
                    aria-label="TikTok @novemas_id"
                  >
                    <div className="social-item-top">
                      <div className="social-icon tiktok-icon" aria-hidden="true">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64c.298-.002.595.042.88.13V9.4a6.33 6.33 0 0 0-.88-.06A6.34 6.34 0 0 0 3 15.68a6.34 6.34 0 0 0 10.83 4.48c.03-.03.06-.06.08-.09.04-.04.07-.07.1-.11V10.7a8.16 8.16 0 0 0 5.58 2.19V9.43a4.85 4.85 0 0 1 0-2.74z" /></svg>
                      </div>
                      <span className="social-tag">TIKTOK</span>
                      <svg className="external-arrow" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><line x1="7" y1="17" x2="17" y2="7" /><polyline points="7 7 17 7 17 17" /></svg>
                    </div>
                    <div className="social-item-main">
                      <span className="social-handle">@novemas_id</span>
                      <span className="social-desc">Tips pemrograman ringkas &amp; ide kreatif harian.</span>
                    </div>
                  </a>

                  {/* TikTok 2: hekaedit25 */}
                  <a
                    href="https://tiktok.com/@hekaedit25"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="social-item-card"
                    aria-label="TikTok @hekaedit25"
                  >
                    <div className="social-item-top">
                      <div className="social-icon tiktok-icon" aria-hidden="true">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64c.298-.002.595.042.88.13V9.4a6.33 6.33 0 0 0-.88-.06A6.34 6.34 0 0 0 3 15.68a6.34 6.34 0 0 0 10.83 4.48c.03-.03.06-.06.08-.09.04-.04.07-.07.1-.11V10.7a8.16 8.16 0 0 0 5.58 2.19V9.43a4.85 4.85 0 0 1 0-2.74z" /></svg>
                      </div>
                      <span className="social-tag">TIKTOK</span>
                      <svg className="external-arrow" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><line x1="7" y1="17" x2="17" y2="7" /><polyline points="7 7 17 7 17 17" /></svg>
                    </div>
                    <div className="social-item-main">
                      <span className="social-handle">@hekaedit25</span>
                      <span className="social-desc">Tutorial video editing singkat dan template visual.</span>
                    </div>
                  </a>

                  {/* TikTok 3: hecalisthenics */}
                  <a
                    href="https://tiktok.com/@hecalisthenics"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="social-item-card"
                    aria-label="TikTok @hecalisthenics"
                  >
                    <div className="social-item-top">
                      <div className="social-icon tiktok-icon" aria-hidden="true">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64c.298-.002.595.042.88.13V9.4a6.33 6.33 0 0 0-.88-.06A6.34 6.34 0 0 0 3 15.68a6.34 6.34 0 0 0 10.83 4.48c.03-.03.06-.06.08-.09.04-.04.07-.07.1-.11V10.7a8.16 8.16 0 0 0 5.58 2.19V9.43a4.85 4.85 0 0 1 0-2.74z" /></svg>
                      </div>
                      <span className="social-tag">CALISTHENICS</span>
                      <svg className="external-arrow" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><line x1="7" y1="17" x2="17" y2="7" /><polyline points="7 7 17 7 17 17" /></svg>
                    </div>
                    <div className="social-item-main">
                      <span className="social-handle">@hecalisthenics</span>
                      <span className="social-desc">Aktivitas olahraga, calisthenics &amp; gaya hidup disiplin.</span>
                    </div>
                  </a>

                  {/* Facebook: novemash3kaa */}
                  <a
                    href="https://facebook.com/novemash3kaa"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="social-item-card"
                    aria-label="Facebook @novemash3kaa"
                  >
                    <div className="social-item-top">
                      <div className="social-icon facebook-icon" aria-hidden="true">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" /></svg>
                      </div>
                      <span className="social-tag">FACEBOOK</span>
                      <svg className="external-arrow" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><line x1="7" y1="17" x2="17" y2="7" /><polyline points="7 7 17 7 17 17" /></svg>
                    </div>
                    <div className="social-item-main">
                      <span className="social-handle">@novemash3kaa</span>
                      <span className="social-desc">Koneksi jaringan dan komunitas Facebook HekaLabs.</span>
                    </div>
                  </a>

                  {/* GitHub: hekalabs-studio */}
                  <a
                    href="https://github.com/hekalabs-studio"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="social-item-card social-item-github"
                    aria-label="GitHub hekalabs-studio"
                  >
                    <div className="social-item-top">
                      <div className="social-icon github-icon" aria-hidden="true">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" /></svg>
                      </div>
                      <span className="social-tag">GITHUB</span>
                      <svg className="external-arrow" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><line x1="7" y1="17" x2="17" y2="7" /><polyline points="7 7 17 7 17 17" /></svg>
                    </div>
                    <div className="social-item-main">
                      <span className="social-handle">hekalabs-studio</span>
                      <span className="social-desc">Repositori open source, tools, dan repositori proyek publik.</span>
                    </div>
                  </a>
                </div>
              </article>

              {/* BENTO ITEM 4: IMPACT & VALUE ALLOCATION */}
              <article className="bento-card bento-impact-card">
                <div className="impact-card-inner">
                  <div className="impact-header">
                    <span className="tech-tag">04-D. // ALOKASI DANA KARYA</span>
                    <span className="badge-pill-subtle">TRANSPARANSI</span>
                  </div>
                  <h2 className="impact-title">Ke Mana Donasi Anda Mengalir?</h2>
                  <div className="impact-list">
                    <div className="impact-item">
                      <span className="impact-idx">01</span>
                      <div className="impact-text">
                        <strong>Pengembangan Heka Edit</strong>
                        <p>Penyempurnaan fitur editor, aset motion graphic gratis, dan tool produktivitas video.</p>
                      </div>
                    </div>
                    <div className="impact-item">
                      <span className="impact-idx">02</span>
                      <div className="impact-text">
                        <strong>Konten Edukasi Heka Edu</strong>
                        <p>Produksi tutorial koding, web development, dan materi belajar gratis di media sosial.</p>
                      </div>
                    </div>
                    <div className="impact-item">
                      <span className="impact-idx">03</span>
                      <div className="impact-text">
                        <strong>Perangkat Lunak Open Source</strong>
                        <p>Maintenance library, template open-source, dan dokumentasi terbuka di GitHub.</p>
                      </div>
                    </div>
                    <div className="impact-item">
                      <span className="impact-idx">04</span>
                      <div className="impact-text">
                        <strong>Infrastruktur &amp; Cloud</strong>
                        <p>Operasional server, domain, database, dan hosting untuk layanan publik HekaLabs.</p>
                      </div>
                    </div>
                  </div>
                </div>
              </article>

            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="site-footer">
        <div className="container footer-inner">
          <div className="footer-top">
            <div className="footer-brand-col">
              <span className="footer-brand">HEKALABS ™</span>
              <p className="footer-quote">
                &ldquo;Bridging the space between bold concepts and digital reality.&rdquo;
              </p>
              <span className="tech-tag">// EST. 2025 • JAKARTA, INDONESIA</span>
            </div>
            <div className="footer-thanks-col">
              <span className="footer-kicker">CATATAN TERIMA KASIH</span>
              <p className="footer-thanks-text">
                Terima kasih tak terhingga kepada setiap donatur dan pendukung. Setiap rupiah yang Anda berikan adalah amanah yang kami konversikan menjadi karya, ilmu, dan kontribusi nyata bagi ekosistem digital terbuka.
              </p>
            </div>
          </div>

          <div className="footer-bottom">
            <div className="footer-copy">
              © 2026 HekaLabs. Seluruh hak cipta dilindungi.
            </div>
            <div className="footer-badge">
              <span className="pulse-dot green" aria-hidden="true" />
              <span>SISTEM QRIS NASIONAL OPERASIONAL</span>
            </div>
          </div>
        </div>
      </footer>
    </>
  );
}
