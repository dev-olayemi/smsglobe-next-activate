/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useEffect, useState } from 'react';
import firestoreApi from '@/lib/firestoreApi';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

type Service = {
  id?: string;
  name: string;
  slug?: string;
  description?: string;
  price?: string;
  country_count?: number;
  image?: string;
};

const sample: Service[] = [
  { name: 'SMS Number', slug: 'sms-number', description: 'Receive SMS messages online', price: 'From $0.10', country_count: 190 },
  { name: 'eSIM', slug: 'esim', description: 'Global eSIM data plans', price: 'From $4.99', country_count: 50 },
  { name: 'Proxy', slug: 'proxy', description: 'Residential and datacenter proxies', price: 'From $2.00', country_count: 10 },
  { name: 'RDP', slug: 'rdp', description: 'Remote desktop access', price: 'From $5.00', country_count: 5 },
];

export const ProductList: React.FC = () => {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    firestoreApi.getServices().then((s) => {
      if (!mounted) return;
      if (s && s.length) setServices(s as any);
      else setServices(sample);
      setLoading(false);
    }).catch(() => {
      if (mounted) { setServices(sample); setLoading(false); }
    });
    return () => { mounted = false; };
  }, []);

  return (
    <section className="py-16">
      <div className="container px-4">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-semibold">Products</h2>
            <p className="text-sm text-muted-foreground">Browse available products. Place an order and our admin will fulfill it manually.</p>
          </div>
          <div>
            <Link to="/pricing" className="text-sm text-primary hover:underline">View pricing</Link>
          </div>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {(services || []).map((s, idx) => {
            // choose a fallback image based on slug/category
            const fallbackMap: Record<string, string> = {
              'sms-number': 'https://source.unsplash.com/collection/190727/800x600',
              'esim': 'https://source.unsplash.com/featured/?esim,sim,phone',
              'proxy': 'https://source.unsplash.com/featured/?proxy,network',
              'rdp': 'https://source.unsplash.com/featured/?server,remote',
              'vpn': 'https://source.unsplash.com/featured/?vpn,security',
            };
            const slugKey = (s.slug || s.name || '').toString().toLowerCase();
            const img = s.image || fallbackMap[slugKey] || `https://source.unsplash.com/featured/?${encodeURIComponent(s.name || 'service')}`;

            return (
              <div key={idx} className="group relative rounded-2xl overflow-hidden border border-border bg-card shadow-sm hover:shadow-lg transition-all">
                <div className="relative h-48 bg-gray-50">
                  <img src={img} alt={s.name} className="absolute inset-0 h-full w-full object-cover group-hover:scale-105 transition-transform" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
                  <div className="absolute top-3 left-3 inline-flex items-center gap-2 rounded-full bg-white/90 px-3 py-1 text-xs font-medium">
                    {s.name}
                  </div>
                  <div className="absolute top-3 right-3 inline-flex items-center gap-2 rounded-full bg-primary text-white px-3 py-1 text-sm font-semibold">
                    {s.price || 'Contact'}
                  </div>
                </div>

                <div className="p-4">
                  <h3 className="text-lg font-semibold mb-1">{s.name}</h3>
                  <p className="text-sm text-muted-foreground mb-4 line-clamp-2">{s.description || 'No description provided.'}</p>

                  <div className="flex items-center justify-between">
                    <div className="text-xs text-muted-foreground">{s.country_count ? `${s.country_count} countries` : 'Various'}</div>
                    <div className="flex items-center gap-2">
                      <Button size="sm" asChild>
                        <Link to={`/product/${s.slug || s.name.toLowerCase().replace(/\s+/g, '-')}`}>Request</Link>
                      </Button>
                      <Button size="sm" variant="outline" asChild>
                        <Link to="/how-it-works">Guide</Link>
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default ProductList;
