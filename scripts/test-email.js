const fs = require('fs');
const path = require('path');
const nodemailer = require('nodemailer');

// Load .env.local manually
const envPath = path.join(__dirname, '..', '.env.local');
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, 'utf8');
  content.split('\n').forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const match = trimmed.match(/^([^=]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      const val = match[2].trim().replace(/^['"]|['"]$/g, '');
      process.env[key] = val;
    }
  });
}

const user = process.env.GMAIL_USER || 'hekoding@gmail.com';
const pass = (process.env.GMAIL_APP_PASSWORD || '').replace(/\s+/g, '');

console.log('====================================================');
console.log('  UJI KONEKSI EMAIL GMAIL HEKALABS DONASI');
console.log('====================================================');
console.log(`Akun Gmail : ${user}`);
console.log(`Password   : ${pass ? pass.slice(0, 4) + '************ (' + pass.length + ' karakter)' : 'TIDAK DITEMUKAN'}`);
console.log('Menghubungkan ke server Google Mail (smtp.gmail.com)...');

if (!pass) {
  console.error('\n❌ ERROR: GMAIL_APP_PASSWORD belum diisi di file .env.local');
  process.exit(1);
}

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 465,
  secure: true,
  auth: {
    user,
    pass,
  },
});

transporter.verify((err, success) => {
  if (err) {
    console.error('\n❌ KONEKSI GAGAL:');
    console.error(err.message);
    if (err.code === 'EAUTH') {
      console.log('\n💡 PENYEBAB & SOLUSI:');
      console.log('1. Akun Google menolak login ini (535 Bad Credentials).');
      console.log('2. Pastikan Anda membuat App Password di akun:', user);
      console.log('   (Jika Anda login ke akun Google lain saat membuka https://myaccount.google.com/apppasswords, password yang dibuat tidak akan cocok untuk ' + user + ')');
      console.log('3. Pastikan Verifikasi 2 Langkah (2-Step Verification) aktif di:', user);
      console.log('4. Buat App Password baru 16 huruf, salin, dan masukkan ke .env.local tanpa spasi.');
    }
    process.exit(1);
  }

  console.log('\n✅ KONEKSI BERHASIL! Akun siap mengirim email.');
  console.log('Mengirim email uji coba ke ' + user + '...');

  transporter.sendMail(
    {
      from: `"HekaLabs Test" <${user}>`,
      to: user,
      subject: '[Test] HekaLabs Donasi Email Berhasil Terhubung! 🎉',
      html: `
        <div style="font-family: sans-serif; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
          <h2 style="color: #0e6ef5;">Koneksi Email HekaLabs Berhasil!</h2>
          <p>Email ini dikirim otomatis sebagai tes dari sistem konfirmasi donasi HekaLabs.</p>
          <p>Waktu tes: <strong>${new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })} WIB</strong></p>
          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 16px 0;" />
          <p style="color: #64748b; font-size: 12px;">© 2026 HekaLabs • Novemas Heka Alfarizi</p>
        </div>
      `,
    },
    (sendErr, info) => {
      if (sendErr) {
        console.error('❌ GAGAL MENGIRIM PESAN:', sendErr.message);
        process.exit(1);
      }
      console.log('🎉 EMAIL UJI COBA BERHASIL TERKIRIM!');
      console.log('Message ID:', info.messageId);
      console.log('Silakan periksa inbox / spam di:', user);
      process.exit(0);
    }
  );
});
