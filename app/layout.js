import { Poppins, JetBrains_Mono } from 'next/font/google';
import './globals.css';

const poppins = Poppins({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700', '800'],
  variable: '--font-body',
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
});

export const viewport = {
  themeColor: '#0e6ef5',
};

export const metadata = {
  metadataBase: new URL('https://hekalabs-donation.vercel.app'),
  title: 'HekaLabs ™ — Donasi & Dukungan Karya Digital',
  description:
    'Dukungan resmi untuk proyek HekaLabs, Heka Edit, Heka Edu, dan inovasi open source oleh Novemas Heka Alfarizi via QRIS resmi HekaStore.',
  keywords: ['HekaLabs', 'Donasi QRIS', 'HekaStore', 'Heka Edit', 'Heka Edu', 'Novemas Heka Alfarizi'],
  authors: [{ name: 'Novemas Heka Alfarizi' }],
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
    <html lang="id" className={`${poppins.variable} ${jetbrainsMono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
