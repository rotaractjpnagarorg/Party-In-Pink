import React, { useState } from 'react';
import { Camera, ExternalLink, X, ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';

export interface GalleryPhoto {
  id: string;
  src: string;
  title: string;
  category: 'Zumba' | 'Community' | 'Celebration';
  caption: string;
}

export const PAST_PHOTOS: GalleryPhoto[] = [
  {
    id: 'photo-1',
    src: '/assets/images/pip4/zumba-close.jpg',
    title: 'Moving Together',
    category: 'Zumba',
    caption: 'Participants dancing with energy and purpose on the SSMRV College campus.',
  },
  {
    id: 'photo-2',
    src: '/assets/images/pip4/community-group.jpg',
    title: 'One Powerful Community',
    category: 'Community',
    caption: 'The Party In Pink 4.0 community together after a morning of movement and awareness.',
  },
  {
    id: 'photo-3',
    src: '/assets/images/pip4/friends-in-pink.jpg',
    title: 'Smiles in Pink',
    category: 'Celebration',
    caption: 'Friends celebrating the spirit of breast cancer awareness at Party In Pink 4.0.',
  },
];

export const GallerySection: React.FC = () => {
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState<number | null>(null);

  const openLightbox = (index: number) => setSelectedPhotoIndex(index);
  const closeLightbox = () => setSelectedPhotoIndex(null);

  const prevPhoto = () => {
    if (selectedPhotoIndex === null) return;
    setSelectedPhotoIndex((selectedPhotoIndex - 1 + PAST_PHOTOS.length) % PAST_PHOTOS.length);
  };

  const nextPhoto = () => {
    if (selectedPhotoIndex === null) return;
    setSelectedPhotoIndex((selectedPhotoIndex + 1) % PAST_PHOTOS.length);
  };

  const currentPhoto = selectedPhotoIndex !== null ? PAST_PHOTOS[selectedPhotoIndex] : null;

  return (
    <section
      className="py-16 bg-gradient-to-b from-white via-pink-50/20 to-slate-50 relative overflow-hidden"
      id="moments"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-12">
          <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-pip-100 text-pip-800 text-xs font-semibold mb-2">
            <Camera className="w-3.5 h-3.5 text-pip-600" />
            <span>Party In Pink Memories</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            📸 Relive the Moments
          </h2>
          <p className="mt-3 text-base sm:text-lg text-slate-600">
            Scroll through candid smiles, high-energy Zumba sessions, and inspiring moments from
            Party In Pink 4.0. Every photo tells a story of community, courage, and impact!
          </p>
        </div>

        {/* Highlighted Photo Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          {PAST_PHOTOS.map((photo, index) => (
            <div
              key={photo.id}
              onClick={() => openLightbox(index)}
              className="group relative rounded-2xl overflow-hidden bg-slate-900 shadow-md hover:shadow-xl transition-all cursor-pointer transform hover:-translate-y-1 h-72 sm:h-80"
            >
              <img
                src={photo.src}
                alt={photo.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-90 group-hover:opacity-100"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-80 group-hover:opacity-90 transition-opacity" />
              <div className="absolute bottom-0 inset-x-0 p-5 text-white">
                <span className="inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-pip-600/90 text-white mb-2">
                  {photo.category}
                </span>
                <h3 className="text-lg font-bold leading-snug">{photo.title}</h3>
                <p className="text-xs text-slate-300 mt-1 line-clamp-2">{photo.caption}</p>
                <div className="flex items-center space-x-1 text-xs text-pink-300 font-semibold mt-2 group-hover:underline">
                  <span>Click to expand</span>
                  <Sparkles className="w-3 h-3" />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Kwikpic Album Callout Banner */}
        <div className="bg-gradient-to-r from-pip-900 via-pink-900 to-slate-900 rounded-3xl p-8 sm:p-10 text-white text-center shadow-xl relative overflow-hidden">
          <div className="relative z-10 max-w-2xl mx-auto space-y-4">
            <span className="px-3 py-1 bg-white/10 rounded-full text-xs font-bold tracking-wide uppercase text-pink-300">
              Consolidated Album • Last 4 Editions
            </span>
            <h3 className="text-2xl sm:text-3xl font-bold">
              Want to see all 500+ photos from past events?
            </h3>
            <p className="text-sm sm:text-base text-pink-100 leading-relaxed">
              Explore the consolidated high-resolution gallery powered by Kwikpic across the last 4 editions.
              Find your candid moments using smart Face Recognition in full quality!
            </p>
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
              <a
                href="https://kwikpic-in.app.link/e/3ePvLoXTD6b?uCode=*GLPII"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full sm:w-auto inline-flex items-center justify-center px-6 py-3 rounded-xl font-bold text-slate-900 bg-white hover:bg-pink-50 transition-all shadow-md text-sm"
              >
                <span>📷 Open Full Kwikpic Album</span>
                <ExternalLink className="w-4 h-4 ml-1.5 text-pip-600" />
              </a>

              <Link
                to="/gallery"
                className="w-full sm:w-auto inline-flex items-center justify-center px-6 py-3 rounded-xl font-semibold text-white bg-white/10 hover:bg-white/20 border border-white/20 transition-all text-sm"
              >
                View Gallery Page
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Lightbox Modal */}
      {currentPhoto && (
        <div
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={closeLightbox}
        >
          <div
            className="relative max-w-5xl w-full max-h-[90vh] flex flex-col items-center"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              onClick={closeLightbox}
              className="absolute -top-12 right-0 p-2 text-white/80 hover:text-white rounded-full bg-white/10 hover:bg-white/20 transition-colors"
              aria-label="Close photo"
            >
              <X className="w-6 h-6" />
            </button>

            {/* Main Image */}
            <div className="relative w-full max-h-[75vh] flex items-center justify-center overflow-hidden rounded-2xl bg-black">
              <img
                src={currentPhoto.src}
                alt={currentPhoto.title}
                className="max-h-[75vh] max-w-full object-contain"
              />

              {/* Navigation Arrows */}
              <button
                onClick={prevPhoto}
                className="absolute left-3 top-1/2 -translate-y-1/2 p-2.5 rounded-full bg-black/60 text-white hover:bg-black/80 transition-colors"
                aria-label="Previous photo"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
              <button
                onClick={nextPhoto}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-2.5 rounded-full bg-black/60 text-white hover:bg-black/80 transition-colors"
                aria-label="Next photo"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            </div>

            {/* Photo Caption & Info */}
            <div className="mt-4 text-center text-white space-y-1">
              <h4 className="text-lg font-bold">{currentPhoto.title}</h4>
              <p className="text-sm text-slate-300">{currentPhoto.caption}</p>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
