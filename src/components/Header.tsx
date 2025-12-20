/* eslint-disable @typescript-eslint/no-explicit-any */
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth-context";
import { useEffect, useState } from "react";
import logo from "/favicon.png";
import { Menu, Wallet, Home, ShoppingBag, Receipt, Shield, CreditCard, Settings, User, Crown, LogOut, DollarSign, MessageSquare, ChevronDown, Monitor, Gift } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";



export const Header = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, profile, signOut } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (profile) {
      const adminEmails = ["muhammednetrc@gmail.com", "ogunlademichael3@gmail.com"];
      const isUserAdmin = profile.isAdmin === true || (user?.email && adminEmails.includes(user.email));
      setIsAdmin(isUserAdmin);
    }
  }, [profile, user]);

  const handleLogout = async () => {
    await signOut();
    navigate("/");
  };

  const isActive = (path: string) => location.pathname === path;

  const publicNavItems = [
    { to: "/pricing", label: "Pricing" },
    { to: "/sms", label: "SMS" },
    { to: "/vpn-and-proxy", label: "Proxy" },
    { to: "/esim", label: "eSIMs" },
    { to: "/rdp", label: "RDP" },
    { to: "/gifts", label: "Send Gifts" },
    { to: "/how-it-works", label: "How it Works" },
    { to: "/about", label: "About" },
    { to: "/support", label: "Support" },
  ];

  const authNavItems = [
    { to: "/dashboard", label: "Dashboard", icon: Home },
    { to: "/sms", label: "SMS", icon: MessageSquare },
    { to: "/orders", label: "Orders", icon: ShoppingBag },
    { to: "/my-orders", label: "My Gift Orders", icon: Gift },
    { to: "/transactions", label: "Transactions", icon: Receipt },
    { to: "/vpn-and-proxy", label: "Proxy", icon: Shield },
    { to: "/esim", label: "eSIMs", icon: CreditCard },
    { to: "/rdp", label: "RDP", icon: Monitor },
    { to: "/gifts", label: "Send Gifts", icon: Gift },
    { to: "/profile", label: "Profile", icon: User },
    { to: "/support", label: "Support", icon: Settings },
  ];

  const desktopAuthNavItems = user ? authNavItems.filter(item => !['Dashboard', 'Orders', 'My Gift Orders', 'Transactions', 'Profile'].includes(item.label)) : [];

  const MobileBalanceAvatar = () => (
    <div className="flex items-center gap-3">
      {/* Compact Balance with USD Icon */}
      <div className="flex items-center gap-1.5 bg-muted/60 px-3 py-1.5 rounded-full text-sm">
        <DollarSign className="h-4 w-4 text-primary" />
        <span className="font-bold">
          {profile?.balance !== undefined ? Number(profile.balance).toFixed(2) : "0.00"}
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
          {(user ? desktopAuthNavItems : publicNavItems).map((item) => (
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
        <div className="hidden md:flex items-center gap-2">
          {user ? (
            <>
              <Button variant="outline" size="sm" asChild>
                <Link to="/top-up">Top Up</Link>
              </Button>
              <div className="flex items-center gap-1 bg-muted/50 px-2 py-1 rounded-md">
                <Wallet className="h-4 w-4 text-primary" />
                <span className="text-sm font-bold">
                  ${profile?.balance !== undefined ? Number(profile.balance).toFixed(2) : "0.00"} USD
                </span>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="flex items-center gap-1 p-0 hover:bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0">
                    <Avatar className="h-9 w-9 ring-2 ring-background">
                      <AvatarImage src={(user as any)?.photoURL || "/assets/resources/avater.png"} />
                      <AvatarFallback>
                        {(user as any)?.displayName?.charAt(0).toUpperCase() ||
                          (user as any)?.email?.charAt(0).toUpperCase() ||
                          "U"}
                      </AvatarFallback>
                    </Avatar>
                    <ChevronDown className="h-4 w-4 text-black" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">
                        {(user as any)?.displayName || (user as any)?.email}
                      </p>
                      {(user as any)?.displayName && (
                        <p className="text-xs leading-none text-muted-foreground">
                          {(user as any)?.email}
                        </p>
                      )}
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link to="/dashboard">Dashboard</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/orders">Orders</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/my-orders">My Gift Orders</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/transactions">Transactions</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/profile">Profile</Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout}>
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Logout</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
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
                          ${profile?.balance !== undefined ? Number(profile.balance).toFixed(2) : "0.00"} USD
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