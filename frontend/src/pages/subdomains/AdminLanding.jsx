import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Shield, Users, Building2, GraduationCap, Activity,
  BarChart3, Settings, Lock, Globe, CheckCircle
} from 'lucide-react';

const AdminLanding = () => {
  const navigate = useNavigate();

  const features = [
    {
      icon: Users,
      title: 'User Management',
      description: 'Manage workforce, employers, and institutions across the platform.'
    },
    {
      icon: Building2,
      title: 'Franchise Control',
      description: 'Oversee regional franchises and their operations.'
    },
    {
      icon: BarChart3,
      title: 'Analytics Dashboard',
      description: 'Real-time insights into platform performance and growth.'
    },
    {
      icon: Shield,
      title: 'Security & Compliance',
      description: 'Monitor verifications, approvals, and compliance status.'
    },
    {
      icon: Activity,
      title: 'Activity Monitoring',
      description: 'Track all platform activity and audit logs.'
    },
    {
      icon: Settings,
      title: 'System Configuration',
      description: 'Configure platform settings, zones, and permissions.'
    }
  ];

  const stats = [
    { value: '87', label: 'Institutions', icon: GraduationCap },
    { value: '500+', label: 'Employers', icon: Building2 },
    { value: '10K+', label: 'Workforce', icon: Users },
    { value: '13', label: 'Provinces', icon: Globe }
  ];

  return (
    <div className="min-h-screen bg-slate-900">
      {/* Navigation */}
      <nav className="bg-slate-900 border-b border-slate-800 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="w-8 h-8 text-red-500" />
            <div>
              <span className="font-bold text-xl text-white">HR Bank</span>
              <span className="text-red-500 text-sm ml-2">Admin</span>
            </div>
          </div>
          <button
            onClick={() => navigate('/admin/login')}
            className="px-6 py-2 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 flex items-center gap-2"
          >
            <Lock className="w-4 h-4" /> Admin Login
          </button>
        </div>
      </nav>

      {/* Hero */}
      <section className="py-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-red-500/10 rounded-full text-red-400 text-sm mb-6 border border-red-500/20">
            <Shield className="w-4 h-4" />
            <span>Secure Administration Portal</span>
          </div>
          <h1 className="text-5xl font-bold text-white mb-6">
            Platform Administration
          </h1>
          <p className="text-xl text-slate-400 mb-8">
            Manage users, monitor activity, and configure the HR Bank platform.
            Authorized personnel only.
          </p>
          <button
            onClick={() => navigate('/admin/login')}
            className="px-8 py-4 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 text-lg"
          >
            Access Admin Panel
          </button>
        </div>
      </section>

      {/* Stats */}
      <section className="py-12 border-y border-slate-800">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <div key={index} className="text-center">
                <div className="w-12 h-12 bg-slate-800 rounded-lg flex items-center justify-center mx-auto mb-3">
                  <stat.icon className="w-6 h-6 text-slate-400" />
                </div>
                <p className="text-3xl font-bold text-white">{stat.value}</p>
                <p className="text-slate-500">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-white mb-4">Admin Capabilities</h2>
            <p className="text-slate-400">Everything you need to manage the platform</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <div key={index} className="bg-slate-800/50 rounded-xl p-6 border border-slate-700 hover:border-slate-600 transition-colors">
                <div className="w-12 h-12 bg-slate-700 rounded-lg flex items-center justify-center mb-4">
                  <feature.icon className="w-6 h-6 text-red-400" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">{feature.title}</h3>
                <p className="text-slate-400 text-sm">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Security Notice */}
      <section className="py-12 px-6 bg-slate-800/30">
        <div className="max-w-4xl mx-auto">
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-red-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                <Lock className="w-6 h-6 text-red-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white mb-2">Security Notice</h3>
                <p className="text-slate-400 text-sm">
                  This portal is restricted to authorized HR Bank administrators only. 
                  All access attempts are logged and monitored. Unauthorized access is prohibited 
                  and may result in legal action.
                </p>
                <div className="flex items-center gap-4 mt-4 text-sm">
                  <div className="flex items-center gap-2 text-green-400">
                    <CheckCircle className="w-4 h-4" />
                    <span>256-bit Encryption</span>
                  </div>
                  <div className="flex items-center gap-2 text-green-400">
                    <CheckCircle className="w-4 h-4" />
                    <span>MFA Required</span>
                  </div>
                  <div className="flex items-center gap-2 text-green-400">
                    <CheckCircle className="w-4 h-4" />
                    <span>Audit Logging</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 border-t border-slate-800 text-slate-500 py-8 px-6">
        <div className="max-w-7xl mx-auto text-center">
          <p>© {new Date().getFullYear()} HR Bank Administration Portal</p>
          <p className="text-sm mt-2">For support, contact: admin-support@hrbank.ca</p>
        </div>
      </footer>
    </div>
  );
};

export default AdminLanding;
