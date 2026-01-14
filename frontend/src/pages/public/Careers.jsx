import React from 'react';
import { Link } from 'react-router-dom';
import { 
  Briefcase, MapPin, Clock, ArrowRight, Heart, Zap, 
  Users, Globe, Shield, TrendingUp, Coffee, Laptop
} from 'lucide-react';

const openPositions = [
  {
    title: 'Senior Full-Stack Developer',
    department: 'Engineering',
    location: 'Windsor, ON (Hybrid)',
    type: 'Full-time',
    description: 'Build the future of workforce management with blockchain technology and modern web frameworks.'
  },
  {
    title: 'Product Manager',
    department: 'Product',
    location: 'Remote (Canada)',
    type: 'Full-time',
    description: 'Drive product strategy and roadmap for our WorkPassport™ platform.'
  },
  {
    title: 'Customer Success Manager',
    department: 'Customer Success',
    location: 'Toronto, ON (Hybrid)',
    type: 'Full-time',
    description: 'Help employers and institutions get the most value from HR Bank.'
  },
  {
    title: 'Marketing Specialist',
    department: 'Marketing',
    location: 'Remote (Canada)',
    type: 'Full-time',
    description: 'Grow our brand presence and drive user acquisition across Canada.'
  },
  {
    title: 'UX/UI Designer',
    department: 'Design',
    location: 'Windsor, ON (Hybrid)',
    type: 'Full-time',
    description: 'Create beautiful, intuitive experiences for millions of workers and employers.'
  }
];

const benefits = [
  { icon: Heart, title: 'Health Benefits', description: 'Comprehensive health, dental, and vision coverage' },
  { icon: Laptop, title: 'Remote Flexibility', description: 'Work from anywhere in Canada' },
  { icon: TrendingUp, title: 'Growth Opportunities', description: 'Clear career paths and learning budget' },
  { icon: Coffee, title: 'Work-Life Balance', description: 'Flexible hours and unlimited PTO' },
  { icon: Zap, title: 'Equity Options', description: 'Share in our success with stock options' },
  { icon: Users, title: 'Amazing Team', description: 'Collaborate with passionate, talented people' }
];

const Careers = () => {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <nav className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <span className="text-2xl">🏦</span>
            <span className="font-bold text-xl text-gray-900">HR Bank</span>
          </Link>
          <Link 
            to="/login" 
            className="px-4 py-2 bg-[#30496d] text-white rounded-lg hover:bg-[#243a57] transition-colors"
          >
            Sign In
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <div className="bg-gradient-to-br from-[#30496d] to-[#1a2d47] text-white py-20">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h1 className="text-5xl font-bold mb-6">Join Our Team</h1>
          <p className="text-xl text-blue-100 mb-8">
            Help us build the future of work. We're revolutionizing how 
            credentials are verified and how people find meaningful employment.
          </p>
          <a 
            href="#positions"
            className="inline-flex items-center gap-2 px-8 py-4 bg-amber-500 text-white rounded-xl font-semibold hover:bg-amber-600 transition-colors"
          >
            View Open Positions <ArrowRight className="w-5 h-5" />
          </a>
        </div>
      </div>

      {/* Mission */}
      <div className="py-16 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-6">Why HR Bank?</h2>
          <p className="text-lg text-gray-600 mb-12">
            We're on a mission to make credentials portable, verifiable, and trustworthy. 
            By combining blockchain technology with human-centered design, we're creating 
            a world where your experience and skills truly belong to you.
          </p>
          
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Globe className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Canada-Wide Impact</h3>
              <p className="text-gray-600">
                Serve millions of workers and thousands of employers across all provinces
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Shield className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Cutting-Edge Tech</h3>
              <p className="text-gray-600">
                Work with blockchain, AI, and modern frameworks to solve real problems
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-purple-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Users className="w-8 h-8 text-purple-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Inclusive Culture</h3>
              <p className="text-gray-600">
                Diverse, supportive team that values different perspectives
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Benefits */}
      <div className="bg-gray-50 py-16 px-6">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-gray-900 mb-12 text-center">Benefits & Perks</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {benefits.map((benefit, index) => {
              const Icon = benefit.icon;
              return (
                <div key={index} className="bg-white rounded-xl p-6 shadow-sm">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                    <Icon className="w-6 h-6 text-blue-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">{benefit.title}</h3>
                  <p className="text-gray-600">{benefit.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Open Positions */}
      <div id="positions" className="py-16 px-6">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">Open Positions</h2>
          
          <div className="space-y-4">
            {openPositions.map((position, index) => (
              <div 
                key={index}
                className="bg-white border border-gray-200 rounded-xl p-6 hover:border-blue-500 hover:shadow-md transition-all cursor-pointer"
              >
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 mb-1">{position.title}</h3>
                    <p className="text-gray-600 mb-3">{position.description}</p>
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="flex items-center gap-1 text-sm text-gray-500">
                        <Briefcase className="w-4 h-4" />
                        {position.department}
                      </span>
                      <span className="flex items-center gap-1 text-sm text-gray-500">
                        <MapPin className="w-4 h-4" />
                        {position.location}
                      </span>
                      <span className="flex items-center gap-1 text-sm text-gray-500">
                        <Clock className="w-4 h-4" />
                        {position.type}
                      </span>
                    </div>
                  </div>
                  <a 
                    href={`mailto:careers@hrbank.ca?subject=Application: ${position.title}`}
                    className="flex items-center gap-2 px-6 py-3 bg-[#30496d] text-white rounded-lg font-semibold hover:bg-[#243a57] transition-colors whitespace-nowrap"
                  >
                    Apply Now <ArrowRight className="w-4 h-4" />
                  </a>
                </div>
              </div>
            ))}
          </div>

          {/* Don't see a fit */}
          <div className="mt-12 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-8 text-center">
            <h3 className="text-2xl font-bold text-gray-900 mb-2">Don't see a perfect fit?</h3>
            <p className="text-gray-600 mb-6">
              We're always looking for talented people. Send us your resume and we'll keep you in mind for future opportunities.
            </p>
            <a 
              href="mailto:careers@hrbank.ca?subject=General Application"
              className="inline-flex items-center gap-2 px-6 py-3 bg-[#30496d] text-white rounded-lg font-semibold hover:bg-[#243a57] transition-colors"
            >
              Send Your Resume <ArrowRight className="w-4 h-4" />
            </a>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-8 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <p>&copy; {new Date().getFullYear()} HR Bank. All rights reserved.</p>
          <div className="flex items-center justify-center gap-6 mt-4">
            <Link to="/about" className="hover:text-white">About</Link>
            <Link to="/contact" className="hover:text-white">Contact</Link>
            <Link to="/privacy" className="hover:text-white">Privacy</Link>
            <Link to="/terms" className="hover:text-white">Terms</Link>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Careers;
