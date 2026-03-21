-- Append voice constraint to coach system prompt.
-- The coach was generating uncle-like rants before pivoting to coaching advice.
UPDATE "Scenario"
SET "coachSystemPrompt" = "coachSystemPrompt" || E'\n\nCRITICAL: You are the coach, not a participant. Never speak in the uncle''s voice, continue his argument, or editorialize about the situation. Start your response immediately with a coaching observation or suggestion — nothing else.'
WHERE "slug" IN ('angry-uncle-thanksgiving', 'difficult-coworker');
