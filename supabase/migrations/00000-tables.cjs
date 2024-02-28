exports.up = async client => {
    await client`
        create table
  public.votes (
    user_guid uuid not null,
    entity_guid bigint not null,
    direction integer not null,
    deleted boolean not null default false,
    created_timestamp timestamp without time zone not null default current_timestamp,
    constraint votes_pkey primary key (user_guid, entity_guid, direction)
  ) tablespace pg_default;`;

    await client`
       create table
  public.comments (
    guid uuid not null,
    entity_guid uuid null,
    owner_guid uuid null,
    parent_depth integer null,
    description text null,
    attachments json null,
    mature boolean null,
    edited boolean null,
    spam boolean null,
    deleted boolean null,
    enabled boolean null,
    group_conversation boolean null,
    time_created timestamp without time zone null default current_timestamp,
    child_path character varying null,
    parent_path character varying null,
    parent_guid_l2 character varying null,
    parent_guid_l1 character varying null,
    can_reply boolean null,
    thumbs_up_count integer null default 0,
    thumbs_up_user_guids uuid[] null default array[]::uuid[],
    thumbs_down_count integer null default 0,
    thumbs_down_user_guids uuid[] null default array[]::uuid[],
    constraint comments_pkey primary key (guid)
  ) tablespace pg_default;
    `;

    await client`
 CREATE TABLE public.entities_activity (
  user_id uuid NOT NULL,
  guid uuid NOT NULL,
  message text NULL,
  title text NULL,
  time_created timestamp with time zone NULL DEFAULT (now() AT TIME ZONE 'utc'::text),
  time_updated timestamp without time zone NULL,
  time_sent timestamp without time zone NULL,
  attachments json NULL,
  thumbs_down_count integer NULL,
  thumbs_up_count integer NULL,
  comments_count integer NULL,
  thumbs_up_user_guids uuid[] NULL,
  thumbs_down_user_guids uuid[] NULL,
  custom_data jsonb[] NULL,
  custom_type character varying NULL,
  type character varying NULL,
  thumbnail_src character varying NULL,
  subtype character varying NULL,
  time_completed timestamp with time zone NULL,
  CONSTRAINT entities_activity_pkey PRIMARY KEY (guid)
) TABLESPACE pg_default;`;
};

exports.down = async client => {
    await client`DROP TABLE IF EXISTS public.votes;`;
    await client`DROP TABLE IF EXISTS public.comments;`;
    await client`DROP TABLE IF EXISTS public.entities_activity;`;
};

