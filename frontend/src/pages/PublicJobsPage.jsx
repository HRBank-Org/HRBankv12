import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { 
  Search, MapPin, DollarSign, Clock, Building2, Filter,
  ChevronRight, ChevronDown, Briefcase, X, Star
} from 'lucide-react';
import { LOGOS } from '../utils/logoUtils';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const PublicJobsPage = () => {
  const navigate = useNavigate();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [locationQuery, setLocationQuery] = useState('');
  const [selectedJob, setSelectedJob] = useState(null);
  const [filters, setFilters] = useState({
    workType: '',
    industry: '',
    minRate: '',
  });
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    fetchJobs();
  }, []);

  const fetchJobs = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API}/jobs/public`);
      const data = await response.json();
      if (data.success && data.data) {
        setJobs(data.data);
        if (data.data.length > 0) {
          setSelectedJob(data.data[0]);
        }
      }
    } catch (error) {
      console.error('Error fetching jobs:', error);
      // Set mock data
      const mockJobs = [
        { 
          posting_id: '1', 
          title: 'Server', 
          company_name: 'Swan Pizza', 
          workplace_city: 'Windsor, ON',
          workplace_address: '1250 Tecumseh Road East',
          hourly_rate: 17.60, 
          work_type: 'on_site',
          description: 'Front of house server responsible for customer service and order management. Must have excellent communication skills and ability to work in a fast-paced environment.',
          requirements: ['Smart Serve', 'Customer Service Experience'],
          posted_date: new Date().toISOString(),
          positions_available: 3
        },
        { 
          posting_id: '2', 
          title: 'Line Cook', 
          company_name: 'Swan Pizza', 
          workplace_city: 'Windsor, ON',
          workplace_address: '1250 Tecumseh Road East',
          hourly_rate: 19.50, 
          work_type: 'on_site',
          description: 'Kitchen staff responsible for food preparation and cooking. Must be able to work under pressure and maintain food safety standards.',
          requirements: ['Food Handler Certificate', 'Kitchen Experience'],
          posted_date: new Date().toISOString(),
          positions_available: 2
        },
        { 
          posting_id: '3', 
          title: 'Delivery Driver', 
          company_name: 'Swan Pizza', 
          workplace_city: 'Windsor, ON',
          workplace_address: '1250 Tecumseh Road East',
          hourly_rate: 18.00, 
          work_type: 'route_based',
          description: 'Responsible for timely delivery of orders to customers. Must have valid G license and clean driving record.',
          requirements: ['G License', 'Clean Driving Record'],
          posted_date: new Date().toISOString(),
          positions_available: 2
        },
        { 
          posting_id: '4', 
          title: 'Night Security', 
          company_name: 'Swan Pizza', 
          workplace_city: 'Windsor, ON',
          workplace_address: '1250 Tecumseh Road East',
          hourly_rate: 20.00, 
          work_type: 'on_site',
          description: 'Overnight security position. Monitor premises, conduct patrols, and ensure safety of property.',
          requirements: ['Security License', 'First Aid'],
          posted_date: new Date().toISOString(),
          positions_available: 1
        },
      ];
      setJobs(mockJobs);
      setSelectedJob(mockJobs[0]);
    } finally {
      setLoading(false);
    }
  };

  const filteredJobs = jobs.filter(job => {
    const matchesSearch = !searchQuery || 
      job.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      job.company_name?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesLocation = !locationQuery ||
      job.workplace_city?.toLowerCase().includes(locationQuery.toLowerCase());
    const matchesWorkType = !filters.workType || job.work_type === filters.workType;
    const matchesMinRate = !filters.minRate || job.hourly_rate >= parseFloat(filters.minRate);
    
    return matchesSearch && matchesLocation && matchesWorkType && matchesMinRate;
  });

  const getWorkTypeBadge = (type) => {
    const styles = {
      on_site: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'On-Site' },
      route_based: { bg: 'bg-green-100', text: 'text-green-700', label: 'Route-Based' },
      continental: { bg: 'bg-purple-100', text: 'text-purple-700', label: 'Continental' },
    };
    const style = styles[type] || styles.on_site;
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${style.bg} ${style.text}`}>
        {style.label}
      </span>
    );
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'Recently';
    const date = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link to="/" className="flex items-center gap-2">
              <img src={LOGOS.master} alt="HR Bank" className="h-9 w-auto" />
            </Link>
            <div className="flex items-center gap-3">
              <Button variant="ghost" onClick={() => navigate('/login')} className="text-gray-700">
                Sign In
              </Button>
              <Button 
                onClick={() => navigate('/signup?type=workforce')}
                className="bg-[#ff5f00] hover:bg-[#e55500] text-white"
              >
                Create Profile
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Search Bar */}
      <div className="bg-[#30496d] py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-2xl font-bold text-white mb-4">Find Your Next Opportunity</h1>
          <div className="flex flex-col md:flex-row gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Job title, skill, or company"
                className="w-full pl-10 pr-4 py-3 rounded-lg border-0 focus:ring-2 focus:ring-[#ff5f00]"
              />
            </div>
            <div className="flex-1 relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                value={locationQuery}
                onChange={(e) => setLocationQuery(e.target.value)}
                placeholder="City or postal code"
                className="w-full pl-10 pr-4 py-3 rounded-lg border-0 focus:ring-2 focus:ring-[#ff5f00]"
              />
            </div>
            <Button 
              onClick={() => setShowFilters(!showFilters)}
              variant="outline"
              className="bg-white h-12 px-6"
            >
              <Filter size={18} className="mr-2" />
              Filters
              <ChevronDown size={16} className={`ml-2 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
            </Button>
          </div>

          {/* Filter Panel */}
          {showFilters && (
            <div className="mt-4 bg-white rounded-lg p-4 flex flex-wrap gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Work Type</label>
                <select
                  value={filters.workType}
                  onChange={(e) => setFilters({ ...filters, workType: e.target.value })}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#ff5f00]"
                >
                  <option value="">All Types</option>
                  <option value="on_site">On-Site</option>
                  <option value="route_based">Route-Based</option>
                  <option value="continental">Continental</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Min. Hourly Rate</label>
                <select
                  value={filters.minRate}
                  onChange={(e) => setFilters({ ...filters, minRate: e.target.value })}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#ff5f00]"
                >
                  <option value="">Any</option>
                  <option value="16">$16+</option>
                  <option value="18">$18+</option>
                  <option value="20">$20+</option>
                  <option value="25">$25+</option>
                </select>
              </div>
              <div className="flex items-end">
                <Button
                  variant="ghost"
                  onClick={() => setFilters({ workType: '', industry: '', minRate: '' })}
                  className="text-gray-600"
                >
                  Clear Filters
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex items-center justify-between mb-4">
          <p className="text-gray-600">
            <span className="font-semibold text-gray-900">{filteredJobs.length}</span> jobs found
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Job List */}
          <div className="lg:col-span-2 space-y-3 max-h-[calc(100vh-280px)] overflow-y-auto pr-2">
            {loading ? (
              Array(4).fill(0).map((_, i) => (
                <div key={i} className="bg-white rounded-xl p-5 shadow-sm animate-pulse">
                  <div className="h-5 bg-gray-200 rounded w-3/4 mb-3"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
                  <div className="h-4 bg-gray-200 rounded w-full"></div>
                </div>
              ))
            ) : filteredJobs.length === 0 ? (
              <div className="bg-white rounded-xl p-8 text-center">
                <Briefcase className="mx-auto text-gray-300 mb-4" size={48} />
                <p className="text-gray-500 font-medium">No jobs match your search</p>
                <p className="text-gray-400 text-sm mt-1">Try adjusting your filters</p>
              </div>
            ) : (
              filteredJobs.map((job) => (
                <Card 
                  key={job.posting_id} 
                  className={`cursor-pointer transition-all hover:shadow-md ${
                    selectedJob?.posting_id === job.posting_id 
                      ? 'ring-2 ring-[#ff5f00] shadow-md' 
                      : ''
                  }`}
                  onClick={() => setSelectedJob(job)}
                >
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-semibold text-gray-900">{job.title}</h3>
                      {getWorkTypeBadge(job.work_type)}
                    </div>
                    <p className="text-sm text-gray-600 mb-2">{job.company_name}</p>
                    <div className="flex flex-wrap items-center gap-3 text-sm text-gray-500 mb-2">
                      <span className="flex items-center gap-1">
                        <MapPin size={14} />
                        {job.workplace_city || 'Location TBD'}
                      </span>
                      <span className="flex items-center gap-1 text-green-600 font-medium">
                        <DollarSign size={14} />
                        ${job.hourly_rate?.toFixed(2)}/hr
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-400">{formatDate(job.posted_date)}</span>
                      {job.positions_available && (
                        <span className="text-xs text-blue-600">{job.positions_available} positions</span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>

          {/* Job Details */}
          <div className="lg:col-span-3">
            {selectedJob ? (
              <div className="bg-white rounded-xl shadow-sm sticky top-24">
                <div className="p-6 border-b border-gray-200">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900 mb-1">{selectedJob.title}</h2>
                      <p className="text-lg text-gray-600">{selectedJob.company_name}</p>
                    </div>
                    <Button
                      onClick={() => navigate(`/signup?type=workforce&apply_job=${selectedJob.posting_id}`)}
                      className="bg-[#ff5f00] hover:bg-[#e55500] text-white"
                    >
                      Apply Now
                    </Button>
                  </div>

                  <div className="flex flex-wrap gap-4 text-sm">
                    <span className="flex items-center gap-1.5 text-gray-600">
                      <MapPin size={16} className="text-gray-400" />
                      {selectedJob.workplace_address || selectedJob.workplace_city || 'Location TBD'}
                    </span>
                    <span className="flex items-center gap-1.5 text-green-600 font-semibold">
                      <DollarSign size={16} />
                      ${selectedJob.hourly_rate?.toFixed(2)}/hr
                    </span>
                    <span className="flex items-center gap-1.5 text-gray-600">
                      <Clock size={16} className="text-gray-400" />
                      {formatDate(selectedJob.posted_date)}
                    </span>
                    {getWorkTypeBadge(selectedJob.work_type)}
                  </div>
                </div>

                <div className="p-6">
                  <div className="mb-6">
                    <h3 className="font-semibold text-gray-900 mb-3">Job Description</h3>
                    <p className="text-gray-600 leading-relaxed">
                      {selectedJob.description || 'No description provided. Contact employer for more details.'}
                    </p>
                  </div>

                  {selectedJob.requirements && selectedJob.requirements.length > 0 && (
                    <div className="mb-6">
                      <h3 className="font-semibold text-gray-900 mb-3">Requirements</h3>
                      <ul className="space-y-2">
                        {selectedJob.requirements.map((req, i) => (
                          <li key={i} className="flex items-center gap-2 text-gray-600">
                            <div className="w-1.5 h-1.5 rounded-full bg-[#ff5f00]"></div>
                            {req}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {selectedJob.positions_available && (
                    <div className="bg-blue-50 rounded-lg p-4 mb-6">
                      <p className="text-blue-800 font-medium">
                        {selectedJob.positions_available} position{selectedJob.positions_available > 1 ? 's' : ''} available
                      </p>
                    </div>
                  )}

                  <div className="bg-gray-50 rounded-lg p-4">
                    <h3 className="font-semibold text-gray-900 mb-2">Why apply through HR Bank?</h3>
                    <ul className="text-sm text-gray-600 space-y-1.5">
                      <li className="flex items-center gap-2">
                        <Star size={14} className="text-[#ff5f00]" />
                        Your ratings and experience follow you
                      </li>
                      <li className="flex items-center gap-2">
                        <Star size={14} className="text-[#ff5f00]" />
                        Verified credentials employers trust
                      </li>
                      <li className="flex items-center gap-2">
                        <Star size={14} className="text-[#ff5f00]" />
                        AI matches you to more jobs automatically
                      </li>
                    </ul>
                  </div>
                </div>

                <div className="p-6 border-t border-gray-200 bg-gray-50 rounded-b-xl">
                  <Button
                    onClick={() => navigate('/signup?type=workforce')}
                    className="w-full bg-[#ff5f00] hover:bg-[#e55500] text-white h-12 text-lg"
                  >
                    Apply for this Job
                    <ChevronRight className="ml-2" size={20} />
                  </Button>
                  <p className="text-center text-sm text-gray-500 mt-3">
                    Create a free account to apply
                  </p>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-xl shadow-sm p-12 text-center">
                <Briefcase className="mx-auto text-gray-300 mb-4" size={64} />
                <p className="text-gray-500 font-medium">Select a job to view details</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PublicJobsPage;
