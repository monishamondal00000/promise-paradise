import React, { useState } from 'react';

const galleryImages = Array.from({ length: 66 }, (_, i) => `/images/gallery/gallery (${i + 1}).jpeg`);

export default function Gallery() {
  const [selectedImage, setSelectedImage] = useState(null);

  return (
    <div className="pt-20 min-h-screen bg-ivory">
      {/* Header */}
      <section className="py-16 px-4 text-center">
        <p className="text-gold text-sm tracking-[0.2em] uppercase mb-2">Our Portfolio</p>
        <h1 className="font-serif text-4xl md:text-5xl text-dark mb-4">Wedding Gallery</h1>
        <p className="text-gray-500 max-w-xl mx-auto">Glimpses of love stories we've helped create across the world</p>
      </section>



      {/* Masonry Grid */}
      <div className="max-w-7xl mx-auto px-4 pb-20">
        <div className="columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-4 space-y-4">
          {galleryImages.map((img, i) => (
            <div
              key={i}
              className="break-inside-avoid group cursor-pointer relative overflow-hidden rounded-xl"
              onClick={() => setSelectedImage(img)}
            >
              <img
                src={img}
                alt="Wedding"
                className="w-full rounded-xl hover:scale-105 transition-transform duration-500"
                style={{ height: `${200 + (i % 3) * 80}px`, objectFit: 'cover' }}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Lightbox */}
      {selectedImage && (
        <div className="fixed inset-0 bg-dark/90 z-50 flex items-center justify-center p-4" onClick={() => setSelectedImage(null)}>
          <div className="relative max-w-4xl w-full">
            <img src={selectedImage} alt="Wedding" className="w-full max-h-[80vh] object-contain rounded-xl" />
            <button className="absolute top-4 right-4 text-white text-3xl hover:text-gold" onClick={() => setSelectedImage(null)}>×</button>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="bg-dark text-white py-12 px-4">
        <div className="max-w-6xl mx-auto text-center">
          <h3 className="font-serif text-2xl text-gold mb-2">Promise Paradise</h3>
          <p className="text-gray-400 text-sm mb-4">Crafting dream destination weddings across the world</p>
          <p className="text-gray-500 text-xs">© 2026 Promise Paradise. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
