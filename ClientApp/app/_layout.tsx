import '../src/utils/fixFontTimeout';
import React from 'react';
import { Slot } from 'expo-router';
import Head from 'expo-router/head';

export default function RootLayout() {
  return (
    <>
      <Head>
        <title>Ethio Debt Tracker</title>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Noto+Serif+Ethiopic:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </Head>
      <Slot />
    </>
  );
}
