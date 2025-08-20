-- Create merchant_reels table for video content
CREATE TABLE public.merchant_reels (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  merchant_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  video_url TEXT NOT NULL,
  thumbnail_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  view_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.merchant_reels ENABLE ROW LEVEL SECURITY;

-- Create policies for merchant access
CREATE POLICY "Merchants can view all active reels" 
ON public.merchant_reels 
FOR SELECT 
USING (is_active = true);

CREATE POLICY "Merchants can manage their own reels" 
ON public.merchant_reels 
FOR ALL
USING (merchant_id::text = current_setting('request.jwt.claims', true)::json->>'sub');

-- Create products table for merchant inventory
CREATE TABLE public.merchant_products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  merchant_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10,2),
  image_url TEXT,
  category TEXT,
  is_available BOOLEAN NOT NULL DEFAULT true,
  stock_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security for products
ALTER TABLE public.merchant_products ENABLE ROW LEVEL SECURITY;

-- Create policies for product access
CREATE POLICY "Anyone can view available products" 
ON public.merchant_products 
FOR SELECT 
USING (is_available = true);

CREATE POLICY "Merchants can manage their own products" 
ON public.merchant_products 
FOR ALL
USING (merchant_id::text = current_setting('request.jwt.claims', true)::json->>'sub');

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_merchant_reels_updated_at
  BEFORE UPDATE ON public.merchant_reels
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_merchant_products_updated_at
  BEFORE UPDATE ON public.merchant_products
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();