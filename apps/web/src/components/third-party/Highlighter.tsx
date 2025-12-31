'use client';

import { useState } from 'react';

// MATERIAL - UI
import Box from '@mui/material/Box';
import CardActions from '@mui/material/CardActions';
import Collapse from '@mui/material/Collapse';
import Divider from '@mui/material/Divider';
import Tooltip from '@mui/material/Tooltip';

// THIRD - PARTY

// PROJECT IMPORTS
import IconButton from 'components/@extended/IconButton';

// ASSETS
import { Code, } from 'iconsax-react';

// ==============================|| CLIPBOARD & HIGHLIGHTER   ||============================== //

interface Props {
  codeString: string;
  codeHighlight: boolean;
}

const Highlighter = ({ codeString, codeHighlight }: Props) => {
  const [highlight, setHighlight] = useState(codeHighlight);

  return (
    <>
      <CardActions sx={{ justifyContent: 'flex-end' }}>
        <Box sx={{ display: 'flex' }}>
          {/* <CopyToClipboard text={codeString}>
            <Tooltip title="Copy the source" placement="top-end">
              <IconButton color="secondary" size="small">
                <Copy />
              </IconButton>
            </Tooltip>
          </CopyToClipboard> */}
          <Divider orientation="vertical" variant="middle" flexItem sx={{ mx: 1 }} />
          <Tooltip title="Show the source" placement="top-end">
            <IconButton
              sx={{ fontSize: '0.875rem' }}
              size="small"
              color={highlight ? 'primary' : 'secondary'}
              onClick={() => setHighlight(!highlight)}
            >
              <Code />
            </IconButton>
          </Tooltip>
        </Box>
      </CardActions>
      <Collapse in={highlight}></Collapse>
    </>
  );
};

export default Highlighter;
