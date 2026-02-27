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
  FileText
} from "lucide-react";

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

  const isLoading = entriesLoading || projectsLoading || usersLoading;

  const filteredEntries = useMemo(() => {
    if (!entries) return [];
    return entries.filter(entry => {
      const matchUser = selectedUserId === "all" || entry.userId.toString() === selectedUserId;
      const matchProject = selectedProjectId === "all" || entry.projectId.toString() === selectedProjectId;
      return matchUser && matchProject;
    });
  }, [entries, selectedUserId, selectedProjectId]);

  const aggregatedByUser = useMemo(() => {
    if (!entries) return [];
    const map = new Map<number, { username: string; totalDays: number }>();
    
    entries.forEach(entry => {
      if (!entry.user) return;
      const current = map.get(entry.userId) || { username: entry.user.username, totalDays: 0 };
      current.totalDays += Number(entry.timeSpent);
      map.set(entry.userId, current);
    });
    
    return Array.from(map.values()).sort((a, b) => b.totalDays - a.totalDays);
  }, [entries]);

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
                        <TableCell className="font-medium">{row.username}</TableCell>
                        <TableCell className="text-right font-mono font-medium text-primary">
                          {row.totalDays}
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
