/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import firestoreApi from "@/lib/firestoreApi";
import { auth } from "@/lib/auth";

const Orders = () => {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      const s = await auth.getSession();
      const user = s.session?.user;
      if (!user) {
        setOrders([]);
        setLoading(false);
        return;
      }
      const res = await firestoreApi.getOrdersByUser(user.uid);
      if (mounted) setOrders(res || []);
      setLoading(false);
    })();
    return () => { mounted = false; };
  }, []);

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 container px-4 py-12">
        <h1 className="text-2xl font-bold mb-6">My Orders</h1>
        {loading ? <div>Loading...</div> : (
          <div className="grid gap-4">
            {orders.length === 0 && <div>No orders yet.</div>}
            {orders.map((o) => (
              <div key={o.id} className="rounded-lg border p-4 bg-card">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-semibold">{o.productName || o.productSlug}</div>
                    <div className="text-sm text-muted-foreground">Status: {o.status}</div>
                  </div>
                  <div className="text-sm text-muted-foreground">{new Date((o.createdAt && o.createdAt.seconds ? o.createdAt.seconds * 1000 : Date.now())).toLocaleString()}</div>
                </div>
                {o.notes && <div className="mt-2 text-sm">Notes: {o.notes}</div>}
              </div>
            ))}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default Orders;
