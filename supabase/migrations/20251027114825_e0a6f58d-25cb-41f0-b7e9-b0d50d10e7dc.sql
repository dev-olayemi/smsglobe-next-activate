-- Create profiles table for user data
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  api_key TEXT,
  balance DECIMAL(10, 2) DEFAULT 0,
  cashback DECIMAL(10, 2) DEFAULT 0,
  use_cashback_first BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Create activations table for purchased numbers
CREATE TABLE IF NOT EXISTS public.activations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  activation_id TEXT NOT NULL,
  phone_number TEXT NOT NULL,
  service TEXT NOT NULL,
  country_code INTEGER NOT NULL,
  country_name TEXT NOT NULL,
  operator TEXT,
  price DECIMAL(10, 2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'waiting',
  sms_code TEXT,
  sms_text TEXT,
  can_get_another_sms BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(activation_id)
);

-- Enable RLS
ALTER TABLE public.activations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for activations
CREATE POLICY "Users can view their own activations"
  ON public.activations FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own activations"
  ON public.activations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own activations"
  ON public.activations FOR UPDATE
  USING (auth.uid() = user_id);

-- Create balance_transactions table
CREATE TABLE IF NOT EXISTS public.balance_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount DECIMAL(10, 2) NOT NULL,
  type TEXT NOT NULL,
  description TEXT,
  balance_after DECIMAL(10, 2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.balance_transactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for balance_transactions
CREATE POLICY "Users can view their own transactions"
  ON public.balance_transactions FOR SELECT
  USING (auth.uid() = user_id);

-- Trigger to update updated_at on profiles
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_activations_updated_at
  BEFORE UPDATE ON public.activations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (NEW.id, NEW.email);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile on signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();