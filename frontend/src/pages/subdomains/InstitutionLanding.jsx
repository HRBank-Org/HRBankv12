import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  GraduationCap, Shield, Award, CheckCircle, ArrowRight,
  FileCheck, TrendingUp, Users, Globe, Trophy, DollarSign
} from 'lucide-react';

const InstitutionLanding = () => {
  const navigate = useNavigate();

  const benefits = [
    {
      icon: Shield,
      title: 'Blockchain Credentials',
      description: 'Issue credentials that are permanently recorded on the blockchain. Tamper-proof and instantly verifiable.'
    },
    {
      icon: Globe,
      title: 'Global Recognition',
      description: 'Your credentials are recognized by employers worldwide. Students carry their qualifications anywhere.'
    },
    {
      icon: DollarSign,
      title: 'Monetize Credentials',
      description: 'Earn revenue when students claim their credentials. Set your own pricing for certificates and diplomas.'
    },
    {
      icon: Trophy,
      title: 'Leaderboard Rankings',
      description: 'Compete with other institutions. Climb the leaderboard and showcase your credential volume.'
    },
    {
      icon: Users,
      title: 'Student Tracking',
      description: 'Track where your graduates work. See the impact of your programs in the real workforce.'
    },
    {
      icon: TrendingUp,
      title: 'Analytics Dashboard',
      description: 'Comprehensive insights into credential issuance, student employment, and revenue.'
    }
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="bg-white border-b border-gray-200 px-6 py-4 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <GraduationCap className="w-8 h-8 text-purple-600" />
            <div>
              <span className="font-bold text-xl text-gray-900">HR Bank</span>
              <span className="text-purple-600 text-sm ml-2">Institutions</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Link to="/leaderboard" className="text-gray-600 hover:text-purple-600 font-medium hidden md:block">
              Leaderboard
            </Link>
            <button
              onClick={() => navigate('/auth/login?type=institution')}
              className="px-4 py-2 text-purple-600 font-medium hover:bg-purple-50 rounded-lg"
            >
              Sign In
            </button>
            <button
              onClick={() => navigate('/auth/register?type=institution')}
              className="px-6 py-2 bg-purple-600 text-white font-medium rounded-lg hover:bg-purple-700"
            >
              Partner With Us
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="bg-gradient-to-br from-purple-600 via-purple-700 to-indigo-800 text-white">
        <div className="max-w-7xl mx-auto px-6 py-20">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 rounded-full text-purple-100 text-sm mb-6">
                <Award className="w-4 h-4" />
                <span>Blockchain-Verified Credentials</span>
              </div>
              <h1 className="text-5xl lg:text-6xl font-bold mb-6 leading-tight">
                Issue Credentials
                <span className="text-purple-300"> That Matter</span>
              </h1>
              <p className="text-xl text-purple-100 mb-8 leading-relaxed">
                Transform how your institution issues credentials. Give students blockchain-verified 
                certificates that employers trust and recognize instantly.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <button
                  onClick={() => navigate('/auth/register?type=institution')}
                  className="px-8 py-4 bg-white text-purple-600 font-bold rounded-lg hover:bg-purple-50 transition-colors flex items-center justify-center gap-2 text-lg"
                >
                  Become a Partner <ArrowRight className="w-5 h-5" />
                </button>
                <Link
                  to="/leaderboard"
                  className="px-8 py-4 bg-purple-500/30 text-white font-medium rounded-lg hover:bg-purple-500/50 transition-colors flex items-center justify-center gap-2"
                >
                  <Trophy className="w-5 h-5" /> View Leaderboard
                </Link>
              </div>
            </div>

            {/* Credential Preview */}
            <div className="relative hidden lg:block">
              <div className="bg-white rounded-2xl p-8 shadow-2xl transform -rotate-2 hover:rotate-0 transition-transform">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                      <GraduationCap className="w-6 h-6 text-purple-600" />
                    </div>
                    <div>
                      <p className="font-bold text-gray-900">St. Claire College</p>
                      <p className="text-gray-500 text-sm">Windsor, Ontario</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-green-600">
                    <CheckCircle className="w-5 h-5" />
                    <span className="text-sm font-medium">Verified</span>
                  </div>
                </div>
                <div className="border-t border-b py-6 mb-6">
                  <p className="text-gray-500 text-sm mb-1">Certificate of Completion</p>
                  <h3 className="text-2xl font-bold text-gray-900">Food Handler Certification</h3>
                  <p className="text-gray-600 mt-2">Issued to: Alex Johnson</p>
                  <p className="text-gray-500 text-sm">January 8, 2026</p>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Shield className="w-5 h-5 text-purple-600" />
                    <span className="text-sm text-gray-600">Blockchain Verified</span>
                  </div>
                  <div className="w-16 h-16 bg-gray-100 rounded p-2">
                    <div className="w-full h-full bg-gray-200 rounded grid grid-cols-4 gap-px">
                      {Array(16).fill(0).map((_, i) => (
                        <div key={i} className={`${Math.random() > 0.5 ? 'bg-gray-800' : 'bg-white'}`} />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
              <div className="absolute -bottom-6 -right-6 bg-green-500 text-white px-4 py-2 rounded-lg text-sm font-semibold shadow-lg">
                💰 Earn $25 per credential
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-12 bg-purple-50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div>
              <p className="text-4xl font-bold text-purple-600">87+</p>
              <p className="text-gray-600">Partner Institutions</p>
            </div>
            <div>
              <p className="text-4xl font-bold text-purple-600">50K+</p>
              <p className="text-gray-600">Credentials Issued</p>
            </div>
            <div>
              <p className="text-4xl font-bold text-purple-600">$2M+</p>
              <p className="text-gray-600">Revenue Generated</p>
            </div>
            <div>
              <p className="text-4xl font-bold text-purple-600">13</p>
              <p className="text-gray-600">Provinces Covered</p>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-20 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Why Institutions Partner With Us</h2>
            <p className="text-xl text-gray-600">Modern credentials for the modern workforce</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {benefits.map((benefit, index) => (
              <div key={index} className="bg-white rounded-xl p-6 shadow-sm hover:shadow-lg transition-shadow border border-gray-100">
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
                  <benefit.icon className="w-6 h-6 text-purple-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">{benefit.title}</h3>
                <p className="text-gray-600">{benefit.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-20 px-6 bg-gray-50">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Revenue Sharing</h2>
            <p className="text-xl text-gray-600">Earn money from every credential issued</p>
          </div>
          <div className="bg-white rounded-2xl p-8 shadow-lg border border-gray-200">
            <div className="grid md:grid-cols-3 gap-8 text-center">
              <div className="p-6">
                <p className="text-gray-500 mb-2">Certificates</p>
                <p className="text-4xl font-bold text-gray-900">$50</p>
                <p className="text-green-600 font-medium mt-2">You earn $25</p>
              </div>
              <div className="p-6 border-x border-gray-200">
                <p className="text-gray-500 mb-2">Diplomas</p>
                <p className="text-4xl font-bold text-gray-900">$75</p>
                <p className="text-green-600 font-medium mt-2">You earn $37.50</p>
              </div>
              <div className="p-6">
                <p className="text-gray-500 mb-2">Degrees</p>
                <p className="text-4xl font-bold text-gray-900">$100</p>
                <p className="text-green-600 font-medium mt-2">You earn $50</p>
              </div>
            </div>
            <div className="mt-8 pt-8 border-t text-center">
              <p className="text-gray-600 mb-4">50/50 revenue share • Weekly payouts • No upfront costs</p>
              <button
                onClick={() => navigate('/auth/register?type=institution')}
                className="px-8 py-3 bg-purple-600 text-white font-semibold rounded-lg hover:bg-purple-700"
              >
                Start Issuing Credentials
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-purple-600 text-white py-16 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl font-bold mb-4">Join the Credential Revolution</h2>
          <p className="text-xl text-purple-100 mb-8">Partner with HR Bank and transform how you certify students</p>
          <button
            onClick={() => navigate('/auth/register?type=institution')}
            className="px-10 py-4 bg-white text-purple-600 font-bold rounded-lg hover:bg-purple-50 text-lg"
          >
            Become a Partner
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-8 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <p>© {new Date().getFullYear()} HR Bank. All rights reserved.</p>
          <div className="flex items-center gap-6">
            <a href="https://hrbank.ca" className="hover:text-white">Main Site</a>
            <Link to="/leaderboard" className="hover:text-white">Leaderboard</Link>
            <Link to="/contact" className="hover:text-white">Contact</Link>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default InstitutionLanding;
