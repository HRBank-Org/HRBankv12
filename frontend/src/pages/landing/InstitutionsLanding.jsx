import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '../../components/ui/button';
import { 
  ChevronRight, Shield, CheckCircle2, Building2, FileCheck, 
  DollarSign, Users, Trophy, Search, TrendingUp, Globe,
  AlertCircle, ArrowRight, GraduationCap, Award
} from 'lucide-react';
import { LOGOS } from '../../utils/logoUtils';
import api from '../../utils/api';
import LoginModal from '../../components/auth/LoginModal';

const InstitutionsLanding = () => {
  const navigate = useNavigate();
  const [topInstitutions, setTopInstitutions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showLoginModal, setShowLoginModal] = useState(false);

  useEffect(() => {
    loadLeaderboard();
  }, []);

  const loadLeaderboard = async () => {
    try {
      const res = await api.get('/api/leaderboard/institutions?limit=5');
      if (res.data.success) {
        setTopInstitutions(res.data.data.leaderboard.slice(0, 5));
      }
    } catch (error) {
      console.error('Failed to load leaderboard:', error);
    } finally {
      setLoading(false);
    }
  };

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
              <Link to="/" className="text-gray-600 hover:text-[#30496d] font-medium">
                WorkPassport™
              </Link>
              <Link to="/institutions" className="text-[#30496d] font-semibold">
                Institutions
              </Link>
              <Link to="/leaderboard" className="text-gray-600 hover:text-[#30496d] font-medium">
                Leaderboard
              </Link>
              <Link to="/employers" className="text-gray-600 hover:text-[#ff5f00] font-medium">
                Employers <span className="text-orange-500 text-xs">(Beta)</span>
              </Link>
              <Link to="/jobs" className="text-gray-600 hover:text-[#30496d] font-medium">
                Jobs
              </Link>
            </div>
            <Button variant="ghost" onClick={() => setShowLoginModal(true)} className="text-gray-700" data-testid="institution-landing-signin">
              Sign In
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-24 pb-20 bg-gradient-to-br from-[#30496d] via-[#1a2d42] to-slate-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500/20 rounded-full text-blue-300 text-sm font-semibold mb-6">
              <Building2 className="w-4 h-4" />
              For All Regulated Training Providers
            </div>
            
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-6 leading-tight">
              Issue Blockchain Credentials.
              <br />
              <span className="text-amber-400">Prove Authenticity Forever.</span>
            </h1>
            
            <p className="text-xl text-gray-300 mb-4 leading-relaxed">
              Whether you&apos;re a university, college, or specialized training provider — 
              if your credentials are regulated, you can issue them on the blockchain.
            </p>
            <p className="text-lg text-gray-400 mb-8">
              From degrees to forklift certifications, WHMIS to food safety — every credential 
              your students earn becomes tamper-proof and instantly verifiable.
            </p>

            <div className="flex flex-col sm:flex-row gap-4">
              <Button
                size="lg"
                onClick={() => navigate('/signup?type=institution')}
                className="bg-amber-500 hover:bg-amber-400 text-slate-900 h-14 px-8 text-lg font-semibold"
              >
                Partner With HR Bank
                <ChevronRight className="ml-2 w-5 h-5" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={() => navigate('/leaderboard')}
                className="bg-transparent border-white/30 text-white hover:bg-white/10 h-14 px-8 text-lg"
              >
                <Trophy className="mr-2 w-5 h-5" />
                View Leaderboard
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Who Can Join Section */}
      <section className="py-16 bg-gradient-to-r from-emerald-50 to-cyan-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Who Can Partner With HR Bank?</h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Any training provider issuing regulated credentials can join — from large universities to specialized certification centers.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
              <div className="w-14 h-14 bg-blue-100 rounded-xl flex items-center justify-center mb-4">
                <GraduationCap className="w-7 h-7 text-blue-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Universities & Colleges</h3>
              <p className="text-gray-600 mb-4">
                Issue degrees, diplomas, and transcripts that employers can verify instantly.
              </p>
              <div className="text-sm text-gray-500">
                <span className="font-medium">Examples:</span> Bachelor&apos;s degrees, College diplomas, Academic transcripts
              </div>
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
              <div className="w-14 h-14 bg-amber-100 rounded-xl flex items-center justify-center mb-4">
                <Award className="w-7 h-7 text-amber-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Training Centers</h3>
              <p className="text-gray-600 mb-4">
                Issue high-frequency certifications that workers need for employment.
              </p>
              <div className="text-sm text-gray-500">
                <span className="font-medium">Examples:</span> Food Handler, Smart Serve, First Aid, CPR
              </div>
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
              <div className="w-14 h-14 bg-green-100 rounded-xl flex items-center justify-center mb-4">
                <Shield className="w-7 h-7 text-green-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Specialized Providers</h3>
              <p className="text-gray-600 mb-4">
                Issue industry-specific certifications and safety credentials.
              </p>
              <div className="text-sm text-gray-500">
                <span className="font-medium">Examples:</span> WHMIS, Forklift, Working at Heights, Security Guard
              </div>
            </div>
          </div>

          <div className="mt-10 text-center">
            <p className="text-gray-600 mb-4">
              <strong>The only requirement:</strong> Your credentials must be regulated or recognized by relevant authorities.
            </p>
            <Button
              onClick={() => navigate('/contact')}
              variant="outline"
              className="border-gray-300"
            >
              Questions? Contact Us
            </Button>
          </div>
        </div>
      </section>

      {/* Problem Section */}
      <section className="py-16 bg-red-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">The Problem</h2>
            <p className="text-gray-600">What you&apos;re dealing with today</p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            <div className="bg-white rounded-xl p-6 border border-red-100">
              <AlertCircle className="w-8 h-8 text-red-500 mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Verification Overload</h3>
              <p className="text-gray-600 text-sm">
                Staff drowning in employer verification requests. Each one takes time, costs money.
              </p>
            </div>
            <div className="bg-white rounded-xl p-6 border border-red-100">
              <AlertCircle className="w-8 h-8 text-red-500 mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">PDF Fraud</h3>
              <p className="text-gray-600 text-sm">
                Fake certificates are everywhere. PDFs are trivially easy to forge. Trust erodes.
              </p>
            </div>
            <div className="bg-white rounded-xl p-6 border border-red-100">
              <AlertCircle className="w-8 h-8 text-red-500 mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Slow Processes</h3>
              <p className="text-gray-600 text-sm">
                Graduates wait weeks for transcripts. Employers wait days for verification. Everyone loses.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Solution Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              What HR Bank Provides
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              A complete credentialing solution that benefits your institution and your graduates.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <FileCheck className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Issue Credentials</h3>
              <p className="text-gray-600 text-sm">
                Issue blockchain-verified certificates and transcripts. Instant, tamper-proof, verifiable forever.
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Shield className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Update & Revoke</h3>
              <p className="text-gray-600 text-sm">
                Maintain full control. Update status, revoke if needed. Your authority is preserved.
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-amber-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <DollarSign className="w-8 h-8 text-amber-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Revenue Share</h3>
              <p className="text-gray-600 text-sm">
                Earn from credential issuance. Built-in payouts via Stripe Connect. New revenue stream.
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-purple-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Users className="w-8 h-8 text-purple-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Graduate Passports</h3>
              <p className="text-gray-600 text-sm">
                Graduates get free WorkPassport™s automatically. They carry your credentials everywhere.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Future of Work Section - LinkedIn/Indeed */}
      <section className="py-20 bg-gradient-to-br from-slate-900 via-[#1a2d42] to-slate-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-500/20 rounded-full text-amber-400 text-sm font-medium mb-4">
                <TrendingUp className="w-4 h-4" />
                The Future is Verified
              </div>
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-6 leading-tight">
                LinkedIn and Indeed Profiles
                <br />
                <span className="text-amber-400">Won&apos;t Work Forever.</span>
              </h2>
              <p className="text-lg text-gray-300 mb-6 leading-relaxed">
                Self-reported credentials on LinkedIn, Indeed, and traditional resumes are being questioned 
                more than ever. AI makes it trivial to fabricate impressive profiles. Employers are losing trust.
              </p>
              <p className="text-gray-400 mb-8">
                The future belongs to <span className="text-white font-semibold">verified credentials</span> — 
                issued by trusted institutions, secured on blockchain, and instantly verifiable. 
                Graduates who can prove their qualifications will win.
              </p>

              <div className="space-y-4">
                {[
                  { platform: 'LinkedIn', issue: 'Anyone can claim any credential. No verification.' },
                  { platform: 'Indeed', issue: 'Self-reported skills. Easy to exaggerate.' },
                  { platform: 'PDF Certificates', issue: 'Trivially easy to forge with AI tools.' },
                  { platform: 'HR Bank', issue: 'Blockchain-verified. Institution-issued. Tamper-proof.', isPositive: true }
                ].map((item, i) => (
                  <div key={i} className={`flex items-start gap-3 p-3 rounded-lg ${item.isPositive ? 'bg-green-500/10 border border-green-500/30' : 'bg-red-500/10 border border-red-500/30'}`}>
                    {item.isPositive ? (
                      <CheckCircle2 className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
                    ) : (
                      <AlertCircle className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" />
                    )}
                    <div>
                      <p className={`font-semibold ${item.isPositive ? 'text-green-400' : 'text-red-400'}`}>{item.platform}</p>
                      <p className="text-gray-400 text-sm">{item.issue}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Visual */}
            <div className="relative">
              <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700">
                <div className="text-center mb-6">
                  <h3 className="text-white font-bold text-lg mb-2">Employer Trust Level</h3>
                  <p className="text-gray-400 text-sm">When reviewing candidate credentials</p>
                </div>

                <div className="space-y-4">
                  {/* LinkedIn */}
                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-gray-300 text-sm flex items-center gap-2">
                        <div className="w-6 h-6 bg-blue-600 rounded flex items-center justify-center text-white text-xs font-bold">in</div>
                        LinkedIn Profile
                      </span>
                      <span className="text-red-400 text-sm">32% Trust</span>
                    </div>
                    <div className="h-3 bg-slate-700 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-red-500 to-red-600 rounded-full" style={{ width: '32%' }}></div>
                    </div>
                  </div>

                  {/* Indeed */}
                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-gray-300 text-sm flex items-center gap-2">
                        <div className="w-6 h-6 bg-blue-500 rounded flex items-center justify-center text-white text-xs font-bold">i</div>
                        Indeed Resume
                      </span>
                      <span className="text-amber-400 text-sm">41% Trust</span>
                    </div>
                    <div className="h-3 bg-slate-700 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-amber-500 to-amber-600 rounded-full" style={{ width: '41%' }}></div>
                    </div>
                  </div>

                  {/* PDF */}
                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-gray-300 text-sm flex items-center gap-2">
                        <div className="w-6 h-6 bg-red-600 rounded flex items-center justify-center text-white text-xs font-bold">PDF</div>
                        PDF Certificate
                      </span>
                      <span className="text-amber-400 text-sm">45% Trust</span>
                    </div>
                    <div className="h-3 bg-slate-700 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-amber-500 to-amber-600 rounded-full" style={{ width: '45%' }}></div>
                    </div>
                  </div>

                  {/* HR Bank */}
                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-gray-300 text-sm flex items-center gap-2">
                        <div className="w-6 h-6 bg-green-500 rounded flex items-center justify-center text-white text-xs font-bold">✓</div>
                        Blockchain Verified
                      </span>
                      <span className="text-green-400 text-sm">94% Trust</span>
                    </div>
                    <div className="h-3 bg-slate-700 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-green-500 to-emerald-500 rounded-full" style={{ width: '94%' }}></div>
                    </div>
                  </div>
                </div>

                <div className="mt-6 p-4 bg-green-500/10 rounded-lg border border-green-500/30">
                  <p className="text-green-400 text-sm text-center">
                    <strong>Your graduates deserve credentials employers trust.</strong>
                  </p>
                </div>
              </div>

              <div className="absolute -top-4 -right-4 bg-amber-500 text-slate-900 px-4 py-2 rounded-lg text-sm font-bold shadow-lg">
                Future-Proof
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Leaderboard Preview */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              🏆 Institution Leaderboard
            </h2>
            <p className="text-gray-600">See which institutions are leading in credential issuance.</p>
          </div>

          <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-6">
            {loading ? (
              <div className="text-center py-8 text-gray-400">Loading...</div>
            ) : topInstitutions.length > 0 ? (
              <div className="space-y-3">
                {topInstitutions.map((inst, index) => (
                  <div key={inst.institution_id || index} className="flex items-center gap-4 p-4 bg-white/5 rounded-xl">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg ${
                      index === 0 ? 'bg-amber-500 text-white' :
                      index === 1 ? 'bg-gray-300 text-gray-800' :
                      index === 2 ? 'bg-amber-700 text-white' :
                      'bg-slate-600 text-gray-300'
                    }`}>
                      {index + 1}
                    </div>
                    <div className="flex-1">
                      <p className="text-white font-semibold">{inst.institution_name}</p>
                      <p className="text-gray-400 text-sm">{inst.province || 'Canada'}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-amber-400 font-bold">{inst.total_issued || 0}</p>
                      <p className="text-gray-500 text-xs">credentials</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-400">
                Be the first institution on the leaderboard!
              </div>
            )}

            <div className="mt-6 text-center">
              <Button
                onClick={() => navigate('/leaderboard')}
                className="bg-white/10 hover:bg-white/20 text-white"
              >
                See Full Leaderboard
                <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Can't Find Your School */}
      <section className="py-16 bg-blue-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <Globe className="w-12 h-12 text-[#30496d] mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Can&apos;t Find Your School?
          </h2>
          <p className="text-gray-600 mb-6">
            Search our directory of 1,800+ Canadian institutions. Request your school to join and start issuing verified credentials.
          </p>
          <Button
            onClick={() => navigate('/leaderboard')}
            className="bg-[#30496d] hover:bg-[#243a56] text-white"
          >
            <Search className="mr-2 w-4 h-4" />
            Search All Institutions
          </Button>
        </div>
      </section>

      {/* Footer CTA */}
      <section className="py-20 bg-gradient-to-r from-[#30496d] to-[#1a2d42]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Ready to Modernize Your Credentials?
          </h2>
          <p className="text-xl text-gray-300 mb-8">
            Join institutions across Canada already issuing blockchain-verified credentials.
          </p>
          <Button
            size="lg"
            onClick={() => navigate('/signup?type=institution')}
            className="bg-amber-500 hover:bg-amber-400 text-slate-900 h-14 px-10 text-lg font-semibold"
          >
            Join as an Institution
            <ChevronRight className="ml-2 w-5 h-5" />
          </Button>
        </div>
      </section>

      {/* Footer */}
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

      {/* Login Modal */}
      <LoginModal 
        isOpen={showLoginModal} 
        onClose={() => setShowLoginModal(false)} 
        userType="institution" 
      />
    </div>
  );
};

export default InstitutionsLanding;
