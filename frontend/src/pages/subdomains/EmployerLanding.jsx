import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Building2, Shield, Users, Clock, CheckCircle, ArrowRight,
  Search, Calendar, DollarSign, FileCheck, TrendingUp, Zap
} from 'lucide-react';

const EmployerLanding = () => {
  const navigate = useNavigate();

  const benefits = [
    {
      icon: Shield,
      title: 'Pre-Vetted Workers',
      description: 'Every worker has verified ID, background checks, and work history. No more guessing.'
    },
    {
      icon: Clock,
      title: 'Verified Experience',
      description: 'See actual hours worked and ratings from previous employers. Know exactly who you\'re hiring.'
    },
    {
      icon: FileCheck,
      title: 'Instant Credentials',
      description: 'Certifications are blockchain-verified. Food handlers, forklift operators - verified in seconds.'
    },
    {
      icon: Calendar,
      title: 'Smart Scheduling',
      description: 'Auto-match shifts with available, qualified workers. Fill positions in minutes, not days.'
    },
    {
      icon: DollarSign,
      title: 'Automated Payroll',
      description: 'Track hours automatically. Generate timesheets. Simplify your payroll process.'
    },
    {
      icon: TrendingUp,
      title: 'Rate & Review',
      description: 'Build your reputation as a great employer. Attract better workers with positive reviews.'
    }
  ];

  const stats = [
    { value: '10,000+', label: 'Verified Workers' },
    { value: '4.7', label: 'Avg Worker Rating' },
    { value: '24hr', label: 'Avg Time to Fill' },
    { value: '95%', label: 'Employer Satisfaction' }
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="bg-white border-b border-gray-200 px-6 py-4 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Building2 className="w-8 h-8 text-orange-600" />
            <div>
              <span className="font-bold text-xl text-gray-900">HR Bank</span>
              <span className="text-orange-600 text-sm ml-2">Employers</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/login')}
              className="px-4 py-2 text-orange-600 font-medium hover:bg-orange-50 rounded-lg"
            >
              Sign In
            </button>
            <button
              onClick={() => navigate('/signup?type=employer')}
              className="px-6 py-2 bg-orange-600 text-white font-medium rounded-lg hover:bg-orange-700"
            >
              Start Hiring
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="bg-gradient-to-br from-orange-500 via-orange-600 to-red-600 text-white">
        <div className="max-w-7xl mx-auto px-6 py-20">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 rounded-full text-orange-100 text-sm mb-6">
                <Shield className="w-4 h-4" />
                <span>Pre-Vetted Workforce</span>
              </div>
              <h1 className="text-5xl lg:text-6xl font-bold mb-6 leading-tight">
                Hire Verified
                <span className="text-orange-200"> Workers Instantly</span>
              </h1>
              <p className="text-xl text-orange-100 mb-8 leading-relaxed">
                Stop wasting time on background checks and reference calls. 
                Access a pool of pre-vetted workers with blockchain-verified credentials and proven track records.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <button
                  onClick={() => navigate('/signup?type=employer')}
                  className="px-8 py-4 bg-white text-orange-600 font-bold rounded-lg hover:bg-orange-50 transition-colors flex items-center justify-center gap-2 text-lg"
                >
                  Start Hiring Free <ArrowRight className="w-5 h-5" />
                </button>
                <button
                  onClick={() => navigate('/jobs')}
                  className="px-8 py-4 bg-orange-500/30 text-white font-medium rounded-lg hover:bg-orange-500/50 transition-colors flex items-center justify-center gap-2"
                >
                  <Search className="w-5 h-5" /> Browse Workers
                </button>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-4">
              {stats.map((stat, index) => (
                <div key={index} className="bg-white/10 backdrop-blur-sm rounded-xl p-6 text-center">
                  <p className="text-4xl font-bold text-white mb-1">{stat.value}</p>
                  <p className="text-orange-200">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Trust Badges */}
      <section className="py-8 bg-gray-50 border-b">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-wrap items-center justify-center gap-8 text-gray-600">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-500" />
              <span>ID Verified Workers</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-500" />
              <span>Background Checked</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-500" />
              <span>Blockchain Credentials</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-500" />
              <span>Verified Work History</span>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-20 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Why Employers Choose HR Bank</h2>
            <p className="text-xl text-gray-600">Hire with confidence, every time</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {benefits.map((benefit, index) => (
              <div key={index} className="bg-white rounded-xl p-6 shadow-sm hover:shadow-lg transition-shadow border border-gray-100">
                <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center mb-4">
                  <benefit.icon className="w-6 h-6 text-orange-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">{benefit.title}</h3>
                <p className="text-gray-600">{benefit.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Access Diverse Talent */}
      <section className="py-16 px-6 bg-gradient-to-r from-slate-900 via-orange-900 to-slate-900 relative overflow-hidden">
        <div className="absolute inset-0 opacity-5 text-white text-6xl font-bold">
          <span className="absolute top-5 left-10">🌍</span>
          <span className="absolute top-10 right-20">🤝</span>
          <span className="absolute bottom-10 left-1/4">💼</span>
          <span className="absolute bottom-5 right-10">🌐</span>
        </div>
        <div className="max-w-5xl mx-auto relative z-10">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 rounded-full text-orange-300 text-sm font-medium mb-6">
                <Users className="w-4 h-4" />
                Diverse Talent Pool
              </div>
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
                Access Canada&apos;s Most Diverse Workforce
              </h2>
              <p className="text-lg text-orange-100 mb-6">
                HR Bank breaks language barriers to give you access to talented workers from every background. 
                Our multilingual platform means you can hire skilled workers who might otherwise be overlooked.
              </p>
              <ul className="space-y-3 text-gray-300">
                <li className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-green-400" />
                  Workers communicate with Emma AI in their native language
                </li>
                <li className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-green-400" />
                  Verified credentials from international institutions
                </li>
                <li className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-green-400" />
                  Notifications translated to worker&apos;s preferred language
                </li>
              </ul>
            </div>
            <div className="text-center">
              <div className="bg-white/10 rounded-2xl p-8 backdrop-blur-sm border border-white/20">
                <p className="text-5xl font-bold text-white mb-2">20+</p>
                <p className="text-orange-200 mb-6">Languages Supported</p>
                <div className="flex flex-wrap justify-center gap-2">
                  {['EN', 'FR', 'AR', 'ZH', 'PA', 'PS', 'TL', 'ES', 'HI', 'UR'].map((lang) => (
                    <span key={lang} className="px-3 py-1 bg-white/10 rounded text-white text-sm">
                      {lang}
                    </span>
                  ))}
                </div>
                <p className="text-sm text-orange-300 mt-6 italic">
                  "Human talent is our greatest resource in the age of AI"
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 px-6 bg-gray-50">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Hire in 3 Simple Steps</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white rounded-xl p-8 text-center shadow-sm">
              <div className="w-16 h-16 bg-orange-600 rounded-full flex items-center justify-center text-white text-2xl font-bold mx-auto mb-4">
                1
              </div>
              <h3 className="font-semibold text-gray-900 mb-2 text-lg">Post Your Job</h3>
              <p className="text-gray-600">Describe the role, set your requirements, and specify the schedule.</p>
            </div>
            <div className="bg-white rounded-xl p-8 text-center shadow-sm">
              <div className="w-16 h-16 bg-orange-600 rounded-full flex items-center justify-center text-white text-2xl font-bold mx-auto mb-4">
                2
              </div>
              <h3 className="font-semibold text-gray-900 mb-2 text-lg">Get Matched</h3>
              <p className="text-gray-600">Our system finds verified workers who match your requirements.</p>
            </div>
            <div className="bg-white rounded-xl p-8 text-center shadow-sm">
              <div className="w-16 h-16 bg-orange-600 rounded-full flex items-center justify-center text-white text-2xl font-bold mx-auto mb-4">
                3
              </div>
              <h3 className="font-semibold text-gray-900 mb-2 text-lg">Hire & Manage</h3>
              <p className="text-gray-600">Review profiles, hire instantly, and manage everything in one place.</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-orange-600 text-white py-16 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl font-bold mb-4">Ready to Hire Smarter?</h2>
          <p className="text-xl text-orange-100 mb-8">Join 500+ employers using HR Bank</p>
          <button
            onClick={() => navigate('/signup?type=employer')}
            className="px-10 py-4 bg-white text-orange-600 font-bold rounded-lg hover:bg-orange-50 text-lg"
          >
            Create Employer Account
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-8 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <p>© {new Date().getFullYear()} HR Bank. All rights reserved.</p>
          <div className="flex items-center gap-6">
            <a href="https://hrbank.ca" className="hover:text-white">Main Site</a>
            <Link to="/privacy" className="hover:text-white">Privacy</Link>
            <Link to="/contact" className="hover:text-white">Contact</Link>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default EmployerLanding;
