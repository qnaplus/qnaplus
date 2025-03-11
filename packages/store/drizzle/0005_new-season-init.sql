-- Custom SQL migration file, put your code below! --

CREATE OR REPLACE FUNCTION new_season_init()
RETURNS TRIGGER AS $$
DECLARE
    new_season_year integer;
    new_season_start text;
BEGIN
    -- Check if the program is "V5RC" and the "open" column is updated to true
    IF NEW.program = 'V5RC' AND NEW.open = true THEN
        -- Reset the failures table for the new season
        DELETE FROM failures;

        -- Set starting point for the new season. Use the newest question id (+1) from the previous season
        SELECT CAST(CAST(id AS INTEGER) + 1 AS TEXT)
        INTO new_season_start
        FROM questions
        ORDER BY CAST(id AS INTEGER) DESC
        LIMIT 1;

        SELECT CAST(SUBSTRING("currentSeason" FROM '-([0-9]+)$') AS integer)
        INTO new_season_year
        FROM metadata
        LIMIT 1;

        UPDATE metadata
        SET "oldestUnansweredQuestion" = new_season_start,
            "currentSeason" = format('%s-%s', new_season_year, new_season_year + 1)
        WHERE id = 0;

    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_new_season
AFTER UPDATE ON programs
FOR EACH ROW
EXECUTE FUNCTION new_season_init();