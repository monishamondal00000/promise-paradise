import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import DestinationCard from '../components/DestinationCard';
import { API } from '../context/AuthContext';
import { HiOutlineSparkles, HiOutlineAdjustments, HiOutlineHeart } from 'react-icons/hi';
import { FiCpu } from 'react-icons/fi';

const testimonials = [
  { couple: 'Priya & Arjun', location: 'Udaipur', quote: 'Promise Paradise made our royal Rajasthani wedding absolutely magical. Every detail was perfect!', rating: 5 },
  { couple: 'Sneha & Rahul', location: 'Bali', quote: 'Our Bali wedding was a dream come true. The team handled everything flawlessly from 3000 miles away.', rating: 5 },
  { couple: 'Ananya & Vikram', location: 'Goa', quote: 'The beach ceremony at sunset was everything we imagined and more. Our guests are still talking about it!', rating: 5 },
  { couple: 'Meera & Karthik', location: 'Kerala', quote: 'The houseboat ceremony on the backwaters was breathtaking. Such attention to regional traditions and details.', rating: 5 },
  { couple: 'Riya & Aditya', location: 'Santorini', quote: 'Flying our families to Greece seemed daunting, but Promise Paradise coordinated everything seamlessly!', rating: 4 },
  { couple: 'Kavya & Rohan', location: 'Jaipur', quote: 'The fort wedding exceeded our wildest dreams. The elephant baraat gave us goosebumps!', rating: 5 },
  { couple: 'Nisha & Aman', location: 'Shimla', quote: 'An intimate mountain wedding with snow-capped views. Absolutely romantic and well-organized.', rating: 5 },
  { couple: 'Divya & Nikhil', location: 'Maldives', quote: 'The overwater ceremony was like something from a movie. Worth every penny for memories of a lifetime.', rating: 5 }
];

const heroImages = Array.from({ length: 7 }, (_, i) => `/images/landing/home (${i + 1}).jpeg`);

export default function Landing() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [destinations, setDestinations] = useState([]);
  const [heroIndex, setHeroIndex] = useState(0);
  const [testimonialIndex, setTestimonialIndex] = useState(0);
  const [scrollY, setScrollY] = useState(0);
  const sectionsRef = useRef([]);

  useEffect(() => {
    API.get('/destinations').then(res => {
      // Shuffle destinations randomly on each load
      const shuffled = [...res.data].sort(() => Math.random() - 0.5);
      setDestinations(shuffled);
    }).catch(() => {});
  }, []);

  // Hero carousel
  useEffect(() => {
    const timer = setInterval(() => setHeroIndex(i => (i + 1) % heroImages.length), 5000);
    return () => clearInterval(timer);
  }, []);

  // Testimonial auto-scroll
  useEffect(() => {
    const timer = setInterval(() => setTestimonialIndex(i => (i + 1) % testimonials.length), 4000);
    return () => clearInterval(timer);
  }, []);

  // Parallax scroll
  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Intersection observer for animations
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('animate-fadeInUp');
            entry.target.style.opacity = '1';
          }
        });
      },
      { threshold: 0.1 }
    );
    sectionsRef.current.forEach(el => { if (el) observer.observe(el); });
    return () => observer.disconnect();
  }, []);

  const addSectionRef = (el) => {
    if (el && !sectionsRef.current.includes(el)) sectionsRef.current.push(el);
  };

  return (
    <div className="pt-16">
      {/* Hero with Parallax & Carousel */}
      <section className="relative h-screen flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0" style={{ transform: `translateY(${scrollY * 0.3}px)` }}>
          {heroImages.map((img, i) => (
            <img
              key={i}
              src={img}
              alt="Wedding"
              className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 ${i === heroIndex ? 'opacity-100' : 'opacity-0'}`}
            />
          ))}
          <div className="absolute inset-0 bg-gradient-to-b from-dark/50 via-dark/30 to-dark/70" />
        </div>
        <div className="relative z-10 text-center px-4">
          <p className="text-gold text-sm tracking-[0.3em] uppercase mb-4 animate-pulse">Destination Weddings</p>
          <h1 className="font-serif text-5xl md:text-7xl lg:text-8xl text-white font-bold italic mb-4 drop-shadow-2xl">
            Where Forever Begins
          </h1>
          <p className="text-white/90 text-lg md:text-xl font-light mb-10 max-w-2xl mx-auto">
            Curated destination weddings across 50+ breathtaking locations, crafted exclusively for you
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => document.getElementById('destinations-section')?.scrollIntoView({ behavior: 'smooth' })}
              className="px-10 py-4 bg-gold text-white rounded-full text-sm font-medium hover:bg-gold/90 hover:scale-105 transition-all shadow-xl"
            >
              Explore Destinations
            </button>
            <button
              onClick={() => user ? navigate('/dashboard') : navigate('/login?returnUrl=/dashboard')}
              className="px-10 py-4 border-2 border-white text-white rounded-full text-sm font-medium hover:bg-white hover:text-dark hover:scale-105 transition-all"
            >
              Plan Your Dream Wedding
            </button>
          </div>
          {/* Hero indicators */}
          <div className="flex gap-2 justify-center mt-8">
            {heroImages.map((_, i) => (
              <button key={i} onClick={() => setHeroIndex(i)} className={`w-2 h-2 rounded-full transition-all ${i === heroIndex ? 'bg-gold w-6' : 'bg-white/50'}`} />
            ))}
          </div>
        </div>
        {/* Scroll indicator */}
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 animate-bounce">
          <span className="text-white/60 text-xs uppercase tracking-widest">Scroll</span>
          <svg className="w-5 h-5 text-white/60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
          </svg>
        </div>
      </section>

      {/* Stats Bar */}
      <section className="bg-dark py-10">
        <div className="max-w-7xl mx-auto px-4 grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          {[
            { num: '50+', label: 'Destinations' },
            { num: '500+', label: 'Weddings Planned' },
            { num: '80+', label: 'Expert Vendors' },
            { num: '4.9/5', label: 'Couple Rating' }
          ].map((s, i) => (
            <div key={i} className="py-3">
              <p className="font-sans text-4xl md:text-5xl text-gold font-bold tracking-tight">{s.num}</p>
              <p className="text-gray-400 text-sm uppercase tracking-wider mt-1">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Destinations */}
      <section id="destinations-section" ref={addSectionRef} className="py-24 px-4 max-w-7xl mx-auto" style={{ opacity: 0, transition: 'opacity 0.8s' }}>
        <div className="text-center mb-16">
          <p className="text-gold text-sm tracking-[0.2em] uppercase mb-2">Handpicked Locations</p>
          <h2 className="font-serif text-3xl md:text-5xl text-dark mb-4">Dream Destinations</h2>
          <p className="text-gray-500 max-w-xl mx-auto">From Indian palaces to tropical islands, discover where your love story unfolds</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {destinations.slice(0, 8).map(dest => (
            <DestinationCard key={dest.id} destination={dest} onViewPackages={(id) => {
              if (!user) { navigate('/login?returnUrl=/plan-wedding?destination=' + id); return; }
              navigate('/plan-wedding?destination=' + id);
            }} />
          ))}
        </div>
        {destinations.length > 8 && (
          <div className="text-center mt-12">
            <button
              onClick={() => user ? navigate('/plan-wedding') : navigate('/login?returnUrl=/plan-wedding')}
              className="group text-gold border-2 border-gold px-8 py-3 rounded-full hover:bg-gold hover:text-white transition-all text-sm font-medium"
            >
              Explore More Destinations <span className="inline-block group-hover:translate-x-1 transition-transform">→</span>
            </button>
          </div>
        )}
      </section>

      {/* Why Us */}
      <section ref={addSectionRef} className="py-24 px-4 max-w-7xl mx-auto" style={{ opacity: 0, transition: 'opacity 0.8s' }}>
        <div className="text-center mb-16">
          <p className="text-gold text-sm tracking-[0.2em] uppercase mb-2">The Promise Difference</p>
          <h2 className="font-serif text-3xl md:text-5xl text-dark mb-4">Why Choose Us</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {[
            { icon: <HiOutlineSparkles className="w-8 h-8" />, title: 'Expert Curation', desc: 'Hand-picked venues and 80+ verified vendors for your perfect day' },
            { icon: <FiCpu className="w-8 h-8" />, title: 'AI-Powered Planning', desc: 'Smart recommendations with our wedding concierge AI' },
            { icon: <HiOutlineAdjustments className="w-8 h-8" />, title: '100% Customizable', desc: 'Every detail crafted to match your dreams and budget' },
            { icon: <HiOutlineHeart className="w-8 h-8" />, title: 'End-to-End Care', desc: 'From first call to bidaai, we handle everything seamlessly' }
          ].map((item, i) => (
            <div key={i} className="text-center p-8 rounded-2xl hover:bg-white hover:shadow-xl transition-all duration-300 group">
              <div className="w-16 h-16 mx-auto mb-6 bg-gold/10 rounded-2xl flex items-center justify-center text-gold group-hover:scale-110 transition-transform">{item.icon}</div>
              <h3 className="font-serif text-lg font-semibold text-dark mb-3">{item.title}</h3>
              <p className="text-sm text-gray-500 leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Testimonials Carousel */}
      <section ref={addSectionRef} className="py-24 px-4 bg-gradient-to-b from-white to-blush/30" style={{ opacity: 0, transition: 'opacity 0.8s' }}>
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-gold text-sm tracking-[0.2em] uppercase mb-2">Real Couples, Real Love</p>
            <h2 className="font-serif text-3xl md:text-5xl text-dark mb-4">Love Stories</h2>
          </div>
          {/* Carousel */}
          <div className="relative overflow-hidden">
            <div className="flex transition-transform duration-700 ease-in-out" style={{ transform: `translateX(-${testimonialIndex * 100}%)` }}>
              {testimonials.map((t, i) => (
                <div key={i} className="w-full flex-shrink-0 px-4">
                  <div className="max-w-2xl mx-auto bg-white p-10 rounded-3xl shadow-lg text-center">
                    <div className="text-gold text-3xl mb-4">&#x201C;</div>
                    <p className="text-gray-600 italic text-lg mb-6 leading-relaxed">{t.quote}</p>
                    <div className="flex justify-center gap-1 mb-4">
                      {Array.from({ length: t.rating }).map((_, j) => (
                        <span key={j} className="text-gold">★</span>
                      ))}
                    </div>
                    <p className="font-serif font-bold text-dark text-lg">{t.couple}</p>
                    <p className="text-sm text-gold">{t.location}</p>
                  </div>
                </div>
              ))}
            </div>
            {/* Dots */}
            <div className="flex gap-2 justify-center mt-8">
              {testimonials.map((_, i) => (
                <button key={i} onClick={() => setTestimonialIndex(i)} className={`w-2.5 h-2.5 rounded-full transition-all ${i === testimonialIndex ? 'bg-gold w-7' : 'bg-gray-300'}`} />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section ref={addSectionRef} className="py-24 px-4" style={{ opacity: 0, transition: 'opacity 0.8s' }}>
        <div className="max-w-4xl mx-auto text-center bg-dark rounded-3xl p-12 md:p-16 relative overflow-hidden">
          <div className="absolute inset-0 opacity-10">
            <img src="https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=1920&q=80" className="w-full h-full object-cover" alt="" />
          </div>
          <div className="relative z-10">
            <h2 className="font-serif text-3xl md:text-4xl text-white mb-4">Ready to Begin Your Story?</h2>
            <p className="text-gray-300 mb-8 max-w-lg mx-auto">Join 500+ couples who trusted us with their most special day</p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={() => user ? navigate('/plan-wedding') : navigate('/register')}
                className="px-10 py-4 bg-gold text-white rounded-full text-sm font-medium hover:bg-gold/90 hover:scale-105 transition-all shadow-xl"
              >
                Start Planning Now
              </button>
              <button
                onClick={() => navigate('/wedding-gallery')}
                className="px-10 py-4 border-2 border-gold text-gold rounded-full text-sm font-medium hover:bg-gold hover:text-white transition-all"
              >
                View Gallery
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-dark py-16 px-4 border-t border-gray-800">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
            <div>
              <h3 className="font-serif text-2xl text-gold italic mb-4">Promise Paradise</h3>
              <p className="text-gray-400 text-sm leading-relaxed">Where Forever Begins. Crafting dream destination weddings across 50+ locations worldwide.</p>
            </div>
            <div>
              <h4 className="text-white font-medium mb-4 text-sm uppercase tracking-wider">Quick Links</h4>
              <ul className="space-y-2 text-gray-400 text-sm">
                <li><a href="/explore-packages" className="hover:text-gold transition-colors">Packages</a></li>
                <li><a href="/wedding-gallery" className="hover:text-gold transition-colors">Gallery</a></li>
                <li><a href="/wedding-concierge" className="hover:text-gold transition-colors">AI Concierge</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-medium mb-4 text-sm uppercase tracking-wider">Contact</h4>
              <ul className="space-y-2 text-gray-400 text-sm">
                <li>promiseparadisesupport@gmail.com</li>
                <li>+91 98765 00000</li>
                <li>Kolkata, India</li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-medium mb-4 text-sm uppercase tracking-wider">Follow Us</h4>
              <div className="flex gap-4 text-gray-400">
                <span className="hover:text-gold cursor-pointer transition-colors">Instagram</span>
                <span className="hover:text-gold cursor-pointer transition-colors">Pinterest</span>
              </div>
            </div>
          </div>
          <div className="border-t border-gray-800 pt-8 text-center">
            <p className="text-gray-600 text-xs">&copy; 2026 Promise Paradise. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}