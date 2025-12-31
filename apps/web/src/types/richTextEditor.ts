// ==============================|| TYPES - RICH TEXT EDITOR ||============================== //

export interface ClinicalTemplate {
  id: string;
  name: string;
  category: TemplateCategory;
  content: string;
  description?: string;
}

export type TemplateCategory =
  | 'nursing_assessment'
  | 'pain_assessment'
  | 'symptom_management'
  | 'care_plan'
  | 'discharge_summary'
  | 'progress_note'
  | 'initial_evaluation'
  | 'medication_review'
  | 'family_communication'
  | 'interdisciplinary_note';

export interface RichTextEditorProps {
  value?: string;
  onChange?: (html: string, plainText: string) => void;
  onBlur?: () => void;
  placeholder?: string;
  minHeight?: number | string;
  maxHeight?: number | string;
  characterLimit?: number;
  showCharacterCount?: boolean;
  disabled?: boolean;
  readOnly?: boolean;
  error?: boolean;
  helperText?: string;
  label?: string;
  required?: boolean;
  templates?: ClinicalTemplate[];
  showTemplates?: boolean;
  showToolbar?: boolean;
  toolbarVariant?: 'full' | 'minimal' | 'clinical';
  autoFocus?: boolean;
  id?: string;
  name?: string;
  'aria-label'?: string;
  'aria-describedby'?: string;
}

export interface ToolbarButtonProps {
  active?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  tooltip?: string;
  children: React.ReactNode;
}

export interface CharacterCountProps {
  current: number;
  limit?: number;
  showLimit?: boolean;
}

export type TextAlignment = 'left' | 'center' | 'right' | 'justify';

export type HeadingLevel = 1 | 2 | 3 | 4 | 5 | 6;

export interface EditorState {
  isBold: boolean;
  isItalic: boolean;
  isUnderline: boolean;
  isStrike: boolean;
  isBulletList: boolean;
  isOrderedList: boolean;
  textAlign: TextAlignment;
  headingLevel: HeadingLevel | null;
  isHighlighted: boolean;
}
