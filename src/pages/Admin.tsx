import React, { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { firestoreService, ProductListing, ProductOrder } from "@/lib/firestore-service";
import { Button } from "@/components/ui/button";

const ALLOWED_ADMIN_EMAILS = ["muhammednetr@gmail.com", "ola@gmail.com"];

export default function Admin() {
  const { user, profile, loading, refreshProfile } = useAuth();
  const [products, setProducts] = useState<ProductListing[]>([]);
  const [orders, setOrders] = useState<ProductOrder[]>([]);
  const [tab, setTab] = useState<"overview" | "products" | "orders">("overview");
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (!loading) {
      const allowed = !!(profile?.isAdmin || (user?.email && ALLOWED_ADMIN_EMAILS.includes(user.email)));
      setIsAdmin(Boolean(allowed || false));
    }
  }, [loading, profile, user]);

  useEffect(() => {
    if (!isAdmin) return;
    (async () => {
      try {
        const p = await firestoreService.getAllProductListings();
        setProducts(p);
        const o = await firestoreService.getAllProductOrders();
        setOrders(o);
      } catch (err) {
        console.error(err);
      }
    })();
  }, [isAdmin]);

  const handleMakeAdmin = async () => {
    if (!user) return alert("Please login first");
    if (!user.email || !ALLOWED_ADMIN_EMAILS.includes(user.email)) return alert("Your email is not allowed to create an admin account.");
    try {
      await firestoreService.updateUserProfile(user.uid, { isAdmin: true });
      await refreshProfile();
      alert("Admin account created. You now have admin access.");
    } catch (err) {
      console.error(err);
      alert("Failed to create admin account");
    }
  };

  const markOrderCompleted = async (orderId: string) => {
    try {
      await firestoreService.updateProductOrder(orderId, { status: 'completed' });
      const updated = orders.map(o => o.id === orderId ? { ...o, status: 'completed' } : o);
      setOrders(updated);
      alert('Order marked completed');
    } catch (err) {
      console.error(err);
      alert('Failed updating order');
    }
  };

  if (loading) return <div className="container py-12">Loading...</div>;

  if (!user) {
    return (
      <div className="container py-12">
        <h2 className="text-2xl font-bold">Admin</h2>
        <p className="mt-4">Please log in with an authorized admin email to continue.</p>
      </div>
    );
  }

  // If user email is allowed but profile.isAdmin not set, show creation option
  if (!profile?.isAdmin && (!user.email || !ALLOWED_ADMIN_EMAILS.includes(user.email))) {
    return (
      <div className="container py-12">
        <h2 className="text-2xl font-bold">Admin Access</h2>
        <p className="mt-4">Your account is not authorized to access admin features.</p>
      </div>
    );
  }

  return (
    <div className="container py-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        {!profile?.isAdmin && (
          <Button onClick={handleMakeAdmin}>Create Admin Account</Button>
        )}
      </div>

      <div className="mt-6 space-x-2">
        <Button variant={tab === 'overview' ? undefined : 'ghost'} onClick={() => setTab('overview')}>Overview</Button>
        <Button variant={tab === 'products' ? undefined : 'ghost'} onClick={() => setTab('products')}>Products</Button>
        <Button variant={tab === 'orders' ? undefined : 'ghost'} onClick={() => setTab('orders')}>Orders</Button>
      </div>

      <div className="mt-6">
        {tab === 'overview' && (
          <div>
            <h2 className="text-xl font-semibold">Summary</h2>
            <p className="mt-2">Products: {products.length} — Orders: {orders.length}</p>
          </div>
        )}

        {tab === 'products' && (
          <div className="mt-4 grid grid-cols-1 gap-4">
            {products.map(p => (
              <div key={p.id} className="p-4 border rounded">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold">{p.name}</h3>
                    <p className="text-sm text-muted-foreground">{p.category} • {p.region || '—'}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">${p.price}</span>
                    <Button size="sm" variant="outline" onClick={async () => { await firestoreService.updateProductListing(p.id, { isActive: !p.isActive }); alert('Updated'); }}>Toggle</Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === 'orders' && (
          <div className="mt-4 grid grid-cols-1 gap-4">
            {orders.map(o => (
              <div key={o.id} className="p-4 border rounded">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold">{o.productName} — {o.userEmail}</h3>
                    <p className="text-sm text-muted-foreground">Status: {o.status}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {o.status !== 'completed' && (
                      <Button size="sm" onClick={() => markOrderCompleted(o.id)}>Mark Completed</Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
