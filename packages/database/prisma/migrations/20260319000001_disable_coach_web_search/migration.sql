-- Disable web search for coach: coach guides conversation technique,
-- not current events. Web search was causing verbose two-part responses.
UPDATE "Scenario"
SET "coachUseWebSearch" = false
WHERE "slug" IN ('angry-uncle-thanksgiving', 'difficult-coworker');
