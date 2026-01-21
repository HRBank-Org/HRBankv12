import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, ChevronUp, Search, HelpCircle, ArrowLeft } from 'lucide-react';

const faqData = [
  {
    category: 'Getting Started',
    questions: [
      {
        q: 'What is WorkPassport™?',
        a: 'WorkPassport™ is your portable, blockchain-verified career profile. It contains all your verified credentials, work experience, and certifications that travel with you throughout your career. Employers can instantly verify your qualifications, making the hiring process faster and more trustworthy.'
      },
      {
        q: 'How do I create a WorkPassport™?',
        a: 'Simply click "Get Started" on our homepage, fill in your basic information, and verify your email and phone. Once registered, you can start adding your credentials, work experience, and certifications. The process takes less than 5 minutes.'
      },
      {
        q: 'Is HR Bank free for workers?',
        a: 'Yes! Creating and maintaining your WorkPassport™ is completely free for workers. You can add unlimited credentials, share your profile with employers, and access job opportunities at no cost.'
      }
    ]
  },
  {
    category: 'Credentials & Verification',
    questions: [
      {
        q: 'How does blockchain verification work?',
        a: 'When a credential is verified on HR Bank, it is recorded on the Polygon blockchain, creating a permanent, tamper-proof record. This means your credentials cannot be faked or altered, giving employers complete confidence in your qualifications.'
      },
      {
        q: 'How long does verification take?',
        a: 'Most credentials are verified within 24-48 hours. Institutional credentials (degrees, certifications) may take 3-5 business days depending on the issuing institution\'s response time.'
      },
      {
        q: 'What credentials can I add?',
        a: 'You can add educational degrees, professional certifications (Food Handler, WHMIS, First Aid, etc.), licenses, work experience from previous employers, and skills assessments. Each type has its own verification process.'
      }
    ]
  },
  {
    category: 'For Employers',
    questions: [
      {
        q: 'How do I verify a candidate\'s credentials?',
        a: 'Candidates can share their WorkPassport™ via a unique link or QR code. Simply scan or click the link to see their verified credentials instantly. Blockchain verification means you can trust the information is authentic.'
      },
      {
        q: 'What does employer access cost?',
        a: 'HR Bank offers flexible pricing for employers. Contact our partnerships team at partnerships@hrbank.ca or call +1 (416) 414-2955 for a customized quote based on your hiring needs.'
      },
      {
        q: 'Can I post jobs on HR Bank?',
        a: 'Yes! Employers can post job listings, manage shifts, and connect with verified workers directly through our platform. Our matching algorithm helps you find candidates with the exact credentials you need.'
      }
    ]
  },
  {
    category: 'For Institutions',
    questions: [
      {
        q: 'How can my institution join HR Bank?',
        a: 'Educational institutions and certification bodies can partner with HR Bank to issue credentials directly to students and members. Contact partnerships@hrbank.ca to learn about our institution partnership program.'
      },
      {
        q: 'What are the benefits for institutions?',
        a: 'Partner institutions appear on our leaderboard, gain visibility to employers, and can track credential usage. Your students benefit from having instantly verifiable credentials that boost their employability.'
      }
    ]
  },
  {
    category: 'Account & Privacy',
    questions: [
      {
        q: 'How is my data protected?',
        a: 'HR Bank uses enterprise-grade encryption for all data. Your personal information (email, phone) is hidden from employers by default. You control exactly what information is visible on your public WorkPassport™.'
      },
      {
        q: 'Can I delete my account?',
        a: 'Yes, you can request account deletion at any time through your account settings or by contacting support@hrbank.ca. Note that blockchain-verified credentials cannot be removed from the blockchain, but your personal profile data will be deleted.'
      },
      {
        q: 'How do I reset my password?',
        a: 'Click "Forgot Password" on the login page, enter your email address, and we\'ll send you a password reset link. For security, links expire after 1 hour.'
      }
    ]
  }
];

const FAQ = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [openQuestions, setOpenQuestions] = useState({});

  const toggleQuestion = (categoryIndex, questionIndex) => {
    const key = `${categoryIndex}-${questionIndex}`;
    setOpenQuestions(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const filteredFaq = faqData.map(category => ({
    ...category,
    questions: category.questions.filter(
      q => q.q.toLowerCase().includes(searchTerm.toLowerCase()) ||
           q.a.toLowerCase().includes(searchTerm.toLowerCase())
    )
  })).filter(category => category.questions.length > 0);

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <nav className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <img 
              src="/logo192.png" 
              alt="HR Bank"
              className="w-10 h-10 rounded-lg object-contain"
            />
            <span className="font-bold text-xl text-gray-900">HR Bank</span>
          </Link>
          <Link 
            to="/" 
            className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <div className="bg-gradient-to-br from-[#30496d] to-[#1a2d47] text-white py-16">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <HelpCircle className="w-16 h-16 mx-auto mb-4 opacity-80" />
          <h1 className="text-4xl font-bold mb-4">Frequently Asked Questions</h1>
          <p className="text-xl text-blue-100 mb-8">
            Find answers to common questions about HR Bank
          </p>
          
          {/* Search */}
          <div className="max-w-xl mx-auto relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search for answers..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 rounded-xl text-gray-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* FAQ Content */}
      <div className="py-16 px-6">
        <div className="max-w-4xl mx-auto">
          {filteredFaq.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500 text-lg">No results found for "{searchTerm}"</p>
              <p className="text-gray-400 mt-2">Try a different search term or browse all categories</p>
              <button 
                onClick={() => setSearchTerm('')}
                className="mt-4 text-blue-600 hover:underline"
              >
                Clear search
              </button>
            </div>
          ) : (
            <div className="space-y-8">
              {filteredFaq.map((category, categoryIndex) => (
                <div key={categoryIndex}>
                  <h2 className="text-2xl font-bold text-gray-900 mb-4">{category.category}</h2>
                  <div className="space-y-3">
                    {category.questions.map((item, questionIndex) => {
                      const isOpen = openQuestions[`${categoryIndex}-${questionIndex}`];
                      return (
                        <div 
                          key={questionIndex}
                          className="border border-gray-200 rounded-xl overflow-hidden"
                        >
                          <button
                            onClick={() => toggleQuestion(categoryIndex, questionIndex)}
                            className="w-full px-6 py-4 flex items-center justify-between text-left bg-white hover:bg-gray-50 transition-colors"
                          >
                            <span className="font-medium text-gray-900">{item.q}</span>
                            {isOpen ? (
                              <ChevronUp className="w-5 h-5 text-gray-500 flex-shrink-0" />
                            ) : (
                              <ChevronDown className="w-5 h-5 text-gray-500 flex-shrink-0" />
                            )}
                          </button>
                          {isOpen && (
                            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
                              <p className="text-gray-700 leading-relaxed">{item.a}</p>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Still need help */}
          <div className="mt-16 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-8 text-center">
            <h3 className="text-2xl font-bold text-gray-900 mb-2">Still have questions?</h3>
            <p className="text-gray-600 mb-6">Our support team is here to help</p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link 
                to="/contact"
                className="px-6 py-3 bg-[#30496d] text-white rounded-lg font-semibold hover:bg-[#243a57] transition-colors"
              >
                Contact Support
              </Link>
              <a 
                href="mailto:support@hrbank.ca"
                className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-white transition-colors"
              >
                support@hrbank.ca
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

export default FAQ;
