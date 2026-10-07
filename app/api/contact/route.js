import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

// In-memory rate limiting store for serverless instance
const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000; // 10 menit
const MAX_REQUESTS_PER_WINDOW = 5;

function isRateLimited(ip) {
  const now = Date.now();
  const timestamps = rateLimitMap.get(ip) || [];
  const recent = timestamps.filter((t) => now - t < RATE_LIMIT_WINDOW_MS);

  if (recent.length >= MAX_REQUESTS_PER_WINDOW) {
    rateLimitMap.set(ip, recent);
    return true;
  }

  recent.push(now);
  rateLimitMap.set(ip, recent);
  return false;
}

function getWibFormattedTime() {
  const now = new Date();
  return (
    new Intl.DateTimeFormat('id-ID', {
      timeZone: 'Asia/Jakarta',
      dateStyle: 'full',
      timeStyle: 'medium',
    }).format(now) + ' WIB'
  );
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

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Accept',
};

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders,
  });
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
        { status: 400, headers: corsHeaders }
      );
    }

    // 1. Anti-spam honeypot
    if (
      (body.website_hp && String(body.website_hp).trim() !== '') ||
      (body._honey && String(body._honey).trim() !== '')
    ) {
      console.warn(`Spam bot trapped via honeypot from IP: ${clientIp}`);
      return NextResponse.json(
        { success: true, message: 'Pesan berhasil diterima.' },
        { headers: corsHeaders }
      );
    }

    // 2. Rate limit
    if (isRateLimited(clientIp)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Terlalu banyak pengiriman dari perangkat Anda. Harap tunggu beberapa menit.',
        },
        { status: 429, headers: corsHeaders }
      );
    }

    // 3. Name validation
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    if (!name || name.length < 2 || name.length > 60) {
      return NextResponse.json(
        { success: false, error: 'Nama tidak valid (harus 2-60 karakter).' },
        { status: 400, headers: corsHeaders }
      );
    }

    // 4. Email validation
    const email = typeof body.email === 'string' ? body.email.trim() : '';
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { success: false, error: 'Format email tidak valid.' },
        { status: 400, headers: corsHeaders }
      );
    }

    // 5. Category validation
    const category = typeof body.category === 'string' && body.category.trim() ? body.category.trim() : (body.Kategori || 'Pesan Umum');

    // 6. WhatsApp (opsional)
    const rawWa = typeof body.whatsapp === 'string' ? body.whatsapp.trim() : (typeof body.WhatsApp_Telegram === 'string' ? body.WhatsApp_Telegram.trim() : '');

    // 7. Message validation
    const message = typeof body.message === 'string' ? body.message.trim() : '';
    if (!message || message.length < 5) {
      return NextResponse.json(
        { success: false, error: 'Pesan minimal 5 karakter.' },
        { status: 400, headers: corsHeaders }
      );
    }

    // 8. Optional File Attachment
    const attachments = [];
    let attachmentNotice = 'Tidak ada lampiran file.';

    if (body.fileBase64 && typeof body.fileBase64 === 'string') {
      let mimeType = 'image/jpeg';
      let base64Data = body.fileBase64;

      const matches = body.fileBase64.match(/^data:([a-zA-Z0-9+.-]+\/[a-zA-Z0-9+.-]+);base64,(.+)$/);
      if (matches) {
        mimeType = matches[1].toLowerCase();
        base64Data = matches[2];
      }

      const allowedMimes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
      if (!allowedMimes.includes(mimeType)) {
        return NextResponse.json(
          { success: false, error: 'Format file lampiran tidak didukung (gunakan JPG, PNG, WEBP, atau PDF).' },
          { status: 400, headers: corsHeaders }
        );
      }

      const fileBuffer = Buffer.from(base64Data, 'base64');
      const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

      if (fileBuffer.length > MAX_SIZE_BYTES) {
        return NextResponse.json(
          { success: false, error: 'Ukuran lampiran melebihi batas 5 MB.' },
          { status: 400, headers: corsHeaders }
        );
      }

      let ext = 'jpg';
      if (mimeType === 'image/png') ext = 'png';
      else if (mimeType === 'image/webp') ext = 'webp';
      else if (mimeType === 'application/pdf') ext = 'pdf';

      const fileName = (body.fileName && typeof body.fileName === 'string')
        ? body.fileName.replace(/[^a-zA-Z0-9._-]/g, '_')
        : `lampiran-${Date.now()}.${ext}`;

      attachments.push({
        filename: fileName,
        content: fileBuffer,
        contentType: mimeType,
      });

      attachmentNotice = `Lampiran file (${fileName}) terlampir pada email ini.`;
    }

    const waktuWib = getWibFormattedTime();

    // 9. Gmail App Password from Environment
    const gmailUser = process.env.GMAIL_USER || 'hekoding@gmail.com';
    const rawPass = process.env.GMAIL_APP_PASSWORD || '';
    const gmailPass = rawPass.replace(/\s+/g, '');

    if (!gmailPass) {
      console.error('GMAIL_APP_PASSWORD environment variable is not configured.');
      return NextResponse.json(
        {
          success: false,
          error: 'Konfigurasi email server belum diatur (GMAIL_APP_PASSWORD tidak ditemukan).',
        },
        { status: 500, headers: corsHeaders }
      );
    }

    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
      auth: {
        user: gmailUser,
        pass: gmailPass,
      },
    });

    // Format WhatsApp link jika tersedia
    let whatsappHtml = '<span style="color: #71717a;">(Tidak dicantumkan)</span>';
    if (rawWa && rawWa !== '(tidak diisi)') {
      let cleanDigits = rawWa.replace(/\D/g, '');
      if (cleanDigits.startsWith('08')) cleanDigits = '628' + cleanDigits.slice(2);
      whatsappHtml = `<a href="https://wa.me/${cleanDigits}" style="color: #5aa7ff; text-decoration: underline;" target="_blank">${escapeHtml(rawWa)}</a>`;
    }

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
    .highlight-box { background: #27272a; border-radius: 6px; padding: 18px; margin-bottom: 20px; text-align: center; }
    .highlight-label { font-size: 12px; font-family: monospace; color: #a1a1aa; margin-bottom: 4px; letter-spacing: 0.05em; text-transform: uppercase; }
    .highlight-value { font-size: 24px; font-weight: 800; color: #ffffff; letter-spacing: -0.02em; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
    td { padding: 10px 0; border-bottom: 1px solid #27272a; font-size: 14px; }
    td.label { color: #a1a1aa; font-family: monospace; width: 35%; font-size: 12px; }
    td.value { color: #ffffff; font-weight: 500; }
    .message-box { background: #09090b; border: 1px solid #27272a; border-radius: 6px; padding: 14px; margin-top: 14px; }
    .message-title { font-size: 11px; font-family: monospace; color: #a1a1aa; margin-bottom: 6px; letter-spacing: 0.05em; }
    .message-text { font-size: 14px; color: #f4f4f5; font-style: italic; white-space: pre-wrap; line-height: 1.6; }
    .meta-footer { background: #000000; padding: 16px 24px; font-size: 11px; font-family: monospace; color: #71717a; border-top: 1px solid #27272a; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="header-tag">HEKALABS // NOTIFIKASI FORMULIR PORTOFOLIO</div>
      <h1 class="header-title">Pesan Portofolio Masuk</h1>
    </div>
    <div class="content">
      <div class="highlight-box">
        <div class="highlight-label">KATEGORI PESAN</div>
        <div class="highlight-value">${escapeHtml(category)}</div>
      </div>

      <table>
        <tr>
          <td class="label">NAMA PENGIRIM</td>
          <td class="value">${escapeHtml(name)}</td>
        </tr>
        <tr>
          <td class="label">EMAIL PENGIRIM</td>
          <td class="value"><a href="mailto:${escapeHtml(email)}" style="color: #5aa7ff; text-decoration: underline;">${escapeHtml(email)}</a></td>
        </tr>
        <tr>
          <td class="label">WHATSAPP / TELEGRAM</td>
          <td class="value">${whatsappHtml}</td>
        </tr>
        <tr>
          <td class="label">STATUS RESPON</td>
          <td class="value"><span style="color: #22c55e; font-weight: 600;">● Menunggu Balasan</span></td>
        </tr>
        <tr>
          <td class="label">WAKTU (WIB)</td>
          <td class="value">${waktuWib}</td>
        </tr>
        <tr>
          <td class="label">SUMBER FORMULIR</td>
          <td class="value">Novemas Heka Portfolio (hekaportfolio.web.app)</td>
        </tr>
      </table>

      <div class="message-box">
        <div class="message-title">ISI PESAN / KEBUTUHAN:</div>
        <div class="message-text">"${escapeHtml(message)}"</div>
      </div>
    </div>
    <div class="meta-footer">
      <div>IP PENGIRIM: ${escapeHtml(clientIp)}</div>
      <div style="margin-top: 4px;">USER AGENT: ${escapeHtml(userAgent)}</div>
      <div style="margin-top: 6px; color: #52525b;">${attachmentNotice}</div>
    </div>
  </div>
</body>
</html>
    `;

    const mailOptions = {
      from: `"HekaLabs Portfolio" <${gmailUser}>`,
      to: 'hekoding@gmail.com',
      replyTo: `${name} <${email}>`,
      subject: `[HekaLabs Portfolio] ${category} dari ${name}`,
      html: emailHtml,
      attachments,
    };

    await transporter.sendMail(mailOptions);
    console.log(`Portfolio contact email sent: [${category}] from ${name} (${email})`);

    return NextResponse.json(
      {
        success: true,
        message: 'Pesan berhasil dikirim ke hekoding@gmail.com! Terima kasih telah menghubungi.',
      },
      { headers: corsHeaders }
    );
  } catch (error) {
    console.error('Error processing contact API route:', error);
    let errorDetail = 'Gagal memproses pesan atau mengirim email. Mohon coba lagi.';
    if (error.code === 'EAUTH') {
      errorDetail =
        'Autentikasi Gmail ditolak oleh Google (535 Bad Credentials). Pastikan App Password aktif untuk hekoding@gmail.com.';
    } else if (error.message) {
      errorDetail = `Kendala email: ${error.message}`;
    }

    return NextResponse.json(
      { success: false, error: errorDetail },
      { status: 500, headers: corsHeaders }
    );
  }
}
