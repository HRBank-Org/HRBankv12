import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { 
  Briefcase, Building2, GraduationCap, MapPin, Clock, DollarSign,
  ChevronRight, Search, Zap, Shield, Globe, Star, CheckCircle2,
  Smartphone, BarChart3, Users, Award, Play
} from 'lucide-react';
import { LOGOS, getLogoByUserType } from '../utils/logoUtils';
import EmmaLandingChat from '../components/emma/EmmaLandingChat';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const LandingPage = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('jobseekers');
  const [featuredJobs, setFeaturedJobs] = useState([]);
  const [loadingJobs, setLoadingJobs] = useState(true);
  
  const [partnerLogos, setPartnerLogos] = useState([
    { id: 1, institution_name: 'Partner 1', logo_url: 'https://via.placeholder.com/150x60/4267B2/ffffff?text=Partner+1' },
    { id: 2, institution_name: 'Partner 2', logo_url: 'https://via.placeholder.com/150x60/2C4A6B/ffffff?text=Partner+2' },
    { id: 3, institution_name: 'Partner 3', logo_url: 'https://via.placeholder.com/150x60/4267B2/ffffff?text=Partner+3' },
    { id: 4, institution_name: 'Partner 4', logo_url: 'https://via.placeholder.com/150x60/2C4A6B/ffffff?text=Partner+4' },
  ]);

  // Fetch partner logos
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

  // Fetch featured jobs for preview
  useEffect(() => {
    const fetchFeaturedJobs = async () => {
      try {
        const response = await fetch(`${API}/jobs/public?limit=4`);
        const data = await response.json();
        if (data.success && data.data) {
          setFeaturedJobs(data.data.slice(0, 4));
        }
      } catch (error) {
        console.error('Error fetching jobs:', error);
        // Set mock data for preview
        setFeaturedJobs([
          { posting_id: '1', title: 'Server', company_name: 'Swan Pizza', workplace_city: 'Windsor, ON', hourly_rate: 17.60, work_type: 'on_site' },
          { posting_id: '2', title: 'Line Cook', company_name: 'Swan Pizza', workplace_city: 'Windsor, ON', hourly_rate: 19.50, work_type: 'on_site' },
          { posting_id: '3', title: 'Delivery Driver', company_name: 'Swan Pizza', workplace_city: 'Windsor, ON', hourly_rate: 18.00, work_type: 'route_based' },
          { posting_id: '4', title: 'Night Security', company_name: 'Swan Pizza', workplace_city: 'Windsor, ON', hourly_rate: 20.00, work_type: 'on_site' },
        ]);
      } finally {
        setLoadingJobs(false);
      }
    };
    fetchFeaturedJobs();
  }, []);

  const valueProps = {
    jobseekers: [
      { icon: Zap, title: 'AI Job Matching', desc: 'No more endless applications. AI finds jobs that match your skills automatically.' },
      { icon: Shield, title: 'Portable Credentials', desc: 'Your certifications follow you forever. Blockchain-secured and instantly verifiable.' },
      { icon: Star, title: 'Ratings That Travel', desc: 'Build your reputation. Great ratings from past jobs unlock better opportunities.' },
      { icon: Globe, title: 'No Language Barriers', desc: '20+ languages supported. Work anywhere, communicate effortlessly.' },
    ],
    employers: [
      { icon: Smartphone, title: 'Manage From Anywhere', desc: 'See who clocked in, track tasks, approve timesheets - all from your phone.' },
      { icon: Shield, title: 'Fraud-Proof Attendance', desc: 'QR + GPS geofencing. Know exactly who is working where. No buddy punching.' },
      { icon: CheckCircle2, title: 'Verified Workers', desc: 'Every credential blockchain-verified. Hire with confidence, not hope.' },
      { icon: DollarSign, title: '$1/hr Flat Rate', desc: '80-90% cheaper than staffing agencies. No hidden fees, no surprises.' },
    ],
    institutions: [
      { icon: Shield, title: 'Blockchain Credentials', desc: 'Issue tamper-proof certificates. Students carry them for life.' },
      { icon: BarChart3, title: 'Graduate Tracking', desc: 'See where your graduates work. Prove your programs ROI.' },
      { icon: Users, title: 'Industry Partnerships', desc: 'Connect directly with employers. Become the trusted talent source.' },
      { icon: Award, title: 'Curriculum Insights', desc: 'Real-time data on what skills employers need most.' },
    ],
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Clean Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <img src={LOGOS.master} alt="HR Bank" className="h-10 w-auto" />
            </div>
            <div className="hidden md:flex items-center gap-6">
              <Link to="/jobs" className="text-gray-600 hover:text-[#30496d] font-medium flex items-center gap-1">
                <Search size={16} />
                Browse Jobs
              </Link>
              <Link to="/leaderboard" className="text-gray-600 hover:text-[#30496d] font-medium flex items-center gap-1">
                🏆 Leaderboard
              </Link>
              <button 
                onClick={() => document.getElementById('employers').scrollIntoView({ behavior: 'smooth' })}
                className="text-gray-600 hover:text-[#ff5f00] font-medium"
              >
                For Employers
              </button>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="ghost" onClick={() => navigate('/login')} className="text-gray-700">
                Sign In
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section with Video */}
      <section className="relative pt-16 h-[650px] overflow-hidden">
        {/* Video Background */}
        <div className="absolute inset-0 z-0">
          <iframe
            className="w-full h-full object-cover scale-125"
            src="https://www.youtube.com/embed/H8vQs5nbJzo?autoplay=1&mute=1&loop=1&playlist=H8vQs5nbJzo&controls=0&showinfo=0&modestbranding=1&vq=hd1080"
            title="HR Bank Video"
            frameBorder="0"
            allow="autoplay; encrypted-media"
            allowFullScreen
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/50 to-transparent"></div>
        </div>

        {/* Hero Content */}
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full flex items-center">
          <div className="max-w-2xl">
            {/* Problem Statement */}
            <p className="text-orange-400 font-semibold text-lg mb-3">Job boards are broken.</p>
            
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-6 leading-tight">
              Tired of writing resumes
              <br />
              <span className="text-blue-300">without results?</span>
            </h1>
            
            <p className="text-xl text-gray-200 mb-8 leading-relaxed">
              Let AI find you jobs automatically. Create an account, 
              <br className="hidden md:block" />
              and let verified opportunities come to you.
            </p>

            {/* Dual CTAs */}
            <div className="flex flex-col sm:flex-row gap-4">
              <Button
                size="lg"
                onClick={() => navigate('/signup?type=workforce')}
                className="bg-[#ff5f00] hover:bg-[#e55500] text-white h-14 px-8 text-lg font-semibold"
              >
                Find My Jobs
                <ChevronRight className="ml-2 w-5 h-5" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={() => document.getElementById('employers').scrollIntoView({ behavior: 'smooth' })}
                className="bg-white/10 border-white text-white hover:bg-white/20 h-14 px-8 text-lg backdrop-blur-sm"
              >
                I&apos;m Hiring
              </Button>
            </div>

            {/* Quick Stats */}
            <div className="flex gap-8 mt-10 text-white/80">
              <div>
                <div className="text-2xl font-bold text-white">10,000+</div>
                <div className="text-sm">Active Jobs</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-white">95%</div>
                <div className="text-sm">Match Rate</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-white">3 Days</div>
                <div className="text-sm">Avg. Time to Hire</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Work Passport Section - PRIMARY for grads/students */}
      <section className="py-20 bg-gradient-to-br from-slate-900 via-slate-800 to-blue-900 relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-10 left-10 w-32 h-32 border-2 border-amber-400 rounded-full" />
          <div className="absolute bottom-20 right-20 w-48 h-48 border-2 border-amber-400 rounded-full" />
          <div className="absolute top-1/2 left-1/3 w-24 h-24 border-2 border-amber-400 rounded-full" />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* Content */}
            <div className="text-white">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500/20 rounded-full text-amber-400 text-sm font-semibold mb-4 border border-amber-500/30">
                <span className="animate-pulse w-2 h-2 bg-amber-400 rounded-full" />
                Everyone&apos;s Talking About It
              </div>
              
              <h2 className="text-4xl md:text-5xl font-bold mb-6 leading-tight">
                Have You Got Your
                <br />
                <span className="text-amber-400">Work Passport?</span>
              </h2>
              
              <p className="text-xl text-gray-300 mb-8 leading-relaxed">
                Your skills. Your experience. Your credentials. All verified and portable. 
                Share it with any employer — they see real-time, trustworthy career data.
              </p>

              <div className="space-y-4 mb-8">
                {[
                  'Blockchain-verified credentials that can\'t be faked',
                  'Real-time hours worked and ratings from employers',
                  'Portable — take your reputation anywhere',
                  'Privacy controls — you decide what to share',
                  'QR code sharing — instant trust in seconds',
                ].map((item, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <CheckCircle2 className="text-amber-400 flex-shrink-0" size={20} />
                    <span className="text-gray-200">{item}</span>
                  </div>
                ))}
              </div>

              <div className="flex flex-col sm:flex-row gap-4">
                <Button
                  size="lg"
                  onClick={() => navigate('/signup?type=workforce')}
                  className="bg-amber-500 hover:bg-amber-400 text-slate-900 h-14 px-8 text-lg font-semibold"
                >
                  Get My Work Passport
                  <ChevronRight className="ml-2 w-5 h-5" />
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  onClick={() => window.open('/passport/3E68EA53', '_blank')}
                  className="bg-transparent border-white/30 text-white hover:bg-white/10 h-14 px-8 text-lg"
                >
                  <Play className="mr-2 w-5 h-5" />
                  See Example
                </Button>
              </div>
            </div>

            {/* Visual - Passport Card Preview */}
            <div className="relative">
              <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-6 border border-slate-700 shadow-2xl transform rotate-2 hover:rotate-0 transition-transform duration-500">
                {/* Gold stripe */}
                <div className="h-2 bg-gradient-to-r from-amber-400 via-amber-500 to-amber-400 rounded-full mb-4" />
                
                <div className="flex items-start gap-4 mb-6">
                  {/* Profile Photo */}
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
                    <p className="text-slate-400 text-sm">Windsor, ON • Canada</p>
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

                {/* Security Verifications */}
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
                    <span className="px-2 py-1 bg-blue-500/20 text-blue-400 rounded text-xs font-medium flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Work Permit
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
                    <p className="text-slate-400 text-xs">Occupations</p>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-slate-700">
                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                    Blockchain Verified on Polygon
                  </div>
                  <div className="w-10 h-10 bg-white rounded p-1">
                    <div className="w-full h-full bg-slate-200 rounded grid grid-cols-4 gap-px">
                      {Array(16).fill(0).map((_, i) => (
                        <div key={i} className={`${i % 2 === 0 ? 'bg-slate-800' : 'bg-white'}`} />
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Floating badges */}
              <div className="absolute -top-4 -right-4 bg-green-500 text-white px-3 py-1 rounded-full text-sm font-semibold shadow-lg flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4" /> Trusted
              </div>
              <div className="absolute -bottom-4 -left-4 bg-slate-700 text-white px-4 py-2 rounded-lg text-sm shadow-lg border border-slate-600">
                <span className="text-gray-400">Viewed by</span>
                <span className="text-white font-bold ml-1">47 employers</span>
              </div>
            </div>
          </div>

          {/* Trust Indicators */}
          <div className="mt-16 pt-12 border-t border-slate-700">
            <p className="text-center text-slate-400 mb-8">Trusted by institutions and employers across Canada</p>
            <div className="flex flex-wrap justify-center items-center gap-8 opacity-60">
              <div className="text-white font-semibold">St. Claire College</div>
              <div className="text-white font-semibold">Swan Pizza</div>
              <div className="text-white font-semibold">QuickDash Delivery</div>
              <div className="text-white font-semibold">+ 200 more</div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works - Fancy AI Matching Section */}
      <section className="py-20 bg-gradient-to-br from-gray-50 to-white relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute top-20 left-20 w-96 h-96 bg-[#ff5f00] rounded-full blur-3xl" />
          <div className="absolute bottom-20 right-20 w-96 h-96 bg-[#30496d] rounded-full blur-3xl" />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#ff5f00]/10 rounded-full text-[#ff5f00] text-sm font-semibold mb-4">
              <Zap className="w-4 h-4" />
              Stop Applying. Start Working.
            </div>
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              Jobs Find <span className="text-[#ff5f00]">You</span>
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Tired of endless applications? Our AI knows your skills and certifications. 
              We match you with real shifts that need to be filled — today.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Step 1 */}
            <div className="relative group">
              <div className="bg-white rounded-2xl p-8 shadow-xl border border-gray-100 hover:border-[#30496d]/30 transition-all hover:-translate-y-2 h-full">
                <div className="w-16 h-16 bg-gradient-to-br from-[#30496d] to-[#1a2d42] rounded-2xl flex items-center justify-center text-white text-2xl font-bold mb-6 group-hover:scale-110 transition-transform">
                  1
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-4">Build Your Profile</h3>
                <p className="text-gray-600 mb-6">
                  Tell us your skills, certifications, and when you&apos;re available. No resume needed — just real information about what you can do.
                </p>
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                    <span>Add credentials from your institution</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                    <span>Set your availability calendar</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                    <span>Choose your preferred work zones</span>
                  </div>
                </div>
              </div>
              <div className="hidden lg:block absolute top-1/2 -right-4 transform -translate-y-1/2 z-10">
                <ChevronRight className="w-8 h-8 text-gray-300" />
              </div>
            </div>

            {/* Step 2 */}
            <div className="relative group">
              <div className="bg-white rounded-2xl p-8 shadow-xl border border-gray-100 hover:border-[#ff5f00]/30 transition-all hover:-translate-y-2 h-full">
                <div className="w-16 h-16 bg-gradient-to-br from-[#ff5f00] to-[#e55500] rounded-2xl flex items-center justify-center text-white text-2xl font-bold mb-6 group-hover:scale-110 transition-transform">
                  2
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-4">AI Does the Work</h3>
                <p className="text-gray-600 mb-6">
                  Our AI scans thousands of shifts from employers. When a shift matches your skills and availability — you get notified instantly.
                </p>
                <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 bg-[#ff5f00]/10 rounded-full flex items-center justify-center">
                      <Zap className="w-5 h-5 text-[#ff5f00]" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">New Match Found!</p>
                      <p className="text-xs text-gray-500">Just now</p>
                    </div>
                  </div>
                  <p className="text-sm text-gray-600">Line Cook at Swan Pizza — Tomorrow 6AM-2PM • $18/hr</p>
                </div>
              </div>
              <div className="hidden lg:block absolute top-1/2 -right-4 transform -translate-y-1/2 z-10">
                <ChevronRight className="w-8 h-8 text-gray-300" />
              </div>
            </div>

            {/* Step 3 */}
            <div className="relative group">
              <div className="bg-white rounded-2xl p-8 shadow-xl border border-gray-100 hover:border-green-500/30 transition-all hover:-translate-y-2 h-full">
                <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-green-600 rounded-2xl flex items-center justify-center text-white text-2xl font-bold mb-6 group-hover:scale-110 transition-transform">
                  3
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-4">Accept & Work</h3>
                <p className="text-gray-600 mb-6">
                  One tap to accept. Show up, do great work, get rated. Your Work Passport grows with every shift — unlocking better opportunities.
                </p>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                    <span className="text-sm font-medium text-green-800">Shift Completed</span>
                    <span className="text-sm text-green-600">+8 hours logged</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-amber-50 rounded-lg">
                    <span className="text-sm font-medium text-amber-800">New Rating</span>
                    <span className="text-sm text-amber-600">⭐ 5.0 from employer</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="text-center mt-12">
            <p className="text-gray-500 mb-6">No more endless job boards. No more ghosted applications.</p>
            <Button
              size="lg"
              onClick={() => navigate('/signup?type=workforce')}
              className="bg-[#ff5f00] hover:bg-[#e55500] text-white h-14 px-10 text-lg font-semibold"
            >
              Let Jobs Find Me
              <ChevronRight className="ml-2 w-5 h-5" />
            </Button>
          </div>
        </div>
      </section>

      {/* Work in Your Language Section */}
      <section className="py-20 bg-gradient-to-br from-[#1a1a2e] via-[#16213e] to-[#0f3460] relative overflow-hidden">
        {/* Subtle Background */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute top-10 left-10 text-6xl text-white">مرحبا</div>
          <div className="absolute top-20 right-20 text-5xl text-white">你好</div>
          <div className="absolute bottom-20 left-1/4 text-4xl text-white">ਸਤ ਸ੍ਰੀ ਅਕਾਲ</div>
          <div className="absolute bottom-10 right-10 text-6xl text-white">नमस्ते</div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-4xl md:text-5xl font-bold text-white mb-6 leading-tight">
                Work in Canada.
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-400"> In Your Language.</span>
              </h2>
              <p className="text-lg text-gray-300 mb-6 leading-relaxed">
                You don&apos;t need perfect English or French to contribute to Canada&apos;s economy. 
                Our AI understands your workplace context and guides you through everything — 
                from understanding your rights to completing your tasks.
              </p>
              <p className="text-gray-400 mb-8">
                Emma isn&apos;t just a translator. She&apos;s a workplace guide who speaks your language, 
                understands Canadian employment standards, and helps you succeed at work.
              </p>
              
              <div className="space-y-4 mb-8">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-6 h-6 text-cyan-400 mt-0.5" />
                  <div>
                    <p className="text-white font-medium">Understand your workplace rights</p>
                    <p className="text-gray-400 text-sm">Know what you&apos;re entitled to, explained clearly</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-6 h-6 text-cyan-400 mt-0.5" />
                  <div>
                    <p className="text-white font-medium">Navigate job requirements with confidence</p>
                    <p className="text-gray-400 text-sm">Get context-aware guidance for your specific role</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-6 h-6 text-cyan-400 mt-0.5" />
                  <div>
                    <p className="text-white font-medium">Build your career without language barriers</p>
                    <p className="text-gray-400 text-sm">Your skills matter more than your accent</p>
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

            <div className="relative">
              {/* Emma Chat Preview */}
              <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-md mx-auto">
                <div className="flex items-center gap-3 mb-4 pb-4 border-b">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold">
                    E
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">Emma</p>
                    <p className="text-sm text-gray-500">Workplace Guide</p>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div className="bg-purple-50 rounded-lg p-3 max-w-[85%]">
                    <p className="text-gray-800 text-sm" dir="rtl">
                      ستاسو د کار ساعتونه د اونۍ ۴۴ ساعته دي. که تاسو زیات کار وکړئ، تاسو باید ۱.۵x معاش ترلاسه کړئ.
                    </p>
                    <p className="text-xs text-gray-500 mt-2 border-t pt-2">Your work hours are 44/week. Overtime is paid at 1.5x rate.</p>
                  </div>
                  
                  <div className="bg-gray-100 rounded-lg p-3 max-w-[85%] ml-auto">
                    <p className="text-gray-800 text-sm" dir="rtl">زما مالک ماته د رخصتۍ پیسې نه راکوي</p>
                  </div>
                  
                  <div className="bg-purple-50 rounded-lg p-3 max-w-[85%]">
                    <p className="text-gray-800 text-sm" dir="rtl">
                      په اونټاریو کې، تاسو حق لرئ چې د ۴٪ رخصتي معاش ترلاسه کړئ. دا ستاسو قانوني حق دی.
                    </p>
                    <p className="text-xs text-gray-500 mt-2 border-t pt-2">In Ontario, you&apos;re entitled to 4% vacation pay. This is your legal right.</p>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t">
                  <p className="text-xs text-gray-400 text-center">
                    Context-aware guidance based on your province &amp; job type
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom message */}
          <div className="mt-16 text-center">
            <p className="text-lg text-gray-300 max-w-3xl mx-auto">
              In an economy being reshaped by AI, we believe human talent remains our greatest resource. 
              <span className="text-cyan-400"> Every worker deserves the chance to contribute.</span>
            </p>
          </div>
        </div>
      </section>

      {/* Employer Spotlight Section */}
      <section id="employers" className="py-24 bg-gradient-to-br from-slate-900 via-[#1a2d42] to-slate-900 relative overflow-hidden">
        {/* Animated background elements */}
        <div className="absolute inset-0">
          <div className="absolute top-20 left-10 w-72 h-72 bg-[#ff5f00]/10 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          {/* Header */}
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#ff5f00]/20 rounded-full text-[#ff5f00] text-sm font-semibold mb-6">
              <Building2 className="w-4 h-4" />
              For Business Owners
            </div>
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6 leading-tight">
              You Built a Business.
              <br />
              <span className="text-[#ff5f00]">Now Build Your Freedom.</span>
            </h2>
            <p className="text-xl text-gray-400 max-w-3xl mx-auto">
              Stop trading your time for money. Our AI-powered platform handles workforce management 
              so you can run operations from anywhere — at a fraction of the cost.
            </p>
          </div>

          {/* Pain Points Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-20">
            {[
              { 
                icon: Clock, 
                pain: 'Chained to your locations?',
                solution: 'Manage from anywhere',
                desc: 'Real-time oversight of all locations from your phone. No more surprise visits.',
                color: 'from-red-500 to-orange-500'
              },
              { 
                icon: Users, 
                pain: 'No-shows killing your shifts?',
                solution: 'AI auto-fills gaps',
                desc: 'Our AI detects no-shows instantly and dispatches verified replacements.',
                color: 'from-orange-500 to-yellow-500'
              },
              { 
                icon: DollarSign, 
                pain: 'Agencies eating your margins?',
                solution: '$1/hr flat rate',
                desc: '80% cheaper than staffing agencies. Same quality, verified workers.',
                color: 'from-green-500 to-emerald-500'
              },
              { 
                icon: Shield, 
                pain: 'Time theft & buddy punching?',
                solution: 'QR + GPS + Blockchain',
                desc: 'Tamper-proof attendance. Every clock-in verified and recorded.',
                color: 'from-blue-500 to-purple-500'
              },
            ].map((item, index) => (
              <div key={index} className="group">
                <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10 hover:border-[#ff5f00]/50 transition-all hover:-translate-y-2 h-full">
                  <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${item.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                    <item.icon className="w-7 h-7 text-white" />
                  </div>
                  <p className="text-gray-400 text-sm mb-1 line-through">{item.pain}</p>
                  <h3 className="text-xl font-bold text-white mb-2">{item.solution}</h3>
                  <p className="text-gray-400 text-sm">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Live Dashboard Preview */}
          <div className="grid lg:grid-cols-2 gap-12 items-center mb-20">
            <div>
              <h3 className="text-3xl font-bold text-white mb-6">
                See Everything. From Anywhere.
              </h3>
              <p className="text-gray-400 mb-8 text-lg">
                Your entire workforce operation in one dashboard. Live attendance, task progress, 
                shift coverage — all updating in real-time. Finally, peace of mind.
              </p>
              
              <div className="space-y-4">
                {[
                  { label: 'Multi-location overview', desc: 'See all your sites on one screen' },
                  { label: 'Live worker status', desc: 'Who\'s clocked in, on break, or running late' },
                  { label: 'Instant alerts', desc: 'Get notified before problems become crises' },
                  { label: 'Historical analytics', desc: 'Track trends, optimize scheduling' },
                ].map((feature, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-green-400 mt-1" />
                    <div>
                      <p className="text-white font-medium">{feature.label}</p>
                      <p className="text-gray-500 text-sm">{feature.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Dashboard Mockup */}
            <div className="relative">
              <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-6 border border-slate-700 shadow-2xl">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <p className="text-white font-bold text-lg">Operations Dashboard</p>
                    <p className="text-gray-400 text-sm">Live • Updated just now</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                    <span className="text-green-400 text-sm">All systems normal</span>
                  </div>
                </div>

                {/* Stats Row */}
                <div className="grid grid-cols-4 gap-3 mb-6">
                  {[
                    { label: 'Active Workers', value: '47', color: 'text-green-400' },
                    { label: 'Locations', value: '5', color: 'text-blue-400' },
                    { label: 'Shifts Today', value: '23', color: 'text-purple-400' },
                    { label: 'Coverage', value: '98%', color: 'text-amber-400' },
                  ].map((stat, i) => (
                    <div key={i} className="bg-slate-700/50 rounded-lg p-3 text-center">
                      <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
                      <p className="text-gray-400 text-xs">{stat.label}</p>
                    </div>
                  ))}
                </div>

                {/* Location Cards */}
                <div className="space-y-3">
                  {[
                    { name: 'Downtown Restaurant', workers: '12/12', status: 'Fully Staffed', statusColor: 'bg-green-500/20 text-green-400' },
                    { name: 'Airport Kitchen', workers: '8/8', status: 'Fully Staffed', statusColor: 'bg-green-500/20 text-green-400' },
                    { name: 'Mall Food Court', workers: '6/7', status: '1 No-Show • AI Dispatched', statusColor: 'bg-amber-500/20 text-amber-400' },
                    { name: 'University Campus', workers: '10/10', status: 'Fully Staffed', statusColor: 'bg-green-500/20 text-green-400' },
                  ].map((loc, i) => (
                    <div key={i} className="bg-slate-700/30 rounded-lg p-4 flex items-center justify-between hover:bg-slate-700/50 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-slate-600 flex items-center justify-center">
                          <MapPin className="w-5 h-5 text-gray-400" />
                        </div>
                        <div>
                          <p className="text-white font-medium text-sm">{loc.name}</p>
                          <p className="text-gray-500 text-xs">{loc.workers} workers</p>
                        </div>
                      </div>
                      <span className={`text-xs px-3 py-1 rounded-full ${loc.statusColor}`}>
                        {loc.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Floating notification */}
              <div className="absolute -top-4 -right-4 bg-green-500 text-white px-4 py-2 rounded-lg text-sm font-semibold shadow-lg animate-bounce">
                <Zap className="w-4 h-4 inline mr-1" />
                AI filled the gap!
              </div>
            </div>
          </div>

          {/* AI Auto-Dispatch Feature */}
          <div className="bg-gradient-to-r from-[#ff5f00]/20 to-purple-500/20 rounded-3xl p-8 md:p-12 border border-[#ff5f00]/30 mb-20">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#ff5f00]/20 rounded-full text-[#ff5f00] text-sm font-medium mb-4">
                  <Zap className="w-4 h-4" />
                  AI-Powered
                </div>
                <h3 className="text-3xl font-bold text-white mb-4">
                  No-Show? No Problem.
                </h3>
                <p className="text-gray-300 mb-6 text-lg">
                  When a worker doesn&apos;t show up, our AI instantly finds and dispatches a verified 
                  replacement from our network. Your operations never stop.
                </p>
                
                <div className="space-y-4">
                  <div className="flex items-center gap-4 p-4 bg-white/5 rounded-xl">
                    <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center">
                      <Clock className="w-6 h-6 text-red-400" />
                    </div>
                    <div>
                      <p className="text-white font-medium">6:02 AM — No-show detected</p>
                      <p className="text-gray-400 text-sm">Morning prep shift at Downtown location</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 p-4 bg-white/5 rounded-xl">
                    <div className="w-12 h-12 rounded-full bg-amber-500/20 flex items-center justify-center">
                      <Zap className="w-6 h-6 text-amber-400" />
                    </div>
                    <div>
                      <p className="text-white font-medium">6:02 AM — AI scanning network</p>
                      <p className="text-gray-400 text-sm">Finding available, qualified workers nearby</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 p-4 bg-white/5 rounded-xl">
                    <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center">
                      <CheckCircle2 className="w-6 h-6 text-green-400" />
                    </div>
                    <div>
                      <p className="text-white font-medium">6:04 AM — Replacement dispatched</p>
                      <p className="text-gray-400 text-sm">Maria S. (4.9★) accepted • ETA 15 min</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Visual */}
              <div className="relative">
                <div className="bg-slate-800/80 backdrop-blur rounded-2xl p-6 border border-slate-700">
                  <div className="text-center mb-6">
                    <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-[#ff5f00] to-purple-500 flex items-center justify-center">
                      <Zap className="w-10 h-10 text-white" />
                    </div>
                    <p className="text-white font-bold text-lg">Auto-Dispatch Active</p>
                    <p className="text-gray-400 text-sm">AI monitoring all shifts</p>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <p className="text-3xl font-bold text-green-400">2min</p>
                      <p className="text-gray-400 text-xs">Avg. Response</p>
                    </div>
                    <div>
                      <p className="text-3xl font-bold text-blue-400">98%</p>
                      <p className="text-gray-400 text-xs">Fill Rate</p>
                    </div>
                    <div>
                      <p className="text-3xl font-bold text-purple-400">24/7</p>
                      <p className="text-gray-400 text-xs">Coverage</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Cost Comparison */}
          <div className="grid lg:grid-cols-2 gap-12 items-center mb-20">
            {/* Comparison Visual */}
            <div className="order-2 lg:order-1">
              <div className="bg-slate-800/50 rounded-2xl p-8 border border-slate-700">
                <h4 className="text-white font-bold text-lg mb-6 text-center">Cost per Hour Comparison</h4>
                
                <div className="space-y-6">
                  {/* Agency */}
                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-gray-400">Staffing Agency</span>
                      <span className="text-red-400 font-bold">$5-8/hr markup</span>
                    </div>
                    <div className="h-4 bg-slate-700 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-red-500 to-red-600 rounded-full" style={{ width: '100%' }}></div>
                    </div>
                  </div>
                  
                  {/* HR Bank */}
                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-gray-400">HR Bank</span>
                      <span className="text-green-400 font-bold">$1/hr flat</span>
                    </div>
                    <div className="h-4 bg-slate-700 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-green-500 to-emerald-500 rounded-full" style={{ width: '15%' }}></div>
                    </div>
                  </div>
                </div>

                <div className="mt-8 p-4 bg-green-500/10 rounded-xl border border-green-500/30">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-green-400 font-bold text-lg">Save up to 80%</p>
                      <p className="text-gray-400 text-sm">On workforce management costs</p>
                    </div>
                    <DollarSign className="w-12 h-12 text-green-400" />
                  </div>
                </div>
              </div>
            </div>

            <div className="order-1 lg:order-2">
              <h3 className="text-3xl font-bold text-white mb-6">
                Stop Paying Agency Prices for Basic Staffing
              </h3>
              <p className="text-gray-400 mb-6 text-lg">
                Staffing agencies charge $5-8/hr markup for the same workers you could access directly. 
                HR Bank gives you verified, rated workers at $1/hr flat — with better oversight.
              </p>
              
              <div className="space-y-4 mb-8">
                {[
                  'Same quality workers, direct access',
                  'Blockchain-verified credentials & ratings',
                  'No long-term contracts or minimums',
                  'Pay only for hours worked',
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-green-400" />
                    <span className="text-gray-300">{item}</span>
                  </div>
                ))}
              </div>

              <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
                <p className="text-gray-400 text-sm mb-2">Example: 10 workers × 40 hrs/week × 4 weeks</p>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-500 text-sm">Agency cost</p>
                    <p className="text-red-400 font-bold text-xl line-through">$8,000 - $12,800</p>
                  </div>
                  <div className="text-right">
                    <p className="text-gray-500 text-sm">HR Bank cost</p>
                    <p className="text-green-400 font-bold text-xl">$1,600</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Blockchain Trust */}
          <div className="grid lg:grid-cols-2 gap-12 items-center mb-16">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-purple-500/20 rounded-full text-purple-400 text-sm font-medium mb-4">
                <Shield className="w-4 h-4" />
                Blockchain Verified
              </div>
              <h3 className="text-3xl font-bold text-white mb-4">
                Trust You Can Verify
              </h3>
              <p className="text-gray-400 mb-6 text-lg">
                Every credential, every rating, every hour worked — recorded on the blockchain. 
                No fake reviews. No inflated resumes. Just verifiable truth.
              </p>
              
              <div className="grid grid-cols-2 gap-4">
                {[
                  { icon: Shield, label: 'Verified Credentials', desc: 'Can\'t be faked' },
                  { icon: Star, label: 'Real Ratings', desc: 'From actual employers' },
                  { icon: Clock, label: 'Hours Logged', desc: 'Tamper-proof records' },
                  { icon: Award, label: 'Certifications', desc: 'Institution-verified' },
                ].map((item, i) => (
                  <div key={i} className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
                    <item.icon className="w-6 h-6 text-purple-400 mb-2" />
                    <p className="text-white font-medium text-sm">{item.label}</p>
                    <p className="text-gray-500 text-xs">{item.desc}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Blockchain Visual */}
            <div className="relative">
              <div className="bg-gradient-to-br from-purple-900/50 to-slate-900 rounded-2xl p-6 border border-purple-500/30">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-12 h-12 rounded-full bg-purple-500/20 flex items-center justify-center">
                    <Shield className="w-6 h-6 text-purple-400" />
                  </div>
                  <div>
                    <p className="text-white font-bold">Worker Verification</p>
                    <p className="text-gray-400 text-sm">Polygon Blockchain</p>
                  </div>
                </div>

                <div className="space-y-3">
                  {[
                    { label: 'Food Handler Certificate', issuer: 'Ontario Health', verified: true },
                    { label: 'Smart Serve', issuer: 'AGCO Ontario', verified: true },
                    { label: 'WHMIS Training', issuer: 'Safety First Inc.', verified: true },
                    { label: '2,400 Hours Worked', issuer: '12 Employers', verified: true },
                  ].map((cred, i) => (
                    <div key={i} className="bg-white/5 rounded-lg p-3 flex items-center justify-between">
                      <div>
                        <p className="text-white text-sm font-medium">{cred.label}</p>
                        <p className="text-gray-500 text-xs">{cred.issuer}</p>
                      </div>
                      <div className="flex items-center gap-1 text-green-400">
                        <CheckCircle2 className="w-4 h-4" />
                        <span className="text-xs">Verified</span>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-4 pt-4 border-t border-purple-500/30 flex items-center justify-between">
                  <span className="text-gray-400 text-xs flex items-center gap-1">
                    <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                    Live on Polygon Mainnet
                  </span>
                  <span className="text-purple-400 text-xs">Block #48,291,037</span>
                </div>
              </div>
            </div>
          </div>

          {/* CTA */}
          <div className="text-center">
            <h3 className="text-3xl font-bold text-white mb-4">
              Ready to Run Your Business, Not Be Run By It?
            </h3>
            <p className="text-gray-400 mb-8 max-w-2xl mx-auto">
              Join hundreds of business owners who&apos;ve reclaimed their time. 
              Start managing smarter today.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                size="lg"
                onClick={() => navigate('/signup?type=employer')}
                className="bg-[#ff5f00] hover:bg-[#e55500] text-white h-14 px-10 text-lg font-semibold"
              >
                Free My Time
                <ChevronRight className="ml-2 w-5 h-5" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={() => navigate('/employer/demo')}
                className="bg-transparent border-white/30 text-white hover:bg-white/10 h-14 px-10 text-lg"
              >
                <Play className="mr-2 w-5 h-5" />
                Watch Demo
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Value Props Tabs */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-3">Built for Everyone</h2>
            <p className="text-gray-600">One platform connecting the entire workforce ecosystem</p>
          </div>

          {/* Tab Navigation */}
          <div className="flex justify-center mb-10">
            <div className="inline-flex bg-white rounded-xl shadow-sm p-1">
              {[
                { id: 'jobseekers', label: 'Job Seekers', icon: Briefcase, color: '#30496d' },
                { id: 'employers', label: 'Employers', icon: Building2, color: '#ff5f00' },
                { id: 'institutions', label: 'Institutions', icon: GraduationCap, color: '#1a1a1a' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-all ${
                    activeTab === tab.id 
                      ? 'text-white shadow-md' 
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                  style={{ backgroundColor: activeTab === tab.id ? tab.color : 'transparent' }}
                >
                  <tab.icon size={18} />
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Tab Content */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {valueProps[activeTab].map((prop, index) => (
              <Card key={index} className="border-0 shadow-md hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${
                    activeTab === 'jobseekers' ? 'bg-blue-100' :
                    activeTab === 'employers' ? 'bg-orange-100' : 'bg-gray-100'
                  }`}>
                    <prop.icon className={`${
                      activeTab === 'jobseekers' ? 'text-[#30496d]' :
                      activeTab === 'employers' ? 'text-[#ff5f00]' : 'text-gray-800'
                    }`} size={24} />
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-2">{prop.title}</h3>
                  <p className="text-sm text-gray-600">{prop.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* CTA based on active tab */}
          <div className="text-center mt-10">
            <Button
              onClick={() => navigate(`/signup?type=${activeTab === 'jobseekers' ? 'workforce' : activeTab === 'employers' ? 'employer' : 'institution'}`)}
              className={`h-12 px-8 text-white ${
                activeTab === 'jobseekers' ? 'bg-[#30496d] hover:bg-[#234058]' :
                activeTab === 'employers' ? 'bg-[#ff5f00] hover:bg-[#e55500]' :
                'bg-gray-900 hover:bg-gray-800'
              }`}
            >
              {activeTab === 'jobseekers' ? 'Find Jobs' : 
               activeTab === 'employers' ? 'Start Hiring' : 'Partner With Us'}
              <ChevronRight className="ml-2 w-4 h-4" />
            </Button>
          </div>
        </div>
      </section>

      {/* Trust Section */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center mb-16">
            {[
              { value: '10,000+', label: 'Verified Workers' },
              { value: '500+', label: 'Active Employers' },
              { value: '50+', label: 'Partner Institutions' },
              { value: '95%', label: 'Compliance Rate' },
            ].map((stat, index) => (
              <div key={index}>
                <div className="text-3xl md:text-4xl font-bold text-[#30496d] mb-1">{stat.value}</div>
                <div className="text-gray-600 text-sm">{stat.label}</div>
              </div>
            ))}
          </div>

          {/* Partner Logos */}
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

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            <div>
              <img src={LOGOS.master} alt="HR Bank" className="h-8 w-auto mb-4" />
              <p className="text-sm">The workforce marketplace where experience travels with you.</p>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">For Job Seekers</h4>
              <ul className="space-y-2 text-sm">
                <li><Link to="/jobs" className="hover:text-white transition-colors">Browse Jobs</Link></li>
                <li><Link to="/signup?type=workforce" className="hover:text-white transition-colors">Create Profile</Link></li>
                <li><Link to="/leaderboard" className="hover:text-white transition-colors">Leaderboard</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">For Employers</h4>
              <ul className="space-y-2 text-sm">
                <li><Link to="/signup?type=employer" className="hover:text-white transition-colors">Post Jobs</Link></li>
                <li><button onClick={() => document.getElementById('employers').scrollIntoView({ behavior: 'smooth' })} className="hover:text-white transition-colors">Why HR Bank</button></li>
                <li><Link to="/signup?type=institution" className="hover:text-white transition-colors">For Institutions</Link></li>
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
