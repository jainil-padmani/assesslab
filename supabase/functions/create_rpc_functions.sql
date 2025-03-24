
-- Function to check if a table exists
CREATE OR REPLACE FUNCTION check_table_exists(table_name TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  exists BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public'
    AND table_name = $1
  ) INTO exists;
  
  RETURN exists;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if a column exists in a table
CREATE OR REPLACE FUNCTION check_column_exists(
  table_name_param TEXT,
  column_name_param TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
  column_exists BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = table_name_param
    AND column_name = column_name_param
  ) INTO column_exists;
  
  RETURN column_exists;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to add a column to a table
CREATE OR REPLACE FUNCTION add_column(
  table_name_param TEXT,
  column_name_param TEXT,
  column_type_param TEXT
)
RETURNS VOID AS $$
BEGIN
  EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS %I %s', 
                 table_name_param, column_name_param, column_type_param);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create the test_answers table
CREATE OR REPLACE FUNCTION create_test_answers_table()
RETURNS VOID AS $$
BEGIN
  CREATE TABLE IF NOT EXISTS public.test_answers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL,
    test_id UUID NOT NULL,
    subject_id UUID NOT NULL,
    answer_sheet_url TEXT,
    text_content TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  );
  
  -- Add indexes for better performance
  CREATE INDEX IF NOT EXISTS idx_test_answers_student_id ON public.test_answers(student_id);
  CREATE INDEX IF NOT EXISTS idx_test_answers_test_id ON public.test_answers(test_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to select from test_answers for a specific student and test
CREATE OR REPLACE FUNCTION select_from_test_answers(
  student_id_param UUID,
  test_id_param UUID
)
RETURNS SETOF public.test_answers AS $$
BEGIN
  RETURN QUERY
  SELECT *
  FROM public.test_answers
  WHERE student_id = student_id_param
  AND test_id = test_id_param;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to select all test answers for a specific test
CREATE OR REPLACE FUNCTION select_all_test_answers_for_test(
  test_id_param UUID
)
RETURNS SETOF public.test_answers AS $$
BEGIN
  RETURN QUERY
  SELECT *
  FROM public.test_answers
  WHERE test_id = test_id_param;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update test answers
CREATE OR REPLACE FUNCTION update_test_answers(
  student_id_param UUID,
  test_id_param UUID,
  text_content_param TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
  updated_rows INTEGER;
BEGIN
  UPDATE public.test_answers
  SET text_content = text_content_param
  WHERE student_id = student_id_param
  AND test_id = test_id_param
  RETURNING 1 INTO updated_rows;
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to insert test answers
CREATE OR REPLACE FUNCTION insert_test_answers(
  student_id_param UUID,
  test_id_param UUID,
  subject_id_param UUID,
  text_content_param TEXT,
  answer_sheet_url_param TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
  inserted_id UUID;
BEGIN
  INSERT INTO public.test_answers (
    student_id,
    test_id,
    subject_id,
    text_content,
    answer_sheet_url
  )
  VALUES (
    student_id_param,
    test_id_param,
    subject_id_param,
    text_content_param,
    answer_sheet_url_param
  )
  RETURNING id INTO inserted_id;
  
  RETURN inserted_id IS NOT NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
