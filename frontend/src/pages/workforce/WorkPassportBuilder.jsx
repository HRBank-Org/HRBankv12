import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../../contexts/ThemeContext';
import WorkforceHeader from '../../components/layout/WorkforceHeader';
import WorkforceSidebar from '../../components/layout/WorkforceSidebar';
import api from '../../utils/api';
import {
  Shield, Eye, EyeOff, QrCode, Link2, Copy, Check,
  RefreshCw, ExternalLink, Download, Share2, Lock,
  User, MapPin, Briefcase, Clock, Star, Award, Building2, 
  Stamp, ChevronDown, ChevronRight, GraduationCap, CheckCircle,
  ToggleLeft, ToggleRight, Layers, FileText, Calendar
} from 'lucide-react';

// Mini preview component that mirrors the public WorkPassport
const LivePreview = ({ settings, profileData, selectedItems }) => {
  const getInitials = (name) => {
    if (!name) return 'HR';
    const parts = name.split(' ');
    return parts.length >= 2 ? parts[0][0] + parts[1][0] : name.substring(0, 2).toUpperCase();
  };

  const privacy = settings?.privacy || {};
  const profile = profileData || {};
  
  // Filter occupation profiles based on selection
  const visibleOccupations = (profile.occupation_profiles || []).filter(
    occ => selectedItems.occupations[occ.occupation_id] !== false
  );
  
  // Filter credentials based on selection
  const visibleCredentials = (profile.credentials || []).filter(
    cred => selectedItems.credentials[cred.credential_id] !== false
  );

  return (
    <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl overflow-hidden border border-slate-700 h-full flex flex-col">
      {/* Header */}
      <div className="h-1.5 bg-gradient-to-r from-amber-400 via-amber-500 to-amber-400"></div>
      
      <div className="px-4 py-3 border-b border-slate-700 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <img src="/work-passport-seal.png" alt="Seal" className="w-8 h-8 object-contain" />
          <div>
            <h3 className="text-sm font-bold text-white">WorkPassport™</h3>
            <p className="text-amber-400 text-[10px]">LIVE PREVIEW</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-slate-400 text-[10px]">Passport No.</p>
          <p className="text-white font-mono text-xs font-bold">{settings?.profile_code || 'XXXXXX'}</p>
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Profile Header */}
        <div className="flex items-start gap-3">
          {privacy.show_photo !== false ? (
            profile.photo_url ? (
              <img src={profile.photo_url} alt="" className="w-16 h-20 rounded-lg border-2 border-amber-500/30 object-cover" />
            ) : (
              <div className="w-16 h-20 rounded-lg border-2 border-amber-500/30 bg-slate-700 flex items-center justify-center text-white text-lg font-bold">
                {getInitials(profile.full_name)}
              </div>
            )
          ) : (
            <div className="w-16 h-20 rounded-lg border-2 border-slate-600 bg-slate-700/50 flex items-center justify-center">
              <EyeOff className="w-6 h-6 text-slate-500" />
            </div>
          )}
          
          <div className="flex-1 min-w-0">
            {privacy.show_full_name !== false ? (
              <h4 className="text-lg font-bold text-white truncate">{profile.full_name || 'Your Name'}</h4>
            ) : (
              <h4 className="text-lg font-bold text-slate-500 italic">Name Hidden</h4>
            )}
            
            {privacy.show_location !== false && profile.location ? (
              <p className="text-slate-400 text-xs flex items-center gap-1 mt-1">
                <MapPin className="w-3 h-3 text-amber-400" />
                {[profile.location?.city, profile.location?.province].filter(Boolean).join(', ')}
              </p>
            ) : privacy.show_location === false ? (
              <p className="text-slate-500 text-xs italic mt-1">Location Hidden</p>
            ) : null}
            
            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-500/20 text-green-400 rounded-full text-[10px] font-medium mt-2">
              <CheckCircle className="w-3 h-3" /> Verified
            </span>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-2 p-3 bg-slate-700/30 rounded-lg">
          <div className="text-center">
            <p className="text-lg font-bold text-amber-400">{visibleOccupations.length}</p>
            <p className="text-[9px] text-slate-400">Occupations</p>
          </div>
          {privacy.show_experience !== false && (
            <div className="text-center">
              <p className="text-lg font-bold text-amber-400">{profile.total_experience || 0}</p>
              <p className="text-[9px] text-slate-400">Years</p>
            </div>
          )}
          {privacy.show_hours_worked !== false && (
            <div className="text-center">
              <p className="text-lg font-bold text-amber-400">{(profile.total_hours || 0).toLocaleString()}</p>
              <p className="text-[9px] text-slate-400">Hours</p>
            </div>
          )}
          {privacy.show_ratings !== false && (
            <div className="text-center">
              <div className="flex items-center justify-center gap-0.5">
                <p className="text-lg font-bold text-amber-400">{profile.avg_rating || '4.8'}</p>
                <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
              </div>
              <p className="text-[9px] text-slate-400">Rating</p>
            </div>
          )}
        </div>

        {/* Occupation Profiles */}
        {privacy.show_occupation_profiles !== false && visibleOccupations.length > 0 && (
          <div>
            <h5 className="text-xs font-semibold text-white mb-2 flex items-center gap-1">
              <Briefcase className="w-3 h-3 text-amber-400" /> Career Entries
            </h5>
            <div className="space-y-2">
              {visibleOccupations.map((occ, idx) => (
                <div key={occ.occupation_id || idx} className="bg-slate-700/50 rounded-lg p-3 border border-slate-600">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <h6 className="text-sm font-bold text-white">{occ.occupation_title}</h6>
                      <p className="text-[10px] text-slate-400">{occ.occupation_category}</p>
                    </div>
                    {privacy.show_ratings !== false && occ.skill_rating_avg && (
                      <div className="flex items-center gap-0.5 bg-amber-500/20 px-2 py-0.5 rounded-full">
                        <span className="text-amber-400 text-xs font-bold">{occ.skill_rating_avg}</span>
                        <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                      </div>
                    )}
                  </div>
                  
                  {/* Employment under this occupation */}
                  {privacy.show_employment_history !== false && occ.employment_history?.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-slate-600">
                      {occ.employment_history
                        .filter(emp => selectedItems.employment[`${occ.occupation_id}_${emp.company_name}`] !== false)
                        .map((emp, empIdx) => (
                          <div key={empIdx} className="flex items-center justify-between py-1">
                            <div className="flex items-center gap-2">
                              <Building2 className="w-3 h-3 text-slate-400" />
                              <div>
                                <p className="text-xs text-white">{emp.company_name}</p>
                                <p className="text-[10px] text-slate-400">{emp.position_title}</p>
                              </div>
                            </div>
                            {privacy.show_hours_worked !== false && (
                              <span className="text-[10px] text-slate-400">{emp.total_hours}h</span>
                            )}
                          </div>
                        ))}
                    </div>
                  )}
                  
                  {/* Skills */}
                  {privacy.show_skills !== false && occ.skills?.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {occ.skills.slice(0, 4).map((skill, skillIdx) => (
                        <span key={skillIdx} className="px-1.5 py-0.5 bg-slate-600 text-slate-300 rounded text-[9px]">
                          {skill}
                        </span>
                      ))}
                      {occ.skills.length > 4 && (
                        <span className="px-1.5 py-0.5 text-slate-400 text-[9px]">+{occ.skills.length - 4}</span>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Credentials */}
        {privacy.show_credentials !== false && visibleCredentials.length > 0 && (
          <div>
            <h5 className="text-xs font-semibold text-white mb-2 flex items-center gap-1">
              <Shield className="w-3 h-3 text-amber-400" /> Verified Credentials
            </h5>
            <div className="space-y-1">
              {visibleCredentials.map((cred, idx) => (
                <div key={cred.credential_id || idx} className="flex items-center justify-between p-2 bg-slate-700/30 rounded-lg">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 bg-green-500/20 rounded-full flex items-center justify-center">
                      <CheckCircle className="w-3 h-3 text-green-400" />
                    </div>
                    <div>
                      <p className="text-xs text-white">{cred.credential_name}</p>
                      <p className="text-[10px] text-slate-400">{cred.institution_name}</p>
                    </div>
                  </div>
                  {cred.blockchain_verified && (
                    <Shield className="w-3 h-3 text-green-400" />
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Education */}
        {privacy.show_education !== false && profile.education?.length > 0 && (
          <div>
            <h5 className="text-xs font-semibold text-white mb-2 flex items-center gap-1">
              <GraduationCap className="w-3 h-3 text-amber-400" /> Education
            </h5>
            <div className="space-y-1">
              {profile.education
                .filter(edu => selectedItems.education[edu.education_id] !== false)
                .map((edu, idx) => (
                  <div key={edu.education_id || idx} className="p-2 bg-slate-700/30 rounded-lg">
                    <p className="text-xs text-white">{edu.degree} in {edu.field_of_study}</p>
                    <p className="text-[10px] text-slate-400">{edu.institution_name} • {edu.end_year}</p>
                  </div>
                ))}
            </div>
          </div>
        )}
        
        {/* Empty State */}
        {visibleOccupations.length === 0 && visibleCredentials.length === 0 && (
          <div className="text-center py-8">
            <EyeOff className="w-12 h-12 text-slate-600 mx-auto mb-2" />
            <p className="text-slate-400 text-sm">No items selected to display</p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-2 bg-slate-900/50 border-t border-slate-700 text-center">
        <p className="text-[10px] text-slate-500">This is a live preview of your shared WorkPassport™</p>
      </div>
    </div>
  );
};

// Collapsible Section Component
const CollapsibleSection = ({ title, icon: Icon, children, defaultOpen = true, count }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  
  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden bg-white">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
            <Icon className="w-5 h-5 text-amber-600" />
          </div>
          <div className="text-left">
            <h4 className="font-semibold text-gray-900">{title}</h4>
            {count !== undefined && (
              <p className="text-xs text-gray-500">{count} item{count !== 1 ? 's' : ''}</p>
            )}
          </div>
        </div>
        {isOpen ? (
          <ChevronDown className="w-5 h-5 text-gray-400" />
        ) : (
          <ChevronRight className="w-5 h-5 text-gray-400" />
        )}
      </button>
      {isOpen && (
        <div className="px-4 pb-4 border-t border-gray-100">
          {children}
        </div>
      )}
    </div>
  );
};

// Toggle Item Component
const ToggleItem = ({ label, sublabel, enabled, onChange, indent = false }) => {
  return (
    <div className={`flex items-center justify-between py-3 ${indent ? 'pl-6 border-l-2 border-gray-100 ml-4' : ''}`}>
      <div>
        <p className={`font-medium ${enabled ? 'text-gray-900' : 'text-gray-400'}`}>{label}</p>
        {sublabel && <p className="text-xs text-gray-500">{sublabel}</p>}
      </div>
      <button
        onClick={onChange}
        className={`relative w-12 h-6 rounded-full transition-colors ${
          enabled ? 'bg-green-500' : 'bg-gray-300'
        }`}
      >
        <span
          className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${
            enabled ? 'left-7' : 'left-1'
          }`}
        />
      </button>
    </div>
  );
};

const WorkPassportBuilder = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState(null);
  const [profileData, setProfileData] = useState(null);
  const [copied, setCopied] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  
  // Granular selection state
  const [selectedItems, setSelectedItems] = useState({
    occupations: {},
    credentials: {},
    employment: {},
    education: {}
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [settingsRes, profileRes] = await Promise.all([
        api.get('/api/career-profile/my-settings'),
        api.get('/api/workforce/my-profile')
      ]);
      
      if (settingsRes.data.success) {
        setSettings(settingsRes.data.data);
      }
      
      if (profileRes.data.success || profileRes.data.data) {
        const profile = profileRes.data.data || profileRes.data;
        setProfileData(profile);
        
        // Initialize all items as selected by default
        const initialSelections = {
          occupations: {},
          credentials: {},
          employment: {},
          education: {}
        };
        
        (profile.occupation_profiles || []).forEach(occ => {
          initialSelections.occupations[occ.occupation_id] = true;
          (occ.employment_history || []).forEach(emp => {
            initialSelections.employment[`${occ.occupation_id}_${emp.company_name}`] = true;
          });
        });
        
        (profile.credentials || []).forEach(cred => {
          initialSelections.credentials[cred.credential_id] = true;
        });
        
        (profile.education || []).forEach(edu => {
          initialSelections.education[edu.education_id] = true;
        });
        
        setSelectedItems(initialSelections);
      }
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const updatePrivacy = async (key, value) => {
    setSaving(true);
    try {
      const response = await api.patch('/api/career-profile/my-settings', {
        [key]: value
      });
      if (response.data.success) {
        setSettings(prev => ({
          ...prev,
          privacy: {
            ...prev.privacy,
            [key]: value
          }
        }));
      }
    } catch (error) {
      console.error('Failed to update privacy:', error);
    } finally {
      setSaving(false);
    }
  };

  const toggleItem = useCallback((category, itemId) => {
    setSelectedItems(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [itemId]: !prev[category][itemId]
      }
    }));
  }, []);

  const toggleOccupation = useCallback((occId) => {
    setSelectedItems(prev => {
      const newEnabled = !prev.occupations[occId];
      const newEmployment = { ...prev.employment };
      
      // Also toggle all employment under this occupation
      const occ = profileData?.occupation_profiles?.find(o => o.occupation_id === occId);
      if (occ?.employment_history) {
        occ.employment_history.forEach(emp => {
          newEmployment[`${occId}_${emp.company_name}`] = newEnabled;
        });
      }
      
      return {
        ...prev,
        occupations: {
          ...prev.occupations,
          [occId]: newEnabled
        },
        employment: newEmployment
      };
    });
  }, [profileData]);

  const regenerateCode = async () => {
    if (!window.confirm('This will invalidate all existing links. Are you sure?')) {
      return;
    }
    setRegenerating(true);
    try {
      const response = await api.post('/api/career-profile/regenerate-code');
      if (response.data.success) {
        setSettings(prev => ({
          ...prev,
          profile_code: response.data.data.profile_code,
          profile_url: response.data.data.profile_url,
          qr_code: response.data.data.qr_code
        }));
      }
    } catch (error) {
      console.error('Failed to regenerate code:', error);
    } finally {
      setRegenerating(false);
    }
  };

  const copyLink = () => {
    navigator.clipboard.writeText(settings.profile_url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadQR = () => {
    const link = document.createElement('a');
    link.download = 'work-passport-qr.png';
    link.href = settings.qr_code;
    link.click();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2" style={{ borderColor: theme.primaryColor }}></div>
      </div>
    );
  }

  const privacy = settings?.privacy || {};

  return (
    <div className="min-h-screen bg-gray-100">
      <WorkforceHeader />
      <WorkforceSidebar />
      
      <div className="transition-all duration-300 pt-[64px]" style={{ marginLeft: 'var(--sidebar-width, 70px)' }}>
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-800 to-slate-900 text-white px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-amber-400 to-amber-600 rounded-lg flex items-center justify-center">
                <Stamp className="w-7 h-7 text-slate-900" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">WorkPassport™ Builder</h1>
                <p className="text-slate-300 text-sm">Customize what employers see on your profile</p>
              </div>
            </div>
            
            {/* Share Actions */}
            <div className="flex items-center gap-3">
              <button
                onClick={copyLink}
                className="flex items-center gap-2 px-4 py-2 bg-slate-700 rounded-lg hover:bg-slate-600 transition-colors"
              >
                {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                <span className="text-sm">{copied ? 'Copied!' : 'Copy Link'}</span>
              </button>
              <a
                href={settings?.profile_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2 bg-amber-500 text-slate-900 rounded-lg font-medium hover:bg-amber-400 transition-colors"
              >
                <ExternalLink className="w-4 h-4" />
                <span className="text-sm">View Live</span>
              </a>
            </div>
          </div>
        </div>

        {/* Split Screen Layout */}
        <div className="flex h-[calc(100vh-180px)]">
          {/* Left Panel - Controls */}
          <div className="w-1/2 overflow-y-auto p-6 space-y-4">
            {/* Profile Visibility Quick Toggle */}
            <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Eye className="w-5 h-5 text-amber-600" />
                  <div>
                    <p className="font-semibold text-gray-900">Profile Visibility</p>
                    <p className="text-xs text-gray-600">Control who can see your WorkPassport™</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  {['public', 'link_only', 'private'].map((visibility) => (
                    <button
                      key={visibility}
                      onClick={() => updatePrivacy('profile_visibility', visibility)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                        privacy.profile_visibility === visibility
                          ? 'bg-amber-500 text-white'
                          : 'bg-white border border-gray-200 text-gray-600 hover:border-amber-300'
                      }`}
                    >
                      {visibility === 'public' && 'Public'}
                      {visibility === 'link_only' && 'Link Only'}
                      {visibility === 'private' && 'Private'}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Basic Info Section */}
            <CollapsibleSection title="Basic Information" icon={User} defaultOpen={true}>
              <div className="pt-4 space-y-1 divide-y divide-gray-100">
                <ToggleItem
                  label="Full Name"
                  sublabel="Display your complete name"
                  enabled={privacy.show_full_name !== false}
                  onChange={() => updatePrivacy('show_full_name', privacy.show_full_name === false)}
                />
                <ToggleItem
                  label="Profile Photo"
                  sublabel="Show your profile picture"
                  enabled={privacy.show_photo !== false}
                  onChange={() => updatePrivacy('show_photo', privacy.show_photo === false)}
                />
                <ToggleItem
                  label="Location"
                  sublabel="City and Province only"
                  enabled={privacy.show_location !== false}
                  onChange={() => updatePrivacy('show_location', privacy.show_location === false)}
                />
              </div>
            </CollapsibleSection>

            {/* Career Metrics Section */}
            <CollapsibleSection title="Career Metrics" icon={Clock} defaultOpen={true}>
              <div className="pt-4 space-y-1 divide-y divide-gray-100">
                <ToggleItem
                  label="Years of Experience"
                  sublabel="Total years in your occupations"
                  enabled={privacy.show_experience !== false}
                  onChange={() => updatePrivacy('show_experience', privacy.show_experience === false)}
                />
                <ToggleItem
                  label="Hours Worked"
                  sublabel="Total tracked hours"
                  enabled={privacy.show_hours_worked !== false}
                  onChange={() => updatePrivacy('show_hours_worked', privacy.show_hours_worked === false)}
                />
                <ToggleItem
                  label="Ratings & Reviews"
                  sublabel="Employer feedback scores"
                  enabled={privacy.show_ratings !== false}
                  onChange={() => updatePrivacy('show_ratings', privacy.show_ratings === false)}
                />
              </div>
            </CollapsibleSection>

            {/* Occupation Profiles Section */}
            <CollapsibleSection 
              title="Occupation Profiles" 
              icon={Briefcase} 
              count={profileData?.occupation_profiles?.length || 0}
              defaultOpen={true}
            >
              <div className="pt-4">
                <ToggleItem
                  label="Show Career Entries"
                  sublabel="Master toggle for all occupations"
                  enabled={privacy.show_occupation_profiles !== false}
                  onChange={() => updatePrivacy('show_occupation_profiles', privacy.show_occupation_profiles === false)}
                />
                
                {privacy.show_occupation_profiles !== false && profileData?.occupation_profiles?.map((occ) => (
                  <div key={occ.occupation_id} className="mt-4 border border-gray-200 rounded-lg p-4">
                    <ToggleItem
                      label={occ.occupation_title}
                      sublabel={`${occ.occupation_category} • ${occ.total_hours_worked || 0} hours`}
                      enabled={selectedItems.occupations[occ.occupation_id] !== false}
                      onChange={() => toggleOccupation(occ.occupation_id)}
                    />
                    
                    {/* Employment under this occupation */}
                    {selectedItems.occupations[occ.occupation_id] !== false && occ.employment_history?.map((emp, idx) => (
                      <ToggleItem
                        key={idx}
                        label={emp.company_name}
                        sublabel={emp.position_title}
                        enabled={selectedItems.employment[`${occ.occupation_id}_${emp.company_name}`] !== false}
                        onChange={() => toggleItem('employment', `${occ.occupation_id}_${emp.company_name}`)}
                        indent={true}
                      />
                    ))}
                  </div>
                ))}
                
                {(!profileData?.occupation_profiles || profileData.occupation_profiles.length === 0) && (
                  <div className="text-center py-6 text-gray-500">
                    <Briefcase className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No occupation profiles yet</p>
                  </div>
                )}
              </div>
            </CollapsibleSection>

            {/* Skills Section */}
            <CollapsibleSection title="Skills" icon={Award} defaultOpen={false}>
              <div className="pt-4">
                <ToggleItem
                  label="Display Skills"
                  sublabel="Show skills listed under each occupation"
                  enabled={privacy.show_skills !== false}
                  onChange={() => updatePrivacy('show_skills', privacy.show_skills === false)}
                />
              </div>
            </CollapsibleSection>

            {/* Credentials Section */}
            <CollapsibleSection 
              title="Credentials & Certifications" 
              icon={Shield}
              count={profileData?.credentials?.length || 0}
              defaultOpen={true}
            >
              <div className="pt-4">
                <ToggleItem
                  label="Show Credentials"
                  sublabel="Master toggle for all credentials"
                  enabled={privacy.show_credentials !== false}
                  onChange={() => updatePrivacy('show_credentials', privacy.show_credentials === false)}
                />
                
                {privacy.show_credentials !== false && profileData?.credentials?.map((cred) => (
                  <ToggleItem
                    key={cred.credential_id}
                    label={cred.credential_name}
                    sublabel={cred.institution_name}
                    enabled={selectedItems.credentials[cred.credential_id] !== false}
                    onChange={() => toggleItem('credentials', cred.credential_id)}
                    indent={true}
                  />
                ))}
              </div>
            </CollapsibleSection>

            {/* Employment History Section */}
            <CollapsibleSection title="Employment History" icon={Building2} defaultOpen={false}>
              <div className="pt-4">
                <ToggleItem
                  label="Show Work History"
                  sublabel="Display employment records under occupations"
                  enabled={privacy.show_employment_history !== false}
                  onChange={() => updatePrivacy('show_employment_history', privacy.show_employment_history === false)}
                />
              </div>
            </CollapsibleSection>

            {/* Education Section */}
            <CollapsibleSection 
              title="Education" 
              icon={GraduationCap}
              count={profileData?.education?.length || 0}
              defaultOpen={false}
            >
              <div className="pt-4">
                <ToggleItem
                  label="Show Education"
                  sublabel="Master toggle for education history"
                  enabled={privacy.show_education !== false}
                  onChange={() => updatePrivacy('show_education', privacy.show_education === false)}
                />
                
                {privacy.show_education !== false && profileData?.education?.map((edu) => (
                  <ToggleItem
                    key={edu.education_id}
                    label={`${edu.degree} in ${edu.field_of_study}`}
                    sublabel={`${edu.institution_name} • ${edu.end_year}`}
                    enabled={selectedItems.education[edu.education_id] !== false}
                    onChange={() => toggleItem('education', edu.education_id)}
                    indent={true}
                  />
                ))}
              </div>
            </CollapsibleSection>

            {/* QR Code & Share Section */}
            <div className="bg-slate-800 rounded-xl p-6 text-white">
              <div className="flex items-start gap-4">
                <div className="bg-white p-2 rounded-lg">
                  {settings?.qr_code && (
                    <img src={settings.qr_code} alt="QR Code" className="w-24 h-24" />
                  )}
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold mb-2">Share Your WorkPassport™</h4>
                  <p className="text-slate-300 text-sm mb-3">
                    Employers can scan the QR code or use the link to view your profile
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={downloadQR}
                      className="flex items-center gap-1 px-3 py-1.5 bg-amber-500 text-slate-900 rounded-lg text-sm font-medium hover:bg-amber-400"
                    >
                      <Download className="w-4 h-4" />
                      Download QR
                    </button>
                    <button
                      onClick={regenerateCode}
                      disabled={regenerating}
                      className="flex items-center gap-1 px-3 py-1.5 bg-slate-700 rounded-lg text-sm hover:bg-slate-600"
                    >
                      <RefreshCw className={`w-4 h-4 ${regenerating ? 'animate-spin' : ''}`} />
                      New Code
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Privacy Notice */}
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <Shield className="w-5 h-5 text-slate-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-slate-700">
                  <strong>Privacy Protected:</strong> Your email, phone, and full address are NEVER shared. 
                  Employers must create an HR Bank account to connect with you.
                </div>
              </div>
            </div>
          </div>

          {/* Right Panel - Live Preview */}
          <div className="w-1/2 bg-slate-900 p-6 sticky top-0">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-white font-semibold flex items-center gap-2">
                <Eye className="w-4 h-4 text-amber-400" />
                Live Preview
              </h3>
              <span className="text-xs text-slate-400 bg-slate-800 px-2 py-1 rounded">
                Updates in real-time
              </span>
            </div>
            <div className="h-[calc(100%-50px)]">
              <LivePreview 
                settings={settings} 
                profileData={profileData}
                selectedItems={selectedItems}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WorkPassportBuilder;
