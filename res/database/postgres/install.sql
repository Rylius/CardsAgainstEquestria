--CREATE DATABASE cae WITH ENCODING = 'UTF8' LC_COLLATE = 'en_US.UTF-8' LC_CTYPE = 'en_US.UTF-8';
ALTER DATABASE cae OWNER TO cae;

CREATE SEQUENCE object_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER TABLE public.object_id_seq OWNER TO cae;

CREATE TABLE permission (
    id integer DEFAULT nextval('object_id_seq'::regclass) NOT NULL,
    name character varying(256) NOT NULL
);
ALTER TABLE public.permission OWNER TO cae;

CREATE TABLE "user" (
    id integer DEFAULT nextval('object_id_seq'::regclass) NOT NULL,
    name character varying(32) NOT NULL,
    email character varying(256) NOT NULL,
    password character varying(512) NOT NULL,
    password_salt character varying(512) NOT NULL,
    allow_emails boolean DEFAULT true NOT NULL,
    date_registered timestamp without time zone DEFAULT now() NOT NULL,
    last_login timestamp without time zone
);
ALTER TABLE public."user" OWNER TO cae;

CREATE TABLE user_permissions (
    user_id integer NOT NULL,
    permission_id integer NOT NULL
);
ALTER TABLE public.user_permissions OWNER TO cae;


ALTER TABLE ONLY permission
    ADD CONSTRAINT permission_pkey PRIMARY KEY (id);

ALTER TABLE ONLY user_permissions
    ADD CONSTRAINT user_permissions_pkey PRIMARY KEY (user_id, permission_id);

ALTER TABLE ONLY "user"
    ADD CONSTRAINT user_pkey PRIMARY KEY (id);

ALTER TABLE ONLY user_permissions
    ADD CONSTRAINT user_permissions_permission_id_fkey FOREIGN KEY (permission_id) REFERENCES permission(id);

ALTER TABLE ONLY user_permissions
    ADD CONSTRAINT user_permissions_user_id_fkey FOREIGN KEY (user_id) REFERENCES "user"(id);

INSERT INTO permission (id, name) VALUES (1, 'admin');
