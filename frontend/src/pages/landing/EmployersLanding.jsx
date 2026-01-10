import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '../../components/ui/button';
import { 
  Building2, Shield, Clock, Users, CheckCircle2, ChevronRight, 
  DollarSign, MapPin, Smartphone, BarChart3, Zap, Calendar,
  ClipboardList, UserCheck, AlertTriangle
} from 'lucide-react';
import { LOGOS } from '../../utils/logoUtils';

const EmployersLanding = () => {
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
              <Link to="/work-passport" className="text-gray-600 hover:text-[#30496d] font-medium">
                Work Passport (Free)
              </Link>
              <Link to="/institutions" className="text-gray-600 hover:text-[#30496d] font-medium">
                Institutions
              </Link>
              <Link to="/employers" className="text-[#ff5f00] font-medium border-b-2 border-[#ff5f00]">
                Employers (Beta)
              </Link>
              <Link to="/leaderboard" className="text-gray-600 hover:text-[#30496d] font-medium">
                Leaderboard
              </Link>
            </div>
            <Button variant="ghost" onClick={() => navigate('/login')} className="text-gray-700">
              Sign In
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-24 pb-20 bg-gradient-to-br from-slate-900 via-[#1a2d42] to-slate-900 relative overflow-hidden">
        {/* Animated background */}
        <div className="absolute inset-0">
          <div className="absolute top-20 left-10 w-72 h-72 bg-[#ff5f00]/10 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              {/* Beta Badge */}
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#ff5f00]/20 rounded-full text-[#ff5f00] text-sm font-semibold mb-6">
                <Zap className="w-4 h-4" />
                Beta Program — Early Access
              </div>
              
              <h1 className="text-4xl md:text-5xl font-bold text-white mb-6 leading-tight">
                Workforce Operations.
                <br />
                <span className="text-[#ff5f00]">Simplified.</span>
              </h1>
              
              <p className="text-xl text-gray-300 mb-4 leading-relaxed">
                Manage your existing team&apos;s attendance, timesheets, and scheduling — all from your phone. 
              </p>
              <p className="text-lg text-gray-400 mb-8">
                Built for multi-location businesses who need real oversight without being on-site 24/7.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 mb-10">
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
                  onClick={() => document.getElementById('features').scrollIntoView({ behavior: 'smooth' })}
                  className="bg-transparent border-white/30 text-white hover:bg-white/10 h-14 px-8 text-lg"
                >
                  See Features
                </Button>
              </div>

              {/* Beta Notice */}
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-amber-400 mt-0.5" />
                  <div>
                    <p className="text-amber-400 font-semibold text-sm">Beta Program</p>
                    <p className="text-gray-400 text-sm">
                      We&apos;re offering free early access to businesses who want to shape the product. 
                      Not a hiring marketplace — just better workforce tools.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Dashboard Preview */}
            <div className="relative">
              <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-6 border border-slate-700 shadow-2xl">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <p className="text-white font-bold text-lg">Live Overview</p>
                    <p className="text-gray-400 text-sm">All locations • Now</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                    <span className="text-green-400 text-sm">Live</span>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3 mb-6">
                  <div className="bg-slate-700/50 rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold text-green-400">23</p>
                    <p className="text-gray-400 text-xs">Clocked In</p>
                  </div>
                  <div className="bg-slate-700/50 rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold text-blue-400">4</p>
                    <p className="text-gray-400 text-xs">Locations</p>
                  </div>
                  <div className="bg-slate-700/50 rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold text-amber-400">98%</p>
                    <p className="text-gray-400 text-xs">On-Time</p>
                  </div>
                </div>

                <div className="space-y-3">
                  {[
                    { name: 'Downtown Location', status: '8/8 present', color: 'bg-green-500/20 text-green-400' },
                    { name: 'Airport Terminal', status: '6/6 present', color: 'bg-green-500/20 text-green-400' },
                    { name: 'Mall Kiosk', status: '5/5 present', color: 'bg-green-500/20 text-green-400' },
                    { name: 'University Campus', status: '4/4 present', color: 'bg-green-500/20 text-green-400' }
                  ].map((loc, i) => (
                    <div key={i} className="flex items-center justify-between p-3 bg-slate-700/30 rounded-lg">
                      <div className="flex items-center gap-3">
                        <MapPin className="w-4 h-4 text-gray-400" />
                        <span className="text-white text-sm">{loc.name}</span>
                      </div>
                      <span className={`text-xs px-2 py-1 rounded-full ${loc.color}`}>
                        {loc.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="absolute -top-4 -right-4 bg-[#ff5f00] text-white px-4 py-2 rounded-lg text-sm font-semibold shadow-lg">
                BETA
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* What This Is / What This Isn't */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-8">
            {/* What This Is */}
            <div className="bg-white rounded-2xl p-8 border border-gray-200">
              <div className="flex items-center gap-2 text-green-600 font-semibold mb-6">
                <CheckCircle2 className="w-6 h-6" />
                What This Is
              </div>
              <ul className="space-y-4">
                {[
                  'Attendance tracking for your existing team',
                  'GPS-verified clock in/out',
                  'Multi-location management from one dashboard',
                  'Timesheet approval and payroll prep',
                  'Shift scheduling and calendar',
                  'Task assignment and tracking'
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-700">{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* What This Isn't */}
            <div className="bg-white rounded-2xl p-8 border border-gray-200">
              <div className="flex items-center gap-2 text-gray-500 font-semibold mb-6">
                <AlertTriangle className="w-6 h-6" />
                What This Isn&apos;t (Yet)
              </div>
              <ul className="space-y-4">
                {[
                  'Not a job board or hiring marketplace',
                  'Not a staffing agency replacement',
                  'Not for finding new candidates',
                  'Hiring features coming in future phases'
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <span className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0">—</span>
                    <span className="text-gray-500">{item}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                <p className="text-blue-800 text-sm">
                  <strong>Beta focus:</strong> Perfect the workforce operations tools first. 
                  Hiring marketplace features will be added based on beta feedback.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Everything You Need to Manage Your Team
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Built for business owners who want oversight without being chained to their locations.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                icon: Smartphone,
                title: 'Mobile-First',
                desc: 'Manage everything from your phone. See who clocked in, approve timesheets, assign tasks — anywhere.',
                color: 'from-blue-500 to-cyan-500'
              },
              {
                icon: Shield,
                title: 'GPS + QR Verification',
                desc: 'Workers clock in with QR code at the location. GPS confirms they\'re actually there. No buddy punching.',
                color: 'from-green-500 to-emerald-500'
              },
              {
                icon: Calendar,
                title: 'Shift Scheduling',
                desc: 'Create and manage shifts across all locations. Workers see their schedule in their app.',
                color: 'from-purple-500 to-pink-500'
              },
              {
                icon: ClipboardList,
                title: 'Task Management',
                desc: 'Assign tasks to shifts. Track completion. Know what got done without being there.',
                color: 'from-orange-500 to-amber-500'
              },
              {
                icon: BarChart3,
                title: 'Timesheet Reports',
                desc: 'Automated timesheet generation. Review, approve, export for payroll. Save hours every week.',
                color: 'from-red-500 to-rose-500'
              },
              {
                icon: Users,
                title: 'Multi-Location',
                desc: 'One dashboard for all your locations. See the big picture and drill down when needed.',
                color: 'from-indigo-500 to-violet-500'
              }
            ].map((feature, index) => (
              <div key={index} className="bg-gray-50 rounded-2xl p-6 hover:shadow-lg transition-shadow">
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-4`}>
                  <feature.icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">{feature.title}</h3>
                <p className="text-gray-600">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Live Attendance Preview */}
      <section className="py-20 bg-gradient-to-br from-slate-900 to-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
                Real-Time Attendance.
                <br />
                <span className="text-[#ff5f00]">Real Peace of Mind.</span>
              </h2>
              <p className="text-lg text-gray-300 mb-8">
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
                    <div className="w-10 h-10 bg-[#ff5f00]/20 rounded-lg flex items-center justify-center">
                      <item.icon className="w-5 h-5 text-[#ff5f00]" />
                    </div>
                    <span className="text-gray-300">{item.text}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Attendance Card */}
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
              Beta Pricing
            </h2>
            <p className="text-xl text-gray-600">
              Early adopters get special rates
            </p>
          </div>

          <div className="bg-white rounded-2xl p-8 border-2 border-[#ff5f00] shadow-xl">
            <div className="flex items-center justify-between mb-6">
              <div>
                <span className="bg-[#ff5f00] text-white text-xs font-bold px-3 py-1 rounded-full">BETA</span>
                <h3 className="text-2xl font-bold text-gray-900 mt-2">Free During Beta</h3>
              </div>
              <div className="text-right">
                <p className="text-4xl font-bold text-gray-900">$0</p>
                <p className="text-gray-500">per month</p>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4 mb-8">
              {[
                'Unlimited locations',
                'Unlimited team members',
                'GPS + QR attendance',
                'Shift scheduling',
                'Timesheet management',
                'Task tracking',
                'Mobile apps',
                'Email support'
              ].map((feature, i) => (
                <div key={i} className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                  <span className="text-gray-700">{feature}</span>
                </div>
              ))}
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
              <p className="text-amber-800 text-sm">
                <strong>Beta terms:</strong> Free access while we refine the product. 
                We&apos;ll give 60 days notice before introducing any paid features.
              </p>
            </div>

            <Button
              size="lg"
              onClick={() => navigate('/signup?type=employer')}
              className="w-full bg-[#ff5f00] hover:bg-[#e55500] text-white h-14 text-lg font-semibold"
              data-testid="employer-pricing-signup"
            >
              Join Beta — It&apos;s Free
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

export default EmployersLanding;
