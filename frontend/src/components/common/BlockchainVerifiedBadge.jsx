import React from 'react';
import { FiCheckCircle, FiShield, FiExternalLink } from 'react-icons/fi';

/**
 * BlockchainVerifiedBadge Component
 * Displays a badge indicating blockchain-verified credentials
 * 
 * @param {Object} props
 * @param {number} props.count - Number of verified credentials
 * @param {string} props.size - Size variant: 'sm', 'md', 'lg'
 * @param {boolean} props.showCount - Whether to show credential count
 * @param {function} props.onClick - Click handler
 * @param {string} props.verificationUrl - URL to verification page
 */
const BlockchainVerifiedBadge = ({ 
  count = 0, 
  size = 'md', 
  showCount = true,
  onClick,
  verificationUrl,
  className = ''
}) => {
  const sizeClasses = {
    sm: 'text-xs px-2 py-1 gap-1',
    md: 'text-sm px-3 py-1.5 gap-1.5',
    lg: 'text-base px-4 py-2 gap-2'
  };

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5'
  };

  if (count === 0) {
    return null;
  }

  const badge = (
    <span 
      className={`
        inline-flex items-center font-medium rounded-full
        bg-gradient-to-r from-emerald-50 to-green-50
        text-emerald-700 border border-emerald-200
        ${sizeClasses[size]}
        ${onClick || verificationUrl ? 'cursor-pointer hover:from-emerald-100 hover:to-green-100 hover:border-emerald-300 transition-all' : ''}
        ${className}
      `}
      onClick={onClick}
      title={`${count} blockchain-verified credential${count !== 1 ? 's' : ''}`}
    >
      <FiCheckCircle className={iconSizes[size]} />
      <span>Blockchain Verified</span>
      {showCount && count > 0 && (
        <span className="bg-emerald-200 text-emerald-800 px-1.5 py-0.5 rounded-full text-xs font-bold ml-0.5">
          {count}
        </span>
      )}
      {verificationUrl && (
        <FiExternalLink className={`${iconSizes[size]} opacity-60`} />
      )}
    </span>
  );

  if (verificationUrl) {
    return (
      <a href={verificationUrl} target="_blank" rel="noopener noreferrer" className="no-underline">
        {badge}
      </a>
    );
  }

  return badge;
};

/**
 * BlockchainCredentialCard Component
 * Displays a single blockchain credential in card format
 */
export const BlockchainCredentialCard = ({
  credential,
  compact = false,
  onVerify,
  theme
}) => {
  const isExpired = credential.is_expired || credential.status === 'expired';
  const isRevoked = credential.status === 'revoked';
  const isActive = !isExpired && !isRevoked;

  return (
    <div className={`
      bg-white rounded-xl border-2 overflow-hidden
      ${isActive ? 'border-emerald-200' : isExpired ? 'border-red-200' : 'border-gray-200'}
      ${compact ? 'p-3' : 'p-4'}
    `}>
      <div className="flex items-start gap-3">
        {/* Status Icon */}
        <div className={`
          flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center
          ${isActive ? 'bg-emerald-100 text-emerald-600' : 
            isExpired ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-600'}
        `}>
          <FiShield className="w-5 h-5" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h4 className="font-semibold text-gray-900 truncate">
                {credential.credential_name}
              </h4>
              <p className="text-sm text-gray-600 truncate">
                {credential.institution_name || 'Unknown Institution'}
              </p>
            </div>
            
            {/* Status Badge */}
            <span className={`
              flex-shrink-0 px-2 py-1 text-xs font-medium rounded-full
              ${isActive ? 'bg-emerald-100 text-emerald-700' :
                isExpired ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700'}
            `}>
              {isActive ? '✓ Verified' : isExpired ? 'Expired' : 'Revoked'}
            </span>
          </div>

          {!compact && (
            <div className="mt-2 flex items-center gap-4 text-xs text-gray-500">
              <span>Issued: {new Date(credential.issue_date).toLocaleDateString()}</span>
              {credential.expiry_date && (
                <span className={isExpired ? 'text-red-600' : ''}>
                  Expires: {new Date(credential.expiry_date).toLocaleDateString()}
                </span>
              )}
            </div>
          )}

          {/* Blockchain Hash (truncated) */}
          {!compact && credential.credential_hash && (
            <div className="mt-2 flex items-center gap-1 text-xs text-gray-400">
              <span>🔐</span>
              <span className="font-mono truncate">{credential.credential_hash?.slice(0, 16)}...</span>
            </div>
          )}
        </div>
      </div>

      {/* Verify Button */}
      {onVerify && !compact && (
        <button
          onClick={() => onVerify(credential)}
          className="mt-3 w-full py-2 text-sm font-medium rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors"
        >
          View Details
        </button>
      )}
    </div>
  );
};

/**
 * BlockchainCredentialsSection Component
 * Displays a section with blockchain credentials summary
 */
export const BlockchainCredentialsSection = ({
  credentials = [],
  loading = false,
  onViewAll,
  onViewCredential,
  maxDisplay = 3,
  theme
}) => {
  if (loading) {
    return (
      <div className="bg-white rounded-xl p-6 border border-gray-200 animate-pulse">
        <div className="h-6 bg-gray-200 rounded w-48 mb-4"></div>
        <div className="space-y-3">
          {[1, 2].map(i => (
            <div key={i} className="h-16 bg-gray-100 rounded-lg"></div>
          ))}
        </div>
      </div>
    );
  }

  const activeCredentials = credentials.filter(c => c.status !== 'revoked' && !c.is_expired);
  const displayCredentials = credentials.slice(0, maxDisplay);

  return (
    <div className="bg-white rounded-xl p-6 border border-gray-200">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-green-600 rounded-xl flex items-center justify-center">
            <FiShield className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-bold text-gray-900">Blockchain Credentials</h3>
            <p className="text-sm text-gray-500">
              {activeCredentials.length} verified credential{activeCredentials.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
        
        {activeCredentials.length > 0 && (
          <BlockchainVerifiedBadge 
            count={activeCredentials.length}
            size="sm"
            showCount={false}
          />
        )}
      </div>

      {/* Credentials List */}
      {displayCredentials.length > 0 ? (
        <div className="space-y-3">
          {displayCredentials.map((credential) => (
            <BlockchainCredentialCard
              key={credential.credential_id}
              credential={credential}
              compact={true}
              onVerify={onViewCredential}
              theme={theme}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-6 text-gray-500">
          <FiShield className="w-8 h-8 mx-auto mb-2 opacity-30" />
          <p className="text-sm">No blockchain credentials yet</p>
        </div>
      )}

      {/* View All Button */}
      {onViewAll && credentials.length > maxDisplay && (
        <button
          onClick={onViewAll}
          className="mt-4 w-full py-2 text-sm font-medium rounded-lg text-emerald-600 hover:bg-emerald-50 transition-colors"
        >
          View All {credentials.length} Credentials →
        </button>
      )}
    </div>
  );
};

export default BlockchainVerifiedBadge;
