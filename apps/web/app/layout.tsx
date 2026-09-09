import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3100',
  ),
  title: 'AlchemyNote — 대화가 살아 있는 Context가 됩니다',
  description:
    '자연스럽게 대화하세요. AlchemyNote가 계속 이어갈 만한 삶의 영역을 발견하고 Goal과 Current Progress를 가진 Living Context로 만듭니다.',
  openGraph: {
    title: 'AlchemyNote — Conversation becomes context',
    description: 'A living memory for the parts of life that keep moving.',
    images: [
      {
        url: '/og.png',
        width: 1200,
        height: 630,
        alt: 'AlchemyNote living context workspace',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AlchemyNote — Conversation becomes context',
    description: 'A living memory for the parts of life that keep moving.',
    images: ['/og.png'],
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
