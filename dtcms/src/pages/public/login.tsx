import React from 'react';
import { useLocation } from 'wouter';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useLogin, UserRole } from '@workspace/api-client-react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Link } from 'wouter';
import { BusFront, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const loginSchema = z.object({
  email: z.string().email('Valid email is required'),
  password: z.string().min(1, 'Password is required'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

const DEMO_ACCOUNTS = [
  { role: 'Admin', email: 'admin@dtcms.gh', password: 'admin123' },
  { role: 'Treasurer', email: 'treasurer@dtcms.gh', password: 'treasurer123' },
  { role: 'Secretary', email: 'secretary@dtcms.gh', password: 'secretary123' },
  { role: 'Client Manager', email: 'manager@dtcms.gh', password: 'manager123' },
  { role: 'Driver', email: 'driver@dtcms.gh', password: 'driver123' },
];

export default function Login() {
  const [, setLocation] = useLocation();
  const { login: setAuthContext } = useAuth();
  const { toast } = useToast();
  const loginMutation = useLogin();

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    }
  });

  const fillCredentials = (email: string, password: string) => {
    form.setValue('email', email, { shouldValidate: true, shouldDirty: true });
    form.setValue('password', password, { shouldValidate: true, shouldDirty: true });
  };

  const onSubmit = (data: LoginFormValues) => {
    loginMutation.mutate({ data }, {
      onSuccess: (res) => {
        if (res.success && res.data && res.token) {
          setAuthContext(res.data, res.token);
          toast({
            title: "Welcome back",
            description: `Logged in as ${res.data.fullName}`,
          });
          
          // Redirect based on role
          const adminRoles = [
            UserRole.ADMIN, 
            UserRole.SECRETARY, 
            UserRole.TREASURER, 
            UserRole.CLIENT_MANAGER, 
            UserRole.COMMITTEE
          ];
          
          if (res.data.role && adminRoles.includes(res.data.role as any)) {
            setLocation('/admin/dashboard');
          } else {
            setLocation('/member/dashboard');
          }
        }
      },
      onError: (error) => {
        toast({
          variant: "destructive",
          title: "Login Failed",
          description: error.message || "Invalid credentials",
        });
      }
    });
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center min-h-[calc(100vh-4rem)] px-4 bg-accent/20">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
            <BusFront className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold text-foreground">Welcome Back</h1>
          <p className="text-muted-foreground mt-2">Sign in to your DTCMS account</p>
        </div>

        <Card className="border-border shadow-lg">
          <CardContent className="pt-6">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          name="email"
                          autoComplete="username"
                          placeholder="name@example.com"
                          {...field}
                          data-testid="input-login-email"
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
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <Input
                          type="password"
                          name="password"
                          autoComplete="current-password"
                          placeholder="••••••••"
                          {...field}
                          data-testid="input-login-password"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <Button 
                  type="submit" 
                  className="w-full h-11 text-base"
                  disabled={loginMutation.isPending}
                  data-testid="btn-login-submit"
                >
                  {loginMutation.isPending ? (
                    <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Signing in...</>
                  ) : (
                    'Sign In'
                  )}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
        
        <div className="text-center mt-6">
          <p className="text-sm text-muted-foreground">
            Don't have an account? <Link href="/apply" className="text-primary font-medium hover:underline">Apply for membership</Link>
          </p>
        </div>

        {/* Demo credentials */}
        <div className="mt-6 rounded-lg border border-border bg-card p-4">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Demo accounts — click to fill</p>
          <div className="grid grid-cols-1 gap-2">
            {DEMO_ACCOUNTS.map((account) => (
              <button
                key={account.email}
                type="button"
                onClick={() => fillCredentials(account.email, account.password)}
                className="flex items-center justify-between w-full px-3 py-2 rounded-md text-left text-sm border border-border hover:bg-accent hover:border-primary/30 transition-colors"
                data-testid={`demo-${account.role.toLowerCase().replace(' ', '-')}`}
              >
                <span className="font-medium text-foreground">{account.role}</span>
                <span className="text-muted-foreground font-mono text-xs">{account.email}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}