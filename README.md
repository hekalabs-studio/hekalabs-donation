# HekaLabs ™ — Portal Donasi QRIS (Next.js + Vercel)

Website satu halaman (*single page*) resmi untuk menerima donasi dan dukungan karya digital HekaLabs (Heka Edit, Heka Edu, dan ekosistem proyek *open source*) via QRIS Nasional. 

Dibangun dengan **Next.js (App Router)** dan siap di-deploy langsung ke **Vercel** (100% gratis, serverless functions tanpa batas Blaze plan / tanpa kartu kredit). Desain visual mengacu penuh pada spesifikasi **[DESIGN.md](DESIGN.md) (Aether - The New Frontier)**.

---

## 📁 Struktur Proyek

```text
hekalabs-donation/
├── app/
│   ├── api/
│   │   └── confirm-donation/
│   │       └── route.js        # Serverless API Handler (Nodemailer, validasi, anti-spam, attachment)
│   ├── globals.css             # Desain Aether (Dark Mode #050505, Bento Grid, Micro-interactions)
│   ├── layout.js               # Metadata, SEO, Next.js Google Fonts (Inter & JetBrains Mono)
│   └── page.js                 # UI Interaktif (QRIS card, auto-format Rupiah, kompresi gambar Canvas)
├── public/
│   └── assets/
│       ├── qris.jpeg           # Gambar QRIS resmi HekaStore (NMID: ID1023245869376)
│       └── favicon.svg         # Favicon identitas HekaLabs
├── .env.example                # Panduan konfigurasi environment variables
├── .env.local                  # Environment variables lokal (tidak di-commit ke Git)
├── .gitignore                  # Mengabaikan node_modules, .next, dan .env*.local
├── vercel.json                 # Konfigurasi deployment Vercel
├── next.config.js              # Konfigurasi Next.js
├── DESIGN.md                   # Sumber acuan visual Aether
└── README.md                   # Panduan instalasi & deployment Vercel
```

---

## ⚡ Fitur Utama

1. **Aether Visual System**:
   - Dark mode modern (`#050505`), teks berkarakter (`#FFFFFF` & `#A1A1AA`), border teknikal halus (`#27272A`), radius sudut `8px`.
   - Font resmi Google Fonts: **Inter** (display & body) dan **JetBrains Mono** (label, tag `01-A.`, metadata, dan NMID).
   - Latar belakang partikel *ambient canvas* responsif dan menghormati `prefers-reduced-motion`.
2. **Kartu QRIS Mandiri & Kompatibel**:
   - Quiet zone luas berlatar putih bersih dengan QRIS resmi **HekaStore** (`ID1023245869376`).
   - Tombol **Salin NMID** dan **Unduh Gambar QR**.
   - Panduan 3 langkah pembayaran (Buka aplikasi → Scan & Cek → Bayar).
3. **Formulir Konfirmasi Pintar**:
   - **Auto-format Rupiah**: Input otomatis diformat saat mengetik (contoh: "Rp 25.000").
   - **Chip Nominal Cepat**: Pilihan Rp 5.000, 10.000, 25.000, 50.000, dan 100.000.
   - **Kompresi Bukti Transfer Sisi Klien**: Resize gambar maksimal sisi 1600px via Canvas API sebelum dikirim, menjaga ukuran payload tetap ringan (< 300 KB).
   - **Opsi Donatur Anonim**: Checkbox untuk merahasiakan nama di publik.
   - **Proteksi Anti-Spam**: *Honeypot field* tersembunyi + rate limit per IP.
4. **Backend Serverless API di Vercel**:
   - Mengirim notifikasi email otomatis ke **hekoding@gmail.com** lengkap dengan data transfer dan lampiran gambar bukti pembayaran.
   - Menggunakan Gmail App Password yang disimpan di Environment Variables Vercel (aman tanpa bocor ke frontend).

---

## 🛠️ Uji Coba Lokal

1. Pastikan file `.env.local` sudah berisi konfigurasi Gmail:
   ```env
   GMAIL_USER=hekoding@gmail.com
   GMAIL_APP_PASSWORD=tdnzdnaafskcpwas
   ```
   *(Ganti dengan 16 digit App Password Anda tanpa spasi jika menggunakan password baru).*

2. Jalankan server development:
   ```bash
   npm run dev
   ```

3. Buka browser di [http://localhost:3000](http://localhost:3000).

---

## 🚀 Panduan Deploy ke Vercel (100% Gratis)

Ada 2 cara mudah untuk mendeploy ke Vercel:

### Cara 1: Menggunakan Vercel CLI (Paling Cepat dari Terminal)

1. Jalankan perintah deploy Vercel di terminal:
   ```bash
   npx vercel
   ```
2. Ikuti instruksi di terminal:
   - Login ke akun Vercel Anda (jika belum).
   - `Set up and deploy?` Tekan **Y**.
   - `Which scope do you want to deploy to?` Pilih akun Anda.
   - `Link to existing project?` Tekan **N**.
   - `What’s your project’s name?` Ketik: **hekalabs-donation** (atau Enter).
   - `In which directory is your code located?` Tekan **Enter** (`./`).
   - `Want to modify these settings?` Tekan **N**.

3. Tambahkan Environment Variable di Vercel:
   ```bash
   npx vercel env add GMAIL_USER production
   # Masukkan: hekoding@gmail.com

   npx vercel env add GMAIL_APP_PASSWORD production
   # Masukkan: 16 karakter App Password (tanpa spasi)
   ```

4. Deploy ke Production:
   ```bash
   npx vercel --prod
   ```

---

### Cara 2: Melalui GitHub & Dashboard Vercel (Otomatis CI/CD)

1. Buat repositori baru di GitHub (misal: `hekalabs-donation`).
2. Hubungkan dan push kode Anda ke GitHub:
   ```bash
   git init
   git add .
   git commit -m "feat: initial commit hekalabs donation next.js"
   git branch -M main
   git remote add origin https://github.com/<username-anda>/hekalabs-donation.git
   git push -u origin main
   ```
3. Buka [vercel.com](https://vercel.com) → Klik **Add New...** → **Project**.
4. Pilih repositori `hekalabs-donation` dari akun GitHub Anda.
5. Pada bagian **Environment Variables**, tambahkan:
   - **Key**: `GMAIL_USER` ➔ **Value**: `hekoding@gmail.com`
   - **Key**: `GMAIL_APP_PASSWORD` ➔ **Value**: 16 karakter App Password Anda (contoh: `tdnzdnaafskcpwas`)
6. Klik **Deploy**. Dalam waktu < 1 menit website Anda sudah aktif di domain gratis `https://hekalabs-donation.vercel.app`!

---

## 🌐 Menghubungkan Custom Domain (Opsional)

Jika ingin menautkan domain sendiri (misal `donasi.hekalabs.com`):
1. Buka dashboard proyek Anda di [vercel.com](https://vercel.com) → Tab **Settings** → Menu **Domains**.
2. Masukkan nama domain/subdomain Anda (contoh: `donasi.hekalabs.com`).
3. Tambahkan DNS Record (CNAME ke `cname.vercel-dns.com`) di panel penyedia domain Anda.
4. Vercel akan otomatis mengonfigurasi sertifikat SSL (HTTPS) gratis secara instan.

---

## 🛡️ Hak Cipta & Lisensi

Dibuat untuk **HekaLabs Studio** © 2026. Seluruh hak cipta dilindungi.
Mendukung ekosistem karya Heka Edit & Heka Edu.
# hekalabs-donation
