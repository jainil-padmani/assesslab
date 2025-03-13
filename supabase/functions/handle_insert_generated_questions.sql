
CREATE OR REPLACE FUNCTION public.insert_generated_questions(
  p_user_id UUID,
  p_subject_id UUID,
  p_topic TEXT,
  p_questions JSONB
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.generated_questions (
    user_id,
    subject_id,
    topic,
    questions
  ) VALUES (
    p_user_id,
    p_subject_id,
    p_topic,
    p_questions
  );
END;
$$;
