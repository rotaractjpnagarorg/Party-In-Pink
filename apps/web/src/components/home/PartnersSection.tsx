import React from 'react';
import { Award, Users2 } from 'lucide-react';

export const PartnersSection: React.FC = () => {
  const brandPartners = [
    {
      name: 'Vishwanath Vajramuni Trust',
      src: '/assets/logos/partners/10.Vishwanath Vajramuni Trust.PNG',
    },
    { name: 'tixora', src: '/assets/logos/partners/11.tixora.svg' },
    { name: 'Akash Electro', src: '/assets/logos/partners/13.AkashElectro.png' },
    {
      name: 'ViaMedia Communications',
      src: '/assets/logos/partners/17.ViaMediaCommunications-SurendranUnni.png',
    },
    { name: 'Icon', src: '/assets/logos/partners/19.Icon.png' },
    { name: 'HiPower', src: '/assets/logos/partners/21.HiPower.jpg' },
    { name: 'Vasan & Sampath', src: '/assets/logos/partners/23.Vasan&Sampath.jpg' },
    { name: 'Hype Experts', src: '/assets/logos/partners/31.HypeExperts.png' },
    { name: 'Hoysala', src: '/assets/logos/partners/Hoysala.jpeg' },
    { name: 'Jusgrabs', src: '/assets/logos/partners/Jusgrabs.png' },
    { name: 'Keerti Technologies', src: '/assets/logos/partners/Keerti Technologies.jpeg' },
    { name: 'NXT Power', src: '/assets/logos/partners/NXT Power.jpeg' },
    { name: 'Sasya Shyamale', src: '/assets/logos/partners/Sasya_Shyamale-removebg-preview.png' },
    { name: 'Tag Unlimited', src: '/assets/logos/partners/Tag Unlimited logo.png' },
    { name: 'UK International', src: '/assets/logos/partners/UK International.png' },
    { name: 'e-relax', src: '/assets/logos/partners/e-relax.png' },
    { name: 'smartgenie', src: '/assets/logos/partners/smartgenie.png' },
    { name: 'tie', src: '/assets/logos/partners/tie.png' },
  ];

  const collaboratingClubs = [
    { name: 'Rotary Bangalore Midtown', src: '/assets/logos/Clubs/RotaryBangaloreMidtown.png' },
    {
      name: 'Rotary Bengaluru South End',
      src: '/assets/logos/Clubs/20.RotaryBengaluruSouthEnd.png',
    },
    {
      name: 'Rotaract Bangalore Aagneya',
      src: '/assets/logos/Clubs/25.RotaractBangaloreAagneya.png',
    },
    {
      name: 'Rotary Bangalore Lakeside',
      src: '/assets/logos/Clubs/16.RotaryBangaloreLakeside-PrasannaKumari.png',
    },
    {
      name: 'Rotary Bengaluru South Samarpane',
      src: '/assets/logos/Clubs/9. RotaryBengaluruSouthSamarpane.jpg',
    },
    { name: 'Innerwheel JP Nagar', src: '/assets/logos/Clubs/Innerwheel JP Nagar.jpeg' },
    { name: 'Orion Gateway', src: '/assets/logos/Clubs/Oriongateway.png' },
    { name: 'Rotary Club Jayanagar', src: '/assets/logos/Clubs/RC Jayanagar.jpg' },
    { name: 'RCBSW', src: '/assets/logos/Clubs/RCBSW Logo.png' },
    { name: 'Rotaract Jayanagar', src: '/assets/logos/Clubs/Rac Jayanagar.jpeg' },
    { name: 'Rotaract NMIMS', src: '/assets/logos/Clubs/RotaractNMIMS.jpg' },
    { name: 'BMS College of Commerce & Management', src: '/assets/logos/Clubs/bmscm.png' },
    { name: 'BMS College for Women', src: '/assets/logos/Clubs/bmscw.png' },
  ];

  return (
    <section className="py-16 bg-white border-t border-slate-200/80" id="partners">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
        {/* Subsection 1: Our Proud Partners (Previous Editions) */}
        <div>
          <div className="text-center max-w-2xl mx-auto mb-10">
            <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-pip-100 text-pip-800 text-xs font-semibold mb-2">
              <Award className="w-3.5 h-3.5 text-pip-600" />
              <span>Corporate & Brand Allies</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Our Proud Partners (Previous Editions)
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              Brands, enterprises, and trusts that stood with us to make Party In Pink a meaningful
              reality.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 items-center justify-center">
            {brandPartners.map((partner, idx) => (
              <div
                key={idx}
                className="h-24 p-3 rounded-2xl border border-slate-100 bg-slate-50/60 flex items-center justify-center hover:bg-white hover:border-pip-300 hover:shadow-md transition-all group"
                title={partner.name}
              >
                <img
                  src={partner.src}
                  alt={partner.name}
                  width={120}
                  height={56}
                  className="max-h-14 max-w-full object-contain filter grayscale group-hover:grayscale-0 transition-all opacity-80 group-hover:opacity-100"
                  loading="lazy"
                />
              </div>
            ))}
          </div>
        </div>

        {/* Subsection 2: Collaborating Clubs */}
        <div className="pt-8 border-t border-slate-100">
          <div className="text-center max-w-2xl mx-auto mb-10">
            <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-semibold mb-2">
              <Users2 className="w-3.5 h-3.5 text-pip-600" />
              <span>Fellowship & Community</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Collaborating Clubs
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              Rotary clubs, Rotaract clubs, and institutions across RI District 3191 who collaborate
              on our mission.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 items-center justify-center">
            {collaboratingClubs.map((club, idx) => (
              <div
                key={idx}
                className="h-24 p-3 rounded-2xl border border-slate-100 bg-slate-50/60 flex items-center justify-center hover:bg-white hover:border-pip-300 hover:shadow-md transition-all group"
                title={club.name}
              >
                <img
                  src={club.src}
                  alt={club.name}
                  width={120}
                  height={56}
                  className="max-h-14 max-w-full object-contain filter grayscale group-hover:grayscale-0 transition-all opacity-80 group-hover:opacity-100"
                  loading="lazy"
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};
