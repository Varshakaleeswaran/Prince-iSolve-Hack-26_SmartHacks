import { Download, TrendingUp, Clock, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { ComplaintChart } from '@/components/dashboard/ComplaintChart';
import { Button } from '@/components/ui/button';
import { useRealtimeComplaints } from '@/hooks/useRealtimeComplaints';
import { ChartData } from '@/types';

export const Reports = () => {
  const { complaints } = useRealtimeComplaints({});

  const pending = complaints.filter(c => c.status === 'pending').length;
  const inProgress = complaints.filter(c => c.status === 'in_progress' || c.status === 'assigned').length;
  const completed = complaints.filter(c => c.status === 'completed').length;
  const delayed = complaints.filter(c => c.status === 'delayed').length;
  const total = complaints.length;

  const resolutionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

  // Compute avg resolution time from completed complaints
  const completedComplaints = complaints.filter(c => c.status === 'completed' && c.resolved_at && c.created_at);
  const avgResolutionDays = completedComplaints.length > 0
    ? (completedComplaints.reduce((sum, c) => {
        const created = new Date(c.created_at!).getTime();
        const resolved = new Date(c.resolved_at!).getTime();
        return sum + (resolved - created) / (1000 * 60 * 60 * 24);
      }, 0) / completedComplaints.length).toFixed(1)
    : '0';

  const slaBreaches = complaints.filter(c => {
    if (!c.sla_deadline) return false;
    const deadline = new Date(c.sla_deadline).getTime();
    return Date.now() > deadline && c.status !== 'completed';
  }).length;

  const statusData: ChartData[] = [
    { name: 'Pending', value: pending },
    { name: 'In Progress', value: inProgress },
    { name: 'Completed', value: completed },
    { name: 'Delayed', value: delayed },
  ];

  // Group by type
  const typeGroups: Record<string, number> = {};
  complaints.forEach(c => {
    typeGroups[c.type] = (typeGroups[c.type] || 0) + 1;
  });
  const typeData: ChartData[] = Object.entries(typeGroups).map(([name, value]) => ({ name, value }));

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Reports & Analytics</h1>
            <p className="text-muted-foreground">Live data analysis of public works performance</p>
          </div>
          <Button variant="outline" className="gap-2">
            <Download className="w-4 h-4" />
            Export Report
          </Button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="glass-card p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg bg-success/20">
                <TrendingUp className="w-5 h-5 text-success" />
              </div>
              <span className="font-medium">Resolution Rate</span>
            </div>
            <p className="text-3xl font-bold">{resolutionRate}%</p>
            <p className="text-sm text-muted-foreground mt-1">Based on live data</p>
          </div>
          
          <div className="glass-card p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg bg-primary/20">
                <Clock className="w-5 h-5 text-primary" />
              </div>
              <span className="font-medium">Avg. Resolution Time</span>
            </div>
            <p className="text-3xl font-bold">{avgResolutionDays} days</p>
            <p className="text-sm text-muted-foreground mt-1">7-day SLA target</p>
          </div>
          
          <div className="glass-card p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg bg-warning/20">
                <AlertTriangle className="w-5 h-5 text-warning" />
              </div>
              <span className="font-medium">SLA Breaches</span>
            </div>
            <p className="text-3xl font-bold">{slaBreaches}</p>
            <p className="text-sm text-muted-foreground mt-1">Currently overdue</p>
          </div>
        </div>

        {/* Charts Grid */}
        <div className="grid lg:grid-cols-2 gap-6">
          <ComplaintChart data={statusData} type="pie" title="Status Distribution" />
          <ComplaintChart data={typeData.length > 0 ? typeData : [{ name: 'No data', value: 0 }]} type="bar" title="Complaints by Type" />
        </div>

        {/* Summary Table */}
        <div className="glass-card p-6">
          <h3 className="font-semibold mb-4">Live Status Summary</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Status</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Count</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Percentage</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { label: 'Pending', count: pending, color: 'text-warning' },
                  { label: 'In Progress', count: inProgress, color: 'text-primary' },
                  { label: 'Completed', count: completed, color: 'text-success' },
                  { label: 'Delayed', count: delayed, color: 'text-destructive' },
                ].map((row) => (
                  <tr key={row.label} className="border-b border-border/50 hover:bg-card/50">
                    <td className={cn("py-3 px-4 font-medium", row.color)}>{row.label}</td>
                    <td className="py-3 px-4">{row.count}</td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                          <div className="h-full bg-primary rounded-full" style={{ width: `${total > 0 ? (row.count / total) * 100 : 0}%` }} />
                        </div>
                        <span>{total > 0 ? Math.round((row.count / total) * 100) : 0}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Reports;
