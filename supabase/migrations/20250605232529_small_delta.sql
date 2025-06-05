-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create custom types
CREATE TYPE stripe_subscription_status AS ENUM (
    'not_started', 'incomplete', 'incomplete_expired', 'trialing',
    'active', 'past_due', 'canceled', 'unpaid', 'paused'
);

CREATE TYPE stripe_order_status AS ENUM (
    'pending', 'completed', 'canceled'
);

-- Create tables
CREATE TABLE IF NOT EXISTS subscriptions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users,
    stripe_customer_id text,
    stripe_sub_id text,
    plan text,
    status text,
    current_period_end timestamp without time zone
);

CREATE TABLE IF NOT EXISTS user_roles (
    user_id uuid PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
    role text CHECK (role IN ('admin', 'user')) NOT NULL,
    created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS audio_fingerprints (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users NOT NULL,
    timestamp timestamptz NOT NULL DEFAULT now(),
    signature text NOT NULL,
    version text NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamptz DEFAULT now(),
    CONSTRAINT signature_length CHECK (length(signature) >= 16)
);

CREATE TABLE IF NOT EXISTS stripe_customers (
    id bigint primary key generated always as identity,
    user_id uuid references auth.users(id) not null unique,
    customer_id text not null unique,
    created_at timestamp with time zone default now(),
    updated_at timestamp with time zone default now(),
    deleted_at timestamp with time zone default null
);

CREATE TABLE IF NOT EXISTS stripe_subscriptions (
    id bigint primary key generated always as identity,
    customer_id text unique not null,
    subscription_id text default null,
    price_id text default null,
    current_period_start bigint default null,
    current_period_end bigint default null,
    cancel_at_period_end boolean default false,
    payment_method_brand text default null,
    payment_method_last4 text default null,
    status stripe_subscription_status not null,
    created_at timestamp with time zone default now(),
    updated_at timestamp with time zone default now(),
    deleted_at timestamp with time zone default null
);

CREATE TABLE IF NOT EXISTS stripe_orders (
    id bigint primary key generated always as identity,
    checkout_session_id text not null,
    payment_intent_id text not null,
    customer_id text not null,
    amount_subtotal bigint not null,
    amount_total bigint not null,
    currency text not null,
    payment_status text not null,
    status stripe_order_status not null default 'pending',
    created_at timestamp with time zone default now(),
    updated_at timestamp with time zone default now(),
    deleted_at timestamp with time zone default null
);

CREATE TABLE IF NOT EXISTS email_logs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_email text NOT NULL,
    email_type text NOT NULL,
    subject text NOT NULL,
    sent_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS presets (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users,
    name text NOT NULL,
    data jsonb NOT NULL,
    created_at timestamptz DEFAULT now(),
    expires_at timestamptz DEFAULT (now() + interval '30 days'),
    views integer DEFAULT 0,
    CONSTRAINT valid_name CHECK (length(name) >= 1 AND length(name) <= 100)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_fingerprints_user_id ON audio_fingerprints(user_id);
CREATE INDEX IF NOT EXISTS idx_fingerprints_timestamp ON audio_fingerprints(timestamp);
CREATE INDEX IF NOT EXISTS idx_fingerprints_signature ON audio_fingerprints(signature);
CREATE INDEX IF NOT EXISTS idx_presets_user_id ON presets(user_id);
CREATE INDEX IF NOT EXISTS idx_presets_expires_at ON presets(expires_at);

-- Enable RLS on all tables
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE audio_fingerprints ENABLE ROW LEVEL SECURITY;
ALTER TABLE stripe_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE stripe_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE stripe_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE presets ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can read own subscriptions" ON subscriptions
    FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can read own role" ON user_roles
    FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can read own fingerprints" ON audio_fingerprints
    FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own customer data" ON stripe_customers
    FOR SELECT TO authenticated
    USING (user_id = auth.uid() AND deleted_at IS NULL);

CREATE POLICY "Users can view their own subscription data" ON stripe_subscriptions
    FOR SELECT TO authenticated
    USING (
        customer_id IN (
            SELECT customer_id FROM stripe_customers
            WHERE user_id = auth.uid() AND deleted_at IS NULL
        )
        AND deleted_at IS NULL
    );

CREATE POLICY "Users can view their own order data" ON stripe_orders
    FOR SELECT TO authenticated
    USING (
        customer_id IN (
            SELECT customer_id FROM stripe_customers
            WHERE user_id = auth.uid() AND deleted_at IS NULL
        )
        AND deleted_at IS NULL
    );

CREATE POLICY "Users can read own logs" ON email_logs
    FOR SELECT TO authenticated
    USING (user_email = auth.jwt() ->> 'email');

CREATE POLICY "Users can read own presets" ON presets
    FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY "Anyone can read shared presets" ON presets
    FOR SELECT TO public USING (expires_at > now());

CREATE POLICY "Users can create presets" ON presets
    FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Create views
CREATE OR REPLACE VIEW stripe_user_subscriptions 
WITH (security_invoker = true) AS
SELECT
    c.customer_id,
    s.subscription_id,
    s.status as subscription_status,
    s.price_id,
    s.current_period_start,
    s.current_period_end,
    s.cancel_at_period_end,
    s.payment_method_brand,
    s.payment_method_last4
FROM stripe_customers c
LEFT JOIN stripe_subscriptions s ON c.customer_id = s.customer_id
WHERE c.user_id = auth.uid()
AND c.deleted_at IS NULL
AND s.deleted_at IS NULL;

CREATE OR REPLACE VIEW stripe_user_orders 
WITH (security_invoker = true) AS
SELECT
    c.customer_id,
    o.id as order_id,
    o.checkout_session_id,
    o.payment_intent_id,
    o.amount_subtotal,
    o.amount_total,
    o.currency,
    o.payment_status,
    o.status as order_status,
    o.created_at as order_date
FROM stripe_customers c
LEFT JOIN stripe_orders o ON c.customer_id = o.customer_id
WHERE c.user_id = auth.uid()
AND c.deleted_at IS NULL
AND o.deleted_at IS NULL;

-- Create functions
CREATE OR REPLACE FUNCTION increment_preset_views(preset_id uuid)
RETURNS void AS $$
BEGIN
    UPDATE presets
    SET views = views + 1
    WHERE id = preset_id;
END;
$$ LANGUAGE plpgsql;

-- Grant necessary permissions
GRANT SELECT ON stripe_user_subscriptions TO authenticated;
GRANT SELECT ON stripe_user_orders TO authenticated;

-- Storage bucket policies
CREATE POLICY "Users can only read own files"
ON storage.objects FOR SELECT
TO authenticated
USING (
    auth.uid()::text = storage.foldername(name)
    OR bucket_id = 'public'
);

CREATE POLICY "Users can upload to own folder"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    auth.uid()::text = storage.foldername(name)
    AND (bucket_id = 'user_uploads' OR bucket_id = 'private')
);

CREATE POLICY "Users can update own files"
ON storage.objects FOR UPDATE
TO authenticated
USING (auth.uid()::text = storage.foldername(name))
WITH CHECK (auth.uid()::text = storage.foldername(name));

CREATE POLICY "Users can delete own files"
ON storage.objects FOR DELETE
TO authenticated
USING (auth.uid()::text = storage.foldername(name));