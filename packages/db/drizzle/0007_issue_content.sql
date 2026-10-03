-- Backfill issue descriptions into version 1 Lexical documents, then drop the
-- old column. Each line becomes one paragraph. CR and CRLF become LF. The text
-- is not parsed as HTML or Markdown. Null and empty descriptions stay empty:
-- content is null and content_text is ''. Whitespace and a lone newline are
-- kept. Saved-view filters.description is renamed to filters.content.
-- Verify before the drop: every content_text matches the normalized
-- description, empty rows agree, text is at most 20,000 characters, and the
-- JSON is at most 1,500,000 bytes. A failure raises and rolls the migration
-- back.

ALTER TABLE "issue" ADD COLUMN "content" jsonb;--> statement-breakpoint
ALTER TABLE "issue" ADD COLUMN "content_text" text DEFAULT '' NOT NULL;--> statement-breakpoint
UPDATE "issue" AS target
SET
  "content" = CASE
    WHEN source."description" IS NULL OR source."description" = '' THEN NULL
    ELSE jsonb_build_object(
      'version', 1,
      'root', jsonb_build_object(
        'children', source.paragraphs,
        'direction', NULL,
        'format', '',
        'indent', 0,
        'type', 'root',
        'version', 1
      )
    )
  END,
  "content_text" = CASE
    WHEN source."description" IS NULL OR source."description" = '' THEN ''
    ELSE source.normalized
  END
FROM (
  SELECT
    "id",
    "description",
    replace(replace("description", E'\r\n', E'\n'), E'\r', E'\n') AS normalized,
    (
      SELECT COALESCE(jsonb_agg(paragraph ORDER BY ordinality), '[]'::jsonb)
      FROM regexp_split_to_table(
        replace(replace("description", E'\r\n', E'\n'), E'\r', E'\n'),
        E'\n'
      ) WITH ORDINALITY AS lines(line, ordinality)
      CROSS JOIN LATERAL (
        SELECT jsonb_build_object(
          'children',
          CASE
            WHEN line = '' THEN '[]'::jsonb
            ELSE jsonb_build_array(
              jsonb_build_object(
                'detail', 0,
                'format', 0,
                'mode', 'normal',
                'style', '',
                'text', line,
                'type', 'text',
                'version', 1
              )
            )
          END,
          'direction', NULL,
          'format', '',
          'indent', 0,
          'type', 'paragraph',
          'version', 1
        ) AS paragraph
      ) AS built
    ) AS paragraphs
  FROM "issue"
) AS source
WHERE target."id" = source."id"
  AND source."description" IS NOT NULL
  AND source."description" <> '';--> statement-breakpoint
UPDATE "issue_view"
SET "definition" = jsonb_set(
  "definition" #- '{filters,description}',
  '{filters,content}',
  "definition" #> '{filters,description}',
  true
)
WHERE jsonb_typeof("definition" #> '{filters,description}') = 'string'
  AND (
    "definition" #> '{filters,content}' IS NULL
    OR jsonb_typeof("definition" #> '{filters,content}') = 'null'
  );--> statement-breakpoint
UPDATE "issue_view"
SET "definition" = "definition" #- '{filters,description}'
WHERE "definition" #> '{filters,description}' IS NOT NULL;--> statement-breakpoint
DO $$
DECLARE
  failed bigint;
BEGIN
  SELECT count(*) INTO failed
  FROM "issue"
  WHERE ("content" IS NULL) IS DISTINCT FROM ("content_text" = '')
    OR char_length("content_text") > 20000
    OR ("content" IS NOT NULL AND octet_length("content"::text) > 1500000)
    OR (
      ("description" IS NULL OR "description" = '')
      AND "content" IS NOT NULL
    )
    OR (
      "description" IS NOT NULL
      AND "description" <> ''
      AND "content_text" IS DISTINCT FROM replace(replace("description", E'\r\n', E'\n'), E'\r', E'\n')
    )
    OR (
      "content" IS NOT NULL
      AND jsonb_array_length("content" -> 'root' -> 'children')
        IS DISTINCT FROM (
          char_length("content_text") - char_length(replace("content_text", E'\n', '')) + 1
        )
    );

  IF failed > 0 THEN
    RAISE EXCEPTION 'issue content backfill failed for % rows', failed;
  END IF;
END $$;--> statement-breakpoint
ALTER TABLE "issue" ADD CONSTRAINT "issue_content_text_length_check" CHECK (char_length("issue"."content_text") <= 20000);--> statement-breakpoint
ALTER TABLE "issue" ADD CONSTRAINT "issue_content_json_size_check" CHECK ("issue"."content" is null or octet_length("issue"."content"::text) <= 1500000);--> statement-breakpoint
ALTER TABLE "issue" ADD CONSTRAINT "issue_content_empty_check" CHECK (("issue"."content" is null) = ("issue"."content_text" = ''));--> statement-breakpoint
ALTER TABLE "issue" DROP COLUMN "description";
