--
-- PostgreSQL database dump
--

-- Dumped from database version 9.1.11
-- Dumped by pg_dump version 9.1.11
-- Started on 2013-12-12 23:17:56 CET

SET statement_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SET check_function_bodies = false;
SET client_min_messages = warning;

--
-- TOC entry 1966 (class 1262 OID 19302)
-- Name: cae; Type: DATABASE; Schema: -; Owner: cae
--

CREATE DATABASE cae WITH TEMPLATE = template0 ENCODING = 'UTF8' LC_COLLATE = 'en_US.UTF-8' LC_CTYPE = 'en_US.UTF-8';


ALTER DATABASE cae OWNER TO cae;

\connect cae

SET statement_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SET check_function_bodies = false;
SET client_min_messages = warning;

--
-- TOC entry 170 (class 3079 OID 11681)
-- Name: plpgsql; Type: EXTENSION; Schema: -; Owner:
--

CREATE EXTENSION IF NOT EXISTS plpgsql WITH SCHEMA pg_catalog;


--
-- TOC entry 1969 (class 0 OID 0)
-- Dependencies: 170
-- Name: EXTENSION plpgsql; Type: COMMENT; Schema: -; Owner:
--

COMMENT ON EXTENSION plpgsql IS 'PL/pgSQL procedural language';


SET search_path = public, pg_catalog;

--
-- TOC entry 162 (class 1259 OID 19326)
-- Dependencies: 5
-- Name: object_id_seq; Type: SEQUENCE; Schema: public; Owner: cae
--

CREATE SEQUENCE object_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.object_id_seq OWNER TO cae;

SET default_tablespace = '';

SET default_with_oids = false;

--
-- TOC entry 168 (class 1259 OID 19435)
-- Dependencies: 1827 5
-- Name: black_card; Type: TABLE; Schema: public; Owner: cae; Tablespace:
--

CREATE TABLE black_card (
    id integer DEFAULT nextval('object_id_seq'::regclass) NOT NULL,
    deck_id integer NOT NULL,
    text character varying(1024) NOT NULL,
    pick integer NOT NULL,
    draw integer NOT NULL
);


ALTER TABLE public.black_card OWNER TO cae;

--
-- TOC entry 163 (class 1259 OID 19335)
-- Dependencies: 1822 1823 1824 1825 5
-- Name: deck; Type: TABLE; Schema: public; Owner: cae; Tablespace:
--

CREATE TABLE deck (
    id integer DEFAULT nextval('object_id_seq'::regclass) NOT NULL,
    name character varying(256) NOT NULL,
    description text NOT NULL,
    expansion boolean DEFAULT true NOT NULL,
    index integer DEFAULT 0 NOT NULL,
    hidden boolean DEFAULT false NOT NULL
);


ALTER TABLE public.deck OWNER TO cae;

--
-- TOC entry 166 (class 1259 OID 19410)
-- Dependencies: 5
-- Name: deck_permissions; Type: TABLE; Schema: public; Owner: cae; Tablespace:
--

CREATE TABLE deck_permissions (
    permission_id integer NOT NULL,
    deck_id integer NOT NULL
);


ALTER TABLE public.deck_permissions OWNER TO cae;

--
-- TOC entry 164 (class 1259 OID 19389)
-- Dependencies: 1826 5
-- Name: permission; Type: TABLE; Schema: public; Owner: cae; Tablespace:
--

CREATE TABLE permission (
    id integer DEFAULT nextval('object_id_seq'::regclass) NOT NULL,
    name character varying(256) NOT NULL
);


ALTER TABLE public.permission OWNER TO cae;

--
-- TOC entry 167 (class 1259 OID 19425)
-- Dependencies: 5
-- Name: site_permissions; Type: TABLE; Schema: public; Owner: cae; Tablespace:
--

CREATE TABLE site_permissions (
    permission_id integer NOT NULL,
    site_permission character varying(256) NOT NULL
);


ALTER TABLE public.site_permissions OWNER TO cae;

--
-- TOC entry 161 (class 1259 OID 19316)
-- Dependencies: 1819 1820 1821 5
-- Name: user; Type: TABLE; Schema: public; Owner: cae; Tablespace:
--

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

--
-- TOC entry 165 (class 1259 OID 19395)
-- Dependencies: 5
-- Name: user_permissions; Type: TABLE; Schema: public; Owner: cae; Tablespace:
--

CREATE TABLE user_permissions (
    user_id integer NOT NULL,
    permission_id integer NOT NULL
);


ALTER TABLE public.user_permissions OWNER TO cae;

--
-- TOC entry 169 (class 1259 OID 19449)
-- Dependencies: 1828 5
-- Name: white_card; Type: TABLE; Schema: public; Owner: cae; Tablespace:
--

CREATE TABLE white_card (
    id integer DEFAULT nextval('object_id_seq'::regclass) NOT NULL,
    deck_id integer NOT NULL,
    text character varying(1024) NOT NULL
);


ALTER TABLE public.white_card OWNER TO cae;

--
-- TOC entry 1960 (class 0 OID 19435)
-- Dependencies: 168 1962
-- Data for Name: black_card; Type: TABLE DATA; Schema: public; Owner: cae
--

COPY black_card (id, deck_id, text, pick, draw) FROM stdin;
\.


--
-- TOC entry 1955 (class 0 OID 19335)
-- Dependencies: 163 1962
-- Data for Name: deck; Type: TABLE DATA; Schema: public; Owner: cae
--

COPY deck (id, name, description, expansion, index, hidden) FROM stdin;
\.


--
-- TOC entry 1958 (class 0 OID 19410)
-- Dependencies: 166 1962
-- Data for Name: deck_permissions; Type: TABLE DATA; Schema: public; Owner: cae
--

COPY deck_permissions (permission_id, deck_id) FROM stdin;
\.


--
-- TOC entry 1970 (class 0 OID 0)
-- Dependencies: 162
-- Name: object_id_seq; Type: SEQUENCE SET; Schema: public; Owner: cae
--

SELECT pg_catalog.setval('object_id_seq', 1, false);


--
-- TOC entry 1956 (class 0 OID 19389)
-- Dependencies: 164 1962
-- Data for Name: permission; Type: TABLE DATA; Schema: public; Owner: cae
--

COPY permission (id, name) FROM stdin;
\.


--
-- TOC entry 1959 (class 0 OID 19425)
-- Dependencies: 167 1962
-- Data for Name: site_permissions; Type: TABLE DATA; Schema: public; Owner: cae
--

COPY site_permissions (permission_id, site_permission) FROM stdin;
\.


--
-- TOC entry 1953 (class 0 OID 19316)
-- Dependencies: 161 1962
-- Data for Name: user; Type: TABLE DATA; Schema: public; Owner: cae
--

COPY "user" (id, name, email, password, password_salt, allow_emails, date_registered, last_login) FROM stdin;
\.


--
-- TOC entry 1957 (class 0 OID 19395)
-- Dependencies: 165 1962
-- Data for Name: user_permissions; Type: TABLE DATA; Schema: public; Owner: cae
--

COPY user_permissions (user_id, permission_id) FROM stdin;
\.


--
-- TOC entry 1961 (class 0 OID 19449)
-- Dependencies: 169 1962
-- Data for Name: white_card; Type: TABLE DATA; Schema: public; Owner: cae
--

COPY white_card (id, deck_id, text) FROM stdin;
\.


--
-- TOC entry 1842 (class 2606 OID 19443)
-- Dependencies: 168 168 1963
-- Name: black_card_pkey; Type: CONSTRAINT; Schema: public; Owner: cae; Tablespace:
--

ALTER TABLE ONLY black_card
    ADD CONSTRAINT black_card_pkey PRIMARY KEY (id);


--
-- TOC entry 1838 (class 2606 OID 19414)
-- Dependencies: 166 166 166 1963
-- Name: deck_permissions_pkey; Type: CONSTRAINT; Schema: public; Owner: cae; Tablespace:
--

ALTER TABLE ONLY deck_permissions
    ADD CONSTRAINT deck_permissions_pkey PRIMARY KEY (permission_id, deck_id);


--
-- TOC entry 1832 (class 2606 OID 19346)
-- Dependencies: 163 163 1963
-- Name: deck_pkey; Type: CONSTRAINT; Schema: public; Owner: cae; Tablespace:
--

ALTER TABLE ONLY deck
    ADD CONSTRAINT deck_pkey PRIMARY KEY (id);


--
-- TOC entry 1834 (class 2606 OID 19394)
-- Dependencies: 164 164 1963
-- Name: permission_pkey; Type: CONSTRAINT; Schema: public; Owner: cae; Tablespace:
--

ALTER TABLE ONLY permission
    ADD CONSTRAINT permission_pkey PRIMARY KEY (id);


--
-- TOC entry 1840 (class 2606 OID 19429)
-- Dependencies: 167 167 167 1963
-- Name: site_permissions_pkey; Type: CONSTRAINT; Schema: public; Owner: cae; Tablespace:
--

ALTER TABLE ONLY site_permissions
    ADD CONSTRAINT site_permissions_pkey PRIMARY KEY (permission_id, site_permission);


--
-- TOC entry 1836 (class 2606 OID 19399)
-- Dependencies: 165 165 165 1963
-- Name: user_permissions_pkey; Type: CONSTRAINT; Schema: public; Owner: cae; Tablespace:
--

ALTER TABLE ONLY user_permissions
    ADD CONSTRAINT user_permissions_pkey PRIMARY KEY (user_id, permission_id);


--
-- TOC entry 1830 (class 2606 OID 19325)
-- Dependencies: 161 161 1963
-- Name: user_pkey; Type: CONSTRAINT; Schema: public; Owner: cae; Tablespace:
--

ALTER TABLE ONLY "user"
    ADD CONSTRAINT user_pkey PRIMARY KEY (id);


--
-- TOC entry 1844 (class 2606 OID 19457)
-- Dependencies: 169 169 1963
-- Name: white_card_pkey; Type: CONSTRAINT; Schema: public; Owner: cae; Tablespace:
--

ALTER TABLE ONLY white_card
    ADD CONSTRAINT white_card_pkey PRIMARY KEY (id);


--
-- TOC entry 1850 (class 2606 OID 19444)
-- Dependencies: 1831 168 163 1963
-- Name: black_card_deck_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: cae
--

ALTER TABLE ONLY black_card
    ADD CONSTRAINT black_card_deck_id_fkey FOREIGN KEY (deck_id) REFERENCES deck(id);


--
-- TOC entry 1848 (class 2606 OID 19420)
-- Dependencies: 163 1831 166 1963
-- Name: deck_permissions_deck_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: cae
--

ALTER TABLE ONLY deck_permissions
    ADD CONSTRAINT deck_permissions_deck_id_fkey FOREIGN KEY (deck_id) REFERENCES deck(id);


--
-- TOC entry 1847 (class 2606 OID 19415)
-- Dependencies: 166 1833 164 1963
-- Name: deck_permissions_permission_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: cae
--

ALTER TABLE ONLY deck_permissions
    ADD CONSTRAINT deck_permissions_permission_id_fkey FOREIGN KEY (permission_id) REFERENCES permission(id);


--
-- TOC entry 1849 (class 2606 OID 19430)
-- Dependencies: 167 1833 164 1963
-- Name: site_permissions_permission_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: cae
--

ALTER TABLE ONLY site_permissions
    ADD CONSTRAINT site_permissions_permission_id_fkey FOREIGN KEY (permission_id) REFERENCES permission(id);


--
-- TOC entry 1846 (class 2606 OID 19405)
-- Dependencies: 164 1833 165 1963
-- Name: user_permissions_permission_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: cae
--

ALTER TABLE ONLY user_permissions
    ADD CONSTRAINT user_permissions_permission_id_fkey FOREIGN KEY (permission_id) REFERENCES permission(id);


--
-- TOC entry 1845 (class 2606 OID 19400)
-- Dependencies: 161 165 1829 1963
-- Name: user_permissions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: cae
--

ALTER TABLE ONLY user_permissions
    ADD CONSTRAINT user_permissions_user_id_fkey FOREIGN KEY (user_id) REFERENCES "user"(id);


--
-- TOC entry 1851 (class 2606 OID 19458)
-- Dependencies: 1831 163 169 1963
-- Name: white_card_deck_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: cae
--

ALTER TABLE ONLY white_card
    ADD CONSTRAINT white_card_deck_id_fkey FOREIGN KEY (deck_id) REFERENCES deck(id);


--
-- TOC entry 1968 (class 0 OID 0)
-- Dependencies: 5
-- Name: public; Type: ACL; Schema: -; Owner: postgres
--

REVOKE ALL ON SCHEMA public FROM PUBLIC;
REVOKE ALL ON SCHEMA public FROM postgres;
GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL ON SCHEMA public TO PUBLIC;


-- Completed on 2013-12-12 23:17:56 CET

--
-- PostgreSQL database dump complete
--
