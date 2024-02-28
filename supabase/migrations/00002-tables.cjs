exports.up = async client => {
    await client`
    CREATE TABLE public.profiles (
id uuid NOT NULL,
updated_at timestamptz NULL,
username text NULL,
bettor_id text NULL,
avatar_url text NULL,
header_url text NULL,
email text NULL,
onboarding_complete text NULL,
first_name text NULL,
last_name text NULL,
phone varchar NULL,
premium bool NOT NULL DEFAULT false,
country varchar NULL,
region varchar NULL,
bio text NULL,
revenue_cat_app_user_id varchar NULL DEFAULT ''::character varying,
premium_expiration_date timestamptz NULL,
subscription_product varchar NULL DEFAULT ''::character varying,
saved_notes _jsonb NOT NULL DEFAULT '{}'::jsonb[],
free_trial_expiration_date timestamptz NULL,
is_free_trial bool NULL,
onesignal_player_ids jsonb NOT NULL DEFAULT '[]'::jsonb,
payment_method jsonb NULL,
joined_servers _text NULL,
CONSTRAINT email UNIQUE (email),
CONSTRAINT phone UNIQUE (phone),
CONSTRAINT profiles_bettor_id_key UNIQUE (bettor_id),
CONSTRAINT profiles_pkey PRIMARY KEY (id),
CONSTRAINT profiles_username_key UNIQUE (username),
CONSTRAINT username_check CHECK ((((username ~* '^[A-Za-z0-9]*$'::text) AND (length(username) <= 15)) OR (username IS NULL)))
);`;

    await client`
  ALTER TABLE public.profiles ADD CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id);`;

    await client`

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
    `;

    await client`
    --
-- Name: profiles Profiles are viewable by users who created them.; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Profiles are viewable by users who created them." ON public.profiles FOR SELECT USING (("auth"."uid"() = "id"));
`;

    await client`
    --
-- Name: profiles Users can insert their own profile.; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can insert their own profile." ON public.profiles FOR INSERT WITH CHECK (("auth"."uid"() = "id"));
    `;

    await client`

--
-- Name: profiles Users can update own profile.; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can update own profile." ON "public"."profiles" FOR UPDATE USING (("auth"."uid"() = "id"));
    `;
}

exports.down = async client => {




    await client`
    alter table public.profiles disable row level security;
    `;

  await client`
    drop policy "Profiles are viewable by users who created them." on public.profiles;
    `;

  await client`
    drop policy "Users can insert their own profile." on public.profiles;
    `;

  await client`
    drop policy "Users can update own profile." on public.profiles;
    `;

     await client`
    alter table public.profiles disable row level security;
    `;

    await client`
ALTER TABLE public.profiles
drop CONSTRAINT username_check`;

    await client`
ALTER TABLE public.profiles
drop CONSTRAINT profiles_id_fkey`;

    await client`
            DROP TABLE if exists public.profiles;
       `;
}
