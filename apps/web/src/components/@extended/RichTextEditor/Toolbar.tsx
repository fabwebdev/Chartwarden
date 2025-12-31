'use client';

import { useMemo } from 'react';

// TIPTAP
import { Editor } from '@tiptap/react';

// MATERIAL - UI
import { styled, useTheme } from '@mui/material/styles';
import Box from '@mui/material/Box';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';

// ICONS
import {
  TextBold,
  TextItalic,
  TextUnderline,
  TextStrikethrough,
  TextalignLeft,
  TextalignCenter,
  TextalignRight,
  TextalignJustifycenter,
  Firstline,
  TaskSquare,
  Code,
  Quote,
  Minus,
  Highlighter,
  Undo,
  Redo
} from 'iconsax-react';

// ==============================|| TOOLBAR - STYLED ||============================== //

const ToolbarWrapper = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexWrap: 'wrap',
  alignItems: 'center',
  gap: theme.spacing(0.5),
  padding: theme.spacing(1, 1.5),
  borderBottom: `1px solid ${theme.palette.divider}`,
  backgroundColor: theme.palette.grey[50],

  '& .MuiIconButton-root': {
    padding: theme.spacing(0.75),
    borderRadius: theme.shape.borderRadius,

    '&.active': {
      backgroundColor: theme.palette.primary.lighter,
      color: theme.palette.primary.main
    },

    '&:hover': {
      backgroundColor: theme.palette.action.hover
    }
  }
}));

const ToolbarDivider = styled(Divider)(({ theme }) => ({
  height: 24,
  margin: theme.spacing(0, 0.5)
}));

// ==============================|| TOOLBAR - BUTTON ||============================== //

interface ToolbarButtonProps {
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
  tooltip: string;
  children: React.ReactNode;
}

const ToolbarButton = ({ active, disabled, onClick, tooltip, children }: ToolbarButtonProps) => (
  <Tooltip title={tooltip} placement="top">
    <span>
      <IconButton
        size="small"
        onClick={onClick}
        disabled={disabled}
        className={active ? 'active' : ''}
        sx={{ color: active ? 'primary.main' : 'text.secondary' }}
      >
        {children}
      </IconButton>
    </span>
  </Tooltip>
);

// ==============================|| TOOLBAR - COMPONENT ||============================== //

interface ToolbarProps {
  editor: Editor;
  variant?: 'full' | 'minimal' | 'clinical';
  disabled?: boolean;
}

const Toolbar = ({ editor, variant = 'clinical', disabled = false }: ToolbarProps) => {
  const theme = useTheme();
  const iconSize = 18;

  // Get current heading level
  const currentHeading = useMemo(() => {
    if (editor.isActive('heading', { level: 1 })) return '1';
    if (editor.isActive('heading', { level: 2 })) return '2';
    if (editor.isActive('heading', { level: 3 })) return '3';
    if (editor.isActive('heading', { level: 4 })) return '4';
    return '0';
  }, [editor.isActive('heading')]);

  // Handle heading change
  const handleHeadingChange = (level: string) => {
    if (level === '0') {
      editor.chain().focus().setParagraph().run();
    } else {
      editor.chain().focus().toggleHeading({ level: parseInt(level) as 1 | 2 | 3 | 4 }).run();
    }
  };

  // Minimal toolbar - basic formatting only
  const minimalTools = (
    <>
      <ToolbarButton
        active={editor.isActive('bold')}
        onClick={() => editor.chain().focus().toggleBold().run()}
        disabled={disabled}
        tooltip="Bold (Ctrl+B)"
      >
        <TextBold size={iconSize} variant="Bold" />
      </ToolbarButton>

      <ToolbarButton
        active={editor.isActive('italic')}
        onClick={() => editor.chain().focus().toggleItalic().run()}
        disabled={disabled}
        tooltip="Italic (Ctrl+I)"
      >
        <TextItalic size={iconSize} variant="Bold" />
      </ToolbarButton>

      <ToolbarButton
        active={editor.isActive('underline')}
        onClick={() => editor.chain().focus().toggleUnderline().run()}
        disabled={disabled}
        tooltip="Underline (Ctrl+U)"
      >
        <TextUnderline size={iconSize} variant="Bold" />
      </ToolbarButton>
    </>
  );

  // Clinical toolbar - optimized for clinical documentation
  const clinicalTools = (
    <>
      {/* Text Style Section */}
      <FormControl size="small" sx={{ minWidth: 100 }}>
        <Select
          value={currentHeading}
          onChange={(e) => handleHeadingChange(e.target.value)}
          disabled={disabled}
          displayEmpty
          sx={{
            '& .MuiSelect-select': {
              py: 0.5,
              fontSize: '0.8125rem'
            }
          }}
        >
          <MenuItem value="0">Normal</MenuItem>
          <MenuItem value="1">Heading 1</MenuItem>
          <MenuItem value="2">Heading 2</MenuItem>
          <MenuItem value="3">Heading 3</MenuItem>
          <MenuItem value="4">Heading 4</MenuItem>
        </Select>
      </FormControl>

      <ToolbarDivider orientation="vertical" />

      {/* Basic Formatting */}
      <ToolbarButton
        active={editor.isActive('bold')}
        onClick={() => editor.chain().focus().toggleBold().run()}
        disabled={disabled}
        tooltip="Bold (Ctrl+B)"
      >
        <TextBold size={iconSize} variant="Bold" />
      </ToolbarButton>

      <ToolbarButton
        active={editor.isActive('italic')}
        onClick={() => editor.chain().focus().toggleItalic().run()}
        disabled={disabled}
        tooltip="Italic (Ctrl+I)"
      >
        <TextItalic size={iconSize} variant="Bold" />
      </ToolbarButton>

      <ToolbarButton
        active={editor.isActive('underline')}
        onClick={() => editor.chain().focus().toggleUnderline().run()}
        disabled={disabled}
        tooltip="Underline (Ctrl+U)"
      >
        <TextUnderline size={iconSize} variant="Bold" />
      </ToolbarButton>

      <ToolbarButton
        active={editor.isActive('strike')}
        onClick={() => editor.chain().focus().toggleStrike().run()}
        disabled={disabled}
        tooltip="Strikethrough"
      >
        <TextStrikethrough size={iconSize} variant="Bold" />
      </ToolbarButton>

      <ToolbarButton
        active={editor.isActive('highlight')}
        onClick={() => editor.chain().focus().toggleHighlight().run()}
        disabled={disabled}
        tooltip="Highlight"
      >
        <Highlighter size={iconSize} variant="Bold" />
      </ToolbarButton>

      <ToolbarDivider orientation="vertical" />

      {/* Lists */}
      <ToolbarButton
        active={editor.isActive('bulletList')}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        disabled={disabled}
        tooltip="Bullet List"
      >
        <Firstline size={iconSize} variant="Bold" />
      </ToolbarButton>

      <ToolbarButton
        active={editor.isActive('orderedList')}
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        disabled={disabled}
        tooltip="Numbered List"
      >
        <TaskSquare size={iconSize} variant="Bold" />
      </ToolbarButton>

      <ToolbarDivider orientation="vertical" />

      {/* Alignment */}
      <ToolbarButton
        active={editor.isActive({ textAlign: 'left' })}
        onClick={() => editor.chain().focus().setTextAlign('left').run()}
        disabled={disabled}
        tooltip="Align Left"
      >
        <TextalignLeft size={iconSize} variant="Bold" />
      </ToolbarButton>

      <ToolbarButton
        active={editor.isActive({ textAlign: 'center' })}
        onClick={() => editor.chain().focus().setTextAlign('center').run()}
        disabled={disabled}
        tooltip="Align Center"
      >
        <TextalignCenter size={iconSize} variant="Bold" />
      </ToolbarButton>

      <ToolbarButton
        active={editor.isActive({ textAlign: 'right' })}
        onClick={() => editor.chain().focus().setTextAlign('right').run()}
        disabled={disabled}
        tooltip="Align Right"
      >
        <TextalignRight size={iconSize} variant="Bold" />
      </ToolbarButton>

      <ToolbarDivider orientation="vertical" />

      {/* Block Elements */}
      <ToolbarButton
        active={editor.isActive('blockquote')}
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
        disabled={disabled}
        tooltip="Quote"
      >
        <Quote size={iconSize} variant="Bold" />
      </ToolbarButton>

      <ToolbarButton
        onClick={() => editor.chain().focus().setHorizontalRule().run()}
        disabled={disabled}
        tooltip="Horizontal Rule"
      >
        <Minus size={iconSize} variant="Bold" />
      </ToolbarButton>

      <ToolbarDivider orientation="vertical" />

      {/* Undo/Redo */}
      <ToolbarButton
        onClick={() => editor.chain().focus().undo().run()}
        disabled={disabled || !editor.can().undo()}
        tooltip="Undo (Ctrl+Z)"
      >
        <Undo size={iconSize} variant="Bold" />
      </ToolbarButton>

      <ToolbarButton
        onClick={() => editor.chain().focus().redo().run()}
        disabled={disabled || !editor.can().redo()}
        tooltip="Redo (Ctrl+Y)"
      >
        <Redo size={iconSize} variant="Bold" />
      </ToolbarButton>
    </>
  );

  // Full toolbar - all features
  const fullTools = (
    <>
      {clinicalTools}

      <ToolbarDivider orientation="vertical" />

      {/* Code */}
      <ToolbarButton
        active={editor.isActive('code')}
        onClick={() => editor.chain().focus().toggleCode().run()}
        disabled={disabled}
        tooltip="Inline Code"
      >
        <Code size={iconSize} variant="Bold" />
      </ToolbarButton>
    </>
  );

  const renderToolbar = () => {
    switch (variant) {
      case 'minimal':
        return minimalTools;
      case 'full':
        return fullTools;
      case 'clinical':
      default:
        return clinicalTools;
    }
  };

  return <ToolbarWrapper>{renderToolbar()}</ToolbarWrapper>;
};

export default Toolbar;
