
ALTER TABLE black_card DROP COLUMN draw;

CREATE TABLE deck_suggestion (
  id integer NOT NULL DEFAULT nextval('object_id_seq') PRIMARY KEY,
  name character varying(256) NOT NULL,
  description text NOT NULL,
  expansion boolean NOT NULL DEFAULT true,
  author_id integer NOT NULL REFERENCES "user" (id)
);
ALTER TABLE deck_suggestion OWNER TO cae;

CREATE TABLE black_card_suggestion (
  id integer NOT NULL DEFAULT nextval('object_id_seq') PRIMARY KEY,
  deck_id integer REFERENCES deck (id),
  deck_suggestion_id integer REFERENCES deck (id),
  text character varying(1024) NOT NULL,
  pick integer NOT NULL,
  author_id integer NOT NULL REFERENCES "user" (id),
  CHECK (deck_id IS NOT NULL OR deck_suggestion_id IS NOT NULL)
);
ALTER TABLE black_card_suggestion OWNER TO cae;

CREATE TABLE white_card_suggestion (
  id integer NOT NULL DEFAULT nextval('object_id_seq') PRIMARY KEY,
  deck_id integer REFERENCES deck (id),
  deck_suggestion_id integer REFERENCES deck (id),
  text character varying(1024) NOT NULL,
  author_id integer NOT NULL REFERENCES "user" (id),
  CHECK (deck_id IS NOT NULL OR deck_suggestion_id IS NOT NULL)
);
ALTER TABLE white_card_suggestion OWNER TO cae;
