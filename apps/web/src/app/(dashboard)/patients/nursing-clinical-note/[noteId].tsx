import { useParams } from 'next/navigation';
import NursingClinicalNotePage from 'views/patients-views/NursingClinicalNotePage';

const NoteIdWrapper = () => {
  const params = useParams();
  const noteId = Array.isArray(params.noteId) ? parseInt(params.noteId[0], 10) : parseInt(params.noteId, 10);

  return <NursingClinicalNotePage noteId={noteId} />;
};

export default NoteIdWrapper;
