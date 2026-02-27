import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertUserSchema } from "@shared/schema";
import { Clock, Briefcase, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type AuthFormValues = z.infer<typeof insertUserSchema>;

export default function AuthPage() {
  const [activeTab, setActiveTab] = useState<"login" | "register">("login");
  const { login, register, isLoggingIn, isRegistering } = useAuth();
  const { toast } = useToast();

  const form = useForm<AuthFormValues>({
    resolver: zodResolver(insertUserSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  const onSubmit = async (data: AuthFormValues) => {
    try {
      if (activeTab === "login") {
        await login(data);
        toast({
          title: "Welcome back!",
          description: "Successfully logged in.",
        });
      } else {
        await register(data);
        toast({
          title: "Account created!",
          description: "Welcome to Content Beta time tracking.",
        });
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: activeTab === "login" ? "Login Failed" : "Registration Failed",
        description: error.message || "An unexpected error occurred",
      });
    }
  };

  const isPending = isLoggingIn || isRegistering;

  return (
    <div className="min-h-screen bg-background flex flex-col lg:flex-row">
      {/* Left side: Branding/Hero */}
      <div className="hidden lg:flex lg:w-1/2 bg-primary p-12 flex-col justify-between relative overflow-hidden">
        {/* Subtle background decoration */}
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-white/10 via-transparent to-transparent opacity-50" />
        
        <div className="relative z-10 flex items-center gap-3 text-primary-foreground">
          <div className="bg-white/10 backdrop-blur-md p-2 rounded-xl">
            <Clock className="w-6 h-6" />
          </div>
          <span className="font-display font-bold text-2xl tracking-tight">Content Beta</span>
        </div>

        <div className="relative z-10 max-w-lg">
          <h1 className="text-5xl font-display font-bold text-primary-foreground leading-[1.1] mb-6">
            Track time with precision and clarity.
          </h1>
          <p className="text-primary-foreground/70 text-lg mb-10 leading-relaxed">
            A premium internal tool for Content Beta employees to effortlessly log daily hours across multiple projects. Minimal friction, maximum insight.
          </p>

          <div className="grid grid-cols-2 gap-6">
            <div className="bg-white/5 border border-white/10 rounded-2xl p-5 backdrop-blur-sm">
              <Briefcase className="w-6 h-6 text-white/80 mb-3" />
              <h3 className="text-white font-medium mb-1">Project Tracking</h3>
              <p className="text-white/60 text-sm">Assign hours to specific active projects.</p>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-2xl p-5 backdrop-blur-sm">
              <BarChart3 className="w-6 h-6 text-white/80 mb-3" />
              <h3 className="text-white font-medium mb-1">Admin Insights</h3>
              <p className="text-white/60 text-sm">Aggregated reporting for management.</p>
            </div>
          </div>
        </div>

        <div className="relative z-10 text-primary-foreground/50 text-sm">
          &copy; {new Date().getFullYear()} Content Beta. All rights reserved.
        </div>
      </div>

      {/* Right side: Form */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-12 relative">
        <div className="absolute top-6 left-6 flex lg:hidden items-center gap-2 text-primary">
          <div className="bg-primary text-primary-foreground p-1.5 rounded-lg">
            <Clock className="w-5 h-5" />
          </div>
          <span className="font-display font-bold text-lg">Content Beta</span>
        </div>

        <div className="w-full max-w-[420px] animate-in fade-in slide-in-from-bottom-8 duration-700">
          <div className="mb-8 text-center lg:text-left">
            <h2 className="text-3xl font-display font-bold text-foreground mb-2">Welcome</h2>
            <p className="text-muted-foreground">Sign in to your account or create a new one.</p>
          </div>

          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6 h-12 bg-secondary/50 p-1 rounded-xl">
              <TabsTrigger value="login" className="rounded-lg font-medium text-sm data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all">Sign In</TabsTrigger>
              <TabsTrigger value="register" className="rounded-lg font-medium text-sm data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all">Create Account</TabsTrigger>
            </TabsList>

            <Card className="border-border/60 shadow-xl shadow-black/5 rounded-2xl overflow-hidden backdrop-blur-sm bg-card/95">
              <CardHeader className="space-y-1 pb-4">
                <CardTitle className="text-xl font-display">
                  {activeTab === "login" ? "Sign In" : "Register"}
                </CardTitle>
                <CardDescription>
                  {activeTab === "login" 
                    ? "Enter your credentials to access your dashboard." 
                    : "Create a new account. The first user becomes the admin."}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                    <FormField
                      control={form.control}
                      name="username"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-foreground/80">Username</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="employee@contentbeta.com" 
                              {...field} 
                              className="h-11 rounded-xl border-border/60 bg-background focus-visible:ring-primary/20 transition-all"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-foreground/80">Password</FormLabel>
                          <FormControl>
                            <Input 
                              type="password" 
                              placeholder="••••••••" 
                              {...field} 
                              className="h-11 rounded-xl border-border/60 bg-background focus-visible:ring-primary/20 transition-all"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button 
                      type="submit" 
                      className="w-full h-12 rounded-xl text-base font-semibold shadow-md hover-elevate active-elevate-2 mt-2" 
                      disabled={isPending}
                    >
                      {isPending 
                        ? (activeTab === "login" ? "Signing in..." : "Creating account...") 
                        : (activeTab === "login" ? "Sign In" : "Create Account")}
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
