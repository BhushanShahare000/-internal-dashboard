import { useState, useMemo } from "react";
import { format } from "date-fns";
import { useAuth } from "@/hooks/use-auth";
import { useProjects } from "@/hooks/use-projects";
import { useUsers } from "@/hooks/use-users";
import { useAllTimeEntries } from "@/hooks/use-time-entries";
import { Redirect } from "wouter";
import {
  Users,
  Briefcase,
  BarChart,
  ListFilter,
  Loader2,
  FileText,
  Calendar as CalendarIcon,
  CheckCircle2,
  AlertCircle
} from "lucide-react";
import { subDays, isSameDay, isWeekend } from "date-fns";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

export default function AdminPage() {
  const { user } = useAuth();

  // Guard - Only admins
  if (user && user.role !== 'admin') {
    return <Redirect to="/" />;
  }

  const { data: entries, isLoading: entriesLoading } = useAllTimeEntries();
  const { data: projects, isLoading: projectsLoading } = useProjects();
  const { data: users, isLoading: usersLoading } = useUsers();

  const [selectedUserId, setSelectedUserId] = useState<string>("all");
  const [selectedProjectId, setSelectedProjectId] = useState<string>("all");
  const [dateRange, setDateRange] = useState<string>("30"); // Default 30 days

  const isLoading = entriesLoading || projectsLoading || usersLoading;

  const filteredEntries = useMemo(() => {
    if (!entries) return [];
    const now = new Date();
    const cutoff = subDays(now, parseInt(dateRange));

    return entries.filter(entry => {
      const matchUser = selectedUserId === "all" || entry.userId.toString() === selectedUserId;
      const matchProject = selectedProjectId === "all" || entry.projectId.toString() === selectedProjectId;
      const entryDate = new Date(entry.date);
      const matchDate = dateRange === "all" || entryDate >= cutoff;
      return matchUser && matchProject && matchDate;
    });
  }, [entries, selectedUserId, selectedProjectId, dateRange]);

  const aggregatedByUser = useMemo(() => {
    if (!entries || !users) return [];

    // Get last 7 days range
    const today = new Date();
    const last7Days = Array.from({ length: 7 }, (_, i) => subDays(today, i));

    return users.map(u => {
      const userEntries = entries.filter(e => e.userId === u.id);
      const totalDays = userEntries.reduce((sum, e) => sum + Number(e.timeSpent), 0);

      // Calculate last 7 days submission count
      const submissionsLast7Days = userEntries.filter(e => {
        const entryDate = new Date(e.date);
        return last7Days.some(d => isSameDay(d, entryDate));
      }).length;

      // Check compliance for last 5 working days (excluding weekends)
      const last5WorkingDays = Array.from({ length: 7 }, (_, i) => subDays(today, i))
        .filter(d => !isWeekend(d))
        .slice(0, 5);

      const missingDays = last5WorkingDays.filter(d => {
        const dateStr = format(d, "yyyy-MM-dd");
        const totalForDay = userEntries
          .filter(e => e.date === dateStr)
          .reduce((sum, e) => sum + Number(e.timeSpent), 0);
        return totalForDay < 1.0;
      });

      return {
        username: u.username,
        totalDays,
        submissionsLast7Days,
        isCompliant: missingDays.length === 0,
        missingDaysCount: missingDays.length
      };
    }).sort((a, b) => b.totalDays - a.totalDays);
  }, [entries, users]);

  const aggregatedByProject = useMemo(() => {
    if (!entries) return [];
    const map = new Map<number, { name: string; totalDays: number }>();

    entries.forEach(entry => {
      if (!entry.project) return;
      const current = map.get(entry.projectId) || { name: entry.project.name, totalDays: 0 };
      current.totalDays += Number(entry.timeSpent);
      map.set(entry.projectId, current);
    });

    return Array.from(map.values()).sort((a, b) => b.totalDays - a.totalDays);
  }, [entries]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary/50" />
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-10">
      <div>
        <h1 className="text-3xl font-display font-bold tracking-tight text-foreground flex items-center gap-3">
          Admin Dashboard
          <Badge variant="secondary" className="ml-2 font-mono rounded-lg">Admin View</Badge>
        </h1>
        <p className="text-muted-foreground mt-1 text-lg">Monitor company-wide time logs and project resource allocation.</p>
      </div>

      <Tabs defaultValue="raw" className="w-full">
        <TabsList className="grid w-full max-w-[400px] grid-cols-2 mb-8 h-12 bg-secondary/50 p-1 rounded-xl">
          <TabsTrigger value="raw" className="rounded-lg font-medium text-sm data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all flex gap-2">
            <ListFilter className="w-4 h-4" />
            Raw Entries
          </TabsTrigger>
          <TabsTrigger value="aggregated" className="rounded-lg font-medium text-sm data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all flex gap-2">
            <BarChart className="w-4 h-4" />
            Aggregated
          </TabsTrigger>
        </TabsList>

        <TabsContent value="raw" className="space-y-6 animate-in fade-in duration-500">
          <Card className="shadow-sm border-border/50 rounded-2xl">
            <CardHeader className="bg-secondary/20 border-b border-border/50 pb-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <CardTitle className="font-display text-xl">All Time Entries</CardTitle>
                  <CardDescription>Filter and view individual logs.</CardDescription>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
                  <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                    <SelectTrigger className="w-full sm:w-[180px] h-10 rounded-xl bg-background">
                      <SelectValue placeholder="Filter by User" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      <SelectItem value="all">All Users</SelectItem>
                      {users?.map(u => (
                        <SelectItem key={u.id} value={u.id.toString()}>{u.username}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
                    <SelectTrigger className="w-full sm:w-[180px] h-10 rounded-xl bg-background">
                      <SelectValue placeholder="Filter by Project" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      <SelectItem value="all">All Projects</SelectItem>
                      {projects?.map(p => (
                        <SelectItem key={p.id} value={p.id.toString()}>{p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select value={dateRange} onValueChange={setDateRange}>
                    <SelectTrigger className="w-full sm:w-[150px] h-10 rounded-xl bg-background">
                      <div className="flex items-center gap-2">
                        <CalendarIcon className="w-3.5 h-3.5 opacity-50" />
                        <SelectValue placeholder="Date Range" />
                      </div>
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      <SelectItem value="7">Last 7 Days</SelectItem>
                      <SelectItem value="30">Last 30 Days</SelectItem>
                      <SelectItem value="90">Last 90 Days</SelectItem>
                      <SelectItem value="all">All Time</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {filteredEntries.length === 0 ? (
                <div className="p-12 text-center text-muted-foreground flex flex-col items-center">
                  <FileText className="w-10 h-10 mb-3 opacity-20" />
                  <p className="font-medium">No entries found matching filters.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent">
                        <TableHead className="font-semibold text-foreground/70">Date</TableHead>
                        <TableHead className="font-semibold text-foreground/70">User</TableHead>
                        <TableHead className="font-semibold text-foreground/70">Project</TableHead>
                        <TableHead className="text-right font-semibold text-foreground/70">Duration</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredEntries.map((entry) => (
                        <TableRow key={entry.id} className="group">
                          <TableCell className="font-medium whitespace-nowrap">
                            {format(new Date(entry.date), "MMM d, yyyy")}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-bold uppercase">
                                {entry.user?.username.charAt(0)}
                              </div>
                              <span className="truncate max-w-[150px]">{entry.user?.username}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="bg-background/50">
                              {entry.project?.name}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <span className="font-mono font-medium">{Number(entry.timeSpent)}</span> days
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="aggregated" className="animate-in fade-in duration-500">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

            {/* By User */}
            <Card className="shadow-sm border-border/50 rounded-2xl h-fit">
              <CardHeader className="bg-secondary/20 border-b border-border/50 pb-5">
                <div className="flex items-center gap-2">
                  <div className="bg-primary/10 text-primary p-1.5 rounded-lg">
                    <Users className="w-5 h-5" />
                  </div>
                  <div>
                    <CardTitle className="font-display">By Employee</CardTitle>
                    <CardDescription>Total days logged per person</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="font-semibold">Employee</TableHead>
                      <TableHead className="text-right font-semibold">Total Days</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {aggregatedByUser.map((row, i) => (
                      <TableRow key={i}>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-medium">{row.username}</span>
                            <span className="text-xs text-muted-foreground">{row.submissionsLast7Days} logs in 7d</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {row.isCompliant ? (
                            <Badge className="bg-green-500/10 text-green-600 border-green-500/20 gap-1 capitalize">
                              <CheckCircle2 className="w-3 h-3" />
                              Compliant
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-amber-600 border-amber-500/20 gap-1 capitalize bg-amber-500/5">
                              <AlertCircle className="w-3 h-3" />
                              {row.missingDaysCount}d Incomplete
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right font-mono font-medium text-primary">
                          {row.totalDays.toFixed(1)}
                        </TableCell>
                      </TableRow>
                    ))}
                    {aggregatedByUser.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={2} className="text-center text-muted-foreground p-6">No data available</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* By Project */}
            <Card className="shadow-sm border-border/50 rounded-2xl h-fit">
              <CardHeader className="bg-secondary/20 border-b border-border/50 pb-5">
                <div className="flex items-center gap-2">
                  <div className="bg-primary/10 text-primary p-1.5 rounded-lg">
                    <Briefcase className="w-5 h-5" />
                  </div>
                  <div>
                    <CardTitle className="font-display">By Project</CardTitle>
                    <CardDescription>Resource allocation per project</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="font-semibold">Project Name</TableHead>
                      <TableHead className="text-right font-semibold">Total Days</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {aggregatedByProject.map((row, i) => (
                      <TableRow key={i}>
                        <TableCell className="font-medium">{row.name}</TableCell>
                        <TableCell className="text-right font-mono font-medium text-primary">
                          {row.totalDays}
                        </TableCell>
                      </TableRow>
                    ))}
                    {aggregatedByProject.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={2} className="text-center text-muted-foreground p-6">No data available</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
