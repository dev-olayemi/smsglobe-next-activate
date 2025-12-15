/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import firestoreApi from "@/lib/firestoreApi";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { auth } from "@/lib/auth";

const ProductDetail = () => {
  const { slug } = useParams();
  const [service, setService] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState("");
  const [quantity, setQuantity] = useState(1);
  const { toast } = useToast();

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      try {
        const services = await firestoreApi.getServices();
        const s = (services || []).find((x: any) => (x.slug || x.name || '').toString().toLowerCase() === (slug || '').toString().toLowerCase());
        if (mounted) setService(s || null);
      } catch (e) {
        // ignore
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [slug]);

  const placeOrder = async () => {
    try {
      const session = await auth.getSession();
      const user = session.session?.user;
      if (!user) {
        toast({ title: 'Login required', description: 'Please login to place an order.' });
        return;
      }

      await firestoreApi.addOrder({
        userId: user.uid,
        productSlug: slug,
        productName: service?.name || slug,
        notes,
        quantity,
        status: 'pending'
      });

      toast({ title: 'Order placed', description: 'Your request was submitted. Admin will fulfill it shortly.' });
    } catch (err) {
      console.error(err);
      toast({ title: 'Error', description: 'Failed to place order.' });
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 container px-4 py-12">
        {loading ? (
          <div>Loading...</div>
        ) : !service ? (
          <div>Product not found.</div>
        ) : (
          <div className="grid md:grid-cols-3 gap-8">
            <div className="md:col-span-2">
              <div className="rounded-lg overflow-hidden bg-card">
                {service.image ? (
                  <img src={service.image} alt={service.name} className="w-full object-cover h-96" />
                ) : (
                  <div className="w-full h-96 bg-muted flex items-center justify-center">No image</div>
                )}
              </div>

              <h1 className="mt-6 text-2xl font-bold">{service.name}</h1>
              <p className="text-muted-foreground mt-2">{service.description}</p>
            </div>

            <aside className="rounded-2xl border border-border bg-card p-6">
              <div className="mb-4">
                <div className="text-sm text-muted-foreground">Price</div>
                <div className="text-lg font-semibold">{service.price || 'Contact'}</div>
              </div>

              <div className="mb-4">
                <Label>Quantity</Label>
                <Input type="number" value={quantity} onChange={(e) => setQuantity(Number(e.target.value))} />
              </div>

              <div className="mb-4">
                <Label>Additional notes</Label>
                <Input value={notes} onChange={(e) => setNotes(e.target.value)} />
              </div>

              <Button className="w-full" onClick={placeOrder}>Request Product</Button>
            </aside>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default ProductDetail;
