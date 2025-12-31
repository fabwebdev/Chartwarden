'use client';

import { useState, useRef, useCallback } from 'react';

// MATERIAL - UI
import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import Alert from '@mui/material/Alert';

// PROJECT IMPORTS
import MainCard from 'components/MainCard';
import RichTextEditor, { RichTextEditorRef } from 'components/@extended/RichTextEditor';
import { clinicalTemplates } from 'components/@extended/RichTextEditor/templates';

// ==============================|| RICH TEXT EDITOR TEST PAGE ||============================== //

const RichTextEditorTestPage = () => {
  const editorRef = useRef<RichTextEditorRef>(null);
  const [content, setContent] = useState<string>('');
  const [plainText, setPlainText] = useState<string>('');
  const [lastAction, setLastAction] = useState<string>('');

  const handleChange = useCallback((html: string, text: string) => {
    setContent(html);
    setPlainText(text);
    setLastAction('Content changed');
  }, []);

  const handleClear = () => {
    editorRef.current?.clearContent();
    setLastAction('Content cleared');
  };

  const handleGetContent = () => {
    const html = editorRef.current?.getHTML();
    const text = editorRef.current?.getText();
    setLastAction(`Got content: ${text?.length || 0} characters`);
    console.log('HTML:', html);
    console.log('Text:', text);
  };

  const handleFocus = () => {
    editorRef.current?.focus();
    setLastAction('Editor focused');
  };

  return (
    <Grid container spacing={3}>
      <Grid item xs={12}>
        <MainCard title="Rich Text Editor Component Test">
          <Alert severity="info" sx={{ mb: 3 }}>
            This page is for testing the RichTextEditor component. It demonstrates formatting, templates, and character limits.
          </Alert>

          <Box data-testid="rich-text-editor-container">
            <RichTextEditor
              ref={editorRef}
              label="Clinical Documentation"
              placeholder="Enter your clinical notes here..."
              onChange={handleChange}
              templates={clinicalTemplates}
              showTemplates={true}
              showToolbar={true}
              toolbarVariant="clinical"
              characterLimit={5000}
              showCharacterCount={true}
              minHeight={200}
              maxHeight={400}
              required
              helperText="Use formatting tools to structure your clinical notes"
              id="test-editor"
              name="clinical-notes"
            />
          </Box>

          <Stack direction="row" spacing={2} sx={{ mt: 3 }}>
            <Button
              variant="contained"
              onClick={handleGetContent}
              data-testid="get-content-btn"
            >
              Get Content
            </Button>
            <Button
              variant="outlined"
              onClick={handleClear}
              data-testid="clear-btn"
            >
              Clear
            </Button>
            <Button
              variant="text"
              onClick={handleFocus}
              data-testid="focus-btn"
            >
              Focus Editor
            </Button>
          </Stack>

          {lastAction && (
            <Typography variant="caption" color="text.secondary" sx={{ mt: 2, display: 'block' }}>
              Last action: {lastAction}
            </Typography>
          )}
        </MainCard>
      </Grid>

      <Grid item xs={12} md={6}>
        <MainCard title="HTML Output">
          <Box
            component="pre"
            sx={{
              p: 2,
              bgcolor: 'grey.100',
              borderRadius: 1,
              overflow: 'auto',
              maxHeight: 300,
              fontSize: '0.75rem',
              fontFamily: 'monospace'
            }}
            data-testid="html-output"
          >
            {content || '<empty>'}
          </Box>
        </MainCard>
      </Grid>

      <Grid item xs={12} md={6}>
        <MainCard title="Plain Text Output">
          <Box
            component="pre"
            sx={{
              p: 2,
              bgcolor: 'grey.100',
              borderRadius: 1,
              overflow: 'auto',
              maxHeight: 300,
              fontSize: '0.75rem',
              fontFamily: 'monospace',
              whiteSpace: 'pre-wrap'
            }}
            data-testid="text-output"
          >
            {plainText || '<empty>'}
          </Box>
        </MainCard>
      </Grid>

      <Grid item xs={12}>
        <MainCard title="Minimal Toolbar Variant">
          <RichTextEditor
            placeholder="Minimal editor with basic formatting only..."
            toolbarVariant="minimal"
            showTemplates={false}
            showCharacterCount={false}
            minHeight={100}
          />
        </MainCard>
      </Grid>

      <Grid item xs={12}>
        <MainCard title="Disabled Editor">
          <RichTextEditor
            value="<p>This editor is <strong>disabled</strong> and cannot be edited.</p>"
            disabled
            showTemplates={false}
            minHeight={80}
          />
        </MainCard>
      </Grid>

      <Grid item xs={12}>
        <MainCard title="Read-Only Editor">
          <RichTextEditor
            value="<p>This editor is <em>read-only</em> but content is visible.</p>"
            readOnly
            showTemplates={false}
            minHeight={80}
          />
        </MainCard>
      </Grid>

      <Grid item xs={12}>
        <MainCard title="Error State">
          <RichTextEditor
            placeholder="This field has an error..."
            error
            helperText="This field is required and must contain valid clinical documentation."
            showTemplates={false}
            minHeight={80}
          />
        </MainCard>
      </Grid>
    </Grid>
  );
};

export default RichTextEditorTestPage;
