import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import {
  LayoutDashboard,
  Users,
  UserCheck,
  Shield,
  Building2,
  MessageSquare,
  Settings,
  ChevronRight,
  ChevronDown,
  BarChart3,
  FileCheck,
  Briefcase,
  MapPin,
  Clock,
  Bell,
  LogOut,
  Menu,
  X,
  UserCog,
  Key,
  Globe,
  FileText,
  DollarSign,
  AlertTriangle,
  CheckCircle,
  Activity,
  FileWarning,
  Receipt,
  Link2
} from 'lucide-react';

const SuperAdminSidebar = () => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [hovering, setHovering] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState(['dashboard', 'users', 'admin']);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const { logout, user } = useAuth();
  
  const showExpanded = isExpanded || hovering;

  useEffect(() => {
    document.documentElement.style.setProperty('--sidebar-width', showExpanded ? '260px' : '70px');
  }, [showExpanded]);

  // Close mobile menu on route change
  useEffect(() => {
    setIsMobileOpen(false);
  }, [location.pathname]);

  const menuGroups = [
    {
      id: 'dashboard',
      label: 'Overview',
      items: [
        {
          label: 'Dashboard',
          icon: LayoutDashboard,
          path: '/admin/super-dashboard',
          badge: null
        },
        {
          label: 'Activity Feed',
          icon: Activity,
          path: '/admin/activity',
          badge: null
        }
      ]
    },
    {
      id: 'users',
      label: 'Account Management',
      items: [
        {
          label: 'Account Activations',
          icon: UserCheck,
          path: '/admin/pending-activations',
          badge: 'pending',
          badgeColor: 'bg-orange-500'
        },
        {
          label: 'All Users',
          icon: Users,
          path: '/admin/users',
          badge: null
        },
        {
          label: 'ID Document Review',
          icon: FileText,
          path: '/admin/documents',
          badge: 'documents',
          badgeColor: 'bg-blue-500'
        },
        {
          label: 'Document Expiry',
          icon: FileWarning,
          path: '/admin/document-expiry',
          badge: 'expiring',
          badgeColor: 'bg-red-500'
        }
      ]
    },
    {
      id: 'admin',
      label: 'Administration',
      items: [
        {
          label: 'Admin Users',
          icon: Shield,
          path: '/admin/admins',
          badge: null
        }
      ]
    },
    {
      id: 'platform',
      label: 'Platform Config',
      items: [
        {
          label: 'Occupation Templates',
          icon: Briefcase,
          path: '/admin/manage-occupations',
          badge: null
        },
        {
          label: 'Occupation Certifications',
          icon: FileCheck,
          path: '/admin/occupation-certifications',
          badge: null
        },
        {
          label: 'Minimum Wage',
          icon: DollarSign,
          path: '/admin/minimum-wage',
          badge: null
        },
        {
          label: 'Zones & Regions',
          icon: MapPin,
          path: '/admin/zones',
          badge: null
        }
      ]
    },
    {
      id: 'business',
      label: 'Business',
      items: [
        {
          label: 'Franchises',
          icon: Building2,
          path: '/admin/franchises',
          badge: null
        },
        {
          label: 'Employers',
          icon: Briefcase,
          path: '/admin/employers',
          badge: null
        },
        {
          label: 'Institutions',
          icon: Globe,
          path: '/admin/institutions',
          badge: null
        },
        {
          label: 'Institution Payouts',
          icon: DollarSign,
          path: '/admin/institution-payouts',
          badge: null
        },
        {
          label: 'Partnership Agreements',
          icon: FileText,
          path: '/admin/partnership-agreements',
          badge: null
        },
        {
          label: 'Invoices',
          icon: Receipt,
          path: '/admin/invoices',
          badge: null
        },
        {
          label: 'API Partners',
          icon: Link2,
          path: '/admin/partners',
          badge: null
        }
      ]
    },
    {
      id: 'regions',
      label: 'Regional',
      items: [
        {
          label: 'Regional Stats',
          icon: BarChart3,
          path: '/admin/regional-stats',
          badge: null
        }
      ]
    },
    {
      id: 'support',
      label: 'Support',
      items: [
        {
          label: 'Support Tickets',
          icon: MessageSquare,
          path: '/admin/support-tickets',
          badge: 'tickets',
          badgeColor: 'bg-red-500'
        },
        {
          label: 'Reported Issues',
          icon: AlertTriangle,
          path: '/admin/reported-issues',
          badge: null
        }
      ]
    },
    {
      id: 'analytics',
      label: 'Analytics & Reports',
      items: [
        {
          label: 'Platform Analytics',
          icon: BarChart3,
          path: '/admin/analytics',
          badge: null
        },
        {
          label: 'Audit Logs',
          icon: Clock,
          path: '/admin/audit-logs',
          badge: null
        }
      ]
    },
    {
      id: 'settings',
      label: 'System',
      items: [
        {
          label: 'Platform Settings',
          icon: Settings,
          path: '/admin/settings',
          badge: null
        },
        {
          label: 'Notifications',
          icon: Bell,
          path: '/admin/notification-settings',
          badge: null
        }
      ]
    }
  ];

  // Badge counts from API
  const [badgeCounts, setBadgeCounts] = useState({
    pending: 0,
    documents: 0,
    tickets: 0,
    expiring: 0
  });

  useEffect(() => {
    // Fetch badge counts from API
    const fetchCounts = async () => {
      try {
        const token = localStorage.getItem('access_token');
        if (!token) return;

        const headers = { 'Authorization': `Bearer ${token}` };
        const baseUrl = process.env.REACT_APP_BACKEND_URL;

        // Fetch pending activations count
        let pendingCount = 0;
        try {
          const pendingRes = await fetch(`${baseUrl}/api/super-admin/pending-activations?limit=1`, { headers });
          if (pendingRes.ok) {
            const data = await pendingRes.json();
            pendingCount = data.data?.total || 0;
          }
        } catch (e) {
          console.error('Failed to fetch pending count:', e);
        }

        // Fetch pending documents count (ID verification)
        let documentsCount = 0;
        try {
          const docsRes = await fetch(`${baseUrl}/api/admin/id-verification/pending`, { headers });
          if (docsRes.ok) {
            const data = await docsRes.json();
            documentsCount = data.data?.total || 0;
          }
        } catch (e) {
          console.error('Failed to fetch documents count:', e);
        }

        // Fetch expiring documents count
        let expiringCount = 0;
        try {
          const expiryRes = await fetch(`${baseUrl}/api/admin/document-expiry/summary`, { headers });
          if (expiryRes.ok) {
            const data = await expiryRes.json();
            if (data.success) {
              expiringCount = (data.data.expired || 0) + 
                             (data.data.expiring_today || 0) + 
                             (data.data.expiring_7_days || 0);
            }
          }
        } catch (e) {
          console.error('Failed to fetch expiry counts:', e);
        }

        // Fetch support tickets count
        let ticketsCount = 0;
        try {
          const ticketsRes = await fetch(`${baseUrl}/api/support/tickets/stats`, { headers });
          if (ticketsRes.ok) {
            const data = await ticketsRes.json();
            ticketsCount = data.data?.open_tickets || 0;
          }
        } catch (e) {
          console.error('Failed to fetch tickets count:', e);
        }
        
        setBadgeCounts({
          pending: pendingCount,
          documents: documentsCount,
          tickets: ticketsCount,
          expiring: expiringCount
        });
      } catch (error) {
        console.error('Failed to fetch badge counts:', error);
      }
    };
    fetchCounts();
  }, []);

  const toggleGroup = (groupId) => {
    setExpandedGroups(prev => 
      prev.includes(groupId) 
        ? prev.filter(id => id !== groupId)
        : [...prev, groupId]
    );
  };

  const handleNavigation = (path) => {
    navigate(path);
  };

  const isActive = (path) => {
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  const handleLogout = () => {
    logout();
    navigate('/admin/login');
  };

  const SidebarContent = () => (
    <div className="h-full flex flex-col" style={{ backgroundColor: '#0f1419' }}>
      {/* Header */}
      <div className="flex items-center h-16 px-4 border-b border-gray-800">
        <div className="flex items-center gap-3">
          <img 
            src={theme.logo}
            alt="HR Bank"
            className="w-10 h-10 rounded-lg object-contain"
          />
          {showExpanded && (
            <div className="flex flex-col">
              <span className="text-white font-bold text-base">HR Bank</span>
              <span className="text-xs text-orange-400 font-medium">Super Admin</span>
            </div>
          )}
        </div>
      </div>

      {/* User Info (when expanded) */}
      {showExpanded && user && (
        <div className="px-4 py-3 border-b border-gray-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white font-semibold text-sm">
              {user.email?.charAt(0).toUpperCase() || 'A'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{user.full_name || user.email}</p>
              <p className="text-xs text-gray-500 truncate">Super Administrator</p>
            </div>
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-2">
        {menuGroups.map((group) => {
          const isGroupExpanded = expandedGroups.includes(group.id);
          const hasActiveItem = group.items.some(item => isActive(item.path));
          
          return (
            <div key={group.id} className="mb-2">
              {/* Group Header */}
              {showExpanded ? (
                <button
                  onClick={() => toggleGroup(group.id)}
                  className={`w-full flex items-center justify-between px-3 py-2 text-xs font-semibold uppercase tracking-wider rounded-lg transition-colors ${
                    hasActiveItem ? 'text-orange-400' : 'text-gray-500 hover:text-gray-300'
                  }`}
                >
                  <span>{group.label}</span>
                  <ChevronDown 
                    className={`w-4 h-4 transition-transform ${isGroupExpanded ? '' : '-rotate-90'}`}
                  />
                </button>
              ) : (
                <div className="h-px bg-gray-800 mx-2 my-3" />
              )}

              {/* Group Items */}
              {(isGroupExpanded || !showExpanded) && (
                <div className="space-y-1 mt-1">
                  {group.items.map((item) => {
                    const Icon = item.icon;
                    const active = isActive(item.path);
                    const badgeCount = item.badge ? badgeCounts[item.badge] : null;

                    return (
                      <button
                        key={item.path}
                        onClick={() => handleNavigation(item.path)}
                        className={`
                          w-full flex items-center gap-3 py-2.5 rounded-lg transition-all duration-200 group relative
                          ${showExpanded ? 'px-3' : 'justify-center px-2'}
                          ${active 
                            ? 'bg-gradient-to-r from-orange-500/20 to-orange-600/10 text-orange-400 border-l-2 border-orange-500' 
                            : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
                          }
                        `}
                      >
                        <Icon 
                          size={20} 
                          className={`flex-shrink-0 ${active ? 'text-orange-400' : ''}`}
                        />
                        
                        {showExpanded && (
                          <>
                            <span className="flex-1 text-sm font-medium text-left">
                              {item.label}
                            </span>
                            {badgeCount > 0 && (
                              <span className={`px-2 py-0.5 text-xs font-bold text-white rounded-full ${item.badgeColor}`}>
                                {badgeCount > 99 ? '99+' : badgeCount}
                              </span>
                            )}
                            {active && (
                              <ChevronRight size={16} className="text-orange-400" />
                            )}
                          </>
                        )}

                        {/* Tooltip for collapsed state */}
                        {!showExpanded && (
                          <div className="absolute left-full ml-2 px-3 py-2 bg-gray-900 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap shadow-xl z-50 flex items-center gap-2">
                            {item.label}
                            {badgeCount > 0 && (
                              <span className={`px-1.5 py-0.5 text-xs font-bold text-white rounded-full ${item.badgeColor}`}>
                                {badgeCount}
                              </span>
                            )}
                          </div>
                        )}

                        {/* Badge dot for collapsed state */}
                        {!showExpanded && badgeCount > 0 && (
                          <span className={`absolute top-1 right-1 w-2 h-2 rounded-full ${item.badgeColor}`} />
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="border-t border-gray-800 p-3">
        {showExpanded ? (
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
          >
            <LogOut size={20} />
            <span className="text-sm font-medium">Sign Out</span>
          </button>
        ) : (
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center p-2 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors group relative"
          >
            <LogOut size={20} />
            <div className="absolute left-full ml-2 px-3 py-2 bg-gray-900 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap shadow-xl z-50">
              Sign Out
            </div>
          </button>
        )}
      </div>

      {/* Collapse Toggle */}
      <div className="border-t border-gray-800 p-2 hidden lg:block">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full flex items-center justify-center p-2 text-gray-500 hover:text-white hover:bg-gray-800/50 rounded-lg transition-colors"
        >
          <ChevronRight 
            size={18} 
            className={`transition-transform duration-300 ${showExpanded ? 'rotate-180' : ''}`}
          />
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile Menu Button */}
      <button
        onClick={() => setIsMobileOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-40 p-2 bg-gray-900 text-white rounded-lg shadow-lg"
      >
        <Menu size={24} />
      </button>

      {/* Mobile Overlay */}
      {isMobileOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-black/50 z-50"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Mobile Sidebar */}
      <div
        className={`lg:hidden fixed left-0 top-0 h-screen w-72 z-50 transform transition-transform duration-300 ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <button
          onClick={() => setIsMobileOpen(false)}
          className="absolute top-4 right-4 p-2 text-gray-400 hover:text-white"
        >
          <X size={24} />
        </button>
        <SidebarContent />
      </div>

      {/* Desktop Sidebar */}
      <div
        className="hidden lg:block fixed left-0 top-0 h-screen z-40 transition-all duration-300"
        style={{ width: showExpanded ? '260px' : '70px' }}
        onMouseEnter={() => setHovering(true)}
        onMouseLeave={() => setHovering(false)}
      >
        <SidebarContent />
      </div>
    </>
  );
};

export default SuperAdminSidebar;
