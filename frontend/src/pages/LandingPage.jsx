import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { Briefcase, Building2, GraduationCap, Users, TrendingUp, Shield, Clock, Award, ChevronRight } from 'lucide-react';
import { LOGOS, getLogoByUserType } from '../utils/logoUtils';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const LandingPage = () => {
  const navigate = useNavigate();
  const [partnerLogos, setPartnerLogos] = useState([
    // Default mock logos shown until real logos are loaded
    { id: 1, institution_name: 'Partner 1', logo_url: 'https://via.placeholder.com/150x60/4267B2/ffffff?text=Partner+1' },
    { id: 2, institution_name: 'Partner 2', logo_url: 'https://via.placeholder.com/150x60/2C4A6B/ffffff?text=Partner+2' },
    { id: 3, institution_name: 'Partner 3', logo_url: 'https://via.placeholder.com/150x60/4267B2/ffffff?text=Partner+3' },
    { id: 4, institution_name: 'Partner 4', logo_url: 'https://via.placeholder.com/150x60/2C4A6B/ffffff?text=Partner+4' },
    { id: 5, institution_name: 'Partner 5', logo_url: 'https://via.placeholder.com/150x60/4267B2/ffffff?text=Partner+5' },
    { id: 6, institution_name: 'Partner 6', logo_url: 'https://via.placeholder.com/150x60/2C4A6B/ffffff?text=Partner+6' },
  ]);

  // Fetch partner logos from backend
  useEffect(() => {
    const fetchPartnerLogos = async () => {
      try {
        const response = await fetch(`${API}/partner-logos/`);
        const data = await response.json();
        if (data && data.length > 0) {
          // Process logo URLs - prepend backend URL if they're relative paths
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
        // Keep using mock logos if fetch fails
      }
    };
    
    fetchPartnerLogos();
  }, []);

  const userCategories = [
    {
      id: 'workforce',
      title: 'Workforce',
      icon: Briefcase,
      description: 'Join a network of verified professionals and access quality job opportunities',
      metrics: [
        { label: 'Verified Workers', value: '10,000+' },
        { label: 'Compliance Rate', value: '95%' },
        { label: 'Active Jobs', value: '2,500+' },
      ],
      color: 'from-[#30496d] to-[#234058]',
      bgColor: 'bg-blue-50',
      buttonColor: 'bg-[#30496d] hover:bg-[#234058]',
    },
    {
      id: 'employer',
      title: 'Employers',
      icon: Building2,
      description: 'Access a trusted pool of vetted workers and streamline your hiring process',
      metrics: [
        { label: 'Active Employers', value: '500+' },
        { label: 'Jobs Posted', value: '3,000+' },
        { label: 'Avg. Time to Hire', value: '3 days' },
      ],
      color: 'from-[#ff5f00] to-[#e55500]',
      bgColor: 'bg-orange-50',
      buttonColor: 'bg-[#ff5f00] hover:bg-[#e55500]',
    },
    {
      id: 'institution',
      title: 'Institutions',
      icon: GraduationCap,
      description: 'Partner with us to provide certification and training for workforce development',
      metrics: [
        { label: 'Partner Institutions', value: '50+' },
        { label: 'Certifications', value: '200+' },
        { label: 'Trained Workers', value: '8,000+' },
      ],
      color: 'from-gray-800 to-gray-900',
      bgColor: 'bg-gray-50',
      buttonColor: 'bg-gray-900 hover:bg-gray-800',
    },
  ];

  const platformFeatures = [
    {
      icon: Shield,
      title: 'Blockchain Credentials',
      description: 'Tamper-proof digital certificates secured on blockchain, portable and verifiable forever',
    },
    {
      icon: Clock,
      title: 'Real-Time Attendance',
      description: 'QR + GPS geofenced clock-in/out prevents fraud across multiple locations',
    },
    {
      icon: Award,
      title: 'Smart Job Matching',
      description: 'Tinder-style swipe interface matches skills, location, and availability instantly',
    },
    {
      icon: TrendingUp,
      title: 'Dual Rating System',
      description: 'Fair 5-star ratings build trust and reputation for both workers and employers',
    },
  ];

  const workforceFeatures = [
    { title: 'Smart Job Matching', description: 'Tinder-style swipe interface matches jobs to your skills, location & availability—no resume needed' },
    { title: 'Verified Digital Credentials', description: 'Blockchain-secured certifications you own forever. Instantly verifiable via QR code' },
    { title: 'Fair Ratings & Transparency', description: 'Dual 5-star system builds reputation. Rate employers, earn trust, unlock opportunities' },
    { title: 'Effortless Attendance', description: 'QR + GPS clock-in/out. Automated timesheets, accurate pay, zero disputes' },
    { title: 'Language Support', description: 'Real-time AI translation in 40+ languages—UI, messaging, jobs. No language barriers' },
  ];

  const employerFeatures = [
    { title: 'Instant Verified Hiring', description: 'Access pre-vetted workers with blockchain credentials. No resume screening delays' },
    { title: 'Complete Workforce Management', description: 'Drag-and-drop scheduling, multi-roster, QR attendance, automated timesheets—all in one' },
    { title: 'Fraud-Proof Attendance', description: 'Geofenced QR clock-in/out prevents buddy punching. Know exactly who\'s working where' },
    { title: 'Unbeatable Pricing', description: 'Flat $1/hour per party. 80-90% cheaper than staffing agencies. No hidden costs' },
    { title: 'Performance Insights', description: 'Dual ratings, analytics dashboards, favorite workers. Build your dream team fast' },
  ];

  const institutionFeatures = [
    { title: 'Digital Credential Issuance', description: 'Issue tamper-proof blockchain certificates (Polygon + IPFS). Students carry them for life' },
    { title: 'Real-Time Demand Analytics', description: 'See which skills employers need most. Align curriculum with market demand' },
    { title: 'Instant Verification', description: 'Employers verify via QR code—no calls, no delays. Reduce admin burden by 90%' },
    { title: 'Graduate Employment Tracking', description: 'Monitor placements, track rates, demonstrate ROI to stakeholders' },
    { title: 'Partnership Revenue', description: 'Become the trusted credential source. Strengthen relationships, create revenue' },
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <div className="w-auto h-10 flex items-center justify-center">
                <img 
                  src={LOGOS.master}
                  alt="HR Bank Logo" 
                  className="h-10 w-auto object-contain"
                />
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                onClick={() => navigate('/login')}
                className="text-gray-700 hover:text-[#30496d]"
              >
                Sign In
              </Button>
              <Button
                onClick={() => navigate('/signup')}
                className="bg-[#ff5f00] hover:bg-[#e55500] text-white"
              >
                Get Started
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section with Video */}
      <section className="relative pt-16 h-[600px] overflow-hidden">
        {/* Video Background */}
        <div className="absolute inset-0 z-0">
          <iframe
            className="w-full h-full object-cover scale-150"
            src="https://www.youtube.com/embed/H8vQs5nbJzo?autoplay=1&mute=1&loop=1&playlist=H8vQs5nbJzo&controls=0&showinfo=0&modestbranding=1"
            title="HR Bank Video"
            frameBorder="0"
            allow="autoplay; encrypted-media"
            allowFullScreen
          />
          <div className="absolute inset-0 bg-gradient-to-l from-black/60 via-black/20 to-transparent"></div>
        </div>

        {/* Hero Content - Positioned Lower Right */}
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full flex items-end justify-end pb-16">
          <div className="max-w-xl text-right">
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-4 leading-tight">
              Your Workforce,
              <br />
              <span className="text-blue-300">Simplified & Standardized</span>
            </h1>
            <p className="text-base md:text-lg text-gray-200 mb-6">
              Connecting verified workers, employers, and institutions for a better workforce marketplace
            </p>
            <div className="flex flex-wrap gap-3 justify-end">
              <Button
                size="default"
                onClick={() => navigate('/signup')}
                className="bg-[#ff5f00] hover:bg-[#e55500] text-white h-10 px-6"
              >
                Get Started
                <ChevronRight className="ml-1 w-4 h-4" />
              </Button>
              <Button
                size="default"
                variant="outline"
                onClick={() => document.getElementById('categories').scrollIntoView({ behavior: 'smooth' })}
                className="bg-white/10 border-white text-white hover:bg-white/20 h-10 px-6 backdrop-blur-sm"
              >
                Learn More
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Bar */}
      <section className="bg-[#30496d] py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-3xl md:text-4xl font-bold text-white mb-1">10,000+</div>
              <div className="text-blue-100 text-sm">Verified Workers</div>
            </div>
            <div>
              <div className="text-3xl md:text-4xl font-bold text-white mb-1">500+</div>
              <div className="text-blue-100 text-sm">Active Employers</div>
            </div>
            <div>
              <div className="text-3xl md:text-4xl font-bold text-white mb-1">50+</div>
              <div className="text-blue-100 text-sm">Partner Institutions</div>
            </div>
            <div>
              <div className="text-3xl md:text-4xl font-bold text-white mb-1">95%</div>
              <div className="text-blue-100 text-sm">Compliance Rate</div>
            </div>
          </div>
        </div>
      </section>

      {/* User Categories Section */}
      <section id="categories" className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Choose Your Path</h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Whether you're seeking work, hiring talent, or providing training - we have the right solution for you
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {userCategories.map((category) => {
              return (
                <Card key={category.id} className="border-0 shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-2">
                  <CardContent className="p-8">
                    <div className={`w-20 h-20 rounded-2xl bg-gradient-to-br ${category.color} flex items-center justify-center mb-6 p-3`}>
                      <img 
                        src={getLogoByUserType(category.id)}
                        alt={`${category.title} Logo`}
                        className="w-full h-full object-contain"
                      />
                    </div>
                    
                    <h3 className="text-2xl font-bold text-gray-900 mb-3">{category.title}</h3>
                    <p className="text-gray-600 mb-6">{category.description}</p>

                    {/* Metrics */}
                    <div className={`${category.bgColor} rounded-xl p-4 mb-6 space-y-3`}>
                      {category.metrics.map((metric, index) => (
                        <div key={index} className="flex justify-between items-center">
                          <span className="text-sm text-gray-700">{metric.label}</span>
                          <span className="text-lg font-bold text-gray-900">{metric.value}</span>
                        </div>
                      ))}
                    </div>

                    {/* Action Buttons */}
                    <div className="space-y-2">
                      <Button
                        onClick={() => navigate(`/signup?type=${category.id}`)}
                        className={`w-full ${category.buttonColor} text-white h-11`}
                      >
                        Sign Up
                      </Button>
                      <Button
                        onClick={() => navigate(`/login?type=${category.id}`)}
                        variant="outline"
                        className="w-full h-11 hover:bg-gray-50"
                      >
                        Sign In
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* Platform Features Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Why Choose HR Bank?</h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Revolutionary technology meets workforce management—blockchain security, real-time tracking, and smart matching
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {platformFeatures.map((feature, index) => {
              const IconComponent = feature.icon;
              return (
                <div key={index} className="text-center">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-100 mb-4">
                    <IconComponent className="w-8 h-8 text-[#30496d]" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">{feature.title}</h3>
                  <p className="text-gray-600">{feature.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Detailed Features by User Type */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
            {/* Workforce Features */}
            <div>
              <div className="flex items-center gap-3 mb-6">
                <div className="bg-[#30496d] rounded-xl p-3 w-14 h-14 flex items-center justify-center">
                  <img 
                    src={getLogoByUserType('workforce')}
                    alt="Workforce"
                    className="w-full h-full object-contain"
                  />
                </div>
                <h3 className="text-2xl font-bold text-gray-900">For Workers</h3>
              </div>
              <div className="space-y-4">
                {workforceFeatures.map((feature, index) => (
                  <div key={index} className="bg-white p-4 rounded-lg shadow-sm hover:shadow-md transition-shadow">
                    <h4 className="font-semibold text-gray-900 mb-1">{feature.title}</h4>
                    <p className="text-sm text-gray-600">{feature.description}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Employer Features */}
            <div>
              <div className="flex items-center gap-3 mb-6">
                <div className="bg-[#ff5f00] rounded-xl p-3 w-14 h-14 flex items-center justify-center">
                  <img 
                    src={getLogoByUserType('employer')}
                    alt="Employers"
                    className="w-full h-full object-contain"
                  />
                </div>
                <h3 className="text-2xl font-bold text-gray-900">For Employers</h3>
              </div>
              <div className="space-y-4">
                {employerFeatures.map((feature, index) => (
                  <div key={index} className="bg-white p-4 rounded-lg shadow-sm hover:shadow-md transition-shadow">
                    <h4 className="font-semibold text-gray-900 mb-1">{feature.title}</h4>
                    <p className="text-sm text-gray-600">{feature.description}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Institution Features */}
            <div>
              <div className="flex items-center gap-3 mb-6">
                <div className="bg-gray-900 rounded-xl p-3 w-14 h-14 flex items-center justify-center">
                  <img 
                    src={getLogoByUserType('institution')}
                    alt="Institutions"
                    className="w-full h-full object-contain"
                  />
                </div>
                <h3 className="text-2xl font-bold text-gray-900">For Institutions</h3>
              </div>
              <div className="space-y-4">
                {institutionFeatures.map((feature, index) => (
                  <div key={index} className="bg-white p-4 rounded-lg shadow-sm hover:shadow-md transition-shadow">
                    <h4 className="font-semibold text-gray-900 mb-1">{feature.title}</h4>
                    <p className="text-sm text-gray-600">{feature.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Partner Logos Carousel */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-2">Trusted By Leading Institutions</h2>
            <p className="text-gray-600">Partnering with top organizations for workforce excellence</p>
          </div>

          {/* Logo Carousel */}
          <div className="relative overflow-hidden">
            <div className="flex items-center justify-center gap-12 animate-scroll">
              {[...partnerLogos, ...partnerLogos].map((logo, index) => (
                <div
                  key={`${logo.id}-${index}`}
                  className="flex-shrink-0 w-40 h-20 bg-white rounded-lg shadow-md flex items-center justify-center p-4 hover:shadow-lg transition-shadow"
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
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-[#30496d]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl font-bold text-white mb-6">Ready to Get Started?</h2>
          <p className="text-xl text-blue-100 mb-8">
            Join thousands of professionals, employers, and institutions transforming the workforce
          </p>
          <Button
            size="lg"
            onClick={() => navigate('/signup')}
            className="bg-white text-[#30496d] hover:bg-gray-100 h-14 px-10 text-lg font-semibold"
          >
            Create Your Account
            <ChevronRight className="ml-2 w-5 h-5" />
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center mb-4">
                <img 
                  src={LOGOS.master}
                  alt="HR Bank Logo" 
                  className="h-8 w-auto object-contain"
                />
              </div>
              <p className="text-sm">Your trusted workforce marketplace</p>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">For Workers</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="hover:text-white transition-colors">Find Jobs</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Get Certified</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Training Programs</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">For Employers</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="hover:text-white transition-colors">Post Jobs</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Find Workers</a></li>
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
    </div>
  );
};

export default LandingPage;