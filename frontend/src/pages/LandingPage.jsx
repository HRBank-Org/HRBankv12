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
                I'm Hiring
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

      {/* Job Board Preview */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-2">Latest Opportunities</h2>
              <p className="text-gray-600">Jobs matched to your skills, updated in real-time</p>
            </div>
            <Link to="/jobs">
              <Button variant="outline" className="mt-4 md:mt-0">
                View All Jobs <ChevronRight className="ml-1 w-4 h-4" />
              </Button>
            </Link>
          </div>

          {/* Job Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {loadingJobs ? (
              Array(4).fill(0).map((_, i) => (
                <div key={i} className="bg-white rounded-xl p-5 shadow-sm animate-pulse">
                  <div className="h-5 bg-gray-200 rounded w-3/4 mb-3"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
                  <div className="h-4 bg-gray-200 rounded w-full"></div>
                </div>
              ))
            ) : (
              featuredJobs.map((job) => (
                <Card key={job.posting_id} className="hover:shadow-lg transition-shadow cursor-pointer group">
                  <CardContent className="p-5">
                    <h3 className="font-semibold text-gray-900 group-hover:text-[#ff5f00] transition-colors mb-1">
                      {job.title}
                    </h3>
                    <p className="text-sm text-gray-600 mb-3">{job.company_name}</p>
                    <div className="flex items-center gap-3 text-sm text-gray-500 mb-3">
                      <span className="flex items-center gap-1">
                        <MapPin size={14} />
                        {job.workplace_city || 'Remote'}
                      </span>
                      <span className="flex items-center gap-1">
                        <DollarSign size={14} />
                        ${job.hourly_rate}/hr
                      </span>
                    </div>
                    <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
                      job.work_type === 'on_site' ? 'bg-blue-100 text-blue-700' :
                      job.work_type === 'route_based' ? 'bg-green-100 text-green-700' :
                      'bg-purple-100 text-purple-700'
                    }`}>
                      {job.work_type === 'on_site' ? 'On-Site' : 
                       job.work_type === 'route_based' ? 'Route-Based' : 'Flexible'}
                    </span>
                  </CardContent>
                </Card>
              ))
            )}
          </div>

          {/* Search Bar */}
          <div className="mt-8 bg-white rounded-xl shadow-sm p-4 flex flex-col md:flex-row gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Job title, skill, or keyword"
                className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#ff5f00] focus:border-transparent"
              />
            </div>
            <div className="flex-1 relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="City or postal code"
                className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#ff5f00] focus:border-transparent"
              />
            </div>
            <Button 
              onClick={() => navigate('/jobs')}
              className="bg-[#ff5f00] hover:bg-[#e55500] text-white h-12 px-8"
            >
              Search Jobs
            </Button>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-3">How It Works</h2>
            <p className="text-gray-600">Get matched to jobs in 3 simple steps</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { step: '1', title: 'Create Your Profile', desc: 'Add your skills, certifications, and preferences. No resume needed.', icon: Users },
              { step: '2', title: 'Get Matched by AI', desc: 'Our AI finds jobs that fit your profile. Opportunities come to you.', icon: Zap },
              { step: '3', title: 'Build Your Career', desc: 'Earn ratings, collect credentials, unlock better opportunities.', icon: Award },
            ].map((item, index) => (
              <div key={index} className="text-center relative">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[#ff5f00] text-white text-2xl font-bold mb-4">
                  {item.step}
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">{item.title}</h3>
                <p className="text-gray-600">{item.desc}</p>
                {index < 2 && (
                  <ChevronRight className="hidden md:block absolute top-8 -right-4 text-gray-300" size={32} />
                )}
              </div>
            ))}
          </div>

          <div className="text-center mt-10">
            <Button
              onClick={() => navigate('/signup?type=workforce')}
              className="bg-[#30496d] hover:bg-[#234058] text-white h-12 px-8"
            >
              Create Free Account
            </Button>
          </div>
        </div>
      </section>

      {/* Work Passport Section */}
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
                Everyone's Talking About It
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
                        <div key={i} className={`${Math.random() > 0.5 ? 'bg-slate-800' : 'bg-white'}`} />
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

      {/* Employer Spotlight Section */}
      <section id="employers" className="py-20 bg-gradient-to-br from-[#30496d] to-[#1a2d42]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="text-white">
              <p className="text-orange-400 font-semibold text-lg mb-3">For Business Owners</p>
              <h2 className="text-4xl font-bold mb-6 leading-tight">
                You make good money.
                <br />
                <span className="text-blue-300">But are you an owner or operator?</span>
              </h2>
              <p className="text-xl text-gray-300 mb-8 leading-relaxed">
                Stop being tied to your business. See live attendance, manage schedules, 
                and approve timesheets from anywhere in the world. Finally enjoy the money you make.
              </p>
              
              <div className="space-y-4 mb-8">
                {[
                  'Live attendance tracking across all locations',
                  'QR + GPS geofencing - no buddy punching',
                  'Automated timesheets and payroll prep',
                  'Verified workers with blockchain credentials',
                  '$1/hr flat rate - 80% cheaper than agencies',
                ].map((item, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <CheckCircle2 className="text-green-400 flex-shrink-0" size={20} />
                    <span className="text-gray-200">{item}</span>
                  </div>
                ))}
              </div>

              <Button
                size="lg"
                onClick={() => navigate('/signup?type=employer')}
                className="bg-[#ff5f00] hover:bg-[#e55500] text-white h-14 px-8 text-lg font-semibold"
              >
                Free My Time
                <ChevronRight className="ml-2 w-5 h-5" />
              </Button>
            </div>

            {/* Visual */}
            <div className="relative">
              <div className="bg-white/10 backdrop-blur rounded-2xl p-6 border border-white/20">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center">
                    <Smartphone className="text-white" size={20} />
                  </div>
                  <div>
                    <p className="text-white font-semibold">Live Dashboard</p>
                    <p className="text-gray-400 text-sm">3 locations • 24 workers active</p>
                  </div>
                </div>
                <div className="space-y-3">
                  {[
                    { name: 'Main Street Location', workers: 8, status: 'All present' },
                    { name: 'Downtown Branch', workers: 10, status: '1 late arrival' },
                    { name: 'Airport Location', workers: 6, status: 'All present' },
                  ].map((loc, i) => (
                    <div key={i} className="bg-white/5 rounded-lg p-3 flex items-center justify-between">
                      <div>
                        <p className="text-white text-sm font-medium">{loc.name}</p>
                        <p className="text-gray-400 text-xs">{loc.workers} workers</p>
                      </div>
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        loc.status === 'All present' ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'
                      }`}>
                        {loc.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
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
                <li><a href="#" className="hover:text-white transition-colors">How It Works</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">For Employers</h4>
              <ul className="space-y-2 text-sm">
                <li><Link to="/signup?type=employer" className="hover:text-white transition-colors">Post Jobs</Link></li>
                <li><a href="#" className="hover:text-white transition-colors">Pricing</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Workforce Management</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="hover:text-white transition-colors">About Us</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Contact</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Privacy Policy</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 pt-8 text-center text-sm">
            <p>&copy; 2024 HR Bank. All rights reserved.</p>
          </div>
        </div>
      </footer>

      {/* Emma Chat */}
      <EmmaLandingChat />
    </div>
  );
};

export default LandingPage;
