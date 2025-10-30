-- Generate referral codes for existing users
UPDATE profiles 
SET referral_code = generate_referral_code()
WHERE referral_code IS NULL;

-- Ensure all future users get referral codes (trigger already exists but let's verify)
-- The handle_new_user function will auto-generate codes for new signups