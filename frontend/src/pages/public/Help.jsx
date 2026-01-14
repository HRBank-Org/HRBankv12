import React from 'react';
import { Link } from 'react-router-dom';
import { 
  BookOpen, MessageCircle, FileText, Shield, Users, Settings,
  ChevronRight, Search, Phone, Mail
} from 'lucide-react';
import { LOGOS } from '../../utils/logoUtils';

const helpCategories = [
  {
    icon: BookOpen,
    title: 'Getting Started',
    description: 'Learn the basics of HR Bank and create your WorkPassport™',
    links: [
      { label: 'Create your account', href: '/signup' },
      { label: 'Build your WorkPassport™', href: '/faq' },
      { label: 'Add your first credential', href: '/faq' }
    ],
    color: 'blue'
  },
  {
    icon: Shield,
    title: 'Verification & Credentials',
    description: 'Understand how blockchain verification works',
    links: [
      { label: 'How verification works', href: '/faq' },
      { label: 'Verification timeframes', href: '/faq' },
      { label: 'Supported credential types', href: '/faq' }
    ],
    color: 'green'
  },
  {
    icon: Users,
    title: 'For Employers',
    description: 'Hire verified workers and manage your team',
    links: [
      { label: 'Verify candidate credentials', href: '/faq' },
      { label: 'Post job listings', href: '/employers' },
      { label: 'Employer pricing', href: '/contact' }
    ],
    color: 'orange'
  },
  {
    icon: FileText,
    title: 'For Institutions',
    description: 'Issue credentials to your students and members',
    links: [
      { label: 'Partnership program', href: '/institutions' },
      { label: 'Credential issuance', href: '/faq' },
      { label: 'Institution benefits', href: '/faq' }
    ],
    color: 'purple'
  },
  {
    icon: Settings,
    title: 'Account Settings',
    description: 'Manage your profile, privacy, and preferences',
    links: [
      { label: 'Update profile', href: '/faq' },
      { label: 'Privacy settings', href: '/privacy' },
      { label: 'Password reset', href: '/forgot-password' }
    ],
    color: 'gray'
  },
  {
    icon: MessageCircle,
    title: 'Contact Support',
    description: 'Get help from our support team',
    links: [
      { label: 'Submit a request', href: '/contact' },
      { label: 'Email support', href: 'mailto:support@hrbank.ca' },
      { label: 'Call us', href: 'tel:+14164142955' }
    ],
    color: 'red'
  }
];

const colorMap = {
  blue: { bg: 'bg-blue-100', text: 'text-blue-600', hover: 'hover:bg-blue-50' },
  green: { bg: 'bg-green-100', text: 'text-green-600', hover: 'hover:bg-green-50' },
  orange: { bg: 'bg-orange-100', text: 'text-orange-600', hover: 'hover:bg-orange-50' },
  purple: { bg: 'bg-purple-100', text: 'text-purple-600', hover: 'hover:bg-purple-50' },
  gray: { bg: 'bg-gray-100', text: 'text-gray-600', hover: 'hover:bg-gray-50' },
  red: { bg: 'bg-red-100', text: 'text-red-600', hover: 'hover:bg-red-50' }
};

const Help = () => {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <nav className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <img src={LOGOS.master} alt="HR Bank" className="h-10 w-auto" />
          </Link>
          <div className="flex items-center gap-4">
            <Link to="/faq" className="text-gray-600 hover:text-gray-900 font-medium">
              FAQ
            </Link>
            <Link 
              to="/login" 
              className="px-4 py-2 bg-[#30496d] text-white rounded-lg hover:bg-[#243a57] transition-colors"
            >
              Sign In
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <div className="bg-gradient-to-br from-[#30496d] to-[#1a2d47] text-white py-16">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h1 className="text-4xl font-bold mb-4">How can we help?</h1>
          <p className="text-xl text-blue-100 mb-8">
            Search our help center or browse categories below
          </p>
          
          {/* Search */}
          <div className="max-w-xl mx-auto relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search for help articles..."
              className="w-full pl-12 pr-4 py-3 rounded-xl text-gray-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  window.location.href = `/faq?search=${encodeURIComponent(e.target.value)}`;
                }
              }}
            />
          </div>
        </div>
      </div>

      {/* Help Categories */}
      <div className="py-16 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {helpCategories.map((category, index) => {
              const colors = colorMap[category.color];
              const Icon = category.icon;
              return (
                <div 
                  key={index}
                  className={`bg-white border border-gray-200 rounded-xl p-6 ${colors.hover} transition-colors`}
                >
                  <div className={`w-12 h-12 ${colors.bg} rounded-lg flex items-center justify-center mb-4`}>
                    <Icon className={`w-6 h-6 ${colors.text}`} />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 mb-2">{category.title}</h3>
                  <p className="text-gray-600 text-sm mb-4">{category.description}</p>
                  <ul className="space-y-2">
                    {category.links.map((link, linkIndex) => (
                      <li key={linkIndex}>
                        <Link 
                          to={link.href}
                          className="text-sm text-blue-600 hover:underline flex items-center gap-1"
                        >
                          <ChevronRight className="w-4 h-4" />
                          {link.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Quick Links */}
      <div className="bg-gray-50 py-12 px-6">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">Quick Links</h2>
          <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-4">
            <Link to="/faq" className="flex items-center gap-3 p-4 bg-white rounded-xl border border-gray-200 hover:border-blue-500 transition-colors">
              <BookOpen className="w-5 h-5 text-blue-600" />
              <span className="font-medium text-gray-900">FAQ</span>
            </Link>
            <Link to="/contact" className="flex items-center gap-3 p-4 bg-white rounded-xl border border-gray-200 hover:border-blue-500 transition-colors">
              <MessageCircle className="w-5 h-5 text-blue-600" />
              <span className="font-medium text-gray-900">Contact Us</span>
            </Link>
            <Link to="/privacy" className="flex items-center gap-3 p-4 bg-white rounded-xl border border-gray-200 hover:border-blue-500 transition-colors">
              <Shield className="w-5 h-5 text-blue-600" />
              <span className="font-medium text-gray-900">Privacy Policy</span>
            </Link>
            <Link to="/terms" className="flex items-center gap-3 p-4 bg-white rounded-xl border border-gray-200 hover:border-blue-500 transition-colors">
              <FileText className="w-5 h-5 text-blue-600" />
              <span className="font-medium text-gray-900">Terms of Service</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Contact Banner */}
      <div className="py-12 px-6">
        <div className="max-w-4xl mx-auto bg-gradient-to-r from-[#30496d] to-[#1a2d47] rounded-2xl p-8 text-white">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div>
              <h3 className="text-2xl font-bold mb-2">Need more help?</h3>
              <p className="text-blue-100">Our support team is available Monday-Friday, 9AM-5PM EST</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-4">
              <a 
                href="tel:+14164142955"
                className="flex items-center gap-2 px-6 py-3 bg-white text-[#30496d] rounded-lg font-semibold hover:bg-gray-100 transition-colors"
              >
                <Phone className="w-5 h-5" />
                +1 (416) 414-2955
              </a>
              <a 
                href="mailto:support@hrbank.ca"
                className="flex items-center gap-2 px-6 py-3 border border-white text-white rounded-lg font-semibold hover:bg-white/10 transition-colors"
              >
                <Mail className="w-5 h-5" />
                Email Support
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-8 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <img src={LOGOS.master} alt="HR Bank" className="h-8 w-auto opacity-70" />
            <p>&copy; {new Date().getFullYear()} HR Bank. All rights reserved.</p>
            <div className="flex items-center gap-6">
              <Link to="/about" className="hover:text-white">About</Link>
              <Link to="/contact" className="hover:text-white">Contact</Link>
              <Link to="/privacy" className="hover:text-white">Privacy</Link>
              <Link to="/terms" className="hover:text-white">Terms</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Help;
