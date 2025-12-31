'use client';
// MATERIAL - UI
import Typography from '@mui/material/Typography';

// TYPES
import { Accordion, AccordionDetails, AccordionSummary } from '@mui/material';

// STYLES & constant

// ==============================|| ACCOUNT PROFILE - PERSONAL ||============================== //

const CarePlanPage = () => {
  return (
    <>
    <Accordion>
    <AccordionSummary aria-controls="panel1d-content" id="panel1d-header">
      <Typography variant="h6">Nursing</Typography>
    </AccordionSummary>
    <AccordionDetails>
      <Typography>
        Lorem ipsum dolor sit amet, consectetur adipiscing elit. Suspendisse malesuada lacus ex, sit amet blandit leo lobortis eget.
        Lorem ipsum dolor sit amet, consectetur adipiscing elit. Suspendisse malesuada lacus ex, sit amet blandit leo lobortis eget.
      </Typography>
    </AccordionDetails>
  </Accordion>
  <Accordion>
    <AccordionSummary aria-controls="panel2d-content" id="panel2d-header">
      <Typography variant="h6">Hospice Aide</Typography>
    </AccordionSummary>
    <AccordionDetails>
      <Typography>
        Lorem ipsum dolor sit amet, consectetur adipiscing elit. Suspendisse malesuada lacus ex, sit amet blandit leo lobortis eget.
        Lorem ipsum dolor sit amet, consectetur adipiscing elit. Suspendisse malesuada lacus ex, sit amet blandit leo lobortis eget.
      </Typography>
    </AccordionDetails>
  </Accordion>
  <Accordion>
    <AccordionSummary aria-controls="panel3d-content" id="panel3d-header">
      <Typography variant="h6">Social Work</Typography>
    </AccordionSummary>
    <AccordionDetails>
      <Typography>
        Lorem ipsum dolor sit amet, consectetur adipiscing elit. Suspendisse malesuada lacus ex, sit amet blandit leo lobortis eget.
        Lorem ipsum dolor sit amet, consectetur adipiscing elit. Suspendisse malesuada lacus ex, sit amet blandit leo lobortis eget.
      </Typography>
    </AccordionDetails>
  </Accordion>
  <Accordion>
    <AccordionSummary aria-controls="panel4d-content" id="panel4d-header">
      <Typography variant="h6">Chaplain</Typography>
    </AccordionSummary>
    <AccordionDetails>
      <Typography>
        Lorem ipsum dolor sit amet, consectetur adipiscing elit. Suspendisse malesuada lacus ex, sit amet blandit leo lobortis eget.
        Lorem ipsum dolor sit amet, consectetur adipiscing elit. Suspendisse malesuada lacus ex, sit amet blandit leo lobortis eget.
      </Typography>
    </AccordionDetails>
  </Accordion>
  <Accordion>
    <AccordionSummary aria-controls="panel5d-content" id="panel5d-header">
      <Typography variant="h6">Therapy</Typography>
    </AccordionSummary>
    <AccordionDetails>
      <Typography>
        Lorem ipsum dolor sit amet, consectetur adipiscing elit. Suspendisse malesuada lacus ex, sit amet blandit leo lobortis eget.
        Lorem ipsum dolor sit amet, consectetur adipiscing elit. Suspendisse malesuada lacus ex, sit amet blandit leo lobortis eget.
      </Typography>
    </AccordionDetails>
  </Accordion>

    </>
  );
};

export default CarePlanPage;
