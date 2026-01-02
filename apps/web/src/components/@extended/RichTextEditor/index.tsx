'use client';

import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef } from 'react';

// TIPTAP
import { useEditor, EditorContent, Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import CharacterCount from '@tiptap/extension-character-count';
import Placeholder from '@tiptap/extension-placeholder';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import TextStyle from '@tiptap/extension-text-style';
import { Color } from '@tiptap/extension-color';
import Highlight from '@tiptap/extension-highlight';

// MATERIAL - UI
import { styled } from '@mui/material/styles';
import Box from '@mui/material/Box';
import FormHelperText from '@mui/material/FormHelperText';
import InputLabel from '@mui/material/InputLabel';

// PROJECT IMPORTS
import Toolbar from './Toolbar';
import TemplateSelector from './TemplateSelector';
import CharacterCounter from './CharacterCounter';

// TYPES
import { RichTextEditorProps, ClinicalTemplate } from 'types/richTextEditor';

// ==============================|| RICH TEXT EDITOR - STYLED ||============================== //

interface EditorWrapperProps {
  error?: boolean;
  disabled?: boolean;
  focused?: boolean;
  minHeight?: number | string;
  maxHeight?: number | string;
}

const EditorWrapper = styled(Box, {
  shouldForwardProp: (prop) => !['error', 'disabled', 'focused', 'minHeight', 'maxHeight'].includes(prop as string)
})<EditorWrapperProps>(({ theme, error, disabled, focused, minHeight, maxHeight }) => ({
  border: `1px solid ${error ? theme.palette.error.main : focused ? theme.palette.primary.main : theme.palette.divider}`,
  borderRadius: theme.shape.borderRadius,
  backgroundColor: disabled ? theme.palette.action.disabledBackground : theme.palette.background.paper,
  transition: theme.transitions.create(['border-color', 'box-shadow']),
  overflow: 'hidden',

  '&:hover': {
    borderColor: !disabled && !error ? theme.palette.text.primary : undefined
  },

  ...(focused && {
    boxShadow: `0 0 0 2px ${error ? theme.palette.error.light : theme.palette.primary.light}`,
    borderColor: error ? theme.palette.error.main : theme.palette.primary.main
  }),

  '& .ProseMirror': {
    padding: theme.spacing(1.5, 2),
    minHeight: minHeight || 150,
    maxHeight: maxHeight || 400,
    overflowY: 'auto',
    outline: 'none',
    fontSize: '0.875rem',
    lineHeight: 1.6,
    color: disabled ? theme.palette.text.disabled : theme.palette.text.primary,

    '& p': {
      margin: 0,
      marginBottom: theme.spacing(1),

      '&:last-child': {
        marginBottom: 0
      }
    },

    '& h1, & h2, & h3, & h4, & h5, & h6': {
      marginTop: theme.spacing(2),
      marginBottom: theme.spacing(1),
      fontWeight: 600,

      '&:first-of-type': {
        marginTop: 0
      }
    },

    '& h1': { fontSize: '1.5rem' },
    '& h2': { fontSize: '1.25rem' },
    '& h3': { fontSize: '1.125rem' },
    '& h4': { fontSize: '1rem' },
    '& h5': { fontSize: '0.875rem' },
    '& h6': { fontSize: '0.75rem' },

    '& ul, & ol': {
      paddingLeft: theme.spacing(3),
      marginBottom: theme.spacing(1)
    },

    '& li': {
      marginBottom: theme.spacing(0.5)
    },

    '& blockquote': {
      borderLeft: `3px solid ${theme.palette.divider}`,
      paddingLeft: theme.spacing(2),
      marginLeft: 0,
      marginRight: 0,
      fontStyle: 'italic',
      color: theme.palette.text.secondary
    },

    '& hr': {
      border: 'none',
      borderTop: `1px solid ${theme.palette.divider}`,
      margin: theme.spacing(2, 0)
    },

    '& mark': {
      backgroundColor: theme.palette.warning.light,
      borderRadius: 2,
      padding: '0 2px'
    },

    '& code': {
      backgroundColor: theme.palette.grey[100],
      borderRadius: 4,
      padding: '2px 4px',
      fontFamily: 'monospace',
      fontSize: '0.8125rem'
    },

    '& pre': {
      backgroundColor: theme.palette.grey[100],
      borderRadius: theme.shape.borderRadius,
      padding: theme.spacing(1.5),
      overflow: 'auto',

      '& code': {
        backgroundColor: 'transparent',
        padding: 0
      }
    },

    '& .is-editor-empty:first-child::before': {
      content: 'attr(data-placeholder)',
      float: 'left',
      color: theme.palette.text.disabled,
      pointerEvents: 'none',
      height: 0
    }
  }
}));

// ==============================|| RICH TEXT EDITOR - COMPONENT ||============================== //

export interface RichTextEditorRef {
  getEditor: () => Editor | null;
  getHTML: () => string;
  getText: () => string;
  setContent: (content: string) => void;
  clearContent: () => void;
  focus: () => void;
  blur: () => void;
}

const RichTextEditor = forwardRef<RichTextEditorRef, RichTextEditorProps>(
  (
    {
      value = '',
      onChange,
      onBlur,
      placeholder = 'Enter clinical documentation...',
      minHeight = 150,
      maxHeight = 400,
      characterLimit,
      showCharacterCount = true,
      disabled = false,
      readOnly = false,
      error = false,
      helperText,
      label,
      required = false,
      templates = [],
      showTemplates = true,
      showToolbar = true,
      toolbarVariant = 'clinical',
      autoFocus = false,
      id,
      name,
      'aria-label': ariaLabel,
      'aria-describedby': ariaDescribedBy
    },
    ref
  ) => {
    const containerRef = useRef<HTMLDivElement>(null);

    // Configure TipTap extensions
    const extensions = useMemo(() => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const exts: any[] = [
        StarterKit.configure({
          heading: {
            levels: [1, 2, 3, 4]
          }
        }),
        Underline,
        TextAlign.configure({
          types: ['heading', 'paragraph']
        }),
        TextStyle,
        Color,
        Highlight.configure({
          multicolor: true
        }),
        Placeholder.configure({
          placeholder
        })
      ];

      if (characterLimit) {
        exts.push(
          CharacterCount.configure({
            limit: characterLimit
          })
        );
      } else {
        exts.push(CharacterCount);
      }

      return exts;
    }, [placeholder, characterLimit]);

    // Initialize TipTap editor
    const editor = useEditor({
      extensions,
      content: value,
      editable: !disabled && !readOnly,
      autofocus: autoFocus,
      onUpdate: ({ editor }) => {
        if (onChange) {
          onChange(editor.getHTML(), editor.getText());
        }
      },
      onBlur: () => {
        if (onBlur) {
          onBlur();
        }
      }
    });

    // Update content when value prop changes
    useEffect(() => {
      if (editor && value !== editor.getHTML()) {
        editor.commands.setContent(value);
      }
    }, [value, editor]);

    // Update editable state
    useEffect(() => {
      if (editor) {
        editor.setEditable(!disabled && !readOnly);
      }
    }, [disabled, readOnly, editor]);

    // Expose editor methods via ref
    useImperativeHandle(ref, () => ({
      getEditor: () => editor,
      getHTML: () => editor?.getHTML() || '',
      getText: () => editor?.getText() || '',
      setContent: (content: string) => {
        editor?.commands.setContent(content);
      },
      clearContent: () => {
        editor?.commands.clearContent();
      },
      focus: () => {
        editor?.commands.focus();
      },
      blur: () => {
        editor?.commands.blur();
      }
    }));

    // Handle template selection
    const handleTemplateSelect = useCallback(
      (template: ClinicalTemplate) => {
        if (editor) {
          editor.commands.setContent(template.content);
          if (onChange) {
            onChange(template.content, editor.getText());
          }
        }
      },
      [editor, onChange]
    );

    // Get character count
    const characterCount = editor?.storage.characterCount?.characters() || 0;

    // Check if editor is focused
    const isFocused = editor?.isFocused || false;

    return (
      <Box ref={containerRef} sx={{ width: '100%' }}>
        {label && (
          <InputLabel
            required={required}
            error={error}
            sx={{
              mb: 1,
              color: error ? 'error.main' : 'text.primary',
              fontWeight: 500
            }}
          >
            {label}
          </InputLabel>
        )}

        <EditorWrapper
          error={error}
          disabled={disabled}
          focused={isFocused}
          minHeight={minHeight}
          maxHeight={maxHeight}
        >
          {showToolbar && editor && (
            <Toolbar
              editor={editor}
              variant={toolbarVariant}
              disabled={disabled || readOnly}
            />
          )}

          {showTemplates && templates.length > 0 && !disabled && !readOnly && (
            <TemplateSelector
              templates={templates}
              onSelect={handleTemplateSelect}
            />
          )}

          <EditorContent
            editor={editor}
            id={id}
            aria-label={ariaLabel || label}
            aria-describedby={ariaDescribedBy}
            aria-invalid={error}
            data-name={name}
          />

          {showCharacterCount && (
            <CharacterCounter
              current={characterCount}
              limit={characterLimit}
              showLimit={!!characterLimit}
            />
          )}
        </EditorWrapper>

        {helperText && (
          <FormHelperText error={error} sx={{ mx: 1.5, mt: 0.5 }}>
            {helperText}
          </FormHelperText>
        )}
      </Box>
    );
  }
);

RichTextEditor.displayName = 'RichTextEditor';

export default RichTextEditor;
