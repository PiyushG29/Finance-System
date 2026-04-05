import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { IndianRupee, Check, X } from "lucide-react";
import { cn } from "@/lib/utils";

const passwordRules = [
  { label: "At least 8 characters", test: (p: string) => p.length >= 8 },
  { label: "One uppercase letter", test: (p: string) => /[A-Z]/.test(p) },
  { label: "One lowercase letter", test: (p: string) => /[a-z]/.test(p) },
  { label: "One number", test: (p: string) => /[0-9]/.test(p) },
  { label: "One special symbol (@#*^%$)", test: (p: string) => /[@#*^%$]/.test(p) },
];

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [identifier, setIdentifier] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();

  const ruleResults = useMemo(() => passwordRules.map(r => r.test(password)), [password]);
  const allPassed = ruleResults.every(Boolean);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((isLogin && !identifier.trim()) || (!isLogin && (!email.trim() || !username.trim())) || !password.trim()) {
      toast.error("Please fill in all required fields");
      return;
    }
    if (!isLogin && !allPassed) {
      toast.error("Password does not meet the requirements");
      return;
    }
    setLoading(true);
    try {
      if (isLogin) {
        const { error } = await signIn(identifier, password);
        if (error) throw error;
        toast.success("Welcome back!");
        navigate("/");
      } else {
        const { error } = await signUp(email, password, username);
        if (error) throw error;
        toast.success("Check your email to confirm your account!");
      }
    } catch (err: any) {
      toast.error(err.message || "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md shadow-lg border-border/50">
        <CardHeader className="text-center space-y-2">
          <div className="mx-auto w-12 h-12 bg-primary rounded-xl flex items-center justify-center mb-2">
            <IndianRupee className="w-6 h-6 text-primary-foreground" />
          </div>
          <CardTitle className="text-2xl font-bold">Finance Dashboard</CardTitle>
          <CardDescription>
            {isLogin ? "Sign in to your account" : "Create a new account"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4" autoComplete="on">
            {isLogin ? (
              <div className="space-y-2">
                <Label htmlFor="identifier">Username or Email</Label>
                <Input
                  id="identifier"
                  name="identifier"
                  type="text"
                  autoComplete="username email"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="username or you@example.com"
                  required
                />
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <Label htmlFor="username">Username</Label>
                  <Input
                    id="username"
                    name="username"
                    autoComplete="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Choose a username"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    inputMode="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    required
                  />
                </div>
              </>
            )}
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete={isLogin ? "current-password" : "new-password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
              {!isLogin && password.length > 0 && (
                <ul className="mt-2 space-y-1">
                  {passwordRules.map((rule, i) => (
                    <li key={i} className={cn("flex items-center gap-1.5 text-xs", ruleResults[i] ? "text-accent" : "text-muted-foreground")}>
                      {ruleResults[i] ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                      {rule.label}
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <Button type="submit" className="w-full" disabled={loading || (!isLogin && !allPassed && password.length > 0)}>
              {loading ? "Please wait..." : isLogin ? "Sign In" : "Sign Up"}
            </Button>
          </form>
          <div className="mt-4 text-center">
            <button
              type="button"
              onClick={() => setIsLogin(!isLogin)}
              className="text-sm text-muted-foreground hover:text-primary transition-colors"
            >
              {isLogin ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
