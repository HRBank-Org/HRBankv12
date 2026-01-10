import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { 
  ChevronRight, Shield, CheckCircle2, Star, Play, Zap,
  Globe, Clock, Award, FileCheck, QrCode, Briefcase
} from 'lucide-react';
import { LOGOS } from '../utils/logoUtils';
import EmmaLandingChat from '../components/emma/EmmaLandingChat';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const LandingPage = () => {
  const navigate = useNavigate();
  const videoRef = useRef(null);
  
  const [partnerLogos, setPartnerLogos] = useState([
    { id: 1, institution_name: 'Partner 1', logo_url: 'https://via.placeholder.com/150x60/4267B2/ffffff?text=Partner+1' },
    { id: 2, institution_name: 'Partner 2', logo_url: 'https://via.placeholder.com/150x60/2C4A6B/ffffff?text=Partner+2' },
    { id: 3, institution_name: 'Partner 3', logo_url: 'https://via.placeholder.com/150x60/4267B2/ffffff?text=Partner+3' },
    { id: 4, institution_name: 'Partner 4', logo_url: 'https://via.placeholder.com/150x60/2C4A6B/ffffff?text=Partner+4' },
  ]);

  useEffect(() => {
    const fetchPartnerLogos = async () => {
      try {
        const response = await fetch(`${API}/partner-logos/`);
        const data = await response.json();
        if (data && data.length > 0) {
          const processedLogos = data.map(logo => ({
            ...logo,
            logo_url: logo.logo_url.startsWith('http') 
              ? logo.logo_url 
              : `${BACKEND_URL}${logo.logo_url}`
          }));
          setPartnerLogos(processedLogos);
        }
      } catch (error) {
        console.error('Error fetching partner logos:', error);
      }
    };
    fetchPartnerLogos();
  }, []);

  return (
    <div className="min-h-screen bg-white">
      {/* Fixed Navigation Header */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link to="/" className="flex items-center gap-3">
              <img src={LOGOS.master} alt="HR Bank" className="h-10 w-auto" />
            </Link>
            <div className="hidden md:flex items-center gap-6">
              <Link to="/" className="text-[#30496d] font-semibold">
                Workforce
              </Link>
              <Link to="/employers" className="text-gray-600 hover:text-[#ff5f00] font-medium">
                Employers <span className="text-orange-500 text-xs">(Beta)</span>
              </Link>
              <Link to="/institutions" className="text-gray-600 hover:text-[#30496d] font-medium">
                Institutions
              </Link>
              <Link to="/leaderboard" className="text-gray-600 hover:text-[#30496d] font-medium">
                Leaderboard
              </Link>
              <Link to="/jobs" className="text-gray-600 hover:text-[#30496d] font-medium">
                Jobs
              </Link>
            </div>
            <Button variant="ghost" onClick={() => navigate('/login')} className="text-gray-700">
              Sign In
            </Button>
          </div>
        </div>
      </nav>

      {/* SECTION 1: Hero with Video Background */}
      <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden pt-16">
        {/* Video Background */}
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-gradient-to-b from-slate-900/90 via-slate-900/70 to-slate-900/90 z-10" />
          <iframe
            ref={videoRef}
            className="absolute w-full h-full object-cover"
            style={{ 
              transform: 'scale(1.5)',
              pointerEvents: 'none',
              minHeight: '100%',
              minWidth: '100%'
            }}
            src="https://www.youtube.com/embed/dQw4w9WgXcQ?autoplay=1&mute=1&loop=1&playlist=dQw4w9WgXcQ&controls=0&showinfo=0&rel=0&modestbranding=1&playsinline=1"
            title="HR Bank Background"
            frameBorder="0"
            allow="autoplay; encrypted-media"
            allowFullScreen
          />
        </div>

        {/* Hero Content */}
        <div className="relative z-20 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-500/20 rounded-full text-green-400 text-sm font-semibold mb-6 border border-green-500/30">
            <span className="animate-pulse w-2 h-2 bg-green-400 rounded-full" />
            100% Free for Workers
          </div>
          
          <h1 className="text-5xl md:text-7xl font-bold text-white mb-6 leading-tight">
            Your Skills.
            <br />
            <span className="text-amber-400">Verified.</span>
          </h1>
          
          <p className="text-xl md:text-2xl text-gray-300 mb-8 max-w-3xl mx-auto leading-relaxed">
            Build a Work Passport that proves what you can do. Carry your credentials, experience, and ratings wherever you go.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <Button
              size="lg"
              onClick={() => navigate('/signup?type=workforce')}
              className="bg-amber-500 hover:bg-amber-400 text-slate-900 h-14 px-10 text-lg font-semibold"
              data-testid="hero-get-passport-btn"
            >
              Get My Free Passport
              <ChevronRight className="ml-2 w-5 h-5" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={() => window.open('/passport/ALEX2024', '_blank')}
              className="bg-white/10 border-white/30 text-white hover:bg-white/20 h-14 px-10 text-lg"
              data-testid="hero-see-example-btn"
            >
              <Play className="mr-2 w-5 h-5" />
              See Example
            </Button>
          </div>

          {/* Quick Stats */}
          <div className="flex flex-wrap justify-center gap-8 text-white/80">
            <div className="text-center">
              <div className="text-2xl font-bold text-white">10,000+</div>
              <div className="text-sm">Work Passports</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-white">50+</div>
              <div className="text-sm">Partner Institutions</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-white">500+</div>
              <div className="text-sm">Employers Trust Us</div>
            </div>
          </div>
        </div>

        {/* Scroll Indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20 animate-bounce">
          <ChevronRight className="w-8 h-8 text-white/50 rotate-90" />
        </div>
      </section>

      {/* SECTION 2: Why Work Passport - The Differentiator */}
      <section className="py-20 bg-gradient-to-br from-gray-50 to-white relative overflow-hidden">
        <div className="absolute inset-0 opacity-5">
          <div className="absolute top-20 left-20 w-96 h-96 bg-amber-500 rounded-full blur-3xl" />
          <div className="absolute bottom-20 right-20 w-96 h-96 bg-[#30496d] rounded-full blur-3xl" />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            {/* Content */}
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-500/20 rounded-full text-amber-600 text-sm font-medium mb-4">
                <Shield className="w-4 h-4" />
                The Work Passport Difference
              </div>
              
              <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6 leading-tight">
                Unlike LinkedIn and Indeed,
                <br />
                <span className="text-amber-500">You Don&apos;t Claim Competence.</span>
              </h2>
              
              <p className="text-xl text-gray-600 mb-8 leading-relaxed">
                Work Passports highlights, optimizes and authenticates your skills, credentials and experience.
              </p>

              <div className="space-y-6 mb-8">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center flex-shrink-0">
                    <span className="text-red-500 font-bold text-lg">✕</span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1">Traditional Profiles</h3>
                    <p className="text-gray-500">Self-reported claims anyone can make. Easy to exaggerate. No verification.</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center flex-shrink-0">
                    <CheckCircle2 className="w-6 h-6 text-green-500" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1">Work Passport</h3>
                    <p className="text-gray-500">Institution-verified credentials. Employer-confirmed experience. Blockchain-secured proof.</p>
                  </div>
                </div>
              </div>

              <Button
                size="lg"
                onClick={() => navigate('/signup?type=workforce')}
                className="bg-amber-500 hover:bg-amber-400 text-slate-900 h-14 px-8 text-lg font-semibold"
              >
                Build Your Work Passport
                <ChevronRight className="ml-2 w-5 h-5" />
              </Button>
            </div>

            {/* Work Passport Preview Card */}
            <div className="relative">
              <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-6 border border-slate-700 shadow-2xl transform rotate-2 hover:rotate-0 transition-transform duration-500">
                <div className="h-2 bg-gradient-to-r from-amber-400 via-amber-500 to-amber-400 rounded-full mb-4" />
                
                <div className="flex items-start gap-4 mb-6">
                  <div className="relative">
                    <img 
                      src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=180&fit=crop&crop=face"
                      alt="Alex Johnson"
                      className="w-20 h-24 rounded-lg border-2 border-amber-500/50 object-cover shadow-lg"
                    />
                    <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center border-2 border-slate-800">
                      <CheckCircle2 className="w-4 h-4 text-white" />
                    </div>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-white font-bold text-lg">Alex Johnson</h3>
                    <p className="text-slate-400 text-sm">Windsor, ON</p>
                    <div className="flex items-center gap-1 mt-1">
                      <span className="text-amber-400 font-bold">4.8</span>
                      <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                      <span className="text-slate-500 text-sm">(127 reviews)</span>
                    </div>
                  </div>
                  <div className="w-10 h-10 bg-gradient-to-br from-amber-400 to-amber-600 rounded-full flex items-center justify-center">
                    <Shield className="w-5 h-5 text-slate-900" />
                  </div>
                </div>

                <div className="bg-slate-700/50 rounded-lg p-3 mb-4">
                  <p className="text-slate-400 text-xs uppercase mb-2 flex items-center gap-1">
                    <Shield className="w-3 h-3" /> Verified Credentials
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <span className="px-2 py-1 bg-green-500/20 text-green-400 rounded text-xs font-medium flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Food Safety
                    </span>
                    <span className="px-2 py-1 bg-green-500/20 text-green-400 rounded text-xs font-medium flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Smart Serve
                    </span>
                    <span className="px-2 py-1 bg-blue-500/20 text-blue-400 rounded text-xs font-medium flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> WHMIS
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3 mb-4">
                  <div className="bg-slate-700/30 rounded-lg p-2 text-center">
                    <p className="text-amber-400 font-bold text-lg">8,500+</p>
                    <p className="text-slate-400 text-xs">Hours Verified</p>
                  </div>
                  <div className="bg-slate-700/30 rounded-lg p-2 text-center">
                    <p className="text-green-400 font-bold text-lg">5</p>
                    <p className="text-slate-400 text-xs">Credentials</p>
                  </div>
                  <div className="bg-slate-700/30 rounded-lg p-2 text-center">
                    <p className="text-blue-400 font-bold text-lg">3</p>
                    <p className="text-slate-400 text-xs">Employers</p>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-slate-700">
                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                    Blockchain Verified
                  </div>
                  <div className="w-10 h-10 bg-white rounded p-1">
                    <QrCode className="w-full h-full text-slate-800" />
                  </div>
                </div>
              </div>

              <div className="absolute -top-4 -right-4 bg-green-500 text-white px-3 py-1 rounded-full text-sm font-semibold shadow-lg flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4" /> Verified
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 3: Context-Aware AI Agent */}
      <section className="py-20 bg-gradient-to-br from-[#1a1a2e] via-[#16213e] to-[#0f3460] relative overflow-hidden">
        <div className="absolute inset-0 opacity-5">
          <div className="absolute top-10 left-10 text-6xl text-white">مرحبا</div>
          <div className="absolute top-20 right-20 text-5xl text-white">你好</div>
          <div className="absolute bottom-20 left-1/4 text-4xl text-white">ਸਤ ਸ੍ਰੀ ਅਕਾਲ</div>
          <div className="absolute bottom-10 right-10 text-6xl text-white">नमस्ते</div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-cyan-500/20 rounded-full text-cyan-400 text-sm font-medium mb-4">
                <Zap className="w-4 h-4" />
                Context-Aware AI Agent
              </div>
              
              <h2 className="text-4xl md:text-5xl font-bold text-white mb-6 leading-tight">
                Your Career Guide.
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-400"> In Your Language.</span>
              </h2>
              
              <p className="text-lg text-gray-300 mb-6 leading-relaxed">
                Emma knows your schedule, availability, credentials, and skills. She guides you in building 
                your career — whether you&apos;re a newcomer, a student without experience, or advancing on the job.
              </p>
              
              <div className="space-y-4 mb-8">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-6 h-6 text-cyan-400 mt-0.5" />
                  <div>
                    <p className="text-white font-medium">Understands your context</p>
                    <p className="text-gray-400 text-sm">Your schedule, skills, and career goals — all considered</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-6 h-6 text-cyan-400 mt-0.5" />
                  <div>
                    <p className="text-white font-medium">Guides newcomers and students</p>
                    <p className="text-gray-400 text-sm">Build your career from scratch with personalized guidance</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-6 h-6 text-cyan-400 mt-0.5" />
                  <div>
                    <p className="text-white font-medium">Works in 20+ languages</p>
                    <p className="text-gray-400 text-sm">Language should never be a barrier to your dream job</p>
                  </div>
                </div>
              </div>

              <Button 
                onClick={() => navigate('/signup?type=workforce')}
                className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white px-8 py-6 text-lg"
              >
                Get Started
                <ChevronRight className="ml-2 w-5 h-5" />
              </Button>
            </div>

            {/* Emma Chat Preview */}
            <div className="relative">
              <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-md mx-auto">
                <div className="flex items-center gap-3 mb-4 pb-4 border-b">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold">
                    E
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">Emma</p>
                    <p className="text-sm text-gray-500">Context-Aware Career Guide</p>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div className="bg-purple-50 rounded-lg p-3 max-w-[85%]">
                    <p className="text-gray-800 text-sm">
                      I see you have Food Safety and Smart Serve certifications. Based on your availability, I found 3 restaurant positions near you that match perfectly.
                    </p>
                  </div>
                  
                  <div className="bg-gray-100 rounded-lg p-3 max-w-[85%] ml-auto">
                    <p className="text-gray-800 text-sm">What about my WHMIS? Does that help?</p>
                  </div>
                  
                  <div className="bg-purple-50 rounded-lg p-3 max-w-[85%]">
                    <p className="text-gray-800 text-sm">
                      Yes! WHMIS opens up kitchen prep and warehouse roles too. I&apos;ve added 5 more matches to your list. Want me to help you apply?
                    </p>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t">
                  <p className="text-xs text-gray-400 text-center">
                    Personalized guidance based on your credentials &amp; availability
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Build Your Work Passport in 3 Steps
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Free forever. Takes under 5 minutes.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-[#30496d] to-[#1a2d42] rounded-2xl flex items-center justify-center text-white text-2xl font-bold mx-auto mb-6">
                1
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Create Your Profile</h3>
              <p className="text-gray-600">
                Add your skills, certifications, and experience. Set your availability and preferred work zones.
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-amber-500 to-amber-600 rounded-2xl flex items-center justify-center text-white text-2xl font-bold mx-auto mb-6">
                2
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Get Verified</h3>
              <p className="text-gray-600">
                Request credentials from institutions. Past employers confirm your work history. All blockchain-secured.
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-green-600 rounded-2xl flex items-center justify-center text-white text-2xl font-bold mx-auto mb-6">
                3
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Share & Get Hired</h3>
              <p className="text-gray-600">
                Share your passport via QR code, link, or PDF. Employers verify instantly. You control what they see.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Privacy Section */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-8">Your Privacy, Your Control</h2>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="flex flex-col items-center">
              <Shield className="w-8 h-8 text-[#30496d] mb-3" />
              <h3 className="font-semibold text-gray-900 mb-1">Contact Info Hidden</h3>
              <p className="text-gray-500 text-sm">Your phone and email stay private by default</p>
            </div>
            <div className="flex flex-col items-center">
              <FileCheck className="w-8 h-8 text-[#30496d] mb-3" />
              <h3 className="font-semibold text-gray-900 mb-1">You Control Visibility</h3>
              <p className="text-gray-500 text-sm">Choose exactly what employers can see</p>
            </div>
            <div className="flex flex-col items-center">
              <QrCode className="w-8 h-8 text-[#30496d] mb-3" />
              <h3 className="font-semibold text-gray-900 mb-1">Share Only by Link/QR</h3>
              <p className="text-gray-500 text-sm">No public searchable profile without your consent</p>
            </div>
          </div>
        </div>
      </section>

      {/* Trust Section */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center mb-16">
            {[
              { value: '10,000+', label: 'Work Passports' },
              { value: '500+', label: 'Employers' },
              { value: '50+', label: 'Partner Institutions' },
              { value: '95%', label: 'Match Rate' },
            ].map((stat, index) => (
              <div key={index}>
                <div className="text-3xl md:text-4xl font-bold text-[#30496d] mb-1">{stat.value}</div>
                <div className="text-gray-600 text-sm">{stat.label}</div>
              </div>
            ))}
          </div>

          <div className="text-center mb-8">
            <p className="text-gray-500 text-sm font-medium uppercase tracking-wide">Trusted By</p>
          </div>
          <div className="flex flex-wrap justify-center items-center gap-8">
            {partnerLogos.map((logo, index) => (
              <div
                key={`${logo.id}-${index}`}
                className="w-32 h-16 bg-gray-50 rounded-lg flex items-center justify-center p-3 grayscale hover:grayscale-0 transition-all"
              >
                <img
                  src={logo.logo_url}
                  alt={logo.institution_name}
                  className="max-w-full max-h-full object-contain"
                />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 bg-gradient-to-r from-amber-500 to-orange-500">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Ready to Build Your Work Passport?
          </h2>
          <p className="text-xl text-white/90 mb-8">
            Free forever. No hidden costs. Start in under 5 minutes.
          </p>
          <Button
            size="lg"
            onClick={() => navigate('/signup?type=workforce')}
            className="bg-white text-amber-600 hover:bg-gray-100 h-14 px-10 text-lg font-semibold"
            data-testid="final-cta-btn"
          >
            Get My Free Work Passport
            <ChevronRight className="ml-2 w-5 h-5" />
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            <div>
              <img src={LOGOS.master} alt="HR Bank" className="h-8 w-auto mb-4" />
              <p className="text-sm">The workforce platform where your experience travels with you.</p>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">For Workers</h4>
              <ul className="space-y-2 text-sm">
                <li><Link to="/jobs" className="hover:text-white transition-colors">Browse Jobs</Link></li>
                <li><Link to="/signup?type=workforce" className="hover:text-white transition-colors">Create Passport</Link></li>
                <li><Link to="/leaderboard" className="hover:text-white transition-colors">Leaderboard</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">For Business</h4>
              <ul className="space-y-2 text-sm">
                <li><Link to="/employers" className="hover:text-white transition-colors">Employers (Beta)</Link></li>
                <li><Link to="/institutions" className="hover:text-white transition-colors">Institutions</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-sm">
                <li><Link to="/about" className="hover:text-white transition-colors">About Us</Link></li>
                <li><Link to="/contact" className="hover:text-white transition-colors">Contact</Link></li>
                <li><Link to="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 pt-8 text-center text-sm">
            <p>&copy; {new Date().getFullYear()} HR Bank. All rights reserved.</p>
          </div>
        </div>
      </footer>

      {/* Emma Chat */}
      <EmmaLandingChat />
    </div>
  );
};

export default LandingPage;
