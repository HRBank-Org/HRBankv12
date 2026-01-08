import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Briefcase, Shield, Star, Clock, Award, CheckCircle, ArrowRight,
  FileCheck, TrendingUp, Users, Globe, Smartphone, Lock
} from 'lucide-react';

const WorkforceLanding = () => {
  const navigate = useNavigate();

  const benefits = [
    {
      icon: Shield,
      title: 'Blockchain-Verified Profile',
      description: 'Your credentials and work history are permanently recorded on the blockchain - impossible to fake or lose.'
    },
    {
      icon: Star,
      title: 'Build Your Reputation',
      description: 'Collect ratings from every job. Great performance unlocks better opportunities and higher pay.'
    },
    {
      icon: Clock,
      title: 'Tracked Hours',
      description: 'Every hour you work is verified and added to your profile. Build a trusted work history.'
    },
    {
      icon: Award,
      title: 'Verified Credentials',
      description: 'Certifications from institutions are blockchain-verified. Employers can trust your qualifications instantly.'
    },
    {
      icon: FileCheck,
      title: 'Security Clearances',
      description: 'Upload ID, background checks, and work permits once. Share with any employer securely.'
    },
    {
      icon: Globe,
      title: 'Work Passport',
      description: 'One shareable profile that travels with you. Apply to jobs with a single link.'
    }
  ];

  const steps = [
    { num: '1', title: 'Create Your Profile', desc: 'Sign up and add your skills, experience, and upload your documents.' },
    { num: '2', title: 'Get Verified', desc: 'Your credentials are verified and recorded on the blockchain.' },
    { num: '3', title: 'Apply to Jobs', desc: 'Browse opportunities and apply with your verified Work Passport.' },
    { num: '4', title: 'Work & Get Rated', desc: 'Complete shifts, get paid, and build your reputation.' }
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="bg-white border-b border-gray-200 px-6 py-4 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Briefcase className="w-8 h-8 text-blue-600" />
            <div>
              <span className="font-bold text-xl text-gray-900">HR Bank</span>
              <span className="text-blue-600 text-sm ml-2">Workforce</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Link to="/jobs" className="text-gray-600 hover:text-blue-600 font-medium hidden md:block">
              Browse Jobs
            </Link>
            <button
              onClick={() => navigate('/auth/login?type=workforce')}
              className="px-4 py-2 text-blue-600 font-medium hover:bg-blue-50 rounded-lg"
            >
              Sign In
            </button>
            <button
              onClick={() => navigate('/auth/register?type=workforce')}
              className="px-6 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700"
            >
              Join Free
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 text-white">
        <div className="max-w-7xl mx-auto px-6 py-20">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 rounded-full text-blue-100 text-sm mb-6">
                <Shield className="w-4 h-4" />
                <span>Blockchain Verified Careers</span>
              </div>
              <h1 className="text-5xl lg:text-6xl font-bold mb-6 leading-tight">
                Your Career,
                <span className="text-blue-300"> Verified Forever</span>
              </h1>
              <p className="text-xl text-blue-100 mb-8 leading-relaxed">
                Build a Work Passport that proves your skills, experience, and reliability. 
                Get hired faster with blockchain-verified credentials that employers trust.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <button
                  onClick={() => navigate('/auth/register?type=workforce')}
                  className="px-8 py-4 bg-white text-blue-600 font-bold rounded-lg hover:bg-blue-50 transition-colors flex items-center justify-center gap-2 text-lg"
                >
                  Create Your Profile <ArrowRight className="w-5 h-5" />
                </button>
                <Link
                  to="/passport/3E68EA53"
                  className="px-8 py-4 bg-blue-500/30 text-white font-medium rounded-lg hover:bg-blue-500/50 transition-colors flex items-center justify-center gap-2"
                >
                  See Example Passport
                </Link>
              </div>
              <div className="flex items-center gap-6 mt-8 text-blue-200 text-sm">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5" />
                  <span>Free to join</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5" />
                  <span>No fees to apply</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5" />
                  <span>Get paid weekly</span>
                </div>
              </div>
            </div>

            {/* Work Passport Preview */}
            <div className="relative hidden lg:block">
              <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-6 border border-slate-700 shadow-2xl transform rotate-2 hover:rotate-0 transition-transform">
                <div className="h-2 bg-gradient-to-r from-amber-400 via-amber-500 to-amber-400 rounded-full mb-4" />
                <div className="flex items-start gap-4 mb-4">
                  <img 
                    src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=120&fit=crop&crop=face"
                    alt="Profile"
                    className="w-16 h-20 rounded-lg border-2 border-amber-500/50 object-cover"
                  />
                  <div>
                    <h3 className="text-white font-bold text-lg">Alex Johnson</h3>
                    <p className="text-slate-400 text-sm">Windsor, ON • Canada</p>
                    <div className="flex items-center gap-1 mt-1">
                      <span className="text-amber-400 font-bold">4.8</span>
                      <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                    </div>
                  </div>
                  <div className="ml-auto">
                    <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                      <CheckCircle className="w-5 h-5 text-white" />
                    </div>
                  </div>
                </div>
                <div className="bg-slate-700/50 rounded-lg p-3 mb-3">
                  <p className="text-slate-400 text-xs mb-2">Security Clearances</p>
                  <div className="flex gap-2">
                    <span className="px-2 py-1 bg-green-500/20 text-green-400 rounded text-xs">✓ ID Verified</span>
                    <span className="px-2 py-1 bg-green-500/20 text-green-400 rounded text-xs">✓ Background Check</span>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="bg-slate-700/30 rounded p-2">
                    <p className="text-amber-400 font-bold">8,500+</p>
                    <p className="text-slate-400 text-xs">Hours</p>
                  </div>
                  <div className="bg-slate-700/30 rounded p-2">
                    <p className="text-green-400 font-bold">5</p>
                    <p className="text-slate-400 text-xs">Credentials</p>
                  </div>
                  <div className="bg-slate-700/30 rounded p-2">
                    <p className="text-blue-400 font-bold">3</p>
                    <p className="text-slate-400 text-xs">Occupations</p>
                  </div>
                </div>
              </div>
              <div className="absolute -bottom-4 -left-4 bg-green-500 text-white px-4 py-2 rounded-lg text-sm font-semibold shadow-lg">
                ✓ Trusted by 500+ Employers
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-20 px-6 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Why Workers Choose HR Bank</h2>
            <p className="text-xl text-gray-600">Build a career that follows you, not stays behind</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {benefits.map((benefit, index) => (
              <div key={index} className="bg-white rounded-xl p-6 shadow-sm hover:shadow-lg transition-shadow border border-gray-100">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                  <benefit.icon className="w-6 h-6 text-blue-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">{benefit.title}</h3>
                <p className="text-gray-600">{benefit.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">How It Works</h2>
            <p className="text-xl text-gray-600">Get started in minutes</p>
          </div>
          <div className="grid md:grid-cols-4 gap-6">
            {steps.map((step, index) => (
              <div key={index} className="text-center">
                <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center text-white text-2xl font-bold mx-auto mb-4">
                  {step.num}
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">{step.title}</h3>
                <p className="text-gray-600 text-sm">{step.desc}</p>
                {index < steps.length - 1 && (
                  <ArrowRight className="w-6 h-6 text-gray-300 mx-auto mt-4 hidden md:block" />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-blue-600 text-white py-16 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl font-bold mb-4">Ready to Build Your Verified Career?</h2>
          <p className="text-xl text-blue-100 mb-8">Join thousands of workers with trusted profiles</p>
          <button
            onClick={() => navigate('/auth/register?type=workforce')}
            className="px-10 py-4 bg-white text-blue-600 font-bold rounded-lg hover:bg-blue-50 text-lg"
          >
            Create Your Free Profile
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

export default WorkforceLanding;
