This is the backend for the GrappleCosmos React Native app. You can view the frontend [here](https://github.com/timothygorer/grapplecomos-frontend).

```Installation instructions```

1. Create a Supabase account.
2. `cd supabase; npm install`
3. Create `.env` file in `supabase/` directory.

.env looks like this:

`CONNECTION_STRING=postgres://postgres.[Your supabase project id]:[Your supabase postgres db password]@[your hostname].supabase.com:5432/postgres`

   
4. `npm run m:up` to run the migrations.
