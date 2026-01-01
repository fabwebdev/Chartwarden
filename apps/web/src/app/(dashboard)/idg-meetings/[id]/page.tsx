'use client';

import { useParams } from 'next/navigation';
// PROJECT IMPORTS
import IdgMeetingFormPage from 'views/idg-meetings/IdgMeetingFormPage';

// ==============================|| EDIT IDG MEETING PAGE ||============================== //

const EditIdgMeetingPage = () => {
  const params = useParams();
  const id = params?.id as string;

  return <IdgMeetingFormPage meetingId={id} />;
};

export default EditIdgMeetingPage;
