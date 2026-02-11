import React, { useState, useEffect } from 'react';
import {
  Shield, Eye, EyeOff, Star, CheckCircle, MapPin, 
  Briefcase, Building2, Award, Clock, GraduationCap,
  ToggleLeft, ToggleRight, ChevronRight
} from 'lucide-react';

// Sample data for the demo
const sampleProfile = {
  full_name: "Alex Johnson",
  photo_url: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=180&fit=crop&crop=face",
  location: { city: "Windsor", province: "ON" },
  occupation_profiles: [
    {
      id: "occ_bartender",
      title: "Bartender",
      category: "Food & Hospitality",
      rating: 4.9,
      hours: 2100,
      employers: [
        { name: "The Keg Steakhouse", position: "Head Bartender", hours: 1200 },
        { name: "Moxies Bar & Grill", position: "Bartender", hours: 900 }
      ],
      skills: ["Mixology", "Customer Service", "Cash Handling"]
    },
    {
      id: "occ_chef",
      title: "Chef",
      category: "Food & Hospitality",
      rating: 4.8,
      hours: 1800,
      employers: [
        { name: "Swan Pizza", position: "Sous Chef", hours: 1100 },
        { name: "Boston Pizza", position: "Line Cook", hours: 700 }
      ],
      skills: ["Food Preparation", "Kitchen Management", "Food Safety"]
    },
    {
      id: "occ_uiux",
      title: "Junior UI/UX Developer",
      category: "Technology",
      rating: 4.6,
      hours: 520,
      employers: [
        { name: "TechStart Windsor", position: "UI/UX Intern", hours: 520 }
      ],
      skills: ["Figma", "Adobe XD", "HTML/CSS", "User Research"]
    }
  ],
  credentials: [
    { id: "cred_food", name: "Food Handler Certificate", issuer: "Ontario Food Safety", verified: true },
    { id: "cred_smart", name: "Smart Serve Certification", issuer: "Smart Serve Ontario", verified: true },
    { id: "cred_diploma", name: "Diploma in Business Administration", issuer: "Trios College", verified: true }
  ],
  education: [
    { id: "edu_trios", degree: "Diploma", field: "Business Administration", school: "Trios College", year: 2023 }
  ]
};

const WorkPassportInteractiveDemo = () => {
  const [settings, setSettings] = useState({
    show_photo: true,
    show_name: true,
    show_location: true,
    show_ratings: true,
    show_hours: true,
    show_skills: true
  });
  
  const [selectedOccupations, setSelectedOccupations] = useState({
    occ_bartender: true,
    occ_chef: true,
    occ_uiux: true
  });
  
  const [selectedCredentials, setSelectedCredentials] = useState({
    cred_food: true,
    cred_smart: true,
    cred_diploma: true
  });
  
  const [animatingField, setAnimatingField] = useState(null);

  const toggleSetting = (key) => {
    setAnimatingField(key);
    setSettings(prev => ({ ...prev, [key]: !prev[key] }));
    setTimeout(() => setAnimatingField(null), 500);
  };

  const toggleOccupation = (id) => {
    setAnimatingField(id);
    setSelectedOccupations(prev => ({ ...prev, [id]: !prev[id] }));
    setTimeout(() => setAnimatingField(null), 500);
  };

  const toggleCredential = (id) => {
    setAnimatingField(id);
    setSelectedCredentials(prev => ({ ...prev, [id]: !prev[id] }));
    setTimeout(() => setAnimatingField(null), 500);
  };

  // Calculate visible stats
  const visibleOccupations = sampleProfile.occupation_profiles.filter(o => selectedOccupations[o.id]);
  const totalHours = visibleOccupations.reduce((sum, o) => sum + o.hours, 0);
  const avgRating = visibleOccupations.length > 0 
    ? (visibleOccupations.reduce((sum, o) => sum + o.rating, 0) / visibleOccupations.length).toFixed(1)
    : 0;
  const visibleCredentials = sampleProfile.credentials.filter(c => selectedCredentials[c.id]);

  return (
    <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-3xl p-6 md:p-8 border border-slate-700 shadow-2xl">
      <div className="text-center mb-6">
        <h3 className="text-xl md:text-2xl font-bold text-white mb-2">
          See How It Works — Toggle Controls Below
        </h3>
        <p className="text-slate-400 text-sm">
          Try it yourself: Toggle sections on the left and watch the preview update instantly
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Left Side - Controls */}
        <div className="space-y-4">
          <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
            <h4 className="text-white font-semibold mb-3 flex items-center gap-2">
              <Eye className="w-4 h-4 text-amber-400" />
              Display Settings
            </h4>
            <div className="space-y-2">
              {[
                { key: 'show_photo', label: 'Profile Photo', icon: '👤' },
                { key: 'show_name', label: 'Full Name', icon: '📛' },
                { key: 'show_location', label: 'Location', icon: '📍' },
                { key: 'show_ratings', label: 'Ratings', icon: '⭐' },
                { key: 'show_hours', label: 'Hours Worked', icon: '⏱️' },
                { key: 'show_skills', label: 'Skills', icon: '🎯' }
              ].map(item => (
                <button
                  key={item.key}
                  onClick={() => toggleSetting(item.key)}
                  className={`w-full flex items-center justify-between p-2 rounded-lg transition-all ${
                    settings[item.key] 
                      ? 'bg-green-500/20 border border-green-500/30' 
                      : 'bg-slate-700/50 border border-slate-600'
                  } ${animatingField === item.key ? 'scale-95' : ''}`}
                >
                  <span className="flex items-center gap-2">
                    <span>{item.icon}</span>
                    <span className={`text-sm ${settings[item.key] ? 'text-white' : 'text-slate-400'}`}>
                      {item.label}
                    </span>
                  </span>
                  {settings[item.key] ? (
                    <ToggleRight className="w-5 h-5 text-green-400" />
                  ) : (
                    <ToggleLeft className="w-5 h-5 text-slate-500" />
                  )}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
            <h4 className="text-white font-semibold mb-3 flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-amber-400" />
              Career Entries
            </h4>
            <div className="space-y-2">
              {sampleProfile.occupation_profiles.map(occ => (
                <button
                  key={occ.id}
                  onClick={() => toggleOccupation(occ.id)}
                  className={`w-full flex items-center justify-between p-2 rounded-lg transition-all ${
                    selectedOccupations[occ.id]
                      ? 'bg-amber-500/20 border border-amber-500/30'
                      : 'bg-slate-700/50 border border-slate-600'
                  } ${animatingField === occ.id ? 'scale-95' : ''}`}
                >
                  <span className={`text-sm ${selectedOccupations[occ.id] ? 'text-white' : 'text-slate-400'}`}>
                    {occ.title}
                  </span>
                  {selectedOccupations[occ.id] ? (
                    <ToggleRight className="w-5 h-5 text-amber-400" />
                  ) : (
                    <ToggleLeft className="w-5 h-5 text-slate-500" />
                  )}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
            <h4 className="text-white font-semibold mb-3 flex items-center gap-2">
              <Shield className="w-4 h-4 text-amber-400" />
              Credentials
            </h4>
            <div className="space-y-2">
              {sampleProfile.credentials.map(cred => (
                <button
                  key={cred.id}
                  onClick={() => toggleCredential(cred.id)}
                  className={`w-full flex items-center justify-between p-2 rounded-lg transition-all ${
                    selectedCredentials[cred.id]
                      ? 'bg-green-500/20 border border-green-500/30'
                      : 'bg-slate-700/50 border border-slate-600'
                  } ${animatingField === cred.id ? 'scale-95' : ''}`}
                >
                  <span className={`text-sm text-left ${selectedCredentials[cred.id] ? 'text-white' : 'text-slate-400'}`}>
                    {cred.name}
                  </span>
                  {selectedCredentials[cred.id] ? (
                    <ToggleRight className="w-5 h-5 text-green-400" />
                  ) : (
                    <ToggleLeft className="w-5 h-5 text-slate-500" />
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right Side - Live Preview */}
        <div className="bg-gradient-to-br from-slate-700 to-slate-800 rounded-xl p-4 border border-slate-600">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs text-amber-400 font-medium flex items-center gap-1">
              <span className="w-2 h-2 bg-amber-400 rounded-full animate-pulse"></span>
              LIVE PREVIEW
            </span>
            <span className="text-xs text-slate-500">Employer View</span>
          </div>

          {/* Header */}
          <div className="h-1 bg-gradient-to-r from-amber-400 via-amber-500 to-amber-400 rounded-full mb-4"></div>
          
          {/* Profile Header */}
          <div className="flex items-start gap-3 mb-4">
            {settings.show_photo ? (
              <img 
                src={sampleProfile.photo_url}
                alt=""
                className={`w-14 h-16 rounded-lg border-2 border-amber-500/50 object-cover transition-all ${
                  animatingField === 'show_photo' ? 'opacity-50 scale-95' : ''
                }`}
              />
            ) : (
              <div className={`w-14 h-16 rounded-lg border-2 border-slate-600 bg-slate-700 flex items-center justify-center transition-all ${
                animatingField === 'show_photo' ? 'opacity-50 scale-95' : ''
              }`}>
                <EyeOff className="w-5 h-5 text-slate-500" />
              </div>
            )}
            
            <div className="flex-1">
              {settings.show_name ? (
                <h4 className={`text-white font-bold transition-all ${
                  animatingField === 'show_name' ? 'opacity-50' : ''
                }`}>{sampleProfile.full_name}</h4>
              ) : (
                <h4 className={`text-slate-500 italic transition-all ${
                  animatingField === 'show_name' ? 'opacity-50' : ''
                }`}>Name Hidden</h4>
              )}
              
              {settings.show_location ? (
                <p className={`text-slate-400 text-xs flex items-center gap-1 transition-all ${
                  animatingField === 'show_location' ? 'opacity-50' : ''
                }`}>
                  <MapPin className="w-3 h-3 text-amber-400" />
                  {sampleProfile.location.city}, {sampleProfile.location.province}
                </p>
              ) : (
                <p className={`text-slate-500 text-xs italic transition-all ${
                  animatingField === 'show_location' ? 'opacity-50' : ''
                }`}>Location Hidden</p>
              )}
              
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-500/20 text-green-400 rounded-full text-[10px] font-medium mt-1">
                <CheckCircle className="w-3 h-3" /> Verified
              </span>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-2 p-2 bg-slate-800/50 rounded-lg mb-4">
            <div className="text-center">
              <p className="text-lg font-bold text-amber-400">{visibleOccupations.length}</p>
              <p className="text-[9px] text-slate-400">Careers</p>
            </div>
            {settings.show_hours && (
              <div className={`text-center transition-all ${animatingField === 'show_hours' ? 'opacity-50' : ''}`}>
                <p className="text-lg font-bold text-amber-400">{totalHours.toLocaleString()}</p>
                <p className="text-[9px] text-slate-400">Hours</p>
              </div>
            )}
            {settings.show_ratings && (
              <div className={`text-center transition-all ${animatingField === 'show_ratings' ? 'opacity-50' : ''}`}>
                <div className="flex items-center justify-center gap-0.5">
                  <p className="text-lg font-bold text-amber-400">{avgRating}</p>
                  <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                </div>
                <p className="text-[9px] text-slate-400">Rating</p>
              </div>
            )}
          </div>

          {/* Occupations */}
          {visibleOccupations.length > 0 ? (
            <div className="space-y-2 mb-4">
              <p className="text-[10px] text-slate-400 uppercase flex items-center gap-1">
                <Briefcase className="w-3 h-3" /> Career Entries
              </p>
              {visibleOccupations.map(occ => (
                <div 
                  key={occ.id}
                  className={`bg-slate-800/80 rounded-lg p-2 border border-slate-600 transition-all ${
                    animatingField === occ.id ? 'opacity-50 scale-95' : ''
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-white text-sm font-medium">{occ.title}</span>
                    {settings.show_ratings && (
                      <div className="flex items-center gap-0.5 bg-amber-500/20 px-1.5 py-0.5 rounded">
                        <span className="text-amber-400 text-xs font-bold">{occ.rating}</span>
                        <Star className="w-2.5 h-2.5 text-amber-400 fill-amber-400" />
                      </div>
                    )}
                  </div>
                  <p className="text-[10px] text-slate-400 mb-1">{occ.category}</p>
                  
                  {/* Employers */}
                  <div className="space-y-1 mt-2">
                    {occ.employers.map((emp, idx) => (
                      <div key={idx} className="flex items-center justify-between text-[10px]">
                        <span className="text-slate-300 flex items-center gap-1">
                          <Building2 className="w-2.5 h-2.5 text-slate-500" />
                          {emp.name}
                        </span>
                        {settings.show_hours && (
                          <span className="text-slate-500">{emp.hours}h</span>
                        )}
                      </div>
                    ))}
                  </div>
                  
                  {/* Skills */}
                  {settings.show_skills && (
                    <div className={`flex flex-wrap gap-1 mt-2 transition-all ${
                      animatingField === 'show_skills' ? 'opacity-50' : ''
                    }`}>
                      {occ.skills.slice(0, 3).map((skill, idx) => (
                        <span key={idx} className="px-1.5 py-0.5 bg-slate-700 text-slate-300 rounded text-[8px]">
                          {skill}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-4 mb-4">
              <EyeOff className="w-8 h-8 text-slate-600 mx-auto mb-1" />
              <p className="text-slate-500 text-xs">No careers selected</p>
            </div>
          )}

          {/* Credentials */}
          {visibleCredentials.length > 0 && (
            <div className="space-y-1">
              <p className="text-[10px] text-slate-400 uppercase flex items-center gap-1">
                <Shield className="w-3 h-3" /> Credentials
              </p>
              {visibleCredentials.map(cred => (
                <div 
                  key={cred.id}
                  className={`flex items-center justify-between p-1.5 bg-slate-800/50 rounded-lg transition-all ${
                    animatingField === cred.id ? 'opacity-50 scale-95' : ''
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 bg-green-500/20 rounded-full flex items-center justify-center">
                      <CheckCircle className="w-3 h-3 text-green-400" />
                    </div>
                    <div>
                      <p className="text-[10px] text-white">{cred.name}</p>
                      <p className="text-[8px] text-slate-500">{cred.issuer}</p>
                    </div>
                  </div>
                  <Shield className="w-3 h-3 text-green-400" />
                </div>
              ))}
            </div>
          )}

          {/* Footer */}
          <div className="mt-4 pt-3 border-t border-slate-700 flex items-center justify-between">
            <span className="text-[9px] text-green-400 flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
              Blockchain Verified
            </span>
            <span className="text-[9px] text-slate-500">hrbank.ca/passport/ALEX2024</span>
          </div>
        </div>
      </div>

      {/* CTA */}
      <div className="mt-6 text-center">
        <p className="text-slate-400 text-sm mb-3">
          Create your own WorkPassport™ and control exactly what employers see
        </p>
        <a
          href="/signup?type=workforce"
          className="inline-flex items-center gap-2 px-6 py-3 bg-amber-500 text-slate-900 rounded-lg font-semibold hover:bg-amber-400 transition-colors"
        >
          Build Your WorkPassport™
          <ChevronRight className="w-5 h-5" />
        </a>
      </div>
    </div>
  );
};

export default WorkPassportInteractiveDemo;
