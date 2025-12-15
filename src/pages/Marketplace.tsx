import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/lib/auth-context";
import { firestoreService, ProductListing, ProductCategory } from "@/lib/firestore-service";
import { toast } from "sonner";
import { Loader2, Wifi, Globe, Shield, Monitor, Gift, ShoppingCart, Clock, Check } from "lucide-react";

const categoryIcons: Record<ProductCategory, React.ReactNode> = {
  esim: <Wifi className="h-5 w-5" />,
  proxy: <Globe className="h-5 w-5" />,
  vpn: <Shield className="h-5 w-5" />,
  rdp: <Monitor className="h-5 w-5" />,
  gift: <Gift className="h-5 w-5" />,
};

const categoryLabels: Record<ProductCategory, string> = {
  esim: "eSIM",
  proxy: "Proxy",
  vpn: "VPN",
  rdp: "RDP",
  gift: "Gift Cards",
};

const Marketplace = () => {
  const navigate = useNavigate();
  const { category } = useParams<{ category?: string }>();
  const { user, profile, refreshProfile } = useAuth();
  const [products, setProducts] = useState<ProductListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<ProductCategory | 'all'>(
    (category as ProductCategory) || 'all'
  );

  useEffect(() => {
    loadProducts();
  }, [activeCategory]);

  const loadProducts = async () => {
    setLoading(true);
    try {
      const data = await firestoreService.getProductListings(
        activeCategory === 'all' ? undefined : activeCategory
      );
      setProducts(data);
    } catch (error) {
      console.error("Error loading products:", error);
      toast.error("Failed to load products");
    } finally {
      setLoading(false);
    }
  };

  const handlePurchase = async (product: ProductListing) => {
    if (!user) {
      toast.error("Please login to purchase");
      navigate("/login");
      return;
    }

    if (!profile || profile.balance < product.price) {
      toast.error("Insufficient balance. Please top up your account.");
      return;
    }

    setPurchasing(product.id);
    try {
      const result = await firestoreService.purchaseProduct(user.uid, product.id);
      if (result.success) {
        toast.success("Order placed successfully! Check your orders for updates.");
        await refreshProfile();
        navigate("/orders");
      } else {
        toast.error(result.error || "Failed to place order");
      }
    } catch (error) {
      console.error("Purchase error:", error);
      toast.error("Failed to complete purchase");
    } finally {
      setPurchasing(null);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 container px-4 py-6 md:py-8">
        <div className="max-w-6xl mx-auto space-y-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold mb-2">Marketplace</h1>
            <p className="text-muted-foreground">
              Browse eSIMs, Proxies, VPNs, RDP, and Gift Cards
            </p>
          </div>

          {/* Balance Card */}
          {user && profile && (
            <Card className="bg-primary text-primary-foreground">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm opacity-80">Your Balance</p>
                    <p className="text-2xl font-bold">${profile.balance?.toFixed(2) || '0.00'}</p>
                  </div>
                  <Button 
                    variant="secondary" 
                    onClick={() => navigate("/dashboard")}
                  >
                    Top Up
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Category Tabs */}
          <Tabs value={activeCategory} onValueChange={(v) => setActiveCategory(v as ProductCategory | 'all')}>
            <TabsList className="w-full flex-wrap h-auto gap-2 bg-transparent p-0">
              <TabsTrigger 
                value="all" 
                className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              >
                All
              </TabsTrigger>
              {(Object.keys(categoryLabels) as ProductCategory[]).map((cat) => (
                <TabsTrigger 
                  key={cat} 
                  value={cat}
                  className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground flex items-center gap-2"
                >
                  {categoryIcons[cat]}
                  {categoryLabels[cat]}
                </TabsTrigger>
              ))}
            </TabsList>

            <TabsContent value={activeCategory} className="mt-6">
              {loading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : products.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <p className="text-muted-foreground">
                      No products available in this category yet.
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {products.map((product) => (
                    <Card key={product.id} className="flex flex-col">
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-2">
                            <div className="p-2 bg-primary/10 rounded-lg">
                              {categoryIcons[product.category]}
                            </div>
                            <Badge variant="secondary">
                              {categoryLabels[product.category]}
                            </Badge>
                          </div>
                          <span className="text-xl font-bold text-primary">
                            ${product.price.toFixed(2)}
                          </span>
                        </div>
                        <CardTitle className="mt-3">{product.name}</CardTitle>
                        <CardDescription>{product.description}</CardDescription>
                      </CardHeader>
                      <CardContent className="flex-1 flex flex-col">
                        {/* Features */}
                        {product.features && product.features.length > 0 && (
                          <ul className="space-y-2 mb-4">
                            {product.features.map((feature, idx) => (
                              <li key={idx} className="flex items-center gap-2 text-sm">
                                <Check className="h-4 w-4 text-green-500" />
                                {feature}
                              </li>
                            ))}
                          </ul>
                        )}
                        
                        {/* Duration/Region */}
                        <div className="flex flex-wrap gap-2 mb-4">
                          {product.duration && (
                            <Badge variant="outline" className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {product.duration}
                            </Badge>
                          )}
                          {product.region && (
                            <Badge variant="outline">
                              {product.region}
                            </Badge>
                          )}
                        </div>

                        <div className="mt-auto">
                          <Button 
                            className="w-full"
                            onClick={() => handlePurchase(product)}
                            disabled={purchasing === product.id}
                          >
                            {purchasing === product.id ? (
                              <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            ) : (
                              <ShoppingCart className="h-4 w-4 mr-2" />
                            )}
                            Purchase
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Marketplace;
