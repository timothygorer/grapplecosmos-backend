exports.up = async client => {

    await client`
    CREATE OR REPLACE FUNCTION public.get_unique_dates(user_timezone character varying)
RETURNS TABLE(row_num bigint, event_date date, event_month numeric, day_of_week text, day_of_month numeric, entities_count bigint)
LANGUAGE plpgsql
AS $function$
BEGIN
    RETURN QUERY
        SELECT
            row_number() over (ORDER BY entity_dates.event_date),
            entity_dates.event_date,
            extract(month from entity_dates.event_date),
            to_char(entity_dates.event_date, 'Day'),
            extract(day from entity_dates.event_date),
            COUNT(*) AS entities_count
        FROM (
            SELECT DISTINCT
                DATE(time_completed AT TIME ZONE user_timezone) AS event_date
            FROM public.entities_activity
        ) AS entity_dates
        GROUP BY
            entity_dates.event_date;
END;
$function$;
    `;

    await client`
    CREATE OR REPLACE FUNCTION public.get_unique_dates(user_timezone character varying)
RETURNS TABLE(row_num bigint, event_date date, event_month numeric, day_of_week text, day_of_month numeric, entities_count bigint)
LANGUAGE plpgsql
AS $function$
BEGIN
    RETURN QUERY
        SELECT
            row_number() over (ORDER BY entity_dates.event_date),
            entity_dates.event_date,
            extract(month from entity_dates.event_date),
            to_char(entity_dates.event_date, 'Day'),
            extract(day from entity_dates.event_date),
            COUNT(*) AS entities_count
        FROM (
            SELECT DISTINCT
                DATE(time_completed AT TIME ZONE user_timezone) AS event_date
            FROM public.entities_activity
        ) AS entity_dates
        GROUP BY
            entity_dates.event_date;
END;
$function$;
`;

    await client`
    CREATE OR REPLACE FUNCTION public.update_thumbs_up_down()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
    voteDirection INTEGER;
BEGIN
    IF TG_OP = 'INSERT' THEN
        NEW.deleted := FALSE; -- Set 'deleted' to false on new insert
    ELSIF TG_OP = 'UPDATE' THEN
        NEW.deleted := NOT OLD.deleted; -- Toggle 'deleted' on update
    END IF;

    -- Determine vote direction
    voteDirection := NEW.direction;

    IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND OLD.deleted IS DISTINCT FROM NEW.deleted) THEN
        -- Update thumbs up/down counts and user guids
        IF voteDirection = 1 THEN -- thumbs up
            IF NEW.deleted THEN
                -- Decrease count and remove user guid
                UPDATE entities_activity
                SET "thumbs_up_count" = "thumbs_up_count" - 1,
                    thumbs_up_user_guids = array_remove(thumbs_up_user_guids, NEW.user_guid)
                WHERE guid = NEW.entity_guid;
            ELSE
                -- Increase count and add user guid
                UPDATE entities_activity
                SET "thumbs_up_count" = "thumbs_up_count" + 1,
                    thumbs_up_user_guids = array_append(thumbs_up_user_guids, NEW.user_guid)
                WHERE guid = NEW.entity_guid AND NOT NEW.user_guid = ANY(thumbs_up_user_guids);
            END IF;
        ELSIF voteDirection = 2 THEN -- thumbs down
            IF NEW.deleted THEN
                -- Decrease count
                UPDATE entities_activity
                SET "thumbs_down_count" = "thumbs_down_count" - 1
                WHERE guid = NEW.entity_guid;
            ELSE
                -- Increase count
                UPDATE entities_activity
                SET "thumbs_down_count" = "thumbs_down_count" + 1
                WHERE guid = NEW.entity_guid;
            END IF;
        END IF;
    END IF;

    RETURN NEW;
END;
$function$
;`;

    await client`CREATE OR REPLACE FUNCTION comment_update_thumbs_up_down()
RETURNS TRIGGER AS $$
DECLARE
    voteDirection INTEGER;
BEGIN
    IF TG_OP = 'INSERT' THEN
        NEW.deleted := FALSE; -- Set 'deleted' to false on new insert
    ELSIF TG_OP = 'UPDATE' THEN
        NEW.deleted := NOT OLD.deleted; -- Toggle 'deleted' on update
    END IF;

    -- Determine vote direction
    voteDirection := NEW.direction;

    IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND OLD.deleted IS DISTINCT FROM NEW.deleted) THEN
        -- Update thumbs up/down counts and user guids
        IF voteDirection = 1 THEN -- thumbs up
            IF NEW.deleted THEN
                -- Decrease count and remove user guid
                UPDATE comments
                SET "thumbs_up_count" = "thumbs_up_count" - 1,
                    thumbs_up_user_guids = array_remove(thumbs_up_user_guids, NEW.user_guid)
                WHERE guid = NEW.entity_guid;
            ELSE
                -- Increase count and add user guid
                UPDATE comments
                SET "thumbs_up_count" = "thumbs_up_count" + 1,
                    thumbs_up_user_guids = array_append(thumbs_up_user_guids, NEW.user_guid)
                WHERE guid = NEW.entity_guid AND NOT NEW.user_guid = ANY(thumbs_up_user_guids);
            END IF;
        ELSIF voteDirection = 2 THEN -- thumbs down
            IF NEW.deleted THEN
                -- Decrease count
                UPDATE comments
                SET "thumbs_down_count" = "thumbs_down_count" - 1
                WHERE guid = NEW.entity_guid;
            ELSE
                -- Increase count
                UPDATE comments
                SET "thumbs_down_count" = "thumbs_down_count" + 1
                WHERE guid = NEW.entity_guid;
            END IF;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;`;

    await client`
CREATE TRIGGER comment_update_thumbs_up_down_before_insert_update
BEFORE INSERT OR UPDATE ON votes
FOR EACH ROW EXECUTE FUNCTION comment_update_thumbs_up_down();`;

    await client`
CREATE OR REPLACE FUNCTION update_replies_count()
RETURNS TRIGGER AS $$
DECLARE
    reply_count INTEGER;
BEGIN
    -- Count replies
    SELECT COUNT(*)
    INTO reply_count
    FROM comments
    WHERE entity_guid = NEW.entity_guid
    AND parent_guid_l1 = NEW.parent_guid_l1
    AND parent_guid_l2 = NEW.parent_guid_l2;

    -- Update the replies count of the parent comment
    UPDATE comments
    SET replies_count = reply_count
    WHERE guid = NEW.guid;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql;`;


await client`
CREATE OR REPLACE FUNCTION public.get_comments(p_entity_guid uuid, p_parent_path text, limit_val integer, descending boolean)
 RETURNS SETOF comments
 LANGUAGE plpgsql
AS $function$
DECLARE
    p_parent_guid_l1 varchar;
    p_parent_guid_l2 varchar;
BEGIN
    -- Assuming parent_path is a string like "0:0:0"
    p_parent_guid_l1 := (string_to_array(p_parent_path, ':'))[1]::varchar;
    p_parent_guid_l2 := (string_to_array(p_parent_path, ':'))[2]::varchar;

    IF descending THEN
        RETURN QUERY
            SELECT *
            FROM comments
            WHERE entity_guid = p_entity_guid
              AND parent_guid_l1 = p_parent_guid_l1
              AND parent_guid_l2 = p_parent_guid_l2
            ORDER BY time_created DESC;
    ELSE
        RETURN QUERY
            SELECT *
            FROM comments
            WHERE entity_guid = p_entity_guid
              AND parent_guid_l1 = p_parent_guid_l1
              AND parent_guid_l2 = p_parent_guid_l2
            ORDER BY time_created ASC;
    END IF;
END;
$function$
;`;

await client`
CREATE OR REPLACE FUNCTION public.update_thumbs_down()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    UPDATE entities_activity
    SET "thumbs_down_count" = (
        SELECT COUNT(*)
        FROM votes
        WHERE entity_guid = NEW.entity_guid AND direction = 2 AND deleted = FALSE
    )
    WHERE guid = NEW.entity_guid;
    RETURN NEW;
END;
$function$
;`;

await client`
CREATE OR REPLACE FUNCTION public.update_thumbs_up()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    UPDATE entities_activity
    SET "thumbs_up_count" = (
        SELECT COUNT(*)
        FROM votes
        WHERE entity_guid = NEW.entity_guid AND direction = 1 AND deleted = FALSE
    )
    WHERE guid = NEW.entity_guid;
    UPDATE entities_activity
    SET thumbs_up_user_guids = array_append(thumbs_up_user_guids, NEW.user_guid)
    WHERE guid = NEW.entity_guid;
    RETURN NEW;
END;
$function$
;`;


}

exports.down = async client => {
    await client`DROP FUNCTION IF EXISTS public.get_unique_dates(user_timezone character varying);`;
    await client`DROP FUNCTION IF EXISTS public.get_comments(p_entity_guid uuid, p_parent_path text, limit_val integer, descending boolean);`;
    await client`DROP FUNCTION IF EXISTS public.update_thumbs_up_down();`;
    await client`DROP TRIGGER IF EXISTS comment_update_thumbs_up_down_before_insert_update ON votes;`;
    await client`DROP FUNCTION IF EXISTS update_replies_count();`;
    await client`DROP FUNCTION IF EXISTS public.get_comments(p_entity_guid uuid, p_parent_path text, limit_val integer, descending boolean);`;
    await client`DROP FUNCTION IF EXISTS public.update_thumbs_down();`;
    await client`DROP FUNCTION IF EXISTS public.update_thumbs_up();`;
};
