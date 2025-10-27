import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { getServiceIcon, getCountryFlag } from "@/lib/service-icons";
import { toast } from "sonner";

interface Service {
  code: string;
  name: string;
}

interface Country {
  code: number;
  name: string;
  count: number;
  price: number;
}

interface DynamicServicePickerProps {
  onBuyNumber: (service: string, country: string, price: number) => Promise<void>;
}

export const DynamicServicePicker = ({ onBuyNumber }: DynamicServicePickerProps) => {
  const [services, setServices] = useState<Service[]>([]);
  const [countries, setCountries] = useState<Country[]>([]);
  const [service, setService] = useState("");
  const [country, setCountry] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingCountries, setLoadingCountries] = useState(false);
  const [searchService, setSearchService] = useState("");
  const [searchCountry, setSearchCountry] = useState("");

  useEffect(() => {
    loadServices();
  }, []);

  useEffect(() => {
    if (service) {
      loadCountries();
    }
  }, [service]);

  const loadServices = async () => {
    try {
      const { data, error } = await supabase.functions.invoke("sms-services");
      if (error) throw error;
      setServices(data || []);
    } catch (error) {
      console.error("Error loading services:", error);
      toast.error("Failed to load services");
    }
  };

  const loadCountries = async () => {
    if (!service) return;
    
    setLoadingCountries(true);
    try {
      const { data, error } = await supabase.functions.invoke("sms-countries", {
        body: { service },
      });
      if (error) throw error;
      setCountries(data || []);
    } catch (error) {
      console.error("Error loading countries:", error);
      toast.error("Failed to load countries");
    } finally {
      setLoadingCountries(false);
    }
  };

  const handleBuy = async () => {
    if (!service || !country) return;
    
    const selectedCountry = countries.find((c) => c.code.toString() === country);
    const price = selectedCountry?.price || 0;
    
    setLoading(true);
    try {
      await onBuyNumber(service, country, price);
    } finally {
      setLoading(false);
    }
  };

  const filteredServices = services.filter((s) =>
    s.name.toLowerCase().includes(searchService.toLowerCase())
  );

  const filteredCountries = countries.filter((c) =>
    c.name.toLowerCase().includes(searchCountry.toLowerCase())
  );

  const selectedCountry = countries.find((c) => c.code.toString() === country);
  const ServiceIcon = service ? getServiceIcon(service) : null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Get a Virtual Number</CardTitle>
        <CardDescription>
          Select a service and country to receive SMS verification codes
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="service">Service</Label>
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search services..."
              value={searchService}
              onChange={(e) => setSearchService(e.target.value)}
              className="pl-9 mb-2"
            />
          </div>
          <Select value={service} onValueChange={setService}>
            <SelectTrigger id="service">
              <SelectValue placeholder="Select a service">
                {service && (
                  <div className="flex items-center gap-2">
                    {ServiceIcon && <ServiceIcon className="h-4 w-4" />}
                    <span>{services.find((s) => s.code === service)?.name}</span>
                  </div>
                )}
              </SelectValue>
            </SelectTrigger>
            <SelectContent className="max-h-[300px]">
              {filteredServices.map((s) => {
                const Icon = getServiceIcon(s.code);
                return (
                  <SelectItem key={s.code} value={s.code}>
                    <div className="flex items-center gap-2">
                      <Icon className="h-4 w-4" />
                      <span>{s.name}</span>
                    </div>
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>

        {service && (
          <div className="space-y-2">
            <Label htmlFor="country">Country</Label>
            {loadingCountries ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : (
              <>
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search countries..."
                    value={searchCountry}
                    onChange={(e) => setSearchCountry(e.target.value)}
                    className="pl-9 mb-2"
                  />
                </div>
                <Select value={country} onValueChange={setCountry}>
                  <SelectTrigger id="country">
                    <SelectValue placeholder="Select a country">
                      {country && selectedCountry && (
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{getCountryFlag(country)}</span>
                          <span>{selectedCountry.name}</span>
                          <span className="ml-auto text-sm text-muted-foreground">
                            ${selectedCountry.price.toFixed(2)}
                          </span>
                        </div>
                      )}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent className="max-h-[300px]">
                    {filteredCountries.map((c) => (
                      <SelectItem key={c.code} value={c.code.toString()}>
                        <div className="flex items-center gap-2 w-full">
                          <span className="text-lg">{getCountryFlag(c.code.toString())}</span>
                          <span className="flex-1">{c.name}</span>
                          <span className="text-sm text-muted-foreground">
                            {c.count} available
                          </span>
                          <span className="text-sm font-medium">
                            ${c.price.toFixed(2)}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </>
            )}
          </div>
        )}

        {selectedCountry && (
          <div className="rounded-lg border bg-muted/50 p-4 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Available numbers:</span>
              <span className="font-medium">{selectedCountry.count}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Price per number:</span>
              <span className="font-medium text-primary">
                ${selectedCountry.price.toFixed(2)}
              </span>
            </div>
          </div>
        )}

        <Button
          onClick={handleBuy}
          className="w-full"
          disabled={!service || !country || loading || loadingCountries}
        >
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {selectedCountry
            ? `Buy Number - $${selectedCountry.price.toFixed(2)}`
            : "Buy Number Now"}
        </Button>
      </CardContent>
    </Card>
  );
};
