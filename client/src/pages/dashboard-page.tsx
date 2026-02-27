import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { CalendarIcon, Loader2, Plus, Clock } from "lucide-react";
import { insertTimeEntrySchema } from "@shared/schema";
import { useProjects } from "@/hooks/use-projects";
import { useTimeEntries, useCreateTimeEntry } from "@/hooks/use-time-entries";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
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
import { Badge } from "@/components/ui/badge";

type TimeEntryFormValues = z.infer<typeof insertTimeEntrySchema>;

export default function DashboardPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { data: projects, isLoading: projectsLoading } = useProjects();
  const { data: entries, isLoading: entriesLoading } = useTimeEntries();
  const { mutateAsync: createEntry, isPending: isCreating } = useCreateTimeEntry();

  const form = useForm<TimeEntryFormValues>({
    resolver: zodResolver(insertTimeEntrySchema),
    defaultValues: {
      date: format(new Date(), "yyyy-MM-dd"),
      timeSpent: 1,
    },
  });

  const onSubmit = async (data: TimeEntryFormValues) => {
    try {
      await createEntry(data);
      toast({
        title: "Time logged successfully",
        description: "Your time entry has been recorded.",
      });
      // Reset form but keep the date
      form.reset({
        date: data.date,
        projectId: undefined,
        timeSpent: 1,
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Failed to log time",
        description: error.message || "You may have exceeded the 1 day limit for this date.",
      });
    }
  };

  if (projectsLoading || entriesLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary/50" />
      </div>
    );
  }

  const activeProjects = projects?.filter(p => p.isActive) || [];

  return (
    <div className="space-y-8 pb-10">
      <div>
        <h1 className="text-3xl font-display font-bold tracking-tight text-foreground">Welcome back, {user?.username.split('@')[0]}</h1>
        <p className="text-muted-foreground mt-1 text-lg">Log your hours and view your recent activity.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* Log Time Form */}
        <Card className="lg:col-span-1 shadow-md shadow-black/5 border-border/50 rounded-2xl overflow-hidden">
          <CardHeader className="bg-secondary/30 border-b border-border/50 pb-5">
            <div className="flex items-center gap-2">
              <div className="bg-primary text-primary-foreground p-1.5 rounded-lg">
                <Plus className="w-4 h-4" />
              </div>
              <CardTitle className="font-display">Log Time</CardTitle>
            </div>
            <CardDescription className="pt-1">Record your work for a specific day.</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                <FormField
                  control={form.control}
                  name="projectId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-foreground/80 font-medium">Project</FormLabel>
                      <Select 
                        onValueChange={(val) => field.onChange(parseInt(val, 10))} 
                        value={field.value?.toString()}
                      >
                        <FormControl>
                          <SelectTrigger className="h-11 rounded-xl">
                            <SelectValue placeholder="Select a project" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="rounded-xl">
                          {activeProjects.map((project) => (
                            <SelectItem key={project.id} value={project.id.toString()} className="rounded-lg my-1">
                              {project.name}
                            </SelectItem>
                          ))}
                          {activeProjects.length === 0 && (
                            <div className="p-2 text-sm text-muted-foreground text-center">No active projects available.</div>
                          )}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="date"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel className="text-foreground/80 font-medium">Date</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant={"outline"}
                              className={`h-11 rounded-xl w-full pl-3 text-left font-normal ${!field.value && "text-muted-foreground"}`}
                            >
                              {field.value ? (
                                format(new Date(field.value), "PPP")
                              ) : (
                                <span>Pick a date</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0 rounded-xl" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value ? new Date(field.value) : undefined}
                            onSelect={(date) => {
                              if (date) {
                                // Adjust to local timezone string format YYYY-MM-DD
                                const offset = date.getTimezoneOffset()
                                const localDate = new Date(date.getTime() - (offset*60*1000))
                                field.onChange(localDate.toISOString().split('T')[0])
                              }
                            }}
                            disabled={(date) =>
                              date > new Date() || date < new Date("1900-01-01")
                            }
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="timeSpent"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-foreground/80 font-medium">Time Spent</FormLabel>
                      <Select 
                        onValueChange={(val) => field.onChange(parseFloat(val))} 
                        value={field.value?.toString()}
                      >
                        <FormControl>
                          <SelectTrigger className="h-11 rounded-xl">
                            <SelectValue placeholder="Select duration" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="rounded-xl">
                          <SelectItem value="0.5" className="rounded-lg my-1">Half Day (0.5)</SelectItem>
                          <SelectItem value="1" className="rounded-lg my-1">Full Day (1.0)</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button 
                  type="submit" 
                  disabled={isCreating}
                  className="w-full h-11 rounded-xl font-semibold shadow-md hover-elevate active-elevate-2 mt-2"
                >
                  {isCreating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Save Entry
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>

        {/* Recent Entries */}
        <Card className="lg:col-span-2 shadow-md shadow-black/5 border-border/50 rounded-2xl overflow-hidden flex flex-col h-full">
          <CardHeader className="bg-secondary/30 border-b border-border/50 pb-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="bg-primary/10 text-primary p-1.5 rounded-lg">
                  <Clock className="w-4 h-4" />
                </div>
                <CardTitle className="font-display">Recent Activity</CardTitle>
              </div>
              <Badge variant="outline" className="font-mono bg-background">
                {entries?.length || 0} entries
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-0 flex-1 flex flex-col">
            {!entries || entries.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center p-12 text-center text-muted-foreground">
                <div className="bg-secondary p-4 rounded-full mb-4">
                  <CalendarIcon className="w-8 h-8 opacity-40" />
                </div>
                <p className="font-medium text-foreground">No time entries yet</p>
                <p className="text-sm mt-1 max-w-sm">Use the form to log your first day of work.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="w-[120px] font-semibold text-foreground/70">Date</TableHead>
                      <TableHead className="font-semibold text-foreground/70">Project</TableHead>
                      <TableHead className="text-right font-semibold text-foreground/70">Duration</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {entries.map((entry) => (
                      <TableRow key={entry.id} className="group transition-colors">
                        <TableCell className="font-medium">
                          {format(new Date(entry.date), "MMM d, yyyy")}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-primary/40 group-hover:bg-primary transition-colors" />
                            {entry.project?.name || "Unknown Project"}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge 
                            variant={Number(entry.timeSpent) === 1 ? "default" : "secondary"}
                            className="font-mono"
                          >
                            {Number(entry.timeSpent)} {Number(entry.timeSpent) === 1 ? 'day' : 'day'}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
