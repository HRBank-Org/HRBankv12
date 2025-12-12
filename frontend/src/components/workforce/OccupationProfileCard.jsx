import React, { useState } from 'react';
import { FiClock, FiAward, FiCheckCircle, FiTrendingUp } from 'react-icons/fi';
import moment from 'moment';
import SkillRating from './SkillRating';

const OccupationProfileCard = ({ occupation, theme }) => {
  const [expanded, setExpanded] = useState(false);
  
  return (
    <div className="bg-white border-2 border-gray-200 rounded-lg overflow-hidden hover:shadow-lg transition-all">
      {/* Header */}
      <div 
        className="p-6 cursor-pointer"
        onClick={() => setExpanded(!expanded)}
        style={{ 
          background: `linear-gradient(135deg, ${theme.primaryColor}15 0%, ${theme.primaryColor}05 100%)`
        }}
      >
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <h3 className="text-xl font-bold text-gray-900 mb-1">
              {occupation.occupation_title}
            </h3>
            <p className="text-sm text-gray-600">{occupation.occupation_category}</p>
          </div>
          {occupation.primary && (
            <span className="px-3 py-1 bg-blue-600 text-white text-xs font-medium rounded-full">
              Primary
            </span>
          )}
        </div>
        
        {/* Experience & Skill Rating */}
        <div className="flex items-center gap-4 mt-4">
          <div className="flex items-center gap-2 text-gray-700">
            <FiClock className="w-4 h-4" />
            <span className="text-sm font-medium">{occupation.years_of_experience || 0} years</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">Skill Rating:</span>
            <div className="flex items-center gap-1">
              <span className="text-lg font-bold text-gray-900">4.8</span>
              <div className="flex">
                {[1, 2, 3, 4, 5].map((star) => (
                  <span key={star} className="text-yellow-400">★</span>
                ))}
              </div>
            </div>
          </div>
        </div>
        
        <button className="mt-4 text-sm text-blue-600 font-medium flex items-center gap-1">
          {expanded ? '▼ Hide Details' : '▶ Show Details'}
        </button>
      </div>
      
      {/* Expanded Content */}
      {expanded && (
        <div className="p-6 border-t border-gray-200 bg-white">
          {/* Skills Section */}
          {occupation.skills && occupation.skills.length > 0 && (
            <div className="mb-6">
              <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <FiAward className="w-4 h-4" />
                Skills
              </h4>
              <div className="flex flex-wrap gap-2">
                {occupation.skills.map((skill, idx) => (
                  <span
                    key={idx}
                    className="px-3 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded-full"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}
          
          {/* Certifications Section */}
          {occupation.credential_details && occupation.credential_details.length > 0 && (
            <div className="mb-6">
              <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <FiCheckCircle className="w-4 h-4" />
                Certifications
              </h4>
              <div className="space-y-3">
                {occupation.credential_details.map((cert, idx) => (
                  <div key={idx} className="flex items-start gap-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                    <FiCheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                    <div className="flex-1">
                      <div className="font-medium text-gray-900 text-sm">{cert.credential_name}</div>
                      <div className="text-xs text-gray-600">{cert.issuer}</div>
                      {cert.expiry_date && (
                        <div className="text-xs text-gray-500 mt-1">
                          Expires: {moment(cert.expiry_date).format('MMM YYYY')}
                        </div>
                      )}
                    </div>
                    <span className="px-2 py-1 bg-green-600 text-white text-xs font-medium rounded">
                      Verified
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* Skill Ratings Breakdown */}
          <div>
            <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <FiTrendingUp className="w-4 h-4" />
              Skill Performance
            </h4>
            <div className="space-y-2">
              <SkillRating label="Technical Proficiency" value={4.9} />
              <SkillRating label="Speed & Efficiency" value={4.7} />
              <SkillRating label="Quality of Work" value={4.8} />
              <SkillRating label="Problem Solving" value={4.6} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OccupationProfileCard;