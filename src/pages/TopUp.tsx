import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";

const TopUp = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 container px-4 py-12">
        <h1 className="text-2xl font-bold mb-4">Top Up</h1>
        <p className="text-muted-foreground mb-6">Add funds to your account to pay for products. Use the dashboard Top Up modal to create a deposit and complete payment.</p>
        <div className="max-w-md">
          <Button asChild>
            <a href="/dashboard">Open Dashboard</a>
          </Button>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default TopUp;
