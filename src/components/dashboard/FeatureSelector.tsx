import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Phone, Calendar, Mic, MessageSquareMore } from "lucide-react";

interface Feature {
  id: string;
  name: string;
  icon: any;
  description: string;
  available: boolean;
}

interface FeatureSelectorProps {
  selectedFeature: string;
  onFeatureChange: (feature: string) => void;
  children: React.ReactNode;
}

export const FeatureSelector = ({ selectedFeature, onFeatureChange, children }: FeatureSelectorProps) => {
  const features: Feature[] = [
    {
      id: "activation",
      name: "SMS Activation",
      icon: Phone,
      description: "Get number for 20 minutes",
      available: true,
    },
    {
      id: "rental",
      name: "Number Rental",
      icon: Calendar,
      description: "Rent for days or weeks",
      available: true,
    },
    {
      id: "voice",
      name: "Voice Calls",
      icon: Mic,
      description: "Receive voice verification",
      available: true,
    },
    {
      id: "multi-sms",
      name: "Multi-SMS",
      icon: MessageSquareMore,
      description: "Multiple SMS to one number",
      available: true,
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Select Service Type</CardTitle>
        <CardDescription>Choose how you want to receive verification</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={selectedFeature} onValueChange={onFeatureChange} className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 lg:grid-cols-4">
            {features.map((feature) => (
              <TabsTrigger
                key={feature.id}
                value={feature.id}
                disabled={!feature.available}
                className="flex flex-col gap-1 h-auto py-3"
              >
                <feature.icon className="h-5 w-5" />
                <span className="text-xs font-medium">{feature.name}</span>
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value={selectedFeature} className="space-y-4 mt-6">
            {children}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};
