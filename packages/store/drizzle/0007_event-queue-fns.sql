-- Custom SQL migration file, put your code below! --

CREATE OR REPLACE FUNCTION questions_update_event_queue()
RETURNS TRIGGER AS $$
DECLARE
    payload jsonb;
    event_name text;
BEGIN
    -- Check if the program is "V5RC" and the "open" column is updated to true
    IF NEW.answered = true AND OLD.answered = false THEN
        payload := json_build_object('question', row_to_json(NEW));
        event_name := 'answered';
    ELSIF NEW.answer IS DISTINCT FROM OLD.answer THEN
        event_name := 'answer_edited';
        payload := json_build_object('before', row_to_json(OLD), 'after', row_to_json(NEW));
    ELSE
        RETURN NEW;
    END IF;

    INSERT INTO event_queue (event, payload) VALUES (event_name, payload);

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_questions_event_queue
AFTER UPDATE ON questions
FOR EACH ROW
EXECUTE FUNCTION questions_update_event_queue();

CREATE OR REPLACE FUNCTION forum_state_update_event_queue()
RETURNS TRIGGER AS $$
BEGIN
    -- Check if the program is "V5RC" and the "open" column is updated to true
    IF NEW.open <> OLD.open THEN
        INSERT INTO event_queue (event, payload) 
        VALUES ('forum_change', json_build_object('before', row_to_json(OLD), 'after', row_to_json(NEW)));
    ELSE
        RETURN NEW;
    END IF;


    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_forum_state_event_queue
AFTER UPDATE ON forum_state
FOR EACH ROW
EXECUTE FUNCTION forum_state_update_event_queue();
