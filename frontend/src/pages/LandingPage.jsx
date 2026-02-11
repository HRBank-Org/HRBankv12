import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { 
  ChevronRight, Shield, CheckCircle2, Star, Play, Zap,
  Globe, Clock, Award, FileCheck, QrCode, Briefcase,
  Building2, Users, Verified, ArrowRight
} from 'lucide-react';
import { LOGOS } from '../utils/logoUtils';
import EmmaLandingChat from '../components/emma/EmmaLandingChat';
import LoginModal from '../components/auth/LoginModal';
import LandingHeader from '../components/layout/LandingHeader';
import WorkPassportInteractiveDemo from '../components/landing/WorkPassportInteractiveDemo';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Animated Trust Flow Component
const TrustFlowAnimation = () => {
  return (
    <div className="relative py-8">
      {/* Flow Container */}
      <div className="flex items-center justify-center gap-4 md:gap-8 relative">
        
        {/* Institution Node */}
        <div className="flex flex-col items-center z-10">
          <div className="w-20 h-20 md:w-24 md:h-24 rounded-2xl bg-gradient-to-br from-[#30496d] to-[#1a2d42] flex items-center justify-center shadow-lg animate-pulse-slow">
            <Building2 className="w-10 h-10 md:w-12 md:h-12 text-white" />
          </div>
          <p className="mt-3 text-sm md:text-base font-semibold text-gray-900">Institution</p>
          <p className="text-xs text-gray-500">Issues Credential</p>
        </div>

        {/* Animated Arrow 1 */}
        <div className="relative w-16 md:w-24 h-12 flex items-center">
          <div className="absolute inset-0 flex items-center">
            <div className="h-0.5 w-full bg-gradient-to-r from-[#30496d] to-amber-500 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent animate-flow-right" />
            </div>
          </div>
          <div className="absolute right-0 transform translate-x-1">
            <ArrowRight className="w-5 h-5 text-amber-500" />
          </div>
          {/* Floating credential */}
          <div className="absolute left-1/2 -translate-x-1/2 -top-3 animate-float-credential">
            <div className="w-8 h-6 bg-gradient-to-r from-amber-400 to-amber-500 rounded shadow-md flex items-center justify-center">
              <Shield className="w-4 h-4 text-white" />
            </div>
          </div>
        </div>

        {/* Worker Node */}
        <div className="flex flex-col items-center z-10">
          <div className="w-20 h-20 md:w-24 md:h-24 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center shadow-lg">
            <Users className="w-10 h-10 md:w-12 md:h-12 text-white" />
          </div>
          <p className="mt-3 text-sm md:text-base font-semibold text-gray-900">Worker</p>
          <p className="text-xs text-gray-500">Carries Proof</p>
        </div>

        {/* Animated Arrow 2 */}
        <div className="relative w-16 md:w-24 h-12 flex items-center">
          <div className="absolute inset-0 flex items-center">
            <div className="h-0.5 w-full bg-gradient-to-r from-amber-500 to-green-500 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent animate-flow-right delay-500" />
            </div>
          </div>
          <div className="absolute right-0 transform translate-x-1">
            <ArrowRight className="w-5 h-5 text-green-500" />
          </div>
          {/* Floating QR code */}
          <div className="absolute left-1/2 -translate-x-1/2 -top-3 animate-float-credential delay-300">
            <div className="w-8 h-6 bg-white rounded shadow-md flex items-center justify-center border border-gray-200">
              <QrCode className="w-4 h-4 text-gray-700" />
            </div>
          </div>
        </div>

        {/* Employer Node */}
        <div className="flex flex-col items-center z-10">
          <div className="w-20 h-20 md:w-24 md:h-24 rounded-2xl bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center shadow-lg">
            <CheckCircle2 className="w-10 h-10 md:w-12 md:h-12 text-white" />
          </div>
          <p className="mt-3 text-sm md:text-base font-semibold text-gray-900">Employer</p>
          <p className="text-xs text-gray-500">Verifies Instantly</p>
        </div>
      </div>

      {/* Blockchain verification badge */}
      <div className="flex justify-center mt-8">
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-100 to-blue-100 rounded-full border border-purple-200">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          <span className="text-sm font-medium text-gray-700">Secured on Polygon Blockchain</span>
          <Shield className="w-4 h-4 text-purple-600" />
        </div>
      </div>

      {/* CSS Animations */}
      <style>{`
        @keyframes flow-right {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(200%); }
        }
        @keyframes float-credential {
          0%, 100% { transform: translateX(-50%) translateY(0); }
          50% { transform: translateX(-50%) translateY(-8px); }
        }
        @keyframes pulse-slow {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.05); }
        }
        .animate-flow-right {
          animation: flow-right 2s ease-in-out infinite;
        }
        .animate-float-credential {
          animation: float-credential 2s ease-in-out infinite;
        }
        .animate-pulse-slow {
          animation: pulse-slow 3s ease-in-out infinite;
        }
        .delay-300 {
          animation-delay: 0.3s;
        }
        .delay-500 {
          animation-delay: 0.5s;
        }
      `}</style>
    </div>
  );
};

const LandingPage = () => {
  const navigate = useNavigate();
  const videoRef = useRef(null);
  
  const [partnerLogos, setPartnerLogos] = useState([]);
  const [showLoginModal, setShowLoginModal] = useState(false);

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
      {/* Shared Navigation Header */}
      <LandingHeader onSignInClick={() => setShowLoginModal(true)} />

      {/* SECTION 1: Hero with Video Background */}
      <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden pt-16">
        {/* Video Background - Lofi aesthetic visuals */}
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-gradient-to-b from-slate-900/85 via-slate-900/70 to-slate-900/85 z-10" />
          <iframe
            ref={videoRef}
            className="absolute w-full h-full object-cover"
            style={{ 
              transform: 'scale(1.5)',
              pointerEvents: 'none',
              minHeight: '100%',
              minWidth: '100%'
            }}
            src="https://www.youtube.com/embed/2Gg6Seob5Mg?autoplay=1&mute=1&loop=1&playlist=2Gg6Seob5Mg&controls=0&showinfo=0&rel=0&modestbranding=1&playsinline=1"
            title="HR Bank Workforce Background"
            frameBorder="0"
            allow="autoplay; encrypted-media"
            allowFullScreen
          />
        </div>

        {/* Hero Content */}
        <div className="relative z-20 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-500/20 rounded-full text-green-400 text-sm font-semibold mb-6 border border-green-500/30">
            <span className="animate-pulse w-2 h-2 bg-green-400 rounded-full" />
            The Standard for Workforce Trust
          </div>
          
          <h1 className="text-5xl md:text-7xl font-bold text-white mb-6 leading-tight">
            Proof Replaces
            <br />
            <span className="text-amber-400">Claims.</span>
          </h1>
          
          <p className="text-xl md:text-2xl text-gray-300 mb-8 max-w-3xl mx-auto leading-relaxed">
            HR Bank turns workforce credibility into a verifiable, portable standard — so employers hire with confidence, and workers prove themselves without hype or connections.
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

        </div>

        {/* Scroll Indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20 animate-bounce">
          <ChevronRight className="w-8 h-8 text-white/50 rotate-90" />
        </div>
      </section>

      {/* SECTION 2: Why WorkPassport™ - The Differentiator */}
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
                Blockchain-Verified Credentials
              </div>
              
              <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6 leading-tight">
                Unlike LinkedIn and Indeed,
                <br />
                <span className="text-amber-500">You Don&apos;t Claim Competence.</span>
              </h2>
              
              <p className="text-xl text-gray-600 mb-8 leading-relaxed">
                WorkPassport™ highlights, optimizes and authenticates your skills, credentials and experience — 
                <strong className="text-gray-900"> secured on the blockchain</strong> where they can never be faked, altered, or disputed.
              </p>

              <div className="space-y-6 mb-8">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center flex-shrink-0">
                    <span className="text-red-500 font-bold text-lg">✕</span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1">Traditional Profiles</h3>
                    <p className="text-gray-500">Self-reported claims anyone can make. Easy to exaggerate. No verification. No proof of authenticity.</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center flex-shrink-0">
                    <CheckCircle2 className="w-6 h-6 text-green-500" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1">WorkPassport™</h3>
                    <p className="text-gray-500">Institution-issued credentials written to the <strong>Polygon blockchain</strong>. Tamper-proof. Employer-verified work history. Authenticity guaranteed.</p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Clock className="w-6 h-6 text-blue-500" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1">Always Current</h3>
                    <p className="text-gray-500">We track credential validity and remind you before they expire. Keep your profile fresh so employers can hire you without hassle.</p>
                  </div>
                </div>
              </div>

              <Button
                size="lg"
                onClick={() => navigate('/signup?type=workforce')}
                className="bg-amber-500 hover:bg-amber-400 text-slate-900 h-14 px-8 text-lg font-semibold"
              >
                Build Your WorkPassport™
                <ChevronRight className="ml-2 w-5 h-5" />
              </Button>
            </div>

            {/* WorkPassport™ Preview Card - replaced with static for mobile, desktop shows below */}
            <div className="relative lg:hidden">
              <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-6 border border-slate-700 shadow-2xl">
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
                </div>

                <div className="grid grid-cols-3 gap-3 mb-4">
                  <div className="bg-slate-700/30 rounded-lg p-2 text-center">
                    <p className="text-amber-400 font-bold text-lg">4,420</p>
                    <p className="text-slate-400 text-xs">Hours</p>
                  </div>
                  <div className="bg-slate-700/30 rounded-lg p-2 text-center">
                    <p className="text-green-400 font-bold text-lg">3</p>
                    <p className="text-slate-400 text-xs">Credentials</p>
                  </div>
                  <div className="bg-slate-700/30 rounded-lg p-2 text-center">
                    <p className="text-blue-400 font-bold text-lg">3</p>
                    <p className="text-slate-400 text-xs">Careers</p>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-slate-700">
                  <div className="flex items-center gap-2 text-xs text-green-400 font-medium">
                    <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                    Verified on Blockchain
                  </div>
                  <div className="w-10 h-10 bg-white rounded p-1">
                    <QrCode className="w-full h-full text-slate-800" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Interactive WorkPassport Demo - Full Width Section */}
      <section className="py-16 bg-slate-950">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-500/20 rounded-full text-amber-400 text-sm font-medium mb-4">
              <Zap className="w-4 h-4" />
              Interactive Demo
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              You Control What Employers See
            </h2>
            <p className="text-lg text-slate-400 max-w-2xl mx-auto">
              WorkPassport™ lets you build tailored profiles for different job opportunities. 
              Share only what&apos;s relevant — your career, your rules.
            </p>
          </div>
          
          <WorkPassportInteractiveDemo />
        </div>
      </section>

      {/* Credential Validity Tracking Section */}
      <section className="py-16 bg-gradient-to-r from-blue-600 to-indigo-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-bold text-white mb-4">
                Never Let Your Credentials Expire
              </h2>
              <p className="text-lg text-blue-100 mb-6">
                HR Bank tracks the validity of all your credentials and sends you reminders before they expire. 
                Stale credentials mean missed opportunities — we make sure you stay hire-ready.
              </p>
              <div className="space-y-3">
                <div className="flex items-center gap-3 text-white">
                  <CheckCircle2 className="w-5 h-5 text-green-400" />
                  <span>Automatic expiry tracking for all credentials</span>
                </div>
                <div className="flex items-center gap-3 text-white">
                  <CheckCircle2 className="w-5 h-5 text-green-400" />
                  <span>Email and in-app renewal reminders</span>
                </div>
                <div className="flex items-center gap-3 text-white">
                  <CheckCircle2 className="w-5 h-5 text-green-400" />
                  <span>Employers see only valid, current credentials</span>
                </div>
              </div>
            </div>
            <div className="bg-white/10 rounded-2xl p-6 backdrop-blur-sm border border-white/20">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-amber-500 rounded-full flex items-center justify-center">
                  <Clock className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-white font-semibold">Credential Alert</p>
                  <p className="text-blue-200 text-sm">Your Food Handler Certificate</p>
                </div>
              </div>
              <div className="bg-amber-500/20 border border-amber-500/30 rounded-lg p-4">
                <p className="text-amber-200 text-sm">
                  <strong>Expires in 30 days</strong> — Renew now to keep your profile active and visible to employers.
                </p>
              </div>
              <Button className="w-full mt-4 bg-white text-blue-600 hover:bg-blue-50">
                Renew Credential
              </Button>
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
              Build Your WorkPassport™ in 3 Steps
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

      {/* Real Operations, Real Jobs Section */}
      <section className="py-20 bg-gradient-to-br from-slate-900 via-[#1a2d42] to-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-500/20 rounded-full text-amber-400 text-sm font-medium mb-4">
                <Briefcase className="w-4 h-4" />
                Not a Job Board
              </div>
              
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-6 leading-tight">
                Real Work.
                <br />
                <span className="text-amber-400">Not Listings.</span>
              </h2>
              
              <p className="text-lg text-gray-300 mb-6 leading-relaxed">
                Unlike job boards where anyone can post a position &quot;out of nowhere,&quot; HR Bank work opportunities 
                come from <strong className="text-white">real, verified employers</strong> with actual operations — 
                shifts, schedules, and accountability already set up on the platform.
              </p>
              
              <div className="space-y-4 mb-8">
                <div className="flex items-start gap-3 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                  <span className="text-red-400 font-bold text-lg mt-0.5">✕</span>
                  <div>
                    <p className="text-red-400 font-medium">Traditional Job Boards</p>
                    <p className="text-gray-400 text-sm">Anyone posts anything. Ghost jobs. Spam listings. No accountability.</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3 p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                  <CheckCircle2 className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-green-400 font-medium">HR Bank Work Opportunities</p>
                    <p className="text-gray-400 text-sm">Generated from real operational needs. Verified employers. Matched by occupation.</p>
                  </div>
                </div>
              </div>

              <p className="text-gray-400 text-sm">
                When the system detects a real need — like a shift that needs coverage — it generates that opportunity 
                in context and matches it to onboarded workers. Faster staffing. More reliable hours. A fairer market.
              </p>
            </div>

            {/* Visual: How jobs flow */}
            <div className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700">
              <h3 className="text-white font-bold text-lg mb-6 text-center">How Work Opportunities Flow</h3>
              
              <div className="space-y-4">
                {/* Step 1 */}
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0">1</div>
                  <div className="flex-1 bg-slate-700/50 rounded-lg p-3">
                    <p className="text-white text-sm font-medium">Employer sets up real operations</p>
                    <p className="text-gray-400 text-xs">Workplaces, shifts, schedules, tasks</p>
                  </div>
                </div>
                
                {/* Arrow */}
                <div className="flex justify-center">
                  <ChevronRight className="w-6 h-6 text-amber-400 rotate-90" />
                </div>
                
                {/* Step 2 */}
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-amber-500 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0">2</div>
                  <div className="flex-1 bg-slate-700/50 rounded-lg p-3">
                    <p className="text-white text-sm font-medium">System detects operational need</p>
                    <p className="text-gray-400 text-xs">Shift needs coverage, role needs filling</p>
                  </div>
                </div>
                
                {/* Arrow */}
                <div className="flex justify-center">
                  <ChevronRight className="w-6 h-6 text-amber-400 rotate-90" />
                </div>
                
                {/* Step 3 */}
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0">3</div>
                  <div className="flex-1 bg-slate-700/50 rounded-lg p-3">
                    <p className="text-white text-sm font-medium">Matched to verified workers</p>
                    <p className="text-gray-400 text-xs">By occupation, credentials, availability</p>
                  </div>
                </div>
              </div>

              <div className="mt-6 p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
                <p className="text-green-400 text-sm text-center font-medium">
                  Result: Every opportunity is real. Every match is qualified.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Trust Infrastructure Ecosystem */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#30496d]/10 rounded-full text-[#30496d] text-sm font-medium mb-4">
              <Globe className="w-4 h-4" />
              Trust Infrastructure
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              One Network. Verified on All Sides.
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              HR Bank isn&apos;t three separate products — it&apos;s a single trust infrastructure where 
              verified workers meet verified employers, powered by institution-issued credentials.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 mb-12">
            {/* Workers */}
            <div className="bg-gradient-to-br from-amber-50 to-amber-100 rounded-2xl p-6 border border-amber-200 relative">
              <div className="absolute -top-3 left-6 bg-amber-500 text-white text-xs font-bold px-3 py-1 rounded-full">
                WORKERS
              </div>
              <div className="pt-4">
                <h3 className="text-xl font-bold text-gray-900 mb-3">Prove, Don&apos;t Claim</h3>
                <ul className="space-y-2 text-gray-600 text-sm">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-amber-500" />
                    Blockchain-verified credentials
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-amber-500" />
                    Employer-confirmed work history
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-amber-500" />
                    Portable reputation that travels
                  </li>
                </ul>
              </div>
            </div>

            {/* Employers */}
            <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-2xl p-6 border border-orange-200 relative">
              <div className="absolute -top-3 left-6 bg-[#ff5f00] text-white text-xs font-bold px-3 py-1 rounded-full">
                EMPLOYERS
              </div>
              <div className="pt-4">
                <h3 className="text-xl font-bold text-gray-900 mb-3">Hire with Confidence</h3>
                <ul className="space-y-2 text-gray-600 text-sm">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#ff5f00]" />
                    Access pre-verified talent pool
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#ff5f00]" />
                    Real credentials, instant verification
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#ff5f00]" />
                    Workforce ops infrastructure built-in
                  </li>
                </ul>
              </div>
            </div>

            {/* Institutions */}
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl p-6 border border-blue-200 relative">
              <div className="absolute -top-3 left-6 bg-[#30496d] text-white text-xs font-bold px-3 py-1 rounded-full">
                INSTITUTIONS
              </div>
              <div className="pt-4">
                <h3 className="text-xl font-bold text-gray-900 mb-3">Issue the Currency</h3>
                <ul className="space-y-2 text-gray-600 text-sm">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#30496d]" />
                    Blockchain-secured credentials
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#30496d]" />
                    Eliminate verification burden
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#30496d]" />
                    Revenue from credential issuance
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* Animated Trust Flow */}
          <div className="mb-12">
            <h3 className="text-center text-lg font-semibold text-gray-700 mb-6">
              See How Trust Flows
            </h3>
            <TrustFlowAnimation />
          </div>

          {/* Central trust flow */}
          <div className="bg-gradient-to-r from-slate-100 to-slate-200 rounded-2xl p-8 text-center">
            <p className="text-lg text-gray-700 mb-4">
              <strong className="text-gray-900">The result:</strong> A market where trust is standardized — 
              like currency. No more friction from unverifiable claims. No more fraud from fake credentials. 
              No more bias from connections over competence.
            </p>
            <p className="text-[#30496d] font-semibold">
              Proof replaces claims. Trust becomes portable. The playing field levels.
            </p>
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

      {/* SOC2 Compliance Badge Section */}
      <section className="py-12 bg-gradient-to-r from-[#30496d] to-slate-800">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-green-500/20 rounded-2xl flex items-center justify-center">
                <Shield className="w-8 h-8 text-green-400" />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-xl font-bold text-white">SOC2 Type II Ready</h3>
                  <span className="px-2 py-0.5 bg-green-500/20 text-green-400 rounded text-xs font-semibold">VERIFIED</span>
                </div>
                <p className="text-gray-300 text-sm">
                  Enterprise-grade security protecting your credentials and data
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-4">
              {[
                { label: 'Encrypted', icon: '🔐' },
                { label: '7-Year Audit', icon: '📋' },
                { label: 'PIPEDA Compliant', icon: '🇨🇦' },
                { label: 'MFA Protected', icon: '🛡️' }
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-2 bg-white/10 rounded-full px-4 py-2">
                  <span>{item.icon}</span>
                  <span className="text-white text-sm font-medium">{item.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Partner Logos Carousel - Only show if we have partners */}
      {partnerLogos.length > 0 && (
        <section className="py-12 bg-gray-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-8">
              <p className="text-gray-500 text-sm font-medium uppercase tracking-wide">Trusted By</p>
            </div>
            <div className="flex flex-wrap justify-center items-center gap-8">
              {partnerLogos.map((logo, index) => (
                <div
                  key={`${logo.id}-${index}`}
                  className="w-32 h-16 bg-white rounded-lg flex items-center justify-center p-3 shadow-sm grayscale hover:grayscale-0 transition-all"
                >
                  <img
                    src={logo.logo_url}
                    alt={logo.institution_name}
                    className="max-w-full max-h-full object-contain"
                    onError={(e) => { e.target.style.display = 'none'; }}
                  />
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* High School Students Callout - Compact */}
      <section className="py-12 bg-gradient-to-r from-emerald-600 to-teal-600">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                <span className="text-3xl">🎓</span>
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">Still in High School?</h3>
                <p className="text-emerald-100">Start building your WorkPassport™ early — track volunteer hours, certifications & achievements now.</p>
              </div>
            </div>
            <Button
              onClick={() => navigate('/signup?type=workforce')}
              className="bg-white text-emerald-700 hover:bg-emerald-50 px-6 py-3 font-semibold whitespace-nowrap"
              data-testid="student-cta-btn"
            >
              Start Early — It&apos;s Free
              <ChevronRight className="ml-2 w-4 h-4" />
            </Button>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 bg-gradient-to-r from-amber-500 to-orange-500">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Ready to Build Your WorkPassport™?
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
            Get My Free WorkPassport™
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
              <p className="text-sm">The standard for trust in employment.</p>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">For Workers</h4>
              <ul className="space-y-2 text-sm">
                <li><Link to="/jobs" className="hover:text-white transition-colors">Work Opportunities</Link></li>
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
          
          {/* Compliance Badges Section */}
          <div className="border-t border-gray-800 pt-8 mb-8">
            <div className="text-center mb-6">
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-6">Security & Compliance Standards</p>
              
              {/* North America Standards */}
              <div className="mb-8">
                <p className="text-[10px] text-gray-600 mb-4">North America</p>
                <div className="flex flex-wrap justify-center items-center gap-6 md:gap-8">
                  {/* SOC 2 */}
                  <div className="flex items-center gap-2 px-4 py-2 bg-slate-800/50 rounded-lg border border-slate-700 hover:border-blue-500/50 transition-colors">
                    <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center">
                      <span className="text-white font-bold text-xs">SOC</span>
                    </div>
                    <div className="text-left">
                      <p className="text-white text-sm font-semibold">SOC 2 Type II</p>
                      <p className="text-gray-500 text-[10px]">AICPA Certified</p>
                    </div>
                  </div>
                  
                  {/* PIPEDA */}
                  <div className="flex items-center gap-2 px-4 py-2 bg-slate-800/50 rounded-lg border border-slate-700 hover:border-red-500/50 transition-colors">
                    <div className="w-8 h-8 bg-red-600 rounded flex items-center justify-center">
                      <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
                      </svg>
                    </div>
                    <div className="text-left">
                      <p className="text-white text-sm font-semibold">PIPEDA</p>
                      <p className="text-gray-500 text-[10px]">Canada Privacy</p>
                    </div>
                  </div>
                  
                  {/* PCI DSS */}
                  <div className="flex items-center gap-2 px-4 py-2 bg-slate-800/50 rounded-lg border border-slate-700 hover:border-green-500/50 transition-colors">
                    <div className="w-8 h-8 bg-green-600 rounded flex items-center justify-center">
                      <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M20 4H4c-1.11 0-1.99.89-1.99 2L2 18c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V6c0-1.11-.89-2-2-2zm0 14H4v-6h16v6zm0-10H4V6h16v2z"/>
                      </svg>
                    </div>
                    <div className="text-left">
                      <p className="text-white text-sm font-semibold">PCI DSS</p>
                      <p className="text-gray-500 text-[10px]">Level 1 via Stripe</p>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* EU Standards */}
              <div className="mb-8">
                <p className="text-[10px] text-gray-600 mb-4">European Union</p>
                <div className="flex flex-wrap justify-center items-center gap-6 md:gap-8">
                  {/* GDPR */}
                  <div className="flex items-center gap-2 px-4 py-2 bg-slate-800/50 rounded-lg border border-slate-700 hover:border-blue-400/50 transition-colors">
                    <div className="w-8 h-8 bg-[#003399] rounded flex items-center justify-center">
                      <svg className="w-5 h-5" viewBox="0 0 24 24">
                        <circle cx="12" cy="12" r="10" fill="#003399"/>
                        <g fill="#FFCC00">
                          <circle cx="12" cy="4" r="1"/>
                          <circle cx="16.5" cy="5.5" r="1"/>
                          <circle cx="19" cy="9" r="1"/>
                          <circle cx="20" cy="12" r="1"/>
                          <circle cx="19" cy="15" r="1"/>
                          <circle cx="16.5" cy="18.5" r="1"/>
                          <circle cx="12" cy="20" r="1"/>
                          <circle cx="7.5" cy="18.5" r="1"/>
                          <circle cx="5" cy="15" r="1"/>
                          <circle cx="4" cy="12" r="1"/>
                          <circle cx="5" cy="9" r="1"/>
                          <circle cx="7.5" cy="5.5" r="1"/>
                        </g>
                      </svg>
                    </div>
                    <div className="text-left">
                      <p className="text-white text-sm font-semibold">GDPR</p>
                      <p className="text-gray-500 text-[10px]">EU Data Protection</p>
                    </div>
                  </div>
                  
                  {/* eIDAS */}
                  <div className="flex items-center gap-2 px-4 py-2 bg-slate-800/50 rounded-lg border border-slate-700 hover:border-indigo-500/50 transition-colors">
                    <div className="w-8 h-8 bg-indigo-600 rounded flex items-center justify-center">
                      <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z"/>
                      </svg>
                    </div>
                    <div className="text-left">
                      <p className="text-white text-sm font-semibold">eIDAS</p>
                      <p className="text-gray-500 text-[10px]">Electronic ID</p>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* International Standards */}
              <div className="mb-6">
                <p className="text-[10px] text-gray-600 mb-4">International</p>
                <div className="flex flex-wrap justify-center items-center gap-6 md:gap-8">
                  {/* ISO 27001 */}
                  <div className="flex items-center gap-2 px-4 py-2 bg-slate-800/50 rounded-lg border border-slate-700 hover:border-purple-500/50 transition-colors">
                    <div className="w-8 h-8 bg-purple-600 rounded flex items-center justify-center">
                      <span className="text-white font-bold text-[10px]">ISO</span>
                    </div>
                    <div className="text-left">
                      <p className="text-white text-sm font-semibold">ISO 27001</p>
                      <p className="text-gray-500 text-[10px]">Info Security</p>
                    </div>
                  </div>
                  
                  {/* ISO 27701 */}
                  <div className="flex items-center gap-2 px-4 py-2 bg-slate-800/50 rounded-lg border border-slate-700 hover:border-purple-500/50 transition-colors">
                    <div className="w-8 h-8 bg-purple-700 rounded flex items-center justify-center">
                      <span className="text-white font-bold text-[10px]">ISO</span>
                    </div>
                    <div className="text-left">
                      <p className="text-white text-sm font-semibold">ISO 27701</p>
                      <p className="text-gray-500 text-[10px]">Privacy Info Mgmt</p>
                    </div>
                  </div>
                  
                  {/* Polygon Blockchain */}
                  <div className="flex items-center gap-2 px-4 py-2 bg-slate-800/50 rounded-lg border border-slate-700 hover:border-[#8247E5]/50 transition-colors">
                    <div className="w-8 h-8 rounded flex items-center justify-center bg-[#8247E5]">
                      <svg viewBox="0 0 38 33" className="w-5 h-5" fill="white">
                        <path d="M29 10.2c-.7-.4-1.6-.4-2.4 0L21 13.5l-3.8 2.1-5.5 3.3c-.7.4-1.6.4-2.4 0l-4.3-2.6c-.7-.4-1.2-1.2-1.2-2.1v-5c0-.8.4-1.6 1.2-2.1l4.3-2.5c.7-.4 1.6-.4 2.4 0l4.3 2.6c.7.4 1.2 1.2 1.2 2.1v3.3l3.8-2.2V7c0-.8-.4-1.6-1.2-2.1l-8-4.7c-.7-.4-1.6-.4-2.4 0L1.2 5C.4 5.4 0 6.2 0 7v9.4c0 .8.4 1.6 1.2 2.1l8.1 4.7c.7.4 1.6.4 2.4 0l5.5-3.2 3.8-2.2 5.5-3.2c.7-.4 1.6-.4 2.4 0l4.3 2.5c.7.4 1.2 1.2 1.2 2.1v5c0 .8-.4 1.6-1.2 2.1L29 29.2c-.7.4-1.6.4-2.4 0l-4.3-2.5c-.7-.4-1.2-1.2-1.2-2.1v-3.2l-3.8 2.2v3.3c0 .8.4 1.6 1.2 2.1l8.1 4.7c.7.4 1.6.4 2.4 0l8.1-4.7c.7-.4 1.2-1.2 1.2-2.1V17c0-.8-.4-1.6-1.2-2.1L29 10.2z"/>
                      </svg>
                    </div>
                    <div className="text-left">
                      <p className="text-white text-sm font-semibold">Polygon</p>
                      <p className="text-gray-500 text-[10px]">Blockchain Verified</p>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Trust statement */}
              <p className="text-[11px] text-gray-600 mt-4 max-w-2xl mx-auto">
                Enterprise-grade security protecting your data. All credentials verified on Polygon blockchain for tamper-proof authenticity.
              </p>
            </div>
          </div>
          
          <div className="border-t border-gray-800 pt-8 text-center text-sm">
            <p>&copy; {new Date().getFullYear()} HR Bank. All rights reserved.</p>
          </div>
        </div>
      </footer>

      {/* Emma Chat */}
      <EmmaLandingChat />

      {/* Login Modal */}
      <LoginModal 
        isOpen={showLoginModal} 
        onClose={() => setShowLoginModal(false)} 
        userType="workforce" 
      />
    </div>
  );
};

export default LandingPage;
