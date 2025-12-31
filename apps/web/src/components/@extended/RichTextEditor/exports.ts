// ==============================|| RICH TEXT EDITOR - EXPORTS ||============================== //

export { default as RichTextEditor } from './index';
export { default as Toolbar } from './Toolbar';
export { default as TemplateSelector } from './TemplateSelector';
export { default as CharacterCounter } from './CharacterCounter';
export { clinicalTemplates } from './templates';

// Types
export type {
  RichTextEditorProps,
  ClinicalTemplate,
  TemplateCategory,
  ToolbarButtonProps,
  CharacterCountProps,
  TextAlignment,
  HeadingLevel,
  EditorState
} from 'types/richTextEditor';

export type { RichTextEditorRef } from './index';
