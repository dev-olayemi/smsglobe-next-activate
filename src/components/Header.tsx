/* eslint-disable @typescript-eslint/no-explicit-any */
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { auth } from "@/lib/auth";
import { useEffect, useState } from "react";
import logo from "/favicon.png";
import { Menu, Wallet, Home, ShoppingBag, Receipt, Shield, CreditCard, Settings, User, Crown, LogOut, DollarSign, MessageSquare } from "lucide-react";
import firestoreApi from "@/lib/firestoreApi";
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";

type User = { uid: string; email?: string | null; displayName?: string | null; emailVerified?: boolean } | null;

export const Header = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState<User | null>(null);
  const [balance, setBalance] = useState<number | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    auth.getSession().then(({ session }) => setUser(session?.user ?? null));

    const unsubscribe = auth.onAuthStateChange((session, user) => {
      setUser(user as any);
    });

    (async () => {
      try {
        const s = await auth.getSession();
        const u = s.session?.user;
        if (u) {
          const profile = await firestoreApi.getUserProfile(u.uid as string);
          if (profile && typeof profile.balance === 'number') setBalance(profile.balance);
          else if (profile && profile.balance) setBalance(Number(profile.balance));
          if (profile && (profile.isAdmin === true || (u.email && ["muhammednetrc@gmail.com","ogunlademichael3@gmail.com"].includes(u.email)))) {
            setIsAdmin(true);
          }
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
    navigate("/");
  };

  const isActive = (path: string) => location.pathname === path;

  const publicNavItems = [
    { to: "/pricing", label: "Pricing" },
    { to: "/sms", label: "SMS" },
    { to: "/vpn-and-proxy", label: "VPN & Proxy" },
    { to: "/esim", label: "eSIMs" },
    { to: "/how-it-works", label: "How it Works" },
    { to: "/about", label: "About" },
    { to: "/support", label: "Support" },
  ];

  const authNavItems = [
    { to: "/dashboard", label: "Dashboard", icon: Home },
    { to: "/sms", label: "SMS", icon: MessageSquare },
    { to: "/orders", label: "Orders", icon: ShoppingBag },
    { to: "/transactions", label: "Transactions", icon: Receipt },
    { to: "/vpn-and-proxy", label: "VPN & Proxy", icon: Shield },
    { to: "/esim", label: "eSIMs", icon: CreditCard },
    { to: "/profile", label: "Profile", icon: User },
    { to: "/support", label: "Support", icon: Settings },
  ];

  const MobileBalanceAvatar = () => (
    <div className="flex items-center gap-3">
      {/* Compact Balance with USD Icon */}
      <div className="flex items-center gap-1.5 bg-muted/60 px-3 py-1.5 rounded-full text-sm">
        <DollarSign className="h-4 w-4 text-primary" />
        <span className="font-bold">
          {balance !== null ? Number(balance).toFixed(2) : "0.00"}
        </span>
        <span className="text-xs text-muted-foreground">USD</span>
      </div>

      {/* Avatar */}
      <Avatar className="h-9 w-9 ring-2 ring-background">
        <AvatarImage src={(user as any)?.photoURL} />
        <AvatarFallback className="bg-primary/10 text-primary font-medium">
          {(user as any)?.displayName?.charAt(0).toUpperCase() ||
            (user as any)?.email?.charAt(0).toUpperCase() ||
            "U"}
        </AvatarFallback>
      </Avatar>
    </div>
  );

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="container flex h-16 items-center justify-between px-4">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-3">
          <img src={logo} alt="SMSGlobe" className="h-9 sm:h-10" />
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden lg:flex items-center gap-8">
          {(user ? authNavItems : publicNavItems).map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className={`text-sm font-medium transition-colors ${
                isActive(item.to)
                  ? "text-foreground underline underline-offset-4 decoration-primary decoration-2"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {item.label}
            </Link>
          ))}
          {isAdmin && user && (
            <Link
              to="/admin"
              className={`text-sm font-medium flex items-center gap-1 transition-colors ${
                isActive("/admin")
                  ? "text-foreground underline underline-offset-4 decoration-primary decoration-2"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Crown className="h-4 w-4" />
              Admin
            </Link>
          )}
        </nav>

        {/* Desktop Right Side */}
        <div className="hidden md:flex items-center gap-4">
          {user ? (
            <>
              <Button variant="outline" size="sm" asChild>
                <Link to="/top-up">Top Up</Link>
              </Button>
              <div className="flex items-center gap-2 bg-muted/50 px-3 py-2 rounded-lg">
                <Wallet className="h-5 w-5 text-primary" />
                <div className="flex flex-col">
                  <span className="text-xs text-muted-foreground">Balance</span>
                  <span className="font-bold">
                    ${balance !== null ? Number(balance).toFixed(2) : "0.00"} USD
                  </span>
                </div>
              </div>
              <Avatar className="h-9 w-9 ring-2 ring-background">
                <AvatarImage src={(user as any)?.photoURL} />
                <AvatarFallback>
                  {(user as any)?.displayName?.charAt(0).toUpperCase() ||
                    (user as any)?.email?.charAt(0).toUpperCase() ||
                    "U"}
                </AvatarFallback>
              </Avatar>
              <Button variant="ghost" size="sm" onClick={handleLogout} className="gap-2">
                <LogOut className="h-4 w-4" />
                Logout
              </Button>
            </>
          ) : (
            <>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/login">Login</Link>
              </Button>
              <Button size="sm" className="shadow-md" asChild>
                <Link to="/signup">Get Started</Link>
              </Button>
            </>
          )}
        </div>

        {/* Mobile: Avatar + Balance (compact) + Menu */}
        <div className="flex items-center gap-3 md:hidden">
          {user && <MobileBalanceAvatar />}
          
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="h-6 w-6" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-80">
              <VisuallyHidden>
                <SheetTitle>Navigation Menu</SheetTitle>
                <SheetDescription>Main navigation and account options</SheetDescription>
              </VisuallyHidden>

              <div className="flex flex-col h-full">
                <div className="flex items-center justify-between mb-8">
                  <Link to="/" className="flex items-center gap-2">
                    <img src={logo} alt="SMSGlobe" className="h-8" />
                  </Link>
                </div>

                {user && (
                  <div className="mb-6 px-4">
                    <div className="flex items-center gap-3 bg-muted/50 p-4 rounded-lg">
                      <Avatar className="h-12 w-12">
                        <AvatarImage src={(user as any)?.photoURL} />
                        <AvatarFallback className="text-lg">
                          {(user as any)?.displayName?.charAt(0).toUpperCase() ||
                            (user as any)?.email?.charAt(0).toUpperCase() ||
                            "U"}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm text-muted-foreground">Account Balance</p>
                        <p className="text-xl font-bold">
                          ${balance !== null ? Number(balance).toFixed(2) : "0.00"} USD
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <nav className="flex-1 space-y-1 px-2">
                  {(user ? authNavItems : publicNavItems).map((item) => {
                    const Icon = (item as any).icon;
                    return (
                      <Link
                        key={item.to}
                        to={item.to}
                        className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                          isActive(item.to)
                            ? "bg-primary/10 text-primary"
                            : "text-muted-foreground hover:bg-muted hover:text-foreground"
                        }`}
                      >
                        {Icon && <Icon className="h-5 w-5" />}
                        {item.label}
                      </Link>
                    );
                  })}
                  {isAdmin && user && (
                    <Link
                      to="/admin"
                      className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                        isActive("/admin")
                          ? "bg-primary/10 text-primary"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground"
                      }`}
                    >
                      <Crown className="h-5 w-5" />
                      Admin
                    </Link>
                  )}
                </nav>

                <div className="border-t pt-6 space-y-3 px-4">
                  {user ? (
                    <>
                      <Button variant="outline" className="w-full" asChild>
                        <Link to="/top-up">Top Up</Link>
                      </Button>
                      <Button variant="destructive" className="w-full gap-2" onClick={handleLogout}>
                        <LogOut className="h-4 w-4" />
                        Logout
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button variant="outline" className="w-full" asChild>
                        <Link to="/login">Login</Link>
                      </Button>
                      <Button className="w-full shadow-md" asChild>
                        <Link to="/signup">Get Started</Link>
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
};