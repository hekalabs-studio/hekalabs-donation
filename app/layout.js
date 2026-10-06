import { Inter, JetBrains_Mono } from 'next/font/google';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-body',
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
});

export const viewport = {
  themeColor: '#050505',
};

export const metadata = {
  metadataBase: new URL('https://hekalabs-donation.vercel.app'),
  title: 'HekaLabs ™ — Donasi & Dukungan Karya Digital',
  description:
    'Salurkan dukungan Anda untuk proyek HekaLabs, Heka Edit, Heka Edu, dan inovasi open source melalui QRIS resmi HekaStore. Cepat, aman, dan tanpa potongan pihak ketiga.',
  keywords: ['HekaLabs', 'Donasi QRIS', 'HekaStore', 'Heka Edit', 'Heka Edu', 'Donasi Karya', 'Novemas'],
  authors: [{ name: 'HekaLabs' }],
  icons: {
    icon: '/assets/favicon.svg',
    shortcut: '/assets/favicon.svg',
  },
  openGraph: {
    type: 'website',
    url: 'https://hekalabs-donation.vercel.app',
    title: 'HekaLabs ™ — Donasi & Dukungan Karya Digital',
    description: 'Dukung karya independen HekaLabs (Heka Edit, Heka Edu, Open Source) secara instan via QRIS Nasional.',
    images: [
      {
        url: '/assets/qris.jpeg',
        width: 800,
        height: 1067,
        alt: 'QRIS Donasi HekaStore',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'HekaLabs ™ — Donasi & Dukungan Karya Digital',
    description: 'Dukung karya independen HekaLabs secara instan via QRIS Nasional.',
    images: ['/assets/qris.jpeg'],
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="id" className={`${inter.variable} ${jetbrainsMono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
