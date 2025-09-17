-- Create prompt_templates table for storing AI prompt templates
CREATE TABLE prompt_templates (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('single', 'couple', 'family')),
  name TEXT NOT NULL,
  template TEXT NOT NULL,
  is_default BOOLEAN DEFAULT false,
  version INTEGER DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Create indexes
CREATE INDEX idx_prompt_templates_type ON prompt_templates(type);
CREATE INDEX idx_prompt_templates_is_default ON prompt_templates(is_default);
CREATE INDEX idx_prompt_templates_created_at ON prompt_templates(created_at);

-- Enable RLS
ALTER TABLE prompt_templates ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Only admin users can view prompt templates
CREATE POLICY "Admin users can view prompt templates"
  ON prompt_templates FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role IN ('admin', 'super_admin')
    )
  );

-- Only admin users can insert prompt templates
CREATE POLICY "Admin users can insert prompt templates"
  ON prompt_templates FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role IN ('admin', 'super_admin')
    )
  );

-- Only admin users can update prompt templates
CREATE POLICY "Admin users can update prompt templates"
  ON prompt_templates FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role IN ('admin', 'super_admin')
    )
  );

-- Only admin users can delete prompt templates
CREATE POLICY "Admin users can delete prompt templates"
  ON prompt_templates FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role IN ('admin', 'super_admin')
    )
  );

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_prompt_templates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  NEW.updated_by = auth.uid();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update updated_at
CREATE TRIGGER trigger_update_prompt_templates_updated_at
  BEFORE UPDATE ON prompt_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_prompt_templates_updated_at();

-- Insert default prompt templates
INSERT INTO prompt_templates (id, type, name, template, is_default, created_by) VALUES
(
  'single_default',
  'single',
  'Single Person Default',
  'Transform the SINGLE PERSON in this image into a FULL BODY wedding portrait with a "{style}" theme. This is a SINGLE PERSON portrait - NOT a couple. Create a professional bridal/groom portrait showing them ALONE. Keep their face EXACTLY identical to the original - preserve ALL facial features, expressions, and complete likeness. Show the complete wedding outfit from head to toe, including dress/suit details, shoes, and accessories. {customPrompt}. Ensure their face remains perfectly consistent and unchanged from the original photo while creating a stunning full-length INDIVIDUAL portrait.',
  true,
  NULL
),
(
  'couple_default',
  'couple',
  'Couple Default',
  'Transform the TWO PEOPLE (couple) in this image into a beautiful wedding portrait with a "{style}" theme. This is a COUPLE portrait - there should be TWO people in the result. Keep BOTH their faces EXACTLY identical to the original - preserve their facial features, expressions, and likeness completely. Maintain BOTH subjects'' identity while transforming only their clothing and background to match the wedding style. {customPrompt}. Make them look like they are dressed for a wedding in that style, but ensure BOTH faces remain perfectly consistent and unchanged from the original photo.',
  true,
  NULL
),
(
  'family_default',
  'family',
  'Family Default',
  'Transform this family of {familyMemberCount} people into a beautiful wedding portrait with a "{style}" theme. Crucially, preserve the exact likeness of EACH and EVERY family member''s face and unique facial features. Only transform their clothing and the environment. Ensure all {familyMemberCount} individuals from the original photo are present and their identity is clearly recognizable. {customPrompt}.',
  true,
  NULL
);

-- Grant access to the service role
GRANT ALL ON prompt_templates TO service_role;