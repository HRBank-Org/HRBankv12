import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '../../components/ui/button';
import { 
  Building2, Shield, Clock, Users, CheckCircle2, ChevronRight, 
  DollarSign, MapPin, Smartphone, BarChart3, Zap, Calendar,
  ClipboardList, UserCheck, AlertTriangle, Star, Play, Award
} from 'lucide-react';
import { LOGOS } from '../../utils/logoUtils';
import LoginModal from '../../components/auth/LoginModal';

const EmployersLanding = () => {
  const navigate = useNavigate();
  const [showLoginModal, setShowLoginModal] = useState(false);

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
              <Link to="/institutions" className="text-gray-600 hover:text-[#30496d] font-medium">
                Institutions
              </Link>
              <Link to="/leaderboard" className="text-gray-600 hover:text-[#30496d] font-medium">
                Leaderboard
              </Link>
              <Link to="/employers" className="text-[#ff5f00] font-semibold">
                Employers <span className="text-orange-500 text-xs">(Beta)</span>
              </Link>
              <Link to="/jobs" className="text-gray-600 hover:text-[#30496d] font-medium">
                Work Opportunities
              </Link>
            </div>
            <Button variant="ghost" onClick={() => setShowLoginModal(true)} className="text-gray-700" data-testid="employer-landing-signin">
              Sign In
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero Section with Video Background */}
      <section className="relative min-h-[90vh] flex items-center overflow-hidden pt-16">
        {/* Video Background - Employer focused operations */}
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-gradient-to-r from-slate-900/95 via-slate-900/60 to-transparent z-10" />
          <iframe
            className="absolute w-full h-full object-cover"
            style={{ 
              transform: 'scale(1.5)',
              pointerEvents: 'none',
              minHeight: '100%',
              minWidth: '100%'
            }}
            src="https://www.youtube.com/embed/H8vQs5nbJzo?autoplay=1&mute=1&loop=1&playlist=H8vQs5nbJzo&controls=0&showinfo=0&rel=0&modestbranding=1&playsinline=1"
            title="HR Bank Employers Background"
            frameBorder="0"
            allow="autoplay; encrypted-media"
            allowFullScreen
          />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 py-20">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#ff5f00] rounded-full text-white text-sm font-semibold mb-6">
              <Zap className="w-4 h-4" />
              Trust Infrastructure for Employers
            </div>
            
            <h1 className="text-5xl md:text-6xl font-bold text-white mb-6 leading-tight">
              Access Ready-to-Work
              <br />
              <span className="text-[#ff5f00]">People. With Proof.</span>
            </h1>
            
            <p className="text-xl text-gray-200 mb-8 leading-relaxed">
              Stop hiring from unverifiable resumes. HR Bank gives you access to workers with 
              <strong className="text-white"> blockchain-verified credentials</strong> and 
              <strong className="text-white"> employer-confirmed work history</strong> — 
              plus the operations infrastructure to manage them.
            </p>

            <div className="flex flex-col sm:flex-row gap-4">
              <Button
                size="lg"
                onClick={() => navigate('/signup?type=employer')}
                className="bg-[#ff5f00] hover:bg-[#e55500] text-white h-14 px-8 text-lg font-semibold"
                data-testid="employer-signup-btn"
              >
                Join Beta (Free)
                <ChevronRight className="ml-2 w-5 h-5" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={() => document.getElementById('how-it-works').scrollIntoView({ behavior: 'smooth' })}
                className="bg-white/10 border-white/30 text-white hover:bg-white/20 h-14 px-8 text-lg"
              >
                <Play className="mr-2 w-5 h-5" />
                See How It Works
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Trust Advantage Section */}
      <section className="py-16 bg-gradient-to-br from-slate-900 to-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-white mb-4">
              Why Trust Infrastructure Matters
            </h2>
            <p className="text-xl text-gray-400 max-w-3xl mx-auto">
              Traditional hiring runs on claims. HR Bank runs on proof.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-6">
              <div className="flex items-center gap-2 text-red-400 font-semibold mb-4">
                <AlertTriangle className="w-6 h-6" />
                The Old Way
              </div>
              <ul className="space-y-3">
                {[
                  'Resumes anyone can fabricate',
                  'References that may not answer',
                  'Credentials you can\'t verify quickly',
                  'No proof of actual work performance',
                  'Bias toward connections over competence'
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <span className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0">✕</span>
                    <span className="text-gray-300">{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="bg-green-500/10 border border-green-500/20 rounded-2xl p-6">
              <div className="flex items-center gap-2 text-green-400 font-semibold mb-4">
                <Shield className="w-6 h-6" />
                HR Bank Way
              </div>
              <ul className="space-y-3">
                {[
                  'Blockchain-verified credentials from real institutions',
                  'Work history confirmed by previous employers',
                  'Instant verification — no phone calls needed',
                  'Real ratings and attendance records',
                  'Proof replaces claims — hire on merit'
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-300">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Operations + Trust. One Platform.
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Not just workforce management — a trust infrastructure where your operational needs 
              generate real work opportunities matched to verified workers.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 mb-12">
            <div className="bg-white rounded-2xl p-8 border border-gray-200">
              <div className="flex items-center gap-2 text-green-600 font-semibold mb-6">
                <CheckCircle2 className="w-6 h-6" />
                What You Get
              </div>
              <ul className="space-y-4">
                {[
                  'Access to workers with verified credentials',
                  'GPS-verified attendance tracking',
                  'Multi-location management from one dashboard',
                  'Timesheet approval and payroll prep',
                  'Shift scheduling that generates real opportunities',
                  'Task assignment and accountability'
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-700">{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="bg-white rounded-2xl p-8 border border-gray-200">
              <div className="flex items-center gap-2 text-[#ff5f00] font-semibold mb-6">
                <Award className="w-6 h-6" />
                How Jobs Flow From Operations
              </div>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-[#ff5f00] rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0">1</div>
                  <div>
                    <p className="font-medium text-gray-900">You set up real operations</p>
                    <p className="text-gray-500 text-sm">Workplaces, shifts, schedules, requirements</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-[#ff5f00] rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0">2</div>
                  <div>
                    <p className="font-medium text-gray-900">System detects staffing needs</p>
                    <p className="text-gray-500 text-sm">Shift needs coverage? Role needs filling?</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-[#ff5f00] rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0">3</div>
                  <div>
                    <p className="font-medium text-gray-900">Matched to verified workers</p>
                    <p className="text-gray-500 text-sm">By credentials, occupation, availability</p>
                  </div>
                </div>
              </div>
              <div className="mt-6 p-4 bg-green-50 rounded-lg border border-green-200">
                <p className="text-green-800 text-sm">
                  <strong>Result:</strong> Real operational needs → Real verified matches. 
                  No ghost jobs. No unqualified applicants.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Sample Dashboard Section */}
      <section id="sample-dashboard" className="py-20 bg-gradient-to-br from-slate-900 to-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              See Everything. From Anywhere.
            </h2>
            <p className="text-xl text-gray-400 max-w-2xl mx-auto">
              Your entire workforce operation in one dashboard — live attendance, task progress, shift coverage.
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Features List */}
            <div className="space-y-6">
              {[
                { icon: Smartphone, title: 'Mobile-First', desc: 'Manage from your phone. See who clocked in, approve timesheets, assign tasks — anywhere.', color: 'from-blue-500 to-cyan-500' },
                { icon: Shield, title: 'GPS + QR Verification', desc: 'Workers clock in with QR at location. GPS confirms they\'re there. No buddy punching.', color: 'from-green-500 to-emerald-500' },
                { icon: Calendar, title: 'Shift Scheduling', desc: 'Create and manage shifts across all locations. Workers see their schedule in the app.', color: 'from-purple-500 to-pink-500' },
                { icon: ClipboardList, title: 'Task Management', desc: 'Assign tasks to shifts. Track completion. Know what got done without being there.', color: 'from-orange-500 to-amber-500' },
                { icon: BarChart3, title: 'Timesheet Reports', desc: 'Automated timesheet generation. Review, approve, export for payroll.', color: 'from-red-500 to-rose-500' },
                { icon: Users, title: 'Multi-Location', desc: 'One dashboard for all locations. Big picture view with drill-down capability.', color: 'from-indigo-500 to-violet-500' }
              ].map((feature, i) => (
                <div key={i} className="flex items-start gap-4">
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center flex-shrink-0`}>
                    <feature.icon className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-white font-semibold mb-1">{feature.title}</h3>
                    <p className="text-gray-400 text-sm">{feature.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Full Dashboard Mockup */}
            <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700">
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

              <div className="space-y-3">
                {[
                  { name: 'Downtown Restaurant', workers: '12/12', status: 'Fully Staffed', statusColor: 'bg-green-500/20 text-green-400' },
                  { name: 'Airport Kitchen', workers: '8/8', status: 'Fully Staffed', statusColor: 'bg-green-500/20 text-green-400' },
                  { name: 'Mall Food Court', workers: '6/7', status: '1 No-Show • AI Dispatched', statusColor: 'bg-amber-500/20 text-amber-400' },
                  { name: 'University Campus', workers: '10/10', status: 'Fully Staffed', statusColor: 'bg-green-500/20 text-green-400' },
                ].map((loc, i) => (
                  <div key={i} className="bg-slate-700/30 rounded-lg p-4 flex items-center justify-between">
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
          </div>
        </div>
      </section>

      {/* Live Attendance Preview */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
                Real-Time Attendance.
                <br />
                <span className="text-[#ff5f00]">Real Peace of Mind.</span>
              </h2>
              <p className="text-lg text-gray-600 mb-8">
                See exactly who&apos;s working at each location, right now. Get notified when someone&apos;s late. 
                Never wonder if your shifts are covered again.
              </p>

              <div className="space-y-4">
                {[
                  { icon: Clock, text: 'Live clock-in/out tracking' },
                  { icon: MapPin, text: 'GPS location verification' },
                  { icon: UserCheck, text: 'Photo verification option' },
                  { icon: AlertTriangle, text: 'Instant late/no-show alerts' }
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-[#ff5f00]/10 rounded-lg flex items-center justify-center">
                      <item.icon className="w-5 h-5 text-[#ff5f00]" />
                    </div>
                    <span className="text-gray-700">{item.text}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Attendance Card Preview */}
            <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-white font-bold">Downtown Location</h3>
                <span className="text-green-400 text-sm flex items-center gap-1">
                  <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                  Live
                </span>
              </div>

              <div className="space-y-3">
                {[
                  { name: 'Sarah M.', role: 'Shift Lead', time: '6:02 AM', status: 'On Time' },
                  { name: 'Mike T.', role: 'Line Cook', time: '6:05 AM', status: 'On Time' },
                  { name: 'Jessica L.', role: 'Server', time: '6:00 AM', status: 'On Time' },
                  { name: 'David K.', role: 'Prep Cook', time: '6:12 AM', status: 'Late' }
                ].map((worker, i) => (
                  <div key={i} className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-slate-600 rounded-full flex items-center justify-center text-white font-medium">
                        {worker.name.split(' ').map(n => n[0]).join('')}
                      </div>
                      <div>
                        <p className="text-white font-medium text-sm">{worker.name}</p>
                        <p className="text-gray-400 text-xs">{worker.role}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-gray-300 text-sm">{worker.time}</p>
                      <p className={`text-xs ${worker.status === 'On Time' ? 'text-green-400' : 'text-amber-400'}`}>
                        {worker.status}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-4 pt-4 border-t border-slate-700 flex items-center justify-between">
                <span className="text-gray-400 text-sm">Shift: 6 AM - 2 PM</span>
                <span className="text-green-400 text-sm font-medium">4/4 Present</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Early Adopter Offer
            </h2>
            <p className="text-xl text-gray-600">
              Be part of shaping the future of workforce management
            </p>
          </div>

          <div className="bg-white rounded-2xl p-8 border-2 border-[#ff5f00] shadow-xl">
            <div className="flex items-center justify-between mb-6">
              <div>
                <span className="bg-[#ff5f00] text-white text-xs font-bold px-3 py-1 rounded-full">EARLY ADOPTER</span>
                <h3 className="text-2xl font-bold text-gray-900 mt-2">Free for 3 Months</h3>
              </div>
              <div className="text-right">
                <p className="text-4xl font-bold text-gray-900">$0</p>
                <p className="text-gray-500">for 3 months</p>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4 mb-8">
              {[
                'Up to 10 locations',
                'Up to 300 workers',
                'GPS + QR attendance',
                'Shift scheduling',
                'Timesheet management',
                'Task tracking',
                'Mobile apps',
                'Priority support'
              ].map((feature, i) => (
                <div key={i} className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                  <span className="text-gray-700">{feature}</span>
                </div>
              ))}
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <p className="text-blue-800 text-sm">
                <strong>Early Adopter Benefits:</strong> 3 months free access with up to 300 workers and 10 locations. 
                Your feedback helps us build the tools you actually need.
              </p>
            </div>

            <Button
              size="lg"
              onClick={() => navigate('/signup?type=employer')}
              className="w-full bg-[#ff5f00] hover:bg-[#e55500] text-white h-14 text-lg font-semibold"
              data-testid="employer-pricing-signup"
            >
              Claim Early Adopter Access
              <ChevronRight className="ml-2 w-5 h-5" />
            </Button>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-[#ff5f00] to-orange-500">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Ready to Simplify Your Operations?
          </h2>
          <p className="text-xl text-white/90 mb-8">
            Join our beta program and help shape the future of workforce management.
          </p>
          <Button
            size="lg"
            onClick={() => navigate('/signup?type=employer')}
            className="bg-white text-[#ff5f00] hover:bg-gray-100 h-14 px-10 text-lg font-semibold"
            data-testid="employer-cta-signup"
          >
            Get Started Free
            <ChevronRight className="ml-2 w-5 h-5" />
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 text-gray-400 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-sm">© 2025 HR Bank. The standard for trust in employment.</p>
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
        userType="employer" 
      />
    </div>
  );
};

export default EmployersLanding;
