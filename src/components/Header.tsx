import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Link, useNavigate } from "react-router-dom";
import { auth } from "@/lib/auth";
import { useEffect, useState } from "react";
type User = { uid: string; email?: string | null; displayName?: string | null; emailVerified?: boolean } | null;
import logo from "@/assets/logo.png";
import { Menu, X } from "lucide-react";
import firestoreApi from "@/lib/firestoreApi";

export const Header = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [balance, setBalance] = useState<number | null>(null);

  useEffect(() => {
    auth.getSession().then(({ session }) => setUser(session?.user ?? null));

    const unsubscribe = auth.onAuthStateChange((session, user) => {
      setUser(user as any);
    });

    // fetch balance when user available
    (async () => {
      try {
        const s = await auth.getSession();
        const u = s.session?.user;
        if (u) {
          const profile = await firestoreApi.getUserProfile(u.uid as string);
          if (profile && typeof profile.balance === 'number') setBalance(profile.balance);
          else if (profile && profile.balance) setBalance(Number(profile.balance));
        }
      } catch (e) {
        // ignore
      }
    })();

    return () => {
      try {
        if (typeof unsubscribe === "function") unsubscribe();
      } catch (e) {
        // ignore
      }
    };
  }, []);

  const handleLogout = async () => {
    await auth.signOut();
    setMobileMenuOpen(false);
    navigate("/");
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-2">
          <img src={logo} alt="SMSGlobe" className="h-8 sm:h-10" />
        </Link>

        {/* Desktop Navigation (hidden when user is authenticated) */}
        {!user && (
          <nav className="hidden md:flex items-center gap-6">
            <Link to="/pricing" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              Pricing
            </Link>
            <Link to="/how-it-works" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              How it works
            </Link>
            <Link to="/about" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              About
            </Link>
            <Link to="/support" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              Support
            </Link>
          </nav>
        )}

        {/* Desktop Auth / User area */}
        <div className="hidden md:flex items-center gap-4">
          {user ? (
            <>
              <nav className="flex items-center gap-4">
                <Link to="/dashboard" className="text-sm font-medium hover:underline">Dashboard</Link>
                <Link to="/transactions" className="text-sm font-medium hover:underline">Transactions</Link>
                <Link to="/orders" className="text-sm font-medium hover:underline">Orders</Link>
                <Link to="/support" className="text-sm font-medium hover:underline">Support</Link>
              </nav>

              <div className="flex items-center gap-3">
                <Button variant="ghost" size="sm" asChild>
                  <Link to="/top-up">Top Up</Link>
                </Button>

                <div className="flex items-center gap-2">
                  <Avatar className="h-8 w-8">
                    {/** show avatar image if available, otherwise show initials */}
                    <AvatarImage src={(user as any)?.photoURL || undefined} alt={(user as any)?.displayName || (user as any)?.email || "user"} />
                    <AvatarFallback>{(user as any)?.displayName ? (user as any).displayName.charAt(0) : ((user as any)?.email ? (user as any).email.charAt(0).toUpperCase() : "U")}</AvatarFallback>
                  </Avatar>
                </div>

                {/* Balance display (USD) */}
                <div className="hidden lg:flex flex-col items-end text-right mr-2">
                  <span className="text-xs text-muted-foreground">Balance</span>
                  <span className="text-sm font-medium">{balance !== null ? `$${Number(balance).toFixed(2)}` : "$0.00"}</span>
                </div>

                <Button variant="outline" size="sm" onClick={handleLogout}>
                  Logout
                </Button>
              </div>
            </>
          ) : (
            <>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/login">Login</Link>
              </Button>
              <Button size="sm" className="shadow-lg" asChild>
                <Link to="/dashboard">Buy Number</Link>
              </Button>
            </>
          )}
        </div>

        {/* Mobile Menu Button */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="md:hidden p-2"
        >
          {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-border bg-background">
          <nav className="container px-4 py-4 space-y-3">
            <Link 
              to="/pricing" 
              className="block py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              onClick={() => setMobileMenuOpen(false)}
            >
              Pricing
            </Link>
            <Link 
              to="/how-it-works" 
              className="block py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              onClick={() => setMobileMenuOpen(false)}
            >
              How it works
            </Link>
            <Link 
              to="/about" 
              className="block py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              onClick={() => setMobileMenuOpen(false)}
            >
              About
            </Link>
            
            <div className="pt-3 space-y-2 border-t border-border">
              {user ? (
                <>
                  <Button variant="ghost" className="w-full justify-start" asChild>
                    <Link to="/dashboard" onClick={() => setMobileMenuOpen(false)}>Dashboard</Link>
                  </Button>
                  <Button variant="ghost" className="w-full justify-start" asChild>
                    <Link to="/transactions" onClick={() => setMobileMenuOpen(false)}>Transactions</Link>
                  </Button>
                  <Button variant="ghost" className="w-full justify-start" asChild>
                    <Link to="/profile" onClick={() => setMobileMenuOpen(false)}>Profile</Link>
                  </Button>
                  <Button variant="outline" className="w-full" onClick={handleLogout}>
                    Logout
                  </Button>
                </>
              ) : (
                <>
                  <Button variant="ghost" className="w-full" asChild>
                    <Link to="/login" onClick={() => setMobileMenuOpen(false)}>Login</Link>
                  </Button>
                  <Button className="w-full shadow-lg" asChild>
                    <Link to="/signup" onClick={() => setMobileMenuOpen(false)}>Get Started</Link>
                  </Button>
                </>
              )}
            </div>
          </nav>
        </div>
      )}
    </header>
  );
};
