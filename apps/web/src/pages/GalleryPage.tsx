import React, { useState } from 'react';
import { Camera, ExternalLink, X, ChevronLeft, ChevronRight, Heart, Maximize2 } from 'lucide-react';
import { Link } from 'react-router-dom';

interface PhotoItem {
  id: string;
  src: string;
  category: 'Zumba' | 'Community' | 'Celebration';
}

const ALL_PHOTOS: PhotoItem[] = [
  { id: 'p-1', src: '/assets/images/pip4/zumba-wide.jpg', category: 'Zumba' },
  { id: 'p-2', src: '/assets/images/pip4/zumba-close.jpg', category: 'Zumba' },
  { id: 'p-3', src: '/assets/images/pip4/community-group.jpg', category: 'Community' },
  { id: 'p-4', src: '/assets/images/pip4/friends-in-pink.jpg', category: 'Celebration' },
  { id: 'p-5', src: '/assets/images/pip4/community-at-ssmrv.jpg', category: 'Community' },
  { id: 'p-6', src: '/assets/images/pip4/supporters-group.jpg', category: 'Celebration' },
  { id: 'p-7', src: '/assets/images/pip4/pink-wristband.jpg', category: 'Community' },
  { id: 'p-8', src: '/assets/images/pip4/awareness-badges.jpg', category: 'Community' },
  { id: 'p-9', src: '/assets/images/pip4/contribution-team.jpg', category: 'Celebration' },
  { id: 'p-10', src: '/assets/images/0H9A1073_optimized.jpg', category: 'Zumba' },
  { id: 'p-11', src: '/assets/images/ADI05791.webp', category: 'Celebration' },
  { id: 'p-12', src: '/assets/images/IMG_7757.webp', category: 'Community' },
];

export const GalleryPage: React.FC = () => {
  const [activeCategory, setActiveCategory] = useState<string>('All');
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState<number | null>(null);

  const filteredPhotos =
    activeCategory === 'All' ? ALL_PHOTOS : ALL_PHOTOS.filter((p) => p.category === activeCategory);

  const openLightbox = (index: number) => setSelectedPhotoIndex(index);
  const closeLightbox = () => setSelectedPhotoIndex(null);

  const prevPhoto = () => {
    if (selectedPhotoIndex === null) return;
    setSelectedPhotoIndex((selectedPhotoIndex - 1 + filteredPhotos.length) % filteredPhotos.length);
  };

  const nextPhoto = () => {
    if (selectedPhotoIndex === null) return;
    setSelectedPhotoIndex((selectedPhotoIndex + 1) % filteredPhotos.length);
  };

  const currentPhoto = selectedPhotoIndex !== null ? filteredPhotos[selectedPhotoIndex] : null;

  return (
    <div className="py-12 sm:py-16 bg-slate-50 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Page Header */}
        <div className="text-center max-w-3xl mx-auto mb-10">
          <div className="inline-flex items-center space-x-2 px-4 py-1.5 rounded-full bg-pip-100 text-pip-800 text-xs font-bold mb-3">
            <Camera className="w-4 h-4 text-pip-600" />
            <span>Event Photography & Memories</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold text-slate-900 tracking-tight">
            Relive Party In Pink
          </h1>
          <p className="mt-3 text-base sm:text-lg text-slate-600 leading-relaxed">
            Take a look back at the incredible moments, smiles, and high-energy Zumba sessions that
            defined Party In Pink. Every snapshot represents a life touched and an awareness spark
            ignited!
          </p>
        </div>

        {/* Top Kwikpic Connect Card */}
        <div className="mb-10 bg-gradient-to-r from-pink-600 via-pip-600 to-rose-600 rounded-3xl p-6 sm:p-8 text-white flex flex-col md:flex-row items-center justify-between gap-6 shadow-lg shadow-pip-500/20">
          <div className="space-y-2 text-center md:text-left">
            <span className="px-3 py-1 bg-white/20 rounded-full text-xs font-bold tracking-wide uppercase">
              Consolidated Album • Last 4 Editions
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold">
              Browse 500+ High-Resolution Photos on Kwikpic
            </h2>
            <p className="text-sm text-pink-100 max-w-xl">
              Consolidated Kwikpic album of the last 4 editions. Find photos of yourself using smart
              face search or explore the complete event collection in original quality.
            </p>
          </div>
          <a
            href="https://kwikpic-in.app.link/e/3ePvLoXTD6b?uCode=*GLPII"
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 inline-flex items-center space-x-2 px-6 py-3.5 rounded-xl font-bold text-slate-900 bg-white hover:bg-pink-50 transition-all shadow-md text-sm sm:text-base hover:scale-105 active:scale-100"
          >
            <span>Open Kwikpic Album</span>
            <ExternalLink className="w-4 h-4 text-pip-600" />
          </a>
        </div>

        {/* Category Filters */}
        <div className="flex items-center justify-center gap-2 mb-8 flex-wrap">
          {['All', 'Zumba', 'Community', 'Celebration'].map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                activeCategory === cat
                  ? 'bg-pip-600 text-white shadow-md shadow-pip-500/25'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Photo Gallery Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6 mb-16">
          {filteredPhotos.map((photo, index) => (
            <div
              key={photo.id}
              onClick={() => openLightbox(index)}
              className="group relative rounded-2xl overflow-hidden bg-slate-900 shadow-sm hover:shadow-xl transition-all cursor-pointer transform hover:-translate-y-1 aspect-[4/3] sm:h-72"
            >
              <img
                src={photo.src}
                alt="Party In Pink gallery"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/35 transition-all flex items-center justify-center">
                <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-black/60 backdrop-blur-sm text-white px-3.5 py-1.5 rounded-full text-xs font-semibold flex items-center space-x-1.5 shadow-lg">
                  <Maximize2 className="w-3.5 h-3.5 text-pink-300" />
                  <span>View Photo</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Bottom CTA to Register for 5.0 */}
        <div className="text-center bg-white rounded-3xl p-8 sm:p-12 border border-slate-200 shadow-sm max-w-3xl mx-auto space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-pip-100 text-pip-600 flex items-center justify-center mx-auto">
            <Heart className="w-6 h-6 fill-pip-600" />
          </div>
          <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
            Be Part of Party In Pink 5.0
          </h3>
          <p className="text-slate-600 text-sm sm:text-base leading-relaxed">
            Party In Pink 5.0 is happening this season! Create memories of your own while supporting
            life-saving cancer treatment at Sri Shankara Cancer Hospital.
          </p>
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              to="/register"
              className="w-full sm:w-auto px-7 py-3 rounded-xl font-bold text-white bg-pip-600 hover:bg-pip-700 shadow-md shadow-pip-600/20 transition-all text-sm"
            >
              Register for 5.0 — ₹239
            </Link>
            <Link
              to="/donate"
              className="w-full sm:w-auto px-7 py-3 rounded-xl font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-all text-sm"
            >
              Support the Cause
            </Link>
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
            <div className="relative w-full max-h-[80vh] flex items-center justify-center overflow-hidden rounded-2xl bg-black">
              <img
                src={currentPhoto.src}
                alt="Party In Pink full view"
                className="max-h-[80vh] max-w-full object-contain"
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
          </div>
        </div>
      )}
    </div>
  );
};
