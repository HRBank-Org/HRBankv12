import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { 
  CreditCard, Receipt, CheckCircle2, Clock, AlertTriangle,
  DollarSign, TrendingUp, Route, Calendar, Building2,
  ChevronRight, Download, ExternalLink, RefreshCw, 
  Truck, Shield, Sparkles, Wrench, BriefcaseIcon
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { useToast } from '../../hooks/use-toast';
import { useTranslation } from 'react-i18next';

const API = process.env.REACT_APP_BACKEND_URL;

const routeTypeIcons = {
  delivery: Truck,
  security_patrol: Shield,
  cleaning: Sparkles,
  healthcare: Building2,
  field_sales: BriefcaseIcon,
  maintenance: Wrench,
  custom: Route
};

const FieldServiceBilling = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const { t } = useTranslation();
  
  const [loading, setLoading] = useState(true);
  const [billingStatus, setBillingStatus] = useState(null);
  const [unpaidRoutes, setUnpaidRoutes] = useState([]);
  const [billingHistory, setBillingHistory] = useState([]);
  const [pricing, setPricing] = useState(null);
  const [processingPayment, setProcessingPayment] = useState(false);

  const fetchBillingData = useCallback(async () => {
    try {
      const token = localStorage.getItem('access_token');
      const headers = { 'Authorization': `Bearer ${token}` };

      const [statusRes, unpaidRes, historyRes, pricingRes] = await Promise.all([
        fetch(`${API}/api/field-service/billing/status`, { headers }),
        fetch(`${API}/api/field-service/billing/unpaid-routes`, { headers }),
        fetch(`${API}/api/field-service/billing/history`, { headers }),
        fetch(`${API}/api/field-service/billing/pricing`, { headers })
      ]);

      const [statusData, unpaidData, historyData, pricingData] = await Promise.all([
        statusRes.json(),
        unpaidRes.json(),
        historyRes.json(),
        pricingRes.json()
      ]);

      if (statusData.success) setBillingStatus(statusData.data);
      if (unpaidData.success) setUnpaidRoutes(unpaidData.data.unpaid_routes || []);
      if (historyData.success) setBillingHistory(historyData.data.transactions || []);
      if (pricingData.success) setPricing(pricingData.data);
    } catch (error) {
      console.error('Error fetching billing data:', error);
      toast({ title: 'Error', description: 'Failed to load billing data', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchBillingData();
  }, [fetchBillingData]);

  // Check for payment success
  useEffect(() => {
    const sessionId = searchParams.get('session_id');
    const setupSuccess = searchParams.get('setup');
    
    if (sessionId) {
      checkPaymentStatus(sessionId);
    }
    if (setupSuccess === 'success') {
      toast({ title: 'Success', description: 'Payment method setup complete!' });
      fetchBillingData();
    }
  }, [searchParams, fetchBillingData, toast]);

  const checkPaymentStatus = async (sessionId) => {
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(`${API}/api/field-service/billing/payment-status/${sessionId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      
      if (data.success && data.data.status === 'paid') {
        toast({ title: 'Payment Successful', description: 'Your routes have been paid!', variant: 'default' });
        fetchBillingData();
      }
    } catch (error) {
      console.error('Error checking payment:', error);
    }
  };

  const handlePayRoute = async (routeId) => {
    setProcessingPayment(true);
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(`${API}/api/field-service/billing/pay-route`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          route_id: routeId,
          origin_url: window.location.origin,
          province: 'ON'
        })
      });

      const data = await response.json();
      if (data.success && data.data.checkout_url) {
        window.location.href = data.data.checkout_url;
      } else {
        toast({ title: 'Error', description: data.detail || 'Failed to initiate payment', variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Payment failed', variant: 'destructive' });
    } finally {
      setProcessingPayment(false);
    }
  };

  const handlePayAll = async () => {
    setProcessingPayment(true);
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(`${API}/api/field-service/billing/pay-all-outstanding?origin_url=${encodeURIComponent(window.location.origin)}&province=ON`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      const data = await response.json();
      if (data.success && data.data.checkout_url) {
        window.location.href = data.data.checkout_url;
      } else {
        toast({ title: 'Error', description: data.detail || 'Failed to initiate payment', variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Payment failed', variant: 'destructive' });
    } finally {
      setProcessingPayment(false);
    }
  };

  const handleSetupPayment = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(`${API}/api/field-service/billing/setup-payment`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          return_url: window.location.href,
          refresh_url: window.location.href
        })
      });

      const data = await response.json();
      if (data.success && data.data.checkout_url) {
        window.location.href = data.data.checkout_url;
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to setup payment', variant: 'destructive' });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center" data-testid="billing-loading">
        <div className="animate-spin w-8 h-8 border-4 border-[#ff5f00] border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6" data-testid="field-service-billing">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Field Service Billing</h1>
            <p className="text-gray-500 mt-1">Manage payments for your completed field service routes</p>
          </div>
          <Button variant="outline" onClick={fetchBillingData}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-red-50 to-white border-red-100">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-red-100 flex items-center justify-center">
                  <AlertTriangle className="w-6 h-6 text-red-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Outstanding Balance</p>
                  <p className="text-2xl font-bold text-red-600">
                    ${billingStatus?.outstanding_balance_cad?.toFixed(2) || '0.00'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-amber-50 to-white border-amber-100">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center">
                  <Clock className="w-6 h-6 text-amber-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Unpaid Routes</p>
                  <p className="text-2xl font-bold text-amber-600">
                    {billingStatus?.unpaid_routes_count || 0}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-50 to-white border-green-100">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center">
                  <DollarSign className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">This Month</p>
                  <p className="text-2xl font-bold text-green-600">
                    ${billingStatus?.month_spend_cad?.toFixed(2) || '0.00'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-blue-50 to-white border-blue-100">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Paid Routes (Month)</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {billingStatus?.paid_routes_this_month || 0}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Unpaid Routes */}
        {unpaidRoutes.length > 0 && (
          <Card>
            <CardHeader className="border-b bg-gradient-to-r from-amber-50 to-white">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2 text-amber-800">
                    <AlertTriangle className="w-5 h-5" />
                    Unpaid Routes
                  </CardTitle>
                  <CardDescription>
                    {unpaidRoutes.length} route{unpaidRoutes.length > 1 ? 's' : ''} awaiting payment - Total: ${billingStatus?.outstanding_balance_cad?.toFixed(2)}
                  </CardDescription>
                </div>
                <Button 
                  onClick={handlePayAll}
                  disabled={processingPayment}
                  className="bg-[#ff5f00] hover:bg-[#e55500]"
                  data-testid="pay-all-btn"
                >
                  <CreditCard className="w-4 h-4 mr-2" />
                  Pay All (${billingStatus?.outstanding_balance_cad?.toFixed(2)})
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y">
                {unpaidRoutes.map((route) => {
                  const Icon = routeTypeIcons[route.route_type] || Route;
                  return (
                    <div key={route.route_id} className="p-4 hover:bg-gray-50 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                            <Icon className="w-5 h-5 text-gray-600" />
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{route.route_name}</p>
                            <div className="flex items-center gap-3 text-sm text-gray-500">
                              <span className="capitalize">{route.route_type?.replace('_', ' ')}</span>
                              <span>•</span>
                              <span>{route.num_stops} stops</span>
                              <span>•</span>
                              <span>{route.worker_name}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <p className="font-bold text-gray-900">${route.billing?.total_cad?.toFixed(2)}</p>
                            <p className="text-xs text-gray-500">
                              Base ${route.billing?.base_price_cad?.toFixed(2)} + ${route.billing?.stops_total_cad?.toFixed(2)} stops
                            </p>
                          </div>
                          <Button
                            size="sm"
                            onClick={() => handlePayRoute(route.route_id)}
                            disabled={processingPayment}
                            className="bg-[#ff5f00] hover:bg-[#e55500]"
                            data-testid={`pay-route-${route.route_id}`}
                          >
                            Pay Now
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Pricing Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Receipt className="w-5 h-5 text-[#ff5f00]" />
              Pricing Structure
            </CardTitle>
            <CardDescription>
              Per-route billing model: Base Price + (Per Stop × Number of Stops) + Tax
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {pricing?.pricing_tiers && Object.entries(pricing.pricing_tiers).map(([key, tier]) => {
                const Icon = routeTypeIcons[key] || Route;
                return (
                  <div key={key} className="p-4 rounded-lg border bg-white hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-8 h-8 rounded-lg bg-[#ff5f00]/10 flex items-center justify-center">
                        <Icon className="w-4 h-4 text-[#ff5f00]" />
                      </div>
                      <p className="font-semibold text-gray-900">{tier.name}</p>
                    </div>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-500">Base Price</span>
                        <span className="font-medium">${tier.base_price_cad?.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Per Stop</span>
                        <span className="font-medium">${tier.per_stop_price_cad?.toFixed(2)}</span>
                      </div>
                    </div>
                    <p className="text-xs text-gray-400 mt-2">{tier.description}</p>
                  </div>
                );
              })}
            </div>
            <div className="mt-4 p-3 bg-gray-50 rounded-lg text-sm text-gray-600">
              <strong>Note:</strong> A {pricing?.platform_fee_percentage || 15}% platform fee applies to all routes. 
              Applicable taxes (GST/HST/PST) are added based on your province.
            </div>
          </CardContent>
        </Card>

        {/* Payment History */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-[#ff5f00]" />
              Payment History
            </CardTitle>
          </CardHeader>
          <CardContent>
            {billingHistory.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <Receipt className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p>No payment history yet</p>
                <p className="text-sm">Completed route payments will appear here</p>
              </div>
            ) : (
              <div className="space-y-3">
                {billingHistory.slice(0, 10).map((txn) => (
                  <div 
                    key={txn.transaction_id}
                    className="flex items-center justify-between p-4 rounded-lg border hover:bg-gray-50"
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        txn.status === 'paid' ? 'bg-green-100' : 'bg-amber-100'
                      }`}>
                        {txn.status === 'paid' ? (
                          <CheckCircle2 className="w-5 h-5 text-green-600" />
                        ) : (
                          <Clock className="w-5 h-5 text-amber-600" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">
                          {txn.is_bulk ? `Bulk Payment (${txn.routes_count} routes)` : txn.route_name}
                        </p>
                        <p className="text-sm text-gray-500">
                          {new Date(txn.created_at).toLocaleDateString('en-CA', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric'
                          })}
                          {txn.route_type && ` • ${txn.route_type.replace('_', ' ')}`}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-gray-900">${txn.total_amount_cad?.toFixed(2)}</p>
                      <Badge className={txn.status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}>
                        {txn.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Payment Method */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-[#ff5f00]" />
              Payment Method
            </CardTitle>
          </CardHeader>
          <CardContent>
            {billingStatus?.has_payment_method ? (
              <div className="flex items-center justify-between p-4 rounded-lg bg-green-50 border border-green-200">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                  <span className="text-green-800">Payment method on file</span>
                </div>
                <Button variant="outline" size="sm" onClick={handleSetupPayment}>
                  Update
                </Button>
              </div>
            ) : (
              <div className="flex items-center justify-between p-4 rounded-lg bg-amber-50 border border-amber-200">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="w-5 h-5 text-amber-600" />
                  <span className="text-amber-800">No payment method on file</span>
                </div>
                <Button onClick={handleSetupPayment} className="bg-[#ff5f00] hover:bg-[#e55500]">
                  Setup Payment
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default FieldServiceBilling;
