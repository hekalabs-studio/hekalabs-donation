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
  // Theme state (Dark Mode matching hekaportfolio.web.app)
  const [isDarkMode, setIsDarkMode] = useState(false);

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

  // Initialize theme from localStorage / system preference
  useEffect(() => {
    const saved = localStorage.getItem('darkMode');
    if (saved === 'enabled') {
      document.body.classList.add('dark-mode');
      setIsDarkMode(true);
    } else if (saved === 'disabled') {
      document.body.classList.remove('dark-mode');
      setIsDarkMode(false);
    }
  }, []);

  const toggleDarkMode = () => {
    const nextState = !isDarkMode;
    setIsDarkMode(nextState);
    if (nextState) {
      document.body.classList.add('dark-mode');
      localStorage.setItem('darkMode', 'enabled');
    } else {
      document.body.classList.remove('dark-mode');
      localStorage.setItem('darkMode', 'disabled');
    }
  };

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
      errs.proof = 'Wajib melampirkan foto bukti pembayaran.';
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
        throw new Error(data.error || 'Terjadi kendala saat mengirim konfirmasi.');
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
      {/* Site Header */}
      <header className="site-header">
        <div className="container header-inner">
          <a href="#" className="brand-wrapper" aria-label="HekaLabs Beranda">
            <span className="brand-title">HEKA</span>
            <span className="brand-sub">Donasi &amp; Dukungan</span>
          </a>

          <nav className="nav-links" aria-label="Navigasi Halaman">
            <a href="#hero" className="nav-link">Home</a>
            <a href="#qris-section" className="nav-link">QRIS</a>
            <a href="#form-section" className="nav-link">Konfirmasi</a>
            <a href="#social-section" className="nav-link">Medsos</a>
            <a
              href="https://hekaportfolio.web.app/"
              target="_blank"
              rel="noopener noreferrer"
              className="nav-link"
            >
              Portfolio ↗
            </a>
          </nav>

          <div className="header-actions">
            {/* Dark Mode Toggle (Matching Heka Portfolio) */}
            <button
              type="button"
              id="dark-mode-toggle"
              className="dark-mode-btn"
              onClick={toggleDarkMode}
              aria-label="Ganti mode gelap/terang"
              title="Mode gelap / terang"
            >
              {isDarkMode ? '☀️' : '🌙'}
            </button>

            <a href="#qris-section" className="btn btn-primary" style={{ padding: '8px 16px', fontSize: '0.85rem' }}>
              <span>Donasi</span>
            </a>
          </div>
        </div>
      </header>

      <main>
        {/* HERO SECTION */}
        <section id="hero" className="hero-section">
          <div className="container">
            <span className="hero-greeting">Hey There</span>
            <h1 className="hero-title">
              Dukungan Karya &amp; Donasi <span className="highlight">HekaLabs</span>
            </h1>
            <p className="hero-role">Web Development • Video Editing • Open Source</p>
            <p className="hero-desc">
              Saya <strong>Novemas Heka Alfarizi</strong>. Halaman ini adalah saluran donasi resmi untuk mendukung
              pengembangan aplikasi <strong>Heka Edit</strong>, pembuatan materi edukasi coding <strong>Heka Edu</strong>,
              serta pemeliharaan berbagai proyek open source gratis untuk masyarakat luas.
            </p>

            <div className="hero-actions">
              <a href="#qris-section" className="btn btn-primary">
                <span>Scan QRIS Sekarang</span>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><line x1="12" y1="5" x2="12" y2="19" /><polyline points="19 12 12 19 5 12" /></svg>
              </a>
              <a href="#form-section" className="btn btn-outline">
                <span>Konfirmasi Bukti Pembayaran</span>
              </a>
            </div>

            <div className="hero-badges-row">
              <div className="stat-badge-card">
                <span className="stat-badge-title">TRANSAKSI LANGSUNG</span>
                <span className="stat-badge-desc">100% Bebas Biaya Potongan</span>
              </div>
              <div className="stat-badge-card">
                <span className="stat-badge-title">STANDAR NASIONAL</span>
                <span className="stat-badge-desc">Semua Bank &amp; E-Wallet QRIS</span>
              </div>
              <div className="stat-badge-card">
                <span className="stat-badge-title">NOTIFIKASI OTOMATIS</span>
                <span className="stat-badge-desc">Diverifikasi &amp; Masuk ke Email</span>
              </div>
            </div>
          </div>
        </section>

        {/* MAIN CONTENT GRID */}
        <section className="main-content-section" id="content-container">
          <div className="container">
            <div className="main-grid">

              {/* ITEM 1: KARTU QRIS */}
              <article className="content-card qris-card grid-qris-col" id="qris-section">
                <div className="card-header-simple">
                  <div>
                    <h2 className="card-title-sm">QRIS HekaStore</h2>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Scan untuk melakukan donasi</span>
                  </div>
                  <div className="qris-badge-official">
                    <span className="qris-red">QRIS</span>
                    <span className="qris-gpn">GPN</span>
                  </div>
                </div>

                {/* QR Code Container */}
                <div className="qris-quiet-zone">
                  <div className="qris-image-wrap">
                    <Image
                      src="/assets/qris.jpeg"
                      alt="Kode QRIS Donasi HekaStore NMID ID1023245869376"
                      width={420}
                      height={560}
                      className="qris-img"
                      priority
                    />
                  </div>
                </div>

                {/* Details */}
                <div className="qris-details">
                  <div className="qris-row">
                    <span className="qris-kicker">Merchant:</span>
                    <span className="qris-val">HekaStore</span>
                  </div>
                  <div className="qris-row">
                    <span className="qris-kicker">NMID:</span>
                    <div className="nmid-wrap">
                      <code className="nmid-code">ID1023245869376</code>
                      <button
                        type="button"
                        className="btn-copy-small"
                        onClick={handleCopyNmid}
                        title="Salin NMID"
                      >
                        {copiedNmid ? 'Tersalin!' : 'Salin'}
                      </button>
                    </div>
                  </div>
                  <div className="qris-slogan-box">
                    <strong>SATU QRIS UNTUK SEMUA</strong>
                    Mendukung BCA, Mandiri, BRI, BNI, GoPay, OVO, Dana, ShopeePay, LinkAja, dan bank lainnya.
                  </div>
                </div>

                {/* Download */}
                <a
                  href="/assets/qris.jpeg"
                  download="qris-hekalabs-hekastore.jpeg"
                  className="btn-download-qr"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
                  <span>Unduh Gambar QR</span>
                </a>

                {/* 3 Step Guide */}
                <div className="guide-steps">
                  <h4>Panduan Pembayaran (3 Langkah)</h4>
                  <ol className="steps-list">
                    <li className="step-item">
                      <span className="step-num">1</span>
                      <div>
                        <strong>Buka Aplikasi</strong>
                        <p>Buka m-Banking atau e-Wallet favorit Anda yang mendukung QRIS.</p>
                      </div>
                    </li>
                    <li className="step-item">
                      <span className="step-num">2</span>
                      <div>
                        <strong>Scan &amp; Cek Merchant</strong>
                        <p>Arahkan kamera ke QR di atas dan pastikan nama penerima: <strong>HekaStore</strong>.</p>
                      </div>
                    </li>
                    <li className="step-item">
                      <span className="step-num">3</span>
                      <div>
                        <strong>Masukkan Nominal &amp; Bayar</strong>
                        <p>Ketik nominal donasi, konfirmasi PIN Anda, lalu simpan screenshot bukti pembayaran.</p>
                      </div>
                    </li>
                  </ol>
                </div>
              </article>

              {/* ITEM 2: FORM KONFIRMASI PEMBAYARAN */}
              <article className="content-card grid-form-col" id="form-section">
                <div className="form-header">
                  <h2>Form Konfirmasi Pembayaran</h2>
                  <p>Sudah transfer? Kirimkan bukti di sini agar tercatat dan kami dapat menyampaikan terima kasih.</p>
                </div>

                {!isSubmitted ? (
                  <form onSubmit={handleSubmit} className="donation-form" noValidate>
                    {/* Honeypot field */}
                    <div style={{ position: 'absolute', left: '-9999px', opacity: 0 }}>
                      <input
                        type="text"
                        name="website_hp"
                        tabIndex={-1}
                        autoComplete="off"
                        value={honeypot}
                        onChange={(e) => setHoneypot(e.target.value)}
                      />
                    </div>

                    {/* Nama */}
                    <div className="form-group">
                      <div className="label-row">
                        <label htmlFor="donor-name" className="form-label">
                          Nama Donatur <span className="req-star">*</span>
                        </label>
                        <span className="label-hint">2–60 karakter</span>
                      </div>
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
                      <label className="checkbox-line" htmlFor="is-anonymous">
                        <input
                          type="checkbox"
                          id="is-anonymous"
                          checked={isAnonymous}
                          onChange={(e) => setIsAnonymous(e.target.checked)}
                        />
                        <span>Tampilkan sebagai donatur anonim (nama dirahasiakan di publik)</span>
                      </label>
                      {errors.name && <div className="field-error-msg">{errors.name}</div>}
                    </div>

                    {/* Nominal */}
                    <div className="form-group">
                      <div className="label-row">
                        <label htmlFor="donor-amount" className="form-label">
                          Nominal Donasi (IDR) <span className="req-star">*</span>
                        </label>
                        <span className="label-hint">Minimum Rp 1.000</span>
                      </div>
                      <div className="input-with-rp">
                        <span className="input-rp-badge">Rp</span>
                        <input
                          type="text"
                          id="donor-amount"
                          className="form-input"
                          placeholder="Contoh: 25.000"
                          inputMode="numeric"
                          value={amountInput}
                          onChange={(e) => handleAmountChange(e.target.value)}
                          required
                        />
                      </div>

                      {/* Quick Chips */}
                      <div className="chips-group">
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
                      {errors.amount && <div className="field-error-msg">{errors.amount}</div>}
                    </div>

                    {/* Bukti Transfer */}
                    <div className="form-group">
                      <div className="label-row">
                        <label className="form-label">
                          Bukti Pembayaran <span className="req-star">*</span>
                        </label>
                        <span className="label-hint">JPG, PNG, WEBP (Maks 5 MB)</span>
                      </div>

                      <div
                        className={`dropzone ${isDragging ? 'dragover' : ''}`}
                        onClick={() => fileInputRef.current?.click()}
                        onDragOver={(e) => {
                          e.preventDefault();
                          setIsDragging(true);
                        }}
                        onDragLeave={() => setIsDragging(false)}
                        onDrop={handleDrop}
                        role="button"
                        tabIndex={0}
                      >
                        <input
                          type="file"
                          ref={fileInputRef}
                          accept="image/jpeg,image/png,image/webp"
                          style={{ display: 'none' }}
                          onChange={handleFileChange}
                        />

                        {!selectedFile ? (
                          <div className="dropzone-prompt">
                            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>
                            <p className="dropzone-prompt-text">
                              <strong>Pilih gambar</strong> atau seret bukti transfer ke sini
                            </p>
                            <span className="dropzone-hint">
                              {isCompressing ? 'Sedang mengompres gambar...' : 'Format: JPG, PNG, atau WEBP'}
                            </span>
                          </div>
                        ) : (
                          <div className="dropzone-preview">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={compressedDataUrl}
                              alt="Bukti Transfer"
                              className="preview-thumb"
                            />
                            <div className="preview-meta">
                              <div className="preview-name">{selectedFile.name}</div>
                              <div className="preview-size">
                                Asli: {formatBytes(selectedFile.size)} ➔ Optimal: {formatBytes(compressedSizeBytes)}
                              </div>
                              <span className="preview-opt-badge">✓ Terkonversi Optimal</span>
                            </div>
                            <button
                              type="button"
                              className="btn-remove-thumb"
                              onClick={handleRemoveFile}
                              title="Hapus gambar"
                            >
                              ✕
                            </button>
                          </div>
                        )}
                      </div>
                      {errors.proof && <div className="field-error-msg">{errors.proof}</div>}
                    </div>

                    {/* Pesan */}
                    <div className="form-group">
                      <div className="label-row">
                        <label htmlFor="donor-msg" className="form-label">
                          Pesan / Kata Dukungan <span className="label-hint">(Opsional)</span>
                        </label>
                        <span className="label-hint">{message.length} / 300</span>
                      </div>
                      <textarea
                        id="donor-msg"
                        className="form-textarea"
                        placeholder="Tuliskan saran, doa, atau pesan hangat Anda..."
                        maxLength={300}
                        rows={3}
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                      />
                    </div>

                    {/* Alert */}
                    {alertError && (
                      <div className="alert-box alert-danger">
                        {alertError}
                      </div>
                    )}

                    {/* Submit */}
                    <button
                      type="submit"
                      className="btn btn-primary btn-submit-main"
                      disabled={isSubmitting || isCompressing}
                    >
                      {isSubmitting ? 'Mengirim Data...' : 'Kirim Konfirmasi Donasi'}
                    </button>
                  </form>
                ) : (
                  /* SUCCESS STATE */
                  <div className="success-container">
                    <div className="success-check-circle">
                      <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                    </div>
                    <h3 className="success-title">
                      Terima Kasih, {submittedData.name}!
                    </h3>
                    <p style={{ color: 'var(--text-muted)' }}>
                      Konfirmasi donasi Anda sebesar <strong>Rp {formatRupiah(submittedData.amount)}</strong> berhasil diterima.
                    </p>
                    <div className="success-body">
                      Pemberitahuan telah otomatis diteruskan ke email <strong>hekoding@gmail.com</strong>.
                      Dukungan Anda memberikan dorongan berharga bagi riset teknologi dan edukasi digital HekaLabs.
                    </div>
                    <button
                      type="button"
                      className="btn btn-outline"
                      onClick={handleResetForm}
                    >
                      Kirim Donasi Lain
                    </button>
                  </div>
                )}
              </article>

              {/* ITEM 3: MEDIA SOSIAL (Matching Heka Portfolio style) */}
              <article className="content-card grid-social-col" id="social-section">
                <div className="social-section-header">
                  <h2>Media Sosial &amp; Komunitas</h2>
                  <p>Ikuti perkembangan karya, tips koding, serta tutorial video editing terbaru:</p>
                </div>

                <div className="social-grid-portfolio">
                  {/* YouTube */}
                  <a
                    href="https://youtube.com/@Novemas12"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="social-card-item"
                  >
                    <div className="social-round-icon" aria-hidden="true">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" /></svg>
                    </div>
                    <div className="social-item-text">
                      <span className="social-item-platform">YouTube</span>
                      <span className="social-item-handle">@Novemas12</span>
                    </div>
                  </a>

                  {/* Instagram 1 */}
                  <a
                    href="https://instagram.com/novemash3kaa"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="social-card-item"
                  >
                    <div className="social-round-icon" aria-hidden="true">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5" /><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" /><line x1="17.5" y1="6.5" x2="17.51" y2="6.5" /></svg>
                    </div>
                    <div className="social-item-text">
                      <span className="social-item-platform">Instagram (Personal)</span>
                      <span className="social-item-handle">@novemash3kaa</span>
                    </div>
                  </a>

                  {/* Instagram 2 */}
                  <a
                    href="https://instagram.com/hekaedit"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="social-card-item"
                  >
                    <div className="social-round-icon" aria-hidden="true">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5" /><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" /><line x1="17.5" y1="6.5" x2="17.51" y2="6.5" /></svg>
                    </div>
                    <div className="social-item-text">
                      <span className="social-item-platform">Instagram (Editing)</span>
                      <span className="social-item-handle">@hekaedit</span>
                    </div>
                  </a>

                  {/* Instagram 3 */}
                  <a
                    href="https://instagram.com/hekaedu"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="social-card-item"
                  >
                    <div className="social-round-icon" aria-hidden="true">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5" /><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" /><line x1="17.5" y1="6.5" x2="17.51" y2="6.5" /></svg>
                    </div>
                    <div className="social-item-text">
                      <span className="social-item-platform">Instagram (Edukasi)</span>
                      <span className="social-item-handle">@hekaedu</span>
                    </div>
                  </a>

                  {/* TikTok 1 */}
                  <a
                    href="https://tiktok.com/@novemas_id"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="social-card-item"
                  >
                    <div className="social-round-icon" aria-hidden="true">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64c.298-.002.595.042.88.13V9.4a6.33 6.33 0 0 0-.88-.06A6.34 6.34 0 0 0 3 15.68a6.34 6.34 0 0 0 10.83 4.48c.03-.03.06-.06.08-.09.04-.04.07-.07.1-.11V10.7a8.16 8.16 0 0 0 5.58 2.19V9.43a4.85 4.85 0 0 1 0-2.74z" /></svg>
                    </div>
                    <div className="social-item-text">
                      <span className="social-item-platform">TikTok (Koding)</span>
                      <span className="social-item-handle">@novemas_id</span>
                    </div>
                  </a>

                  {/* TikTok 2 */}
                  <a
                    href="https://tiktok.com/@hekaedit25"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="social-card-item"
                  >
                    <div className="social-round-icon" aria-hidden="true">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64c.298-.002.595.042.88.13V9.4a6.33 6.33 0 0 0-.88-.06A6.34 6.34 0 0 0 3 15.68a6.34 6.34 0 0 0 10.83 4.48c.03-.03.06-.06.08-.09.04-.04.07-.07.1-.11V10.7a8.16 8.16 0 0 0 5.58 2.19V9.43a4.85 4.85 0 0 1 0-2.74z" /></svg>
                    </div>
                    <div className="social-item-text">
                      <span className="social-item-platform">TikTok (Editing)</span>
                      <span className="social-item-handle">@hekaedit25</span>
                    </div>
                  </a>

                  {/* TikTok 3 */}
                  <a
                    href="https://tiktok.com/@hecalisthenics"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="social-card-item"
                  >
                    <div className="social-round-icon" aria-hidden="true">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64c.298-.002.595.042.88.13V9.4a6.33 6.33 0 0 0-.88-.06A6.34 6.34 0 0 0 3 15.68a6.34 6.34 0 0 0 10.83 4.48c.03-.03.06-.06.08-.09.04-.04.07-.07.1-.11V10.7a8.16 8.16 0 0 0 5.58 2.19V9.43a4.85 4.85 0 0 1 0-2.74z" /></svg>
                    </div>
                    <div className="social-item-text">
                      <span className="social-item-platform">TikTok (Calisthenics)</span>
                      <span className="social-item-handle">@hecalisthenics</span>
                    </div>
                  </a>

                  {/* Facebook */}
                  <a
                    href="https://facebook.com/novemash3kaa"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="social-card-item"
                  >
                    <div className="social-round-icon" aria-hidden="true">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" /></svg>
                    </div>
                    <div className="social-item-text">
                      <span className="social-item-platform">Facebook</span>
                      <span className="social-item-handle">@novemash3kaa</span>
                    </div>
                  </a>

                  {/* GitHub */}
                  <a
                    href="https://github.com/hekalabs-studio"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="social-card-item"
                    style={{ gridColumn: '1 / -1' }}
                  >
                    <div className="social-round-icon" aria-hidden="true">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" /></svg>
                    </div>
                    <div className="social-item-text">
                      <span className="social-item-platform">GitHub</span>
                      <span className="social-item-handle">hekalabs-studio</span>
                    </div>
                  </a>
                </div>
              </article>

              {/* ITEM 4: ALOKASI & PENGGUNAAN DANA */}
              <article className="content-card impact-card grid-impact-col">
                <h2>Alokasi Dana Karya</h2>
                <div className="impact-items-list">
                  <div className="impact-row">
                    <span className="impact-icon-badge">1</span>
                    <div className="impact-info">
                      <strong>Heka Edit</strong>
                      <p>Riset tool video editor ringan, preset kreatif, dan workflow grafis modern.</p>
                    </div>
                  </div>
                  <div className="impact-row">
                    <span className="impact-icon-badge">2</span>
                    <div className="impact-info">
                      <strong>Heka Edu</strong>
                      <p>Materi tutorial koding, tips web programming, dan video edukasi gratis.</p>
                    </div>
                  </div>
                  <div className="impact-row">
                    <span className="impact-icon-badge">3</span>
                    <div className="impact-info">
                      <strong>Open Source &amp; Tools</strong>
                      <p>Pembuatan template kode gratis dan pustaka sumber terbuka di GitHub.</p>
                    </div>
                  </div>
                  <div className="impact-row">
                    <span className="impact-icon-badge">4</span>
                    <div className="impact-info">
                      <strong>Server &amp; Cloud</strong>
                      <p>Operasional domain dan hosting website mandiri.</p>
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
        <div className="container footer-inner-layout">
          <div className="footer-top-row">
            <div>
              <span className="footer-brand">HEKALABS</span>
              <p className="footer-tagline">
                Dukungan karya digital independen • Novemas Heka Alfarizi
              </p>
            </div>
            <div className="footer-status-pill">
              <span className="status-dot" />
              <span>SISTEM QRIS OPERASIONAL</span>
            </div>
          </div>

          <div className="footer-copy">
            <span>© 2026 HekaLabs • Novemas Heka Alfarizi. Seluruh hak cipta dilindungi.</span>
            <a
              href="https://hekaportfolio.web.app/"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: 'var(--primary)', textDecoration: 'none', fontWeight: 600 }}
            >
              hekaportfolio.web.app ↗
            </a>
          </div>
        </div>
      </footer>
    </>
  );
}
