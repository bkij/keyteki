-- Table: public."SourcePods"

-- DROP TABLE public."SourcePods";

CREATE TABLE public."SourcePods"
(
    "DeckId" integer NOT NULL,
    "SourceDeckId" integer NOT NULL,
    "HouseId" integer NOT NULL,
    UNIQUE ("DeckId", "SourceDeckId", "HouseId"),
    CONSTRAINT "FK_SourcePods_Decks_Id" FOREIGN KEY ("DeckId")
        REFERENCES public."Decks" ("Id") MATCH SIMPLE
        ON UPDATE NO ACTION
        ON DELETE CASCADE,
    CONSTRAINT "FK_SourceDeckId_SourceDecks_Id" FOREIGN KEY ("SourceDeckId")
        REFERENCES public."SourceDecks" ("Id") MATCH SIMPLE
        ON UPDATE NO ACTION
        ON DELETE CASCADE,
    CONSTRAINT "FK_HousesId_Houses_Id" FOREIGN KEY ("HouseId")
        REFERENCES public."Houses" ("Id") MATCH SIMPLE
        ON UPDATE NO ACTION
        ON DELETE CASCADE
) TABLESPACE pg_default;

ALTER TABLE public."SourcePods"
    OWNER to keyteki;

CREATE INDEX "IX_SourcePods_DeckId"
    ON public."SourcePods" USING btree
    ("DeckId" ASC NULLS LAST)
    TABLESPACE pg_default;

CREATE INDEX "IX_SourcePods_SourceDeckId"
    ON public."SourcePods" USING btree
    ("SourceDeckId" ASC NULLS LAST)
    TABLESPACE pg_default;

CREATE INDEX "IX_SourcePods_HouseId"
    ON public."SourcePods" USING btree
    ("HouseId" ASC NULLS LAST)
    TABLESPACE pg_default;
