-- Create role enum
CREATE TYPE public.app_role AS ENUM ('citizen', 'officer', 'worker', 'admin');

-- Create complaint status enum
CREATE TYPE public.complaint_status AS ENUM ('pending', 'assigned', 'in_progress', 'completed', 'delayed');

-- Create complaint type enum
CREATE TYPE public.complaint_type AS ENUM ('pothole', 'streetlight', 'illegal_dumping', 'drainage', 'road_damage', 'water_leak', 'sewage', 'garbage', 'encroachment', 'other');

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  phone_number TEXT,
  phone_country_code TEXT DEFAULT '+91',
  theme_preference TEXT DEFAULT 'dark' CHECK (theme_preference IN ('light', 'dark')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create user_roles table (separate from profiles for security)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL DEFAULT 'citizen',
  UNIQUE (user_id, role)
);

-- Create complaints table
CREATE TABLE public.complaints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  citizen_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  type complaint_type NOT NULL,
  description TEXT NOT NULL,
  address TEXT NOT NULL,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  status complaint_status DEFAULT 'pending',
  officer_id UUID REFERENCES auth.users(id),
  worker_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  resolved_at TIMESTAMPTZ,
  sla_deadline TIMESTAMPTZ DEFAULT (now() + INTERVAL '7 days')
);

-- Create complaint_images table
CREATE TABLE public.complaint_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  complaint_id UUID REFERENCES public.complaints(id) ON DELETE CASCADE NOT NULL,
  image_url TEXT NOT NULL,
  image_type TEXT DEFAULT 'before' CHECK (image_type IN ('before', 'after')),
  captured_at TIMESTAMPTZ DEFAULT now(),
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.complaints ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.complaint_images ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Create function to get user's primary role
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id UUID)
RETURNS app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.user_roles WHERE user_id = _user_id LIMIT 1
$$;

-- Create function to check if user is officer or admin
CREATE OR REPLACE FUNCTION public.is_officer_or_admin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = _user_id 
    AND role IN ('officer', 'admin')
  )
$$;

-- Create function to check if user is worker
CREATE OR REPLACE FUNCTION public.is_worker(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = _user_id 
    AND role = 'worker'
  )
$$;

-- Profiles policies
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Officers and admins can view all profiles"
  ON public.profiles FOR SELECT
  USING (public.is_officer_or_admin(auth.uid()));

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- User roles policies
CREATE POLICY "Users can view own role"
  ON public.user_roles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all roles"
  ON public.user_roles FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can insert own role during signup"
  ON public.user_roles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Complaints policies
CREATE POLICY "Citizens can view own complaints"
  ON public.complaints FOR SELECT
  USING (auth.uid() = citizen_id);

CREATE POLICY "Officers can view all complaints"
  ON public.complaints FOR SELECT
  USING (public.is_officer_or_admin(auth.uid()));

CREATE POLICY "Workers can view assigned complaints"
  ON public.complaints FOR SELECT
  USING (auth.uid() = worker_id);

CREATE POLICY "Authenticated users can create complaints"
  ON public.complaints FOR INSERT
  WITH CHECK (auth.uid() = citizen_id);

CREATE POLICY "Officers can update complaints"
  ON public.complaints FOR UPDATE
  USING (public.is_officer_or_admin(auth.uid()));

CREATE POLICY "Workers can update assigned complaints"
  ON public.complaints FOR UPDATE
  USING (auth.uid() = worker_id);

CREATE POLICY "Citizens can update own pending complaints"
  ON public.complaints FOR UPDATE
  USING (auth.uid() = citizen_id AND status = 'pending');

-- Complaint images policies
CREATE POLICY "Users can view images of accessible complaints"
  ON public.complaint_images FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.complaints c 
      WHERE c.id = complaint_id 
      AND (c.citizen_id = auth.uid() OR c.worker_id = auth.uid() OR public.is_officer_or_admin(auth.uid()))
    )
  );

CREATE POLICY "Users can insert images for own complaints"
  ON public.complaint_images FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.complaints c 
      WHERE c.id = complaint_id 
      AND (c.citizen_id = auth.uid() OR c.worker_id = auth.uid() OR public.is_officer_or_admin(auth.uid()))
    )
  );

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_complaints_updated_at
  BEFORE UPDATE ON public.complaints
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create trigger to set resolved_at when status changes to completed
CREATE OR REPLACE FUNCTION public.set_resolved_at()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    NEW.resolved_at = now();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_complaint_resolved_at
  BEFORE UPDATE ON public.complaints
  FOR EACH ROW
  EXECUTE FUNCTION public.set_resolved_at();

-- Create trigger to auto-create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Create storage bucket for complaint images
INSERT INTO storage.buckets (id, name, public) 
VALUES ('complaint-images', 'complaint-images', true);

-- Storage policies
CREATE POLICY "Authenticated users can upload complaint images"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'complaint-images' AND auth.uid() IS NOT NULL);

CREATE POLICY "Anyone can view complaint images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'complaint-images');