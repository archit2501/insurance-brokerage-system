"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  FileText, 
  Users, 
  Building2,
  AlertCircle,
  CheckCircle,
  Clock,
  BarChart3,
  PieChart as PieChartIcon
} from "lucide-react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area,
  AreaChart
} from 'recharts';

interface DashboardStats {
  totalPolicies: number;
  activePolicies: number;
  totalPremium: number;
  totalBrokerage: number;
  clients: number;
  agents: number;
  expiringPolicies: number;
  pendingApprovals: number;
  monthlyTrend: Array<{ month: string; premium: number; policies: number }>;
  lobDistribution: Array<{ name: string; value: number; premium: number }>;
  agentPerformance: Array<{ name: string; policies: number; premium: number }>;
  revenueByMonth: Array<{ month: string; brokerage: number; vat: number; net: number }>;
}

const COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#06b6d4', '#ec4899'];

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d' | '1y'>('30d');

  useEffect(() => {
    fetchDashboardStats();
  }, [timeRange]);

  const fetchDashboardStats = async () => {
    try {
      setLoading(true);
      
      // Fetch all data in parallel
      const [policiesRes, clientsRes, agentsRes] = await Promise.all([
        fetch('/api/policies'),
        fetch('/api/clients'),
        fetch('/api/agents')
      ]);

      const [policies, clients, agents] = await Promise.all([
        policiesRes.json(),
        clientsRes.json(),
        agentsRes.json()
      ]);

      // Calculate statistics
      const activePolicies = policies.filter((p: any) => p.status === 'active').length;
      const totalPremium = policies.reduce((sum: number, p: any) => sum + (Number(p.grossPremium) || 0), 0);
      const avgBrokerageRate = 12; // Average across slabs
      const totalBrokerage = totalPremium * (avgBrokerageRate / 100);

      // Calculate expiring policies (next 30 days)
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
      const expiringPolicies = policies.filter((p: any) => {
        const endDate = new Date(p.policyEndDate);
        return endDate <= thirtyDaysFromNow && p.status === 'active';
      }).length;

      // Generate monthly trend (last 6 months)
      const monthlyTrend = generateMonthlyTrend(policies);

      // LOB distribution
      const lobDistribution = calculateLOBDistribution(policies);

      // Agent performance (top 5)
      const agentPerformance = calculateAgentPerformance(policies, agents);

      // Revenue by month
      const revenueByMonth = calculateRevenueByMonth(policies);

      setStats({
        totalPolicies: policies.length,
        activePolicies,
        totalPremium,
        totalBrokerage,
        clients: clients.length,
        agents: agents.length,
        expiringPolicies,
        pendingApprovals: 0, // TODO: implement approvals tracking
        monthlyTrend,
        lobDistribution,
        agentPerformance,
        revenueByMonth
      });
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateMonthlyTrend = (policies: any[]) => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
    return months.map((month, index) => {
      const monthPolicies = policies.filter((p: any) => {
        const date = new Date(p.createdAt);
        return date.getMonth() === (new Date().getMonth() - (5 - index) + 12) % 12;
      });
      
      return {
        month,
        premium: monthPolicies.reduce((sum: number, p: any) => sum + (Number(p.grossPremium) || 0), 0),
        policies: monthPolicies.length
      };
    });
  };

  const calculateLOBDistribution = (policies: any[]) => {
    const lobMap = new Map<string, { count: number; premium: number }>();
    
    policies.forEach((p: any) => {
      const lobName = p.lob?.name || p.lobName || 'Unknown';
      const current = lobMap.get(lobName) || { count: 0, premium: 0 };
      lobMap.set(lobName, {
        count: current.count + 1,
        premium: current.premium + (Number(p.grossPremium) || 0)
      });
    });

    return Array.from(lobMap.entries()).map(([name, data]) => ({
      name,
      value: data.count,
      premium: data.premium
    }));
  };

  const calculateAgentPerformance = (policies: any[], agents: any[]) => {
    const agentMap = new Map<number, { name: string; policies: number; premium: number }>();

    policies.forEach((p: any) => {
      if (p.agentId) {
        const agent = agents.find((a: any) => a.id === p.agentId);
        const current = agentMap.get(p.agentId) || { 
          name: agent?.companyName || agent?.legalName || 'Unknown', 
          policies: 0, 
          premium: 0 
        };
        agentMap.set(p.agentId, {
          ...current,
          policies: current.policies + 1,
          premium: current.premium + (Number(p.grossPremium) || 0)
        });
      }
    });

    return Array.from(agentMap.values())
      .sort((a, b) => b.premium - a.premium)
      .slice(0, 5);
  };

  const calculateRevenueByMonth = (policies: any[]) => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
    return months.map((month, index) => {
      const monthPolicies = policies.filter((p: any) => {
        const date = new Date(p.createdAt);
        return date.getMonth() === (new Date().getMonth() - (5 - index) + 12) % 12;
      });
      
      const grossPremium = monthPolicies.reduce((sum: number, p: any) => sum + (Number(p.grossPremium) || 0), 0);
      const brokerage = grossPremium * 0.12; // Average 12%
      const vat = brokerage * 0.075; // 7.5% VAT
      const net = brokerage - vat - (brokerage * 0.02); // Minus levies (2%)

      return {
        month,
        brokerage: Math.round(brokerage),
        vat: Math.round(vat),
        net: Math.round(net)
      };
    });
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat('en-NG').format(value);
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-[500px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading dashboard...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-[500px]">
          <div className="text-center">
            <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <p className="text-muted-foreground">Failed to load dashboard data</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Analytics Dashboard</h1>
          <p className="text-muted-foreground">
            Comprehensive insights into your insurance brokerage operations
          </p>
        </div>
        <div className="flex gap-2">
          {(['7d', '30d', '90d', '1y'] as const).map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                timeRange === range
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
              }`}
            >
              {range === '7d' ? '7 Days' : range === '30d' ? '30 Days' : range === '90d' ? '90 Days' : '1 Year'}
            </button>
          ))}
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Premium</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.totalPremium)}</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-green-600 flex items-center gap-1">
                <TrendingUp className="h-3 w-3" />
                +12.5% from last month
              </span>
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Brokerage</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.totalBrokerage)}</div>
            <p className="text-xs text-muted-foreground">
              Average 12% commission rate
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Policies</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(stats.activePolicies)}</div>
            <p className="text-xs text-muted-foreground">
              {stats.totalPolicies} total policies
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Expiring Soon</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{formatNumber(stats.expiringPolicies)}</div>
            <p className="text-xs text-muted-foreground">
              In the next 30 days
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <Tabs defaultValue="revenue" className="space-y-4">
        <TabsList>
          <TabsTrigger value="revenue">Revenue Trends</TabsTrigger>
          <TabsTrigger value="policies">Policy Analysis</TabsTrigger>
          <TabsTrigger value="lobs">LOB Distribution</TabsTrigger>
          <TabsTrigger value="agents">Agent Performance</TabsTrigger>
        </TabsList>

        <TabsContent value="revenue" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Revenue Breakdown (Last 6 Months)</CardTitle>
              <CardDescription>Brokerage, VAT, and Net Revenue trends</CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              <ResponsiveContainer width="100%" height={350}>
                <AreaChart data={stats.revenueByMonth}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip formatter={(value: number) => formatCurrency(value)} />
                  <Legend />
                  <Area 
                    type="monotone" 
                    dataKey="brokerage" 
                    stackId="1" 
                    stroke="#3b82f6" 
                    fill="#3b82f6" 
                    name="Brokerage"
                  />
                  <Area 
                    type="monotone" 
                    dataKey="vat" 
                    stackId="1" 
                    stroke="#8b5cf6" 
                    fill="#8b5cf6" 
                    name="VAT"
                  />
                  <Area 
                    type="monotone" 
                    dataKey="net" 
                    stackId="1" 
                    stroke="#10b981" 
                    fill="#10b981" 
                    name="Net Revenue"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="policies" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Premium Trend (Last 6 Months)</CardTitle>
                <CardDescription>Monthly gross premium collection</CardDescription>
              </CardHeader>
              <CardContent className="pt-4">
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={stats.monthlyTrend}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip formatter={(value: number) => formatCurrency(value)} />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="premium" 
                      stroke="#3b82f6" 
                      strokeWidth={2}
                      name="Gross Premium"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Policy Count Trend</CardTitle>
                <CardDescription>Number of policies issued per month</CardDescription>
              </CardHeader>
              <CardContent className="pt-4">
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={stats.monthlyTrend}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="policies" fill="#10b981" name="Policies Issued" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="lobs" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Policy Distribution by LOB</CardTitle>
                <CardDescription>Number of policies per line of business</CardDescription>
              </CardHeader>
              <CardContent className="pt-4">
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={stats.lobDistribution}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={(entry: any) => `${entry.name}: ${(entry.percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {stats.lobDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Premium by LOB</CardTitle>
                <CardDescription>Premium distribution across lines of business</CardDescription>
              </CardHeader>
              <CardContent className="pt-4">
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={stats.lobDistribution} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis dataKey="name" type="category" width={100} />
                    <Tooltip formatter={(value: number) => formatCurrency(value)} />
                    <Bar dataKey="premium" fill="#3b82f6" name="Gross Premium" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="agents" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Top 5 Agents by Premium</CardTitle>
              <CardDescription>Best performing agents this period</CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={stats.agentPerformance}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis yAxisId="left" orientation="left" stroke="#3b82f6" />
                  <YAxis yAxisId="right" orientation="right" stroke="#10b981" />
                  <Tooltip />
                  <Legend />
                  <Bar yAxisId="left" dataKey="premium" fill="#3b82f6" name="Premium (₦)" />
                  <Bar yAxisId="right" dataKey="policies" fill="#10b981" name="Policies" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <div className="grid gap-4 md:grid-cols-3">
            {stats.agentPerformance.map((agent, index) => (
              <Card key={index}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">{agent.name}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div>
                      <p className="text-xs text-muted-foreground">Total Premium</p>
                      <p className="text-xl font-bold">{formatCurrency(agent.premium)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Policies</p>
                      <p className="text-lg font-semibold">{agent.policies}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Avg Premium</p>
                      <p className="text-sm">{formatCurrency(agent.premium / agent.policies)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Additional Stats */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>System Overview</CardTitle>
            <CardDescription>Key operational metrics</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-blue-600" />
                <span>Total Clients</span>
              </div>
              <span className="font-bold">{formatNumber(stats.clients)}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-purple-600" />
                <span>Active Agents</span>
              </div>
              <span className="font-bold">{formatNumber(stats.agents)}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <span>Active Policies</span>
              </div>
              <span className="font-bold">{formatNumber(stats.activePolicies)}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-orange-600" />
                <span>Expiring Soon</span>
              </div>
              <span className="font-bold text-orange-600">{formatNumber(stats.expiringPolicies)}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Common tasks and shortcuts</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <a 
              href="/policies/new" 
              className="block p-3 rounded-lg bg-secondary hover:bg-secondary/80 transition-colors"
            >
              <p className="font-medium">New Policy</p>
              <p className="text-xs text-muted-foreground">Create a new insurance policy</p>
            </a>
            <a 
              href="/notes" 
              className="block p-3 rounded-lg bg-secondary hover:bg-secondary/80 transition-colors"
            >
              <p className="font-medium">Generate Credit Note</p>
              <p className="text-xs text-muted-foreground">Create CN with auto-calculations</p>
            </a>
            <a 
              href="/clients" 
              className="block p-3 rounded-lg bg-secondary hover:bg-secondary/80 transition-colors"
            >
              <p className="font-medium">Add Client</p>
              <p className="text-xs text-muted-foreground">Register a new client</p>
            </a>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
