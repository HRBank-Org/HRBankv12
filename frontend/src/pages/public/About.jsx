import React from 'react';
import { Link } from 'react-router-dom';
import { Shield, Users, Award, Globe, CheckCircle, ArrowRight } from 'lucide-react';

const About = () => {
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
            to="/auth/login" 
            className="px-4 py-2 bg-[#30496d] text-white rounded-lg hover:bg-[#243a57] transition-colors"
          >
            Sign In
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <div className="bg-gradient-to-br from-[#30496d] to-[#1a2d47] text-white py-20">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h1 className="text-5xl font-bold mb-6">About HR Bank</h1>
          <p className="text-xl text-blue-100">
            Revolutionizing workforce management with blockchain-verified credentials 
            and seamless employment solutions.
          </p>
        </div>
      </div>

      {/* Mission */}
      <div className="py-16 px-6">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-gray-900 mb-6">Our Mission</h2>
          <p className="text-lg text-gray-600 mb-8">
            HR Bank is building the future of work by creating a trusted ecosystem where 
            workforce credentials travel with individuals throughout their careers. We believe 
            that verified experience and skills should be portable, tamper-proof, and instantly 
            verifiable by any employer.
          </p>
          
          <div className="grid md:grid-cols-2 gap-8 mt-12">
            <div className="bg-gray-50 rounded-xl p-6">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                <Shield className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Blockchain Verified</h3>
              <p className="text-gray-600">
                Every credential on HR Bank is permanently recorded on the Polygon blockchain, 
                making it impossible to fake or alter work history.
              </p>
            </div>
            
            <div className="bg-gray-50 rounded-xl p-6">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
                <Users className="w-6 h-6 text-green-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Workforce Empowerment</h3>
              <p className="text-gray-600">
                Workers own their verified credentials through their Work Passport, 
                building a portable reputation that opens doors to new opportunities.
              </p>
            </div>
            
            <div className="bg-gray-50 rounded-xl p-6">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
                <Award className="w-6 h-6 text-purple-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Institution Partners</h3>
              <p className="text-gray-600">
                Educational institutions can issue verified credentials directly to students, 
                creating a bridge between education and employment.
              </p>
            </div>
            
            <div className="bg-gray-50 rounded-xl p-6">
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center mb-4">
                <Globe className="w-6 h-6 text-orange-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Canada-Wide</h3>
              <p className="text-gray-600">
                Serving employers and workforce across all Canadian provinces and territories 
                with localized tax compliance and provincial regulations.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="bg-gray-900 text-white py-16 px-6">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold mb-12 text-center">Platform Stats</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div>
              <p className="text-4xl font-bold text-amber-400">87+</p>
              <p className="text-gray-400">Institutions</p>
            </div>
            <div>
              <p className="text-4xl font-bold text-amber-400">1,000+</p>
              <p className="text-gray-400">Credentials Issued</p>
            </div>
            <div>
              <p className="text-4xl font-bold text-amber-400">500+</p>
              <p className="text-gray-400">Work Passports</p>
            </div>
            <div>
              <p className="text-4xl font-bold text-amber-400">13</p>
              <p className="text-gray-400">Provinces/Territories</p>
            </div>
          </div>
        </div>
      </div>

      {/* CTA */}
      <div className="py-16 px-6 bg-gradient-to-r from-blue-50 to-indigo-50">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">Ready to Get Started?</h2>
          <p className="text-gray-600 mb-8">Join the workforce revolution today.</p>
          <div className="flex items-center justify-center gap-4">
            <Link 
              to="/auth/register" 
              className="px-6 py-3 bg-[#30496d] text-white rounded-lg font-semibold hover:bg-[#243a57] transition-colors flex items-center gap-2"
            >
              Create Account <ArrowRight className="w-5 h-5" />
            </Link>
            <Link 
              to="/leaderboard" 
              className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition-colors"
            >
              View Leaderboard
            </Link>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-8 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <p>&copy; {new Date().getFullYear()} HR Bank. All rights reserved.</p>
          <div className="flex items-center justify-center gap-6 mt-4">
            <Link to="/privacy" className="hover:text-white">Privacy Policy</Link>
            <Link to="/contact" className="hover:text-white">Contact</Link>
            <Link to="/" className="hover:text-white">Home</Link>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default About;
