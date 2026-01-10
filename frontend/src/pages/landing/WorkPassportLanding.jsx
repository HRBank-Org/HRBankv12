import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '../../components/ui/button';
import { 
  ChevronRight, Shield, CheckCircle2, Star, Play, QrCode,
  FileCheck, Link2, Lock, Eye, Share2
} from 'lucide-react';
import { LOGOS } from '../../utils/logoUtils';

const WorkPassportLanding = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link to="/" className="flex items-center gap-3">
              <img src={LOGOS.master} alt="HR Bank" className="h-10 w-auto" />
            </Link>
            <div className="hidden md:flex items-center gap-6">
              <Link to="/work-passport" className="text-[#30496d] font-semibold">
                Work Passport <span className="text-green-600 text-xs">(Free)</span>
              </Link>
              <Link to="/institutions" className="text-gray-600 hover:text-[#30496d] font-medium">
                Institutions
              </Link>
              <Link to="/employers" className="text-gray-600 hover:text-[#ff5f00] font-medium">
                Employers <span className="text-orange-500 text-xs">(Beta)</span>
              </Link>
              <Link to="/leaderboard" className="text-gray-600 hover:text-[#30496d] font-medium">
                🏆 Leaderboard
              </Link>
            </div>
            <Button variant="ghost" onClick={() => navigate('/auth/login')} className="text-gray-700">
              Sign In
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-24 pb-20 bg-gradient-to-br from-slate-900 via-slate-800 to-blue-900 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-10 left-10 w-32 h-32 border-2 border-amber-400 rounded-full" />
          <div className="absolute bottom-20 right-20 w-48 h-48 border-2 border-amber-400 rounded-full" />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="text-white">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-500/20 rounded-full text-green-400 text-sm font-semibold mb-4 border border-green-500/30">
                <span className="animate-pulse w-2 h-2 bg-green-400 rounded-full" />
                100% Free for Workers
              </div>
              
              <h1 className="text-4xl md:text-5xl font-bold mb-4 leading-tight">
                Get Your Free
                <br />
                <span className="text-amber-400">Work Passport</span>
              </h1>
              
              <p className="text-xl text-gray-300 mb-4 leading-relaxed">
                QR-verifiable credentials + portable work history.
              </p>
              <p className="text-lg text-gray-400 mb-8">
                Contact info stays private. You control what&apos;s visible. 
                Share with any employer instantly via QR code or link.
              </p>

              <div className="flex flex-col sm:flex-row gap-4">
                <Button
                  size="lg"
                  onClick={() => navigate('/signup?type=workforce')}
                  className="bg-amber-500 hover:bg-amber-400 text-slate-900 h-14 px-8 text-lg font-semibold"
                >
                  Get My Free Work Passport
                  <ChevronRight className="ml-2 w-5 h-5" />
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  onClick={() => window.open('/passport/ALEX2024', '_blank')}
                  className="bg-transparent border-white/30 text-white hover:bg-white/10 h-14 px-8 text-lg"
                >
                  <Play className="mr-2 w-5 h-5" />
                  See Example
                </Button>
              </div>
            </div>

            {/* Passport Card Preview */}
            <div className="relative">
              <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-6 border border-slate-700 shadow-2xl transform rotate-2 hover:rotate-0 transition-transform duration-500">
                <div className="h-2 bg-gradient-to-r from-amber-400 via-amber-500 to-amber-400 rounded-full mb-4" />
                
                <div className="flex items-start gap-4 mb-6">
                  <div className="relative">
                    <img 
                      src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=180&fit=crop&crop=face"
                      alt="Sample Profile"
                      className="w-20 h-24 rounded-lg border-2 border-amber-500/50 object-cover shadow-lg"
                    />
                    <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center border-2 border-slate-800">
                      <CheckCircle2 className="w-4 h-4 text-white" />
                    </div>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-white font-bold text-lg">Alex Johnson</h3>
                    <p className="text-slate-400 text-sm">Windsor, ON • Canada</p>
                    <div className="flex items-center gap-1 mt-1">
                      <span className="text-amber-400 font-bold">4.8</span>
                      <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                      <span className="text-slate-500 text-sm">(47 reviews)</span>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-700/50 rounded-lg p-3 mb-4">
                  <p className="text-slate-400 text-xs uppercase mb-2 flex items-center gap-1">
                    <Shield className="w-3 h-3" /> Security Clearances
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <span className="px-2 py-1 bg-green-500/20 text-green-400 rounded text-xs font-medium flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> ID Verified
                    </span>
                    <span className="px-2 py-1 bg-green-500/20 text-green-400 rounded text-xs font-medium flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Background Check
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3 mb-4">
                  <div className="bg-slate-700/30 rounded-lg p-2 text-center">
                    <p className="text-amber-400 font-bold text-lg">2,340</p>
                    <p className="text-slate-400 text-xs">Hours Verified</p>
                  </div>
                  <div className="bg-slate-700/30 rounded-lg p-2 text-center">
                    <p className="text-green-400 font-bold text-lg">4</p>
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
                  <QrCode className="w-8 h-8 text-slate-400" />
                </div>
              </div>

              <div className="absolute -top-4 -right-4 bg-green-500 text-white px-3 py-1 rounded-full text-sm font-semibold shadow-lg">
                ✓ Verified
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Not LinkedIn Section */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Not LinkedIn. Not Indeed. <span className="text-[#30496d]">Built for Proof.</span>
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
              <div className="w-12 h-12 bg-amber-100 rounded-lg flex items-center justify-center mb-4">
                <FileCheck className="w-6 h-6 text-amber-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Profiles are self-claims</h3>
              <p className="text-gray-600">Work Passports are verifiable. Credentials issued by the source — not screenshots.</p>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                <Shield className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Blockchain verified</h3>
              <p className="text-gray-600">Every credential is cryptographically signed and tamper-proof. Trust, not hope.</p>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
                <Link2 className="w-6 h-6 text-green-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">One link/QR</h3>
              <p className="text-gray-600">Share your verified profile anywhere — employers, recruiters, or clients. Instant trust.</p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Build Proof. <span className="text-[#30496d]">Get Matched Faster.</span>
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Your credentials and experience in one portable, verifiable profile.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Step 1 */}
            <div className="bg-gray-50 rounded-2xl p-8 border border-gray-100">
              <div className="w-16 h-16 bg-[#30496d] rounded-2xl flex items-center justify-center text-white text-2xl font-bold mb-6">
                1
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">Build Your Profile</h3>
              <p className="text-gray-600 mb-6">
                No resume required. Add your skills, availability, and work preferences. Keep it simple.
              </p>
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  <span>Set your skills and availability</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  <span>Choose preferred work zones</span>
                </div>
              </div>
            </div>

            {/* Step 2 */}
            <div className="bg-gray-50 rounded-2xl p-8 border border-gray-100">
              <div className="w-16 h-16 bg-amber-500 rounded-2xl flex items-center justify-center text-white text-2xl font-bold mb-6">
                2
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">Add Credentials</h3>
              <p className="text-gray-600 mb-6">
                Get credentials issued directly from your institution — or request verification for existing ones.
              </p>
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  <span>Issuer-issued certificates</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  <span>Verified work history</span>
                </div>
              </div>
            </div>

            {/* Step 3 */}
            <div className="bg-gray-50 rounded-2xl p-8 border border-gray-100">
              <div className="w-16 h-16 bg-green-500 rounded-2xl flex items-center justify-center text-white text-2xl font-bold mb-6">
                3
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">Share Your Passport</h3>
              <p className="text-gray-600 mb-6">
                Share via QR code, link, or PDF. Get notified when opportunities match your profile.
              </p>
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  <span>QR code for instant sharing</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  <span>Optional: match notifications</span>
                </div>
              </div>
            </div>
          </div>

          <div className="text-center mt-12">
            <Button
              size="lg"
              onClick={() => navigate('/signup?type=workforce')}
              className="bg-amber-500 hover:bg-amber-400 text-slate-900 h-14 px-10 text-lg font-semibold"
            >
              Create My Work Passport
              <ChevronRight className="ml-2 w-5 h-5" />
            </Button>
          </div>
        </div>
      </section>

      {/* Emma Support Section */}
      <section className="py-20 bg-gradient-to-br from-[#1a1a2e] via-[#16213e] to-[#0f3460]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-6 leading-tight">
                Need Help Building Your Profile?
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-400"> Emma&apos;s Got You.</span>
              </h2>
              <p className="text-lg text-gray-300 mb-6 leading-relaxed">
                Our AI assistant speaks 20+ languages and understands Canadian workplace context. 
                Get help building your profile, understanding your rights, and navigating work requirements.
              </p>
              
              <div className="space-y-4 mb-8">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-6 h-6 text-cyan-400 mt-0.5" />
                  <p className="text-gray-300">Profile building guidance in your language</p>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-6 h-6 text-cyan-400 mt-0.5" />
                  <p className="text-gray-300">Workplace rights and requirements explained</p>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-6 h-6 text-cyan-400 mt-0.5" />
                  <p className="text-gray-300">Credential support and verification help</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-md mx-auto">
              <div className="flex items-center gap-3 mb-4 pb-4 border-b">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold">
                  E
                </div>
                <div>
                  <p className="font-semibold text-gray-900">Emma</p>
                  <p className="text-sm text-gray-500">Profile Assistant</p>
                </div>
              </div>
              
              <div className="space-y-4">
                <div className="bg-purple-50 rounded-lg p-3 max-w-[85%]">
                  <p className="text-gray-800 text-sm">
                    Hi! I can help you build your Work Passport. What skills would you like to highlight?
                  </p>
                </div>
                <div className="bg-gray-100 rounded-lg p-3 max-w-[85%] ml-auto">
                  <p className="text-gray-800 text-sm">I have food safety certification</p>
                </div>
                <div className="bg-purple-50 rounded-lg p-3 max-w-[85%]">
                  <p className="text-gray-800 text-sm">
                    Great! I can help you request verification from your institution. This will make it blockchain-verified!
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Trust & Privacy Section */}
      <section className="py-16 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-8">Your Privacy, Your Control</h2>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="flex flex-col items-center">
              <Lock className="w-8 h-8 text-[#30496d] mb-3" />
              <h3 className="font-semibold text-gray-900 mb-1">Contact Info Hidden</h3>
              <p className="text-gray-500 text-sm">Your phone and email stay private by default</p>
            </div>
            <div className="flex flex-col items-center">
              <Eye className="w-8 h-8 text-[#30496d] mb-3" />
              <h3 className="font-semibold text-gray-900 mb-1">You Control Visibility</h3>
              <p className="text-gray-500 text-sm">Choose exactly what employers can see</p>
            </div>
            <div className="flex flex-col items-center">
              <Share2 className="w-8 h-8 text-[#30496d] mb-3" />
              <h3 className="font-semibold text-gray-900 mb-1">Share Only by Link/QR</h3>
              <p className="text-gray-500 text-sm">No public searchable profile without your consent</p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer CTA */}
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
          >
            Get My Free Work Passport
            <ChevronRight className="ml-2 w-5 h-5" />
          </Button>
        </div>
      </section>

      {/* Simple Footer */}
      <footer className="bg-slate-900 text-gray-400 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-sm">© 2025 HR Bank. All rights reserved.</p>
          <div className="flex justify-center gap-6 mt-4 text-sm">
            <Link to="/privacy" className="hover:text-white">Privacy</Link>
            <Link to="/about" className="hover:text-white">About</Link>
            <Link to="/contact" className="hover:text-white">Contact</Link>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default WorkPassportLanding;
