import { Download, FileText, BarChart3, Users, DollarSign, Calendar } from "lucide-react";
import { usePermissions } from "@/contexts/PermissionsContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RevenueChart } from "@/components/dashboard/RevenueChart";
import { MembershipChart } from "@/components/dashboard/MembershipChart";

const reportTypes = [
  {
    id: "membership",
    title: "Membership Report",
    description: "Active, expired, and pending memberships breakdown",
    icon: Users,
    lastGenerated: "Jan 15, 2024",
  },
  {
    id: "revenue",
    title: "Revenue Report",
    description: "Monthly and yearly revenue analysis",
    icon: DollarSign,
    lastGenerated: "Jan 14, 2024",
  },
  {
    id: "attendance",
    title: "Attendance Report",
    description: "Daily check-in patterns and peak hours",
    icon: Calendar,
    lastGenerated: "Jan 15, 2024",
  },
  {
    id: "performance",
    title: "Performance Report",
    description: "Trainer performance and class attendance",
    icon: BarChart3,
    lastGenerated: "Jan 10, 2024",
  },
];

export default function Reports() {
  const { hasPermission } = usePermissions();

  const filteredReports = reportTypes.filter(report => {
    if (report.id === 'revenue') return hasPermission('view_revenue_summary');
    return true; // Other reports are fine if they have view_reports
  });

  return (
    <>
      {/* Quick Reports */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {filteredReports.map((report) => {
          const Icon = report.icon;
          return (
            <Card
              key={report.id}
              className="hover:shadow-lg transition-all duration-300 cursor-pointer group animate-fade-in"
            >
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary group-hover:shadow-glow transition-all duration-300">
                    <Icon className="h-6 w-6 text-primary group-hover:text-primary-foreground transition-colors" />
                  </div>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <Download className="h-4 w-4" />
                  </Button>
                </div>
                <h3 className="font-semibold mb-1">{report.title}</h3>
                <p className="text-sm text-muted-foreground mb-3">{report.description}</p>
                <p className="text-xs text-muted-foreground">
                  Last generated: {report.lastGenerated}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Export Section */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="text-lg">Export Data</CardTitle>
          <CardDescription>
            Generate and download custom reports in PDF or CSV format
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <Select defaultValue="membership">
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Report Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="membership">Membership Report</SelectItem>
                {hasPermission('view_revenue_summary') && <SelectItem value="revenue">Revenue Report</SelectItem>}
                <SelectItem value="attendance">Attendance Report</SelectItem>
                {hasPermission('view_revenue_summary') && <SelectItem value="payments">Payments Report</SelectItem>}
              </SelectContent>
            </Select>
            <Select defaultValue="month">
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Period" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="week">This Week</SelectItem>
                <SelectItem value="month">This Month</SelectItem>
                <SelectItem value="quarter">This Quarter</SelectItem>
                <SelectItem value="year">This Year</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex gap-2">
              <Button variant="outline">
                <FileText className="h-4 w-4 mr-2" />
                Export PDF
              </Button>
              <Button className="gradient-primary">
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {hasPermission('view_revenue_summary') && (
          <RevenueChart
            data={[
              { name: "Jan", revenue: 45000 },
              { name: "Feb", revenue: 52000 },
              { name: "Mar", revenue: 48000 },
              { name: "Apr", revenue: 61000 },
              { name: "May", revenue: 55000 },
              { name: "Jun", revenue: 67000 },
            ]}
          />
        )}
        <MembershipChart
          data={[
            { name: "Active", value: 120, color: "hsl(var(--success))" },
            { name: "Expiring", value: 45, color: "hsl(var(--warning))" },
            { name: "Expired", value: 25, color: "hsl(var(--destructive))" },
          ]}
        />
      </div>
    </>
  );
}
