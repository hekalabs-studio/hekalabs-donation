import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

// In-memory rate limiting store for serverless instance
const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000; // 10 minutes
const MAX_REQUESTS_PER_WINDOW = 5;

function isRateLimited(ip) {
  const now = Date.now();
  const timestamps = rateLimitMap.get(ip) || [];
  const recent = timestamps.filter(t => now - t < RATE_LIMIT_WINDOW_MS);

  if (recent.length >= MAX_REQUESTS_PER_WINDOW) {
    rateLimitMap.set(ip, recent);
    return true;
  }

  recent.push(now);
  rateLimitMap.set(ip, recent);
  return false;
}

function formatRupiah(amount) {
  return new Intl.NumberFormat('id-ID').format(amount);
}

function getWibFormattedTime() {
  const now = new Date();
  return new Intl.DateTimeFormat('id-ID', {
    timeZone: 'Asia/Jakarta',
    dateStyle: 'full',
    timeStyle: 'medium'
  }).format(now) + ' WIB';
}

function escapeHtml(text) {
  if (!text) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export async function POST(request) {
  try {
    const clientIp =
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      request.headers.get('x-real-ip') ||
      'Unknown IP';

    const userAgent = request.headers.get('user-agent') || 'Unknown User-Agent';

    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { success: false, error: 'Payload JSON tidak valid.' },
        { status: 400 }
      );
    }

    // 1. Anti-spam honeypot
    if (body.website_hp && String(body.website_hp).trim() !== '') {
      console.warn(`Spam bot trapped via honeypot from IP: ${clientIp}`);
      return NextResponse.json({
        success: true,
        message: 'Konfirmasi donasi berhasil diterima.'
      });
    }

    // 2. Rate limit
    if (isRateLimited(clientIp)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Terlalu banyak permintaan dari perangkat Anda. Harap tunggu beberapa menit.'
        },
        { status: 429 }
      );
    }

    // 3. Name validation
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    if (!name || name.length < 2 || name.length > 60) {
      return NextResponse.json(
        { success: false, error: 'Nama donatur tidak valid (harus 2-60 karakter).' },
        { status: 400 }
      );
    }

    // 4. Amount validation
    const amount = parseInt(body.amount, 10);
    if (isNaN(amount) || amount < 1000) {
      return NextResponse.json(
        { success: false, error: 'Nominal donasi tidak valid (minimal Rp 1.000).' },
        { status: 400 }
      );
    }

    const isAnonymous = Boolean(body.isAnonymous);
    const message = typeof body.message === 'string' ? body.message.trim().slice(0, 300) : '';

    // 5. Image Proof validation
    const imageBase64Raw = body.imageBase64;
    if (!imageBase64Raw || typeof imageBase64Raw !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Bukti pembayaran wajib dilampirkan.' },
        { status: 400 }
      );
    }

    let mimeType = 'image/jpeg';
    let base64Data = imageBase64Raw;

    const matches = imageBase64Raw.match(/^data:(image\/[a-zA-Z0-9+.-]+);base64,(.+)$/);
    if (matches) {
      mimeType = matches[1].toLowerCase();
      base64Data = matches[2];
    }

    const allowedMimes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedMimes.includes(mimeType)) {
      return NextResponse.json(
        { success: false, error: 'Format gambar tidak didukung (gunakan JPG, PNG, atau WEBP).' },
        { status: 400 }
      );
    }

    const fileBuffer = Buffer.from(base64Data, 'base64');
    const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

    if (fileBuffer.length > MAX_SIZE_BYTES) {
      return NextResponse.json(
        { success: false, error: 'Ukuran file melebihi batas 5 MB.' },
        { status: 400 }
      );
    }

    let fileExt = 'jpg';
    if (mimeType === 'image/png') fileExt = 'png';
    else if (mimeType === 'image/webp') fileExt = 'webp';

    const attachmentFilename = `bukti-donasi-${Date.now()}.${fileExt}`;
    const formattedNominal = formatRupiah(amount);
    const waktuWib = getWibFormattedTime();

    // 6. Gmail App Password from Environment
    const gmailUser = process.env.GMAIL_USER || 'hekoding@gmail.com';
    const gmailPass = process.env.GMAIL_APP_PASSWORD;

    if (!gmailPass) {
      console.error('GMAIL_APP_PASSWORD environment variable is not configured.');
      return NextResponse.json(
        {
          success: false,
          error: 'Konfigurasi email server belum diatur (GMAIL_APP_PASSWORD tidak ditemukan).'
        },
        { status: 500 }
      );
    }

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: gmailUser,
        pass: gmailPass
      }
    });

    const emailHtml = `
<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #09090b; color: #f4f4f5; margin: 0; padding: 24px; }
    .container { max-width: 600px; margin: 0 auto; background: #18181b; border: 1px solid #27272a; border-radius: 8px; overflow: hidden; }
    .header { background: #000000; padding: 24px; border-bottom: 2px solid #27272a; }
    .header-tag { font-family: monospace; font-size: 11px; color: #a1a1aa; letter-spacing: 0.05em; text-transform: uppercase; }
    .header-title { margin: 6px 0 0 0; font-size: 20px; font-weight: 700; color: #ffffff; }
    .content { padding: 24px; }
    .amount-box { background: #27272a; border-radius: 6px; padding: 18px; margin-bottom: 20px; text-align: center; }
    .amount-label { font-size: 12px; font-family: monospace; color: #a1a1aa; margin-bottom: 4px; }
    .amount-value { font-size: 28px; font-weight: 800; color: #ffffff; letter-spacing: -0.02em; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
    td { padding: 10px 0; border-bottom: 1px solid #27272a; font-size: 14px; }
    td.label { color: #a1a1aa; font-family: monospace; width: 35%; font-size: 12px; }
    td.value { color: #ffffff; font-weight: 500; }
    .message-box { background: #09090b; border: 1px solid #27272a; border-radius: 6px; padding: 14px; margin-top: 14px; }
    .message-title { font-size: 11px; font-family: monospace; color: #a1a1aa; margin-bottom: 6px; }
    .message-text { font-size: 14px; color: #f4f4f5; font-style: italic; white-space: pre-wrap; line-height: 1.5; }
    .meta-footer { background: #000000; padding: 16px 24px; font-size: 11px; font-family: monospace; color: #71717a; border-top: 1px solid #27272a; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="header-tag">HEKALABS ™ // NOTIFIKASI DONASI QRIS</div>
      <h1 class="header-title">Konfirmasi Donasi Masuk</h1>
    </div>
    <div class="content">
      <div class="amount-box">
        <div class="amount-label">NOMINAL DONASI DITERIMA</div>
        <div class="amount-value">Rp ${formattedNominal}</div>
      </div>

      <table>
        <tr>
          <td class="label">NAMA DONATUR</td>
          <td class="value">${escapeHtml(name)}</td>
        </tr>
        <tr>
          <td class="label">STATUS PRIVASI</td>
          <td class="value">${isAnonymous ? 'Anonim (Nama Disembunyikan)' : 'Publik'}</td>
        </tr>
        <tr>
          <td class="label">WAKTU (WIB)</td>
          <td class="value">${waktuWib}</td>
        </tr>
        <tr>
          <td class="label">MERCHANT QRIS</td>
          <td class="value">HekaStore (NMID: ID1023245869376)</td>
        </tr>
      </table>

      ${
        message
          ? `
      <div class="message-box">
        <div class="message-title">PESAN / KATA DUKUNGAN:</div>
        <div class="message-text">"${escapeHtml(message)}"</div>
      </div>`
          : ''
      }
    </div>
    <div class="meta-footer">
      <div>IP PENGIRIM: ${escapeHtml(clientIp)}</div>
      <div style="margin-top: 4px;">USER AGENT: ${escapeHtml(userAgent)}</div>
      <div style="margin-top: 6px; color: #52525b;">Lampiran bukti transfer pembayaran terlampir pada email ini.</div>
    </div>
  </div>
</body>
</html>
    `;

    const mailOptions = {
      from: `"HekaLabs Donasi" <${gmailUser}>`,
      to: 'hekoding@gmail.com',
      replyTo: 'hekoding@gmail.com',
      subject: `[HekaLabs Donasi] Rp ${formattedNominal} dari ${name}${isAnonymous ? ' (Anonim)' : ''}`,
      html: emailHtml,
      attachments: [
        {
          filename: attachmentFilename,
          content: fileBuffer,
          contentType: mimeType
        }
      ]
    };

    await transporter.sendMail(mailOptions);
    console.log(`Donation email sent: Rp ${formattedNominal} from ${name}`);

    return NextResponse.json({
      success: true,
      message: 'Konfirmasi donasi dan bukti transfer berhasil dikirim. Terima kasih banyak!'
    });

  } catch (error) {
    console.error('Error processing donation API route:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Gagal memproses konfirmasi donasi atau mengirim email. Mohon coba lagi.'
      },
      { status: 500 }
    );
  }
}
