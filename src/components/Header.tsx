import { Button } from "@/components/ui/button";
import { Link, useNavigate } from "react-router-dom";
import { auth } from "@/lib/auth";
import { useEffect, useState } from "react";
import { User } from "@supabase/supabase-js";
import logo from "@/assets/logo.png";

export const Header = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    auth.getSession().then(({ session }) => {
      setUser(session?.user ?? null);
    });

    const { data: { subscription } } = auth.onAuthStateChange((session, user) => {
      setUser(user);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    await auth.signOut();
    navigate("/");
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <img src={logo} alt="SMSGlobe" className="h-10" />
        </Link>

        <nav className="hidden md:flex items-center gap-6">
          <Link to="/pricing" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
            Pricing
          </Link>
          <Link to="/api-docs" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
            API Docs
          </Link>
          <Link to="/about" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
            About
          </Link>
        </nav>

        <div className="flex items-center gap-3">
          {user ? (
            <>
              <Button variant="ghost" asChild>
                <Link to="/dashboard">Dashboard</Link>
              </Button>
              <Button variant="ghost" asChild>
                <Link to="/transactions">Transactions</Link>
              </Button>
              <Button variant="ghost" asChild>
                <Link to="/profile">Profile</Link>
              </Button>
              <Button variant="outline" onClick={handleLogout}>
                Logout
              </Button>
            </>
          ) : (
            <>
              <Button variant="ghost" asChild>
                <Link to="/login">Login</Link>
              </Button>
              <Button asChild className="shadow-lg">
                <Link to="/signup">Get Started</Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
};
