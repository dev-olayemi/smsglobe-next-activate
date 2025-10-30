-- Add referral system to profiles
ALTER TABLE profiles 
ADD COLUMN referral_code TEXT UNIQUE,
ADD COLUMN referred_by UUID REFERENCES profiles(id),
ADD COLUMN referral_count INTEGER DEFAULT 0,
ADD COLUMN referral_earnings NUMERIC DEFAULT 0;

-- Function to generate unique referral code
CREATE OR REPLACE FUNCTION generate_referral_code()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_code TEXT;
  code_exists BOOLEAN;
BEGIN
  LOOP
    -- Generate 8 character alphanumeric code
    new_code := upper(substring(md5(random()::text || clock_timestamp()::text) from 1 for 8));
    
    -- Check if code already exists
    SELECT EXISTS(SELECT 1 FROM profiles WHERE referral_code = new_code) INTO code_exists;
    
    -- Exit loop if code is unique
    EXIT WHEN NOT code_exists;
  END LOOP;
  
  RETURN new_code;
END;
$$;

-- Update handle_new_user to generate referral code
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, referral_code)
  VALUES (NEW.id, NEW.email, generate_referral_code());
  RETURN NEW;
END;
$$;

-- Function to apply referral bonus
CREATE OR REPLACE FUNCTION apply_referral_bonus(referrer_code TEXT, new_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  referrer_id UUID;
  bonus_amount NUMERIC := 1.00;
BEGIN
  -- Find referrer by code
  SELECT id INTO referrer_id
  FROM profiles
  WHERE referral_code = referrer_code;
  
  -- If referrer not found, return false
  IF referrer_id IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Update referrer's balance and stats
  UPDATE profiles
  SET 
    balance = balance + bonus_amount,
    referral_count = referral_count + 1,
    referral_earnings = referral_earnings + bonus_amount
  WHERE id = referrer_id;
  
  -- Update new user's referred_by
  UPDATE profiles
  SET referred_by = referrer_id
  WHERE id = new_user_id;
  
  -- Create transaction record for referrer
  INSERT INTO balance_transactions (user_id, type, amount, balance_after, description)
  SELECT 
    referrer_id,
    'referral_bonus',
    bonus_amount,
    balance,
    'Referral bonus for inviting new user'
  FROM profiles
  WHERE id = referrer_id;
  
  RETURN TRUE;
END;
$$;