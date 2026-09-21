import React from 'react';
import { HeroSection } from '../components/home/HeroSection.js';
import { EventDetailsBar } from '../components/home/EventDetailsBar.js';
import { CauseSection } from '../components/home/CauseSection.js';
import { RegistrationOptionsSection } from '../components/home/RegistrationOptionsSection.js';
import { DonationBanner } from '../components/home/DonationBanner.js';
import { GallerySection } from '../components/home/GallerySection.js';
import { FaqSection } from '../components/home/FaqSection.js';
import { PartnersSection } from '../components/home/PartnersSection.js';

export const LandingPage: React.FC = () => {
  return (
    <div className="flex flex-col min-h-screen">
      <HeroSection />
      <EventDetailsBar />
      <CauseSection />
      <RegistrationOptionsSection />
      <GallerySection />
      <DonationBanner />
      <FaqSection />
      <PartnersSection />
    </div>
  );
};
