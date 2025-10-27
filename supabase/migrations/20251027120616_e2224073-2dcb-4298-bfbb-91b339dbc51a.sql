-- Add rental and voice support to activations table
ALTER TABLE public.activations 
ADD COLUMN IF NOT EXISTS activation_type TEXT DEFAULT 'standard',
ADD COLUMN IF NOT EXISTS rental_days INTEGER,
ADD COLUMN IF NOT EXISTS rental_expires_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS is_voice BOOLEAN DEFAULT false;

-- Create payment methods table
CREATE TABLE IF NOT EXISTS public.payment_methods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Insert payment methods
INSERT INTO public.payment_methods (name, code) VALUES
  ('Stripe', 'stripe'),
  ('PayPal', 'paypal'),
  ('Crypto', 'crypto'),
  ('Bank Transfer', 'bank_transfer')
ON CONFLICT (code) DO NOTHING;

-- Enable RLS
ALTER TABLE public.payment_methods ENABLE ROW LEVEL SECURITY;

-- Public read for payment methods
CREATE POLICY "Anyone can view payment methods"
  ON public.payment_methods FOR SELECT
  USING (true);

-- Create deposits table
CREATE TABLE IF NOT EXISTS public.deposits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount DECIMAL(10, 2) NOT NULL,
  payment_method TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  transaction_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE public.deposits ENABLE ROW LEVEL SECURITY;

-- RLS Policies for deposits
CREATE POLICY "Users can view their own deposits"
  ON public.deposits FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own deposits"
  ON public.deposits FOR INSERT
  WITH CHECK (auth.uid() = user_id);