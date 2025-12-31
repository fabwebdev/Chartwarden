import {
  Grid,
  Stack,
  InputLabel,
  FormControlLabel,
  Checkbox,
  TextField,
  InputAdornment,
  Typography,
  MenuItem,
  Select,
  FormControl,
  RadioGroup,
  Radio,
  OutlinedInput
} from '@mui/material';
import { useState } from 'react';
import AuthService from 'types/AuthService';
import http from '../../../hooks/useCookie';
import { useEffect } from 'react';

const ensureArray = <T = any>(payload: any): T[] => {
  if (Array.isArray(payload)) {
    return payload;
  }
  if (payload && Array.isArray(payload.data)) {
    return payload.data;
  }
  return [];
};

const getOptionLabel = (option: any): string => {
  if (!option) return '';
  return (
    option.value ??
    option.label ??
    option.name ??
    option.title ??
    option.text ??
    ''
  );
};

const PainPage = ({ id }: { id: string })=> {

  const [ratedByData, setRatedByData] = useState<{ id: string; value: string }[]>([]);
  const [painRatingScaleData, setPainRatingScaleData] = useState<{ id: string; value: string }[]>([]);
  const [painDurationData, setPainDurationData] = useState<{ id: string; value: string }[]>([]);
  const [painFrequencyData, setPainFrequencyData] = useState<{ id: string; value: string }[]>([]);
  const [painObservationsData, setPainObservationsData] = useState<{ id: string; value: string }[]>([]);
  const [painWorsenedByData, setPainWorsenedByData] = useState<{ id: string; value: string }[]>([]);
  const [painCharacterData, setPainCharacterData] = useState<{ id: string; value: string }[]>([]);
  const [painRelievedByData, setPainRelievedByData] = useState<{ id: string; value: string }[]>([]);
  const [effectsOnFunctionData, setEffectsOnFunctionData] = useState<{ id: string; value: string }[]>([]);
  const [breakthroughPainData, setBreakthroughPainData] = useState<{ id: string; value: string }[]>([]);
  const [negativeVocalizationData, setNegativeVocalizationData] = useState<{ id: string; value: string }[]>([]);
  const [facialExpressionData, setFacialExpressionData] = useState<{ id: string; value: string }[]>([]);
  const [bodyLanguageData, setBodyLanguageData] = useState<{ id: string; value: string }[]>([]);
  const [consolabilityData, setConsolabilityData] = useState<{ id: string; value: string }[]>([]);
  const [breathingData, setBreathingData] = useState<{ id: string; value: string }[]>([]);
  const [cryData, setCryData] = useState<{ id: string; value: string }[]>([]);
  const [activityData, setActivityData] = useState<{ id: string; value: string }[]>([]);
  const [faceData, setFaceData] = useState<{ id: string; value: string }[]>([]);
  const [legsData, setLegsData] = useState<{ id: string; value: string }[]>([]);
  const [consolabilityBodyData, setConsolabilityBodyData] = useState<{ id: string; value: string }[]>([]);
  const [painSeverityData, setPainSeverityData] = useState<{ id: string; value: string }[]>([]);
  const [standardizedPainToolData, setStandardizedPainToolData] = useState<{ id: string; value: string }[]>([]);
  const [comprehensivePainIncludedData, setComprehensivePainIncludedData] = useState<{ id: string; value: string }[]>([]);
 

  const [checkedRatedBy, setCheckedRatedBy] = useState<{ [key: string]: boolean }>({});
  const [checkedPainRatingScale, setCheckedPainRatingScale] = useState<{ [key: string]: boolean }>({});
  const [checkedPainDuration, setCheckedPainDuration] = useState<{ [key: string]: boolean }>({});
  const [checkedPainFrequency, setCheckedPainFrequency] = useState<{ [key: string]: boolean }>({});
  const [checkedPainObservations, setCheckedPainObservations] = useState<{ [key: string]: boolean }>({});
  const [checkedPainWorsenedBy, setCheckedPainWorsenedBy] = useState<{ [key: string]: boolean }>({});
  const [checkedPainCharacter, setCheckedPainCharacter] = useState<{ [key: string]: boolean }>({});
  const [checkedPainRelievedBy, setCheckedPainRelievedBy] = useState<{ [key: string]: boolean }>({});
  const [checkedEffectsOnFunction, setCheckedEffectsOnFunction] = useState<{ [key: string]: boolean }>({});
  const [checkedBreakthroughPain, setCheckedBreakthroughPain] = useState<{ [key: string]: boolean }>({});
  const [checkedComprehensivePainIncluded, setCheckedComprehensivePainIncluded] = useState<{ [key: string]: boolean }>({});
  const { permissions} = AuthService();
  const hasPermission = (permission: any) => {
    return permissions.includes(permission);
  };
  const canEditPainHope =
    hasPermission('pain_screening_assessment_section_pain_hope_edit') || hasPermission('update:patient');

  const [faceScore, setFaceScore] = useState(0);
  const [legsScore, setLegsScore] = useState(0);
  const [activityScore, setActivityScore] = useState(0);
  const [cryScore, setCryScore] = useState(0);
  const [consolabilityScore, setConsolabilityScore] = useState(0);
  const [breathingScore, setBreathingScore] = useState(0);
  const [vocalizationScore, setVocalizationScore] = useState(0);
  const [facialScore, setFacialScore] = useState(0);
  const [bodyScore, setBodyScore] = useState(0);
  const [consolabilityBodyScore, setConsolabilityBodyScore] = useState(0);

  const [painVitalSignsData, setPainVitalSignsData] = useState({
    patient_id: id,
    temperature_fahrenheit: '',
    temperature_method: '',
    heart_rate: '',
    heart_rhythm: '',
    heart_rate_location: '',
    respiratory_rate: '',
    respiratory_rhythm: '',
    blood_pressure_systolic: '',
    blood_pressure_diastolic: '',
    bp_location: '',
    bp_position: '',
    bp_additional_details: '',
    pulse_oximetry: '',
    pulse_ox_location: '',
    pulse_ox_other_location: '',
    bmi: '',
    bmi_percentile: '',
    body_height_inches: '',
    body_weight_lbs: '',
    body_weight_kg: '',
    weight_source: '',
    abdominal_girth_cm: '',
    abdominal_girth_location: '',
    body_height_cm: '',
    body_height_location: ''
  });

  const [painScalesToolsLabData, setPainScalesToolsLabData] = useState({
    patient_id: id,
    mid_arm_circumference: '',
    mid_thigh_circumference: '',
    sleep_hours: '',
    fast: '',
    nyha: '',
    pps: '',
    blood_sugar: '',
    pt_inr: '',
    other_reading_2: '',
    other_reading_3: '',
    other_reading_4: ''
  });   

  const [painAssessmentInDementiaScaleStore, setPainAssessmentInDementiaScaleStore] = useState({
    patient_id: id,
    breathing: '',
    vocalization: '',
    facial_expression: '',
    body_language: '',
    consolability: '',
    total_score: ''
  });

  const [flaccBehavioralPain, setFlaccBehavioralPain] = useState({
    patient_id: id,
    face: '',
    legs: '',
    activity: '',
    cry: '',
    consolability: '',
    total_score: '' 
  });

  const [painScreening, setPainScreening] = useState({
    patient_id: id,
    patient_screened: '',
    date_of_first_pain: '',
    pain_severity: '',
    standardized_tool_pain_used: '',
    comprehensive_pain_included: ''
  });

  const [painActiveProblem, setPainActiveProblem] = useState({
    patient_id: id,
    pain_active_problem_patient: '',
    comments: '',
  });

  const [painSummaryInterventionsGoalsData, setPainSummaryInterventionsGoalsData] = useState({
    patient_id: id,
    summary_of_problem: '',
    pain_interventions_administer_medication: '',
    pain_interventions_administer_medication_start_date: '',
    pain_interventions_assess_effectiveness: '',
    pain_interventions_assess_effectiveness_start_date: '',
    pain_interventions_assess_pain_status: '',
    pain_interventions_assess_pain_status_start_date: '',
    pain_interventions_non_pharmacological: '',
    pain_interventions_non_pharmacological_start_date: '',
    pain_goals_caregiver: '',
    pain_goals_rating: '',
    pain_goals_start_date: '',
    pain_goals_end_date: '',
    pain_caregiver_discussion_methods: '',
    pain_achive_by_date: '',
    pain_achive_by_date_start_date: '',
  });

  const [comprehensivePainAssessment, setComprehensivePainAssessment] = useState({
    patient_id: id,
    comprehensive_pain: '',
    date_of_assessment: '',
    comprehensive_pain_included: [] as string[], // Initialize as string array
    comments: ''
  });

  const [painLevelSeverityStore, setPainLevelSeverityStore] = useState({
    patient_id: id,
    pain_level_now: '',
    acceptable_level_of_pain: '',
    primary_pain_site: '',
    worst_pain_level: '',
    best_pain_level: ''
  });

  const ratedBy = async () => {
    http
      .get(`/pain-type/rated-by`)
      .then((response: any) => {
        console.log('ratedByData', response.data);
        setRatedByData(ensureArray(response.data));
      })
      .catch((error: any) => {});
  };

  const painRatingScale = async () => {
    http
      .get(`/pain-type/rating-scale-used`)
      .then((response: any) => {
        console.log('painRatingScaleData', response.data);
        setPainRatingScaleData(ensureArray(response.data));
      })
      .catch((error: any) => {});
  };

  const painDuration = async () => {
    http
      .get(`/pain-type/duration`)
      .then((response: any) => {
        console.log('painDurationData', response.data);
        setPainDurationData(ensureArray(response.data));
      })
      .catch((error: any) => {});
  };

  const painFrequency = async () => {
    http
      .get(`/pain-type/frequency`)
      .then((response: any) => {
        console.log('painFrequencyData', response.data);
        setPainFrequencyData(ensureArray(response.data));
      })
      .catch((error: any) => {});
  };

  const painObservations = async () => {
    http
      .get(`/pain-type/observation`)
      .then((response: any) => {
        console.log('painObservationsData', response.data);
        setPainObservationsData(ensureArray(response.data));
      })
      .catch((error: any) => {});
  };

  const painWorsenedBy = async () => {
    http
      .get(`/pain-type/worsened`)
      .then((response: any) => {
        console.log('painWorsenedByData', response.data);
        setPainWorsenedByData(ensureArray(response.data));
      })
      .catch((error: any) => {});
  };

  const painCharacter = async () => {
    http
      .get(`/pain-type/character`)
      .then((response: any) => {
        console.log('painCharacterData', response.data);
        setPainCharacterData(ensureArray(response.data));
      })
      .catch((error: any) => {});
  };

  const painRelievedBy = async () => {
    http
      .get(`/pain-type/relieved-by`)
      .then((response: any) => {
        console.log('painRelievedByData', response.data);
        setPainRelievedByData(ensureArray(response.data));
      })
      .catch((error: any) => {});
  };

  const effectsOnFunction = async () => {
    http
      .get(`/pain-type/effects-on-function`)
      .then((response: any) => {
        console.log('effectsOnFunctionData', response.data);
        setEffectsOnFunctionData(ensureArray(response.data));
      })
      .catch((error: any) => {});
  };

  const negativeVocalization = async () => {
    http
      .get(`/pain-type/negative-vocalization`)
      .then((response: any) => {
        console.log('negativeVocalizationData', response.data);
        setNegativeVocalizationData(ensureArray(response.data));
      })
      .catch((error: any) => {});
  };

  const facialExpression = async () => {
    http
      .get(`/pain-type/facial-expression`)
      .then((response: any) => {
        console.log('facialExpressionData', response.data);
        setFacialExpressionData(ensureArray(response.data));
      })
      .catch((error: any) => {});
  };  

  const bodyLanguage = async () => {
    http
      .get(`/pain-type/body-language`)
      .then((response: any) => {
        console.log('bodyLanguageData', response.data);
        setBodyLanguageData(ensureArray(response.data));
        })
      .catch((error: any) => {console.log('error', error)});
  };

  const consolability = async () => {
    http
      .get(`/pain-type/consolability`)
      .then((response: any) => {
        console.log('consolabilityData', response.data);
        setConsolabilityData(ensureArray(response.data));
      })
      .catch((error: any) => {});
  };

  const breathing = async () => {
    http
      .get(`/pain-type/breathing`)
      .then((response: any) => {
        console.log('breathingData', response.data);
        setBreathingData(ensureArray(response.data));
      })
      .catch((error: any) => {});
  };

  const breakthroughPain = async () => {
    http
      .get(`/pain-type/breakthrough`)
      .then((response: any) => {
        console.log('breakthroughPainData', response.data);
        setBreakthroughPainData(ensureArray(response.data));
      })
      .catch((error: any) => {});
  };

  const cry = async () => {
    http
      .get(`/pain-type/cry`)
      .then((response: any) => {
        console.log('cryData', response.data);
        setCryData(ensureArray(response.data));
      })
      .catch((error: any) => {});
  };

  const activity = async () => {
    http
      .get(`/pain-type/activity`)
      .then((response: any) => {
        console.log('activityData', response.data);
        setActivityData(ensureArray(response.data));
      })
      .catch((error: any) => {});
  };

  const face = async () => {
    http
      .get(`/pain-type/face`)
      .then((response: any) => {
        console.log('faceData', response.data);
        setFaceData(ensureArray(response.data));
      })
      .catch((error: any) => {});
  };

  const legs = async () => {
    http
      .get(`/pain-type/legs`)
      .then((response: any) => {
        console.log('legsData', response.data);
        setLegsData(ensureArray(response.data));
      })
      .catch((error: any) => {});
  };

 const consolabilityBody = async () => {
  http
    .get(`/pain-type/flaacc-behavioral-consolability`)
    .then((response: any) => {
      console.log('consolabilityBodyData', response.data);
      setConsolabilityBodyData(ensureArray(response.data));
    })
    .catch((error: any) => {});
 };
const painSeverity = async () => {
  http
    .get(`/pain-type/pain-serverity`)
    .then((response: any) => {
      console.log('painSeverityData', response.data);
      setPainSeverityData(ensureArray(response.data));
    })
    .catch((error: any) => {console.log('server', error)});
};

const standardizedPainTool = async () => {
  http
    .get(`/pain-type/standardized-pain-tool`)
    .then((response: any) => {
      console.log('standardizedPainToolData', response.data);
      setStandardizedPainToolData(ensureArray(response.data));
    })
    .catch((error: any) => {});
};

const comprehensivePainIncluded = async () => {
  http
    .get(`/pain-type/comprehensive-pain-included`)
    .then((response: any) => {
      console.log('comprehensivePainIncludedData', response.data);
      setComprehensivePainIncludedData(ensureArray(response.data));
    })
    .catch((error: any) => { console.log('comprehensivePainIncludedDataerror', error)});
};


  const PainRatedById = async () => {
    http
      .get(`/pain/pain-rated-by/${id}`)
      .then((response: any) => {
        console.log('byidff', response.data.pain_rated_by_id);
        if (response.data.pain_rated_by_id) {
          const ratedByIds = response.data.pain_rated_by_id.split(',');
          const newCheckedRatedBy: { [key: string]: boolean } = { ...checkedRatedBy };
          ratedByIds.forEach((id: string) => {
            newCheckedRatedBy[id] = true;
          });
          setCheckedRatedBy(newCheckedRatedBy);
        }
      })
      .catch((error: any) => {});
  };

  const PainRatingScaleById = async () => {
    http
      .get(`/pain/pain-rating-scale/${id}`)
      .then((response: any) => {
        if (response.data.type_of_pain_rating_scale_used_id) {
          const scaleIds = response.data.type_of_pain_rating_scale_used_id.split(',');
          const newCheckedPainRatingScale: { [key: string]: boolean } = { ...checkedPainRatingScale };
          scaleIds.forEach((id: string) => {
            newCheckedPainRatingScale[id] = true;
          });
          setCheckedPainRatingScale(newCheckedPainRatingScale);
        }
      })
      .catch((error: any) => {});
  };
  const PainDurationById = async () => {
    http
      .get(`/pain/pain-duration/${id}`)
      .then((response: any) => {
        console.log('durationById', response.data);
        if (response.data.pain_duration_id) {
          const durationIds = response.data.pain_duration_id.split(',');
          const newCheckedPainDuration: { [key: string]: boolean } = { ...checkedPainDuration };
          durationIds.forEach((id: string) => {
            newCheckedPainDuration[id] = true;
          });
          setCheckedPainDuration(newCheckedPainDuration);
        }
      })
      .catch((error: any) => {console.log('error', error)});
  };
  const PainFrequencyById = async () => {
    http
      .get(`/pain-frequency/${id}`)
      .then((response: any) => {
        console.log('frequencyById', response.data);
        if (response.data.pain_frequency_id) {
          const frequencyIds = response.data.pain_frequency_id.split(',');
          const newCheckedPainFrequency: { [key: string]: boolean } = { ...checkedPainFrequency };
          frequencyIds.forEach((id: string) => {
            newCheckedPainFrequency[id] = true;
          });
          setCheckedPainFrequency(newCheckedPainFrequency);
        }
      })
      .catch((error: any) => {});
  };
  const PainObservationsById = async () => {
    http
      .get(`/pain/pain-observation/${id}`)
      .then((response: any) => {
        console.log('observationsById', response.data);
        if (response.data.pain_observations_id) {
          const observationIds = response.data.pain_observations_id.split(',');
          const newCheckedPainObservations: { [key: string]: boolean } = { ...checkedPainObservations };
          observationIds.forEach((id: string) => {
            newCheckedPainObservations[id] = true;
          });
          setCheckedPainObservations(newCheckedPainObservations);
        }
      })
      .catch((error: any) => {});
  };
  const PainWorsenedById = async () => {
    http
      .get(`/pain/pain-worsened-by/${id}`)
      .then((response: any) => {
        console.log('worsenedById', response.data);
        if (response.data.pain_worsened_by_id) {
          const worsenedByIds = response.data.pain_worsened_by_id.split(',');
          const newCheckedPainWorsenedBy: { [key: string]: boolean } = { ...checkedPainWorsenedBy };
          worsenedByIds.forEach((id: string) => {
            newCheckedPainWorsenedBy[id] = true;
          });
          setCheckedPainWorsenedBy(newCheckedPainWorsenedBy);
        }
      })
      .catch((error: any) => {});
  };
  const PainCharacterById = async () => {
    http
      .get(`/pain/pain-character/${id}`)
      .then((response: any) => {
        console.log('characterById', response.data);
        if (response.data.pain_character_id) {
          const characterIds = response.data.pain_character_id.split(',');
          const newCheckedPainCharacter: { [key: string]: boolean } = { ...checkedPainCharacter };
          characterIds.forEach((id: string) => {
            newCheckedPainCharacter[id] = true;
          });
          setCheckedPainCharacter(newCheckedPainCharacter);
        }
      })
      .catch((error: any) => {});
  };
  const PainRelievedById = async () => {
    http
      .get(`/pain/pain-relieved-by/${id}`)
      .then((response: any) => {
        console.log('relievedById', response.data);
        if (response.data.pain_relieved_by_id) {
          const relievedByIds = response.data.pain_relieved_by_id.split(',');
          const newCheckedPainRelievedBy: { [key: string]: boolean } = { ...checkedPainRelievedBy };
          relievedByIds.forEach((id: string) => {
            newCheckedPainRelievedBy[id] = true;
          });
          setCheckedPainRelievedBy(newCheckedPainRelievedBy);
        }
      })
      .catch((error: any) => {});
  };
  const PainEffectsOnFunctionById = async () => {
    http
      .get(`/pain/pain-effects-on-function/${id}`)
      .then((response: any) => {
        console.log('effectsOnFunctionById', response.data);
        if (response.data.pain_effects_on_function_id) {
          const effectsOnFunctionIds = response.data.pain_effects_on_function_id.split(',');
          const newCheckedEffectsOnFunction: { [key: string]: boolean } = { ...checkedEffectsOnFunction };
          effectsOnFunctionIds.forEach((id: string) => {
            newCheckedEffectsOnFunction[id] = true;
          });
          setCheckedEffectsOnFunction(newCheckedEffectsOnFunction);
        }
      })
      .catch((error: any) => {});
  };
  const PainVitalSigns = async () => {
    http
      .get(`/pain/pain-vital-signs/${id}`)
      .then((response: any) => {
        console.log('painVitalSignsData', response.data);
        setPainVitalSignsData(response.data);
      })
      .catch((error: any) => {});
  };
  const PainBreakthroughById = async () => {
    http
      .get(`/pain/pain-breakthrough/${id}`)
      .then((response: any) => {
        console.log('breakthroughById', response.data);
        if (response.data.pain_breakthrough_id) {
          const breakthroughIds = response.data.pain_breakthrough_id.split(',');
          const newCheckedBreakthroughPain: { [key: string]: boolean } = { ...checkedBreakthroughPain };
          breakthroughIds.forEach((id: string) => {
            newCheckedBreakthroughPain[id] = true;
          });
          setCheckedBreakthroughPain(newCheckedBreakthroughPain);
        }
      })
      .catch((error: any) => {});
  };
 const  painAssessmentInDementiaScaleById = async () => {
  http
    .get(`/pain/pain-assessment-in-dementia-scale/${id}`)
    .then((response: any) => {
      console.log('painAssessmentInDementiaScaleById', response.data);
      setPainAssessmentInDementiaScaleStore(response.data);
    })
    .catch((error: any) => {});
 };
 const flaccBehavioralPainById = async () => {
  http
    .get(`/pain/flacc-behavioral-pain/${id}`)
    .then((response: any) => {
      console.log('flaccBehavioralPainById', response.data);
      setFlaccBehavioralPain(response.data);
    })
    .catch((error: any) => {});
 };
 const comprehensivePainIncludedById = async () => {
  http
    .get(`/pain/comprehensive-pain-assessment/${id}`)
    .then((response: any) => {
      console.log('comprehensivePainAssessmentById', response.data);
      if (response.data.comprehensive_pain_included) {
        const comprehensivePainIncludedIds = response.data.comprehensive_pain_included.split(',');
        const newCheckedComprehensivePainIncluded: { [key: string]: boolean } = { ...checkedComprehensivePainIncluded };
        comprehensivePainIncludedIds.forEach((id: string) => {
          newCheckedComprehensivePainIncluded[id] = true;
        });
        setCheckedComprehensivePainIncluded(newCheckedComprehensivePainIncluded);
      }
      setComprehensivePainAssessment(response.data);
    })
    .catch((error: any) => {});
 };
 const painScreeningById = async () => {
  http
    .get(`/pain/pain-screening/${id}`)
    .then((response: any) => {
      console.log('painScreeningById', response.data);
      setPainScreening(response.data);
    })
    .catch((error: any) => { console.log('errorScreening', error)});
 };
 
 const painActiveProblemById = async () => {
  http
    .get(`/pain/pain-active-problem/${id}`)
    .then((response: any) => {
      console.log('painActiveProblemById', response.data);
      setPainActiveProblem(response.data);
    })
    .catch((error: any) => { console.log('errorActiveProblem', error)});
 };
  const handlePainRatedBy = (ids: string) => {
      // Inverser l'état de la case cochée/décochée
      const updatedCheckedRatedBy: { [key: string]: boolean } = {
        ...checkedRatedBy,
        [ids]: !checkedRatedBy[ids]
      };
      // Mettre à jour l'état local des cases cochées
      setCheckedRatedBy(updatedCheckedRatedBy);
      // Récupérer les ID des problèmes cochés
      const selectedRatedByIds = Object.keys(updatedCheckedRatedBy).filter((key) => updatedCheckedRatedBy[key]);
      http
      .post(`/pain/pain-rated-by/store`, {
          patient_id: id,
          pain_rated_by_id: selectedRatedByIds
        })
        .then((response: any) => {
          console.log('response', response);
        })
        .catch((error: any) => {
          console.log('error', error);
        });
  }

  const handlePainRatingScale = (ids: string) => {
    const updatedCheckedPainRatingScale: { [key: string]: boolean } = {
      ...checkedPainRatingScale,
      [ids]: !checkedPainRatingScale[ids]
    };
    setCheckedPainRatingScale(updatedCheckedPainRatingScale);
    const selectedScaleIds = Object.keys(updatedCheckedPainRatingScale).filter((key) => updatedCheckedPainRatingScale[key]);
    http
      .post(`/pain/pain-rating-scale/store`, {
        patient_id: id,
        type_of_pain_rating_scale_used_id: selectedScaleIds
      })
      .then((response: any) => {
        console.log('response', response);
      })
      .catch((error: any) => {});
  }

  const handlePainDuration = (ids: string) => {
    const updatedCheckedPainDuration: { [key: string]: boolean } = {
      ...checkedPainDuration,
      [ids]: !checkedPainDuration[ids]
    };
    setCheckedPainDuration(updatedCheckedPainDuration);
    const selectedDurationIds = Object.keys(updatedCheckedPainDuration).filter((key) => updatedCheckedPainDuration[key]);
    http
      .post(`/pain/pain-duration/store`, {
        patient_id: id,
        pain_duration_id: selectedDurationIds
      })
      .then((response: any) => {
        console.log('duration', response);
      })
      .catch((error: any) => {console.log('error', error)});
  }

  const handlePainFrequency = (ids: string) => {
    const updatedCheckedPainFrequency: { [key: string]: boolean } = {
      ...checkedPainFrequency,
      [ids]: !checkedPainFrequency[ids]
    };
    setCheckedPainFrequency(updatedCheckedPainFrequency);
    const selectedFrequencyIds = Object.keys(updatedCheckedPainFrequency).filter((key) => updatedCheckedPainFrequency[key]);
    http
      .post(`/pain/pain-frequency/store`, {
        patient_id: id,
        pain_frequency_id: selectedFrequencyIds
      })
      .then((response: any) => {
        console.log('response', response);
        // Refresh data after successful save
        PainFrequencyById();  
      })
      .catch((error: any) => {}); 
  }

  const handlePainObservation = (ids: string) => {
    const updatedCheckedPainObservations: { [key: string]: boolean } = {
      ...checkedPainObservations,
      [ids]: !checkedPainObservations[ids]
    };
    setCheckedPainObservations(updatedCheckedPainObservations);
    const selectedObservationIds = Object.keys(updatedCheckedPainObservations).filter((key) => updatedCheckedPainObservations[key]);
    http
      .post(`/pain/pain-observation/store`, {
        patient_id: id,
        pain_observations_id: selectedObservationIds
      })
      .then((response: any) => {
        console.log('response', response);
        // Refresh data after successful save
        PainObservationsById();
      })
      .catch((error: any) => { console.log('error', error)});
  }

  const handlePainWorsenedBy = (ids: string) => {
    const updatedCheckedPainWorsenedBy: { [key: string]: boolean } = {
      ...checkedPainWorsenedBy,
      [ids]: !checkedPainWorsenedBy[ids]
    };
    setCheckedPainWorsenedBy(updatedCheckedPainWorsenedBy);
    const selectedWorsenedByIds = Object.keys(updatedCheckedPainWorsenedBy).filter((key) => updatedCheckedPainWorsenedBy[key]);
    http
      .post(`/pain/pain-worsened-by/store`, {
        patient_id: id,
        pain_worsened_by_id: selectedWorsenedByIds
      })
      .then((response: any) => {
        console.log('response', response);
        // Refresh data after successful save
        PainWorsenedById();
      })
      .catch((error: any) => {});
  }

  const handlePainCharacter = (ids: string) => {
    const updatedCheckedPainCharacter: { [key: string]: boolean } = {
      ...checkedPainCharacter,
      [ids]: !checkedPainCharacter[ids]
    };
    setCheckedPainCharacter(updatedCheckedPainCharacter);
    const selectedCharacterIds = Object.keys(updatedCheckedPainCharacter).filter((key) => updatedCheckedPainCharacter[key]);
    http
      .post(`/pain/pain-character/store`, {
        patient_id: id,
        pain_character_id: selectedCharacterIds
      })
      .then((response: any) => {
        console.log('response', response);
        // Refresh data after successful save
        PainCharacterById();
      })
      .catch((error: any) => {});
  }
  const handlePainRelievedBy = (ids: string) => {
    const updatedCheckedPainRelievedBy: { [key: string]: boolean } = {
      ...checkedPainRelievedBy,
      [ids]: !checkedPainRelievedBy[ids]
    };
    setCheckedPainRelievedBy(updatedCheckedPainRelievedBy);
    const selectedRelievedByIds = Object.keys(updatedCheckedPainRelievedBy).filter((key) => updatedCheckedPainRelievedBy[key]);
    http
      .post(`/pain/pain-relieved-by/store`, {
        patient_id: id,
        pain_relieved_by_id: selectedRelievedByIds
      })
      .then((response: any) => {
        console.log('response', response);
        // Refresh data after successful save
        PainRelievedById();
      })
      .catch((error: any) => {});
  }

  const handleEffectsOnFunction = (ids: string) => {
    const updatedCheckedEffectsOnFunction: { [key: string]: boolean } = {
      ...checkedEffectsOnFunction,
      [ids]: !checkedEffectsOnFunction[ids]
    };
    setCheckedEffectsOnFunction(updatedCheckedEffectsOnFunction);
    const selectedEffectsIds = Object.keys(updatedCheckedEffectsOnFunction).filter((key) => updatedCheckedEffectsOnFunction[key]);
    http
      .post(`/pain/pain-effects-on-function/store`, {
        patient_id: id,
        pain_effects_on_function_id: selectedEffectsIds
      })
      .then((response: any) => {
        console.log('response', response);
        // Refresh data after successful save
        PainEffectsOnFunctionById();
      })
      .catch((error: any) => {});
  }

  const handleBreakthroughPain = (ids: string) => {
    const updatedCheckedBreakthroughPain: { [key: string]: boolean } = {
      ...checkedBreakthroughPain,
      [ids]: !checkedBreakthroughPain[ids]
    };
    setCheckedBreakthroughPain(updatedCheckedBreakthroughPain);
    const selectedBreakthroughIds = Object.keys(updatedCheckedBreakthroughPain).filter((key) => updatedCheckedBreakthroughPain[key]);
    http
      .post(`/pain/pain-breakthrough/store`, {
        patient_id: id,
        pain_breakthrough_id: selectedBreakthroughIds
      })
      .then((response: any) => {
        console.log('response', response);
        // Refresh data after successful save
        PainBreakthroughById();
      })
      .catch((error: any) => {});
  }

  const handlePainVitalSigns = (data: any) => {
    http
      .post(`/pain/pain-vital-signs/store`, data)
      .then((response: any) => {
        console.log('response', response);
        // Refresh data after successful save
        PainVitalSigns();
        })
      .catch((error: any) => { console.log('error', error)});
  }
  const handlePainScalesToolsLabData = (data: any) => {
    http
      .post(`/pain/pain-scales-tools-lab-data-reviews/store`, data)
      .then((response: any) => {
        console.log('response', response);
        // Refresh data after successful save
        scalesToolsLabDataById();
      })
      .catch((error: any) => { console.log('error', error)});
  }
  const handleComprehensivePainIncluded    = (ids: string) => {
    const updatedCheckedComprehensivePainIncluded   : { [key: string]: boolean } = {
      ...checkedComprehensivePainIncluded,
      [ids]: !checkedComprehensivePainIncluded[ids]
    };
    setCheckedComprehensivePainIncluded(updatedCheckedComprehensivePainIncluded);
    const selectedComprehensivePainIncludedIds = Object.keys(updatedCheckedComprehensivePainIncluded).filter((key) => updatedCheckedComprehensivePainIncluded[key]);
    http
      .post(`/pain/comprehensive-pain-assessment/store`, {
        patient_id: id,
        comprehensive_pain: comprehensivePainAssessment.comprehensive_pain,
        date_of_assessment: comprehensivePainAssessment.date_of_assessment,
        comments: comprehensivePainAssessment.comments,
        comprehensive_pain_included: selectedComprehensivePainIncludedIds
      })
      .then((response: any) => {
        console.log('response', response);
        // Refresh data after successful save
        comprehensivePainIncludedById();
      })
      .catch((error: any) => { console.log('comprehensiveerror', error)});
  }

  const scalesToolsLabDataById = async () => {
    http
      .get(`/pain/pain-scales-tools-lab-data-reviews/${id}`)
      .then((response: any) => {
        console.log('scalesToolsLabData', response.data);
        setPainScalesToolsLabData(response.data);
      })
      .catch((error: any) => {});
  }

  const painSummaryInterventionsGoalsById = async () => {
    http
      .get(`/pain/pain-summary-interventions-goals/${id}`)
      .then((response: any) => {
        console.log('painSummaryInterventionsGoalsData', response.data);
        setPainSummaryInterventionsGoalsData(response.data);
      })
      .catch((error: any) => {});
  };
  const painLevelSeverityById = async () => {
    http
      .get(`/pain/pain-assessment/${id}`)
      .then((response: any) => {
        console.log('painLevelSeverity', response.data);
        setPainLevelSeverityStore(response.data);
      })
      .catch((error: any) => {});
  };
  useEffect(() => {
    // Use Promise.all to fetch data in parallel
    const fetchAllData = async () => {
      try {
        await Promise.all([
          PainVitalSigns(),
          scalesToolsLabDataById(),
          PainRatedById(),
          PainRatingScaleById(), 
          PainDurationById(),
          PainFrequencyById(),
          PainObservationsById(),
          PainWorsenedById(),
          PainCharacterById(),
          PainRelievedById(),
          painLevelSeverityById(),
          PainEffectsOnFunctionById(),
          PainBreakthroughById(),
          painAssessmentInDementiaScaleById(),
          painActiveProblemById(),
          painScreeningById(),
          flaccBehavioralPainById(),
          painSummaryInterventionsGoalsById(),
          comprehensivePainIncludedById(),
          
          ratedBy(),
          painRatingScale(),
          painDuration(),
          painFrequency(),
          painObservations(),
          painWorsenedBy(),
          painCharacter(),
          painRelievedBy(),
          effectsOnFunction(),
          breakthroughPain(),
          negativeVocalization(),
          facialExpression(),
          bodyLanguage(),
          consolability(),
          breathing(),
          cry(),
          activity(),
          face(),
          legs(),
          consolabilityBody(),
          painSeverity(),
          standardizedPainTool(),
          comprehensivePainIncluded()
        ]);
      } catch (error) {
        console.error('Error fetching data:', error);
      }
    };

    fetchAllData();
  }, [id]);
  return (
    <>
      <>
        
        <Grid container sx={{ p: 0 }} margin={0}>
          <Grid item xs={12}>
            <div style={{ 
              borderLeft: '5px solid #0AA369', 
              borderRadius: '5px',
              boxShadow: '0px 0px 5px 2px rgba(0, 0, 0, 0.1)',
             
            }}>
              <div style={{ backgroundColor: '#44BB769F', color: '#ffffff', borderTopRightRadius: '5px', paddingLeft: '10px' }}>
                <h2>Vital Signs</h2>
              </div>
              <Grid container spacing={3} sx={{ p: 2 }}>
                {/* Temperature & Blood Pressure Section */}
                <Grid item xs={12} md={12}>
                  <Typography variant="h5" color="dark">Body Temperature / Route:</Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        label="F - degrees fahrenheit"
                        variant="outlined"
                        InputProps={{
                          endAdornment: <InputAdornment position="end">°C</InputAdornment>
                        }}
                        value={painVitalSignsData.temperature_fahrenheit || ''}
                        onChange={(event: any) => {
                          const selected = event.target.value;
                          const newInputData= { ...painVitalSignsData, temperature_fahrenheit: selected };
                          setPainVitalSignsData(newInputData);
                          handlePainVitalSigns(newInputData);
                        }}
                      />
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <FormControl fullWidth>
                        <InputLabel>Temperature Method:</InputLabel>
                        <Select label="Method" value={painVitalSignsData.temperature_method || ''} onChange={(event: any) => {
                          const selected = event.target.value;
                          const newInputData= { ...painVitalSignsData, temperature_method: selected };
                          setPainVitalSignsData(newInputData);
                          handlePainVitalSigns(newInputData);
                        }}>
                          <MenuItem value="temporal">Temporal</MenuItem>
                          <MenuItem value="oral">Oral</MenuItem>
                          <MenuItem value="axillary">Axillary</MenuItem>
                        </Select>
                      </FormControl>
                    </Grid>
                   
                  </Grid>
                </Grid>

                {/* Heart Rate & Respiratory Section */}
                <Grid item xs={12} md={12}>
                  <Typography variant="h5" color="dark" gutterBottom>Heart Rate</Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={12} md={3}>
                      <TextField
                        fullWidth
                        label="Heart Rate"
                        variant="outlined"
                        InputProps={{
                          endAdornment: <InputAdornment position="end">breaths/min</InputAdornment>
                        }}
                        value={painVitalSignsData.heart_rate || ''}
                        onChange={(event: any) => {
                          const selected = event.target.value;
                          const newInputData= { ...painVitalSignsData, heart_rate: selected };
                          setPainVitalSignsData(newInputData);
                          handlePainVitalSigns(newInputData);
                        }}
                      />
                    </Grid>
                    <Grid item xs={12} md={3} >
                      <FormControl fullWidth>
                        <InputLabel>Heart Rhythm</InputLabel>
                        <Select label="Method" value={painVitalSignsData.heart_rhythm || ''} onChange={(event: any) => {
                          const selected = event.target.value;
                          const newInputData= { ...painVitalSignsData, heart_rhythm: selected };
                          setPainVitalSignsData(newInputData);
                          handlePainVitalSigns(newInputData);
                        }}>
                          <MenuItem value="temporal">Regular</MenuItem>
                          <MenuItem value="oral">Irregular</MenuItem>
                        </Select>
                      </FormControl>
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <FormControl fullWidth>
                        <InputLabel>Heart Rate Location</InputLabel>
                        <Select label="Method" value={painVitalSignsData.heart_rate_location || ''} onChange={(event: any) => {
                          const selected = event.target.value;
                          const newInputData= { ...painVitalSignsData, heart_rate_location: selected };
                          setPainVitalSignsData(newInputData);
                          handlePainVitalSigns(newInputData);
                        }}>
                          <MenuItem value="Apical">Apical</MenuItem>
                          <MenuItem value="Radial">Radial</MenuItem>
                          <MenuItem value="Other">Other</MenuItem>
                        </Select>
                      </FormControl>
                    </Grid>
                   
                  </Grid>
                    
                </Grid>
                <Grid item xs={12} md={12}>
                    <Typography variant="h5" color="dark" gutterBottom>Respiratory Rate:</Typography>
                <Grid container spacing={2}>
                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        label="Respiratory Rate"
                        variant="outlined"
                        InputProps={{
                          endAdornment: <InputAdornment position="end">breaths/min</InputAdornment>
                        }}
                        value={painVitalSignsData.respiratory_rate || ''}
                        onChange={(event: any) => {
                          const selected = event.target.value;
                          const newInputData= { ...painVitalSignsData, respiratory_rate: selected };
                          setPainVitalSignsData(newInputData);
                          handlePainVitalSigns(newInputData);
                        }}
                      />
                    </Grid>
                   
                    <Grid item xs={12} md={6}>

                    <FormControl fullWidth>
                        <InputLabel>Respiratory Rhythm:</InputLabel>
                        <Select label="Method" value={painVitalSignsData.respiratory_rhythm || ''} onChange={(event: any) => {
                          const selected = event.target.value;
                          const newInputData= { ...painVitalSignsData, respiratory_rhythm: selected };
                          setPainVitalSignsData(newInputData);
                          handlePainVitalSigns(newInputData);
                        }}>
                          <MenuItem value="temporal">Regular</MenuItem>
                          <MenuItem value="oral">Irregular</MenuItem>
                        </Select>
                      </FormControl>
                    </Grid>
                    </Grid>
                </Grid>
                <Grid item xs={12} md={12}>
                    <Typography variant="h5" color="dark">Blood Pressure-Systolic /Diastolic</Typography>
                    <Grid container spacing={2}>
                    <Grid item xs={12} md={3}>
                      <TextField
                        fullWidth
                        label="mmHg"
                        variant="outlined"
                        InputProps={{
                          endAdornment: <InputAdornment position="end">mmHg</InputAdornment>
                        }}
                        value={painVitalSignsData.blood_pressure_systolic || ''}
                        onChange={(event: any) => {
                          const selected = event.target.value;
                          const newInputData= { ...painVitalSignsData, blood_pressure_systolic: selected };
                          setPainVitalSignsData(newInputData);
                          handlePainVitalSigns(newInputData);
                        }}
                      />
                    </Grid>
                   
                    <Grid item xs={12} md={3}>

                    <FormControl fullWidth>
                        <InputLabel>BP Location:</InputLabel>
                        <Select label="Method" value={painVitalSignsData.bp_location || ''} onChange={(event: any) => {
                          const selected = event.target.value;
                          const newInputData= { ...painVitalSignsData, bp_location: selected };
                          setPainVitalSignsData(newInputData);
                          handlePainVitalSigns(newInputData);
                        }}>
                          <MenuItem value="L_Arm">L Arm</MenuItem>
                          <MenuItem value="R_Arm">R Arm</MenuItem>
                          <MenuItem value="other">Other</MenuItem>
                        </Select>
                      </FormControl>
                    </Grid>

                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        label="Position"
                        variant="outlined"
                        value={painVitalSignsData.bp_position || ''}
                        onChange={(event: any) => {
                          const selected = event.target.value;
                          const newInputData= { ...painVitalSignsData, bp_position: selected };
                          setPainVitalSignsData(newInputData);
                          handlePainVitalSigns(newInputData);
                        }}
                      />
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        label="Other BP Location"
                        variant="outlined"
                        value={painVitalSignsData.bp_additional_details || ''}
                        onChange={(event: any) => {
                          const selected = event.target.value;
                          const newInputData= { ...painVitalSignsData, bp_additional_details: selected };
                          setPainVitalSignsData(newInputData);
                          handlePainVitalSigns(newInputData);
                        }}
                      />
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        label="Addition Readings /Details"
                        variant="outlined"
                        value={painVitalSignsData.bp_additional_details || ''}
                        onChange={(event: any) => {
                          const selected = event.target.value;
                          const newInputData= { ...painVitalSignsData, bp_additional_details: selected };
                          setPainVitalSignsData(newInputData);
                          handlePainVitalSigns(newInputData);
                        }}
                      />
                    </Grid>
                    </Grid>
                  </Grid>
                 
                  {/* Pulse Oximetry Section */}
                  <Grid item xs={12} md={12}>
                    <Typography variant="h5" color="dark">Pulse Oximetry:</Typography>
                    <Grid container spacing={2}>
                    <Grid item xs={12} md={3}>
                      <TextField
                        fullWidth
                        label="%"
                        variant="outlined"
                        InputProps={{
                          endAdornment: <InputAdornment position="end">%</InputAdornment>
                        }}
                        value={painVitalSignsData.pulse_oximetry || ''}
                        onChange={(event: any) => {
                          const selected = event.target.value;
                          const newInputData= { ...painVitalSignsData, pulse_oximetry: selected };
                          setPainVitalSignsData(newInputData);
                          handlePainVitalSigns(newInputData);
                        }}
                      />
                    </Grid>
                    <Grid item xs={12} md={3}>
                      <TextField
                        fullWidth
                        label="Pulse Ox Location"
                        variant="outlined"
                        value={painVitalSignsData.pulse_ox_location || ''}
                        onChange={(event: any) => {
                          const selected = event.target.value;
                          const newInputData= { ...painVitalSignsData, pulse_oximetry_location: selected };
                          setPainVitalSignsData(newInputData);
                          handlePainVitalSigns(newInputData);
                        }}
                      />
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        label="other location"
                        variant="outlined"
                        value={painVitalSignsData.pulse_ox_other_location || ''}
                        onChange={(event: any) => {
                          const selected = event.target.value;
                          const newInputData= { ...painVitalSignsData, pulse_ox_other_location: selected };
                          setPainVitalSignsData(newInputData);
                          handlePainVitalSigns(newInputData);
                        }}
                      />
                    </Grid>
                        </Grid>
                  </Grid>

                  {/* BMI Section */}
                  <Grid item xs={12} md={3}>
                    <Typography variant="h5" color="dark">BMI:</Typography>
                      <TextField
                        fullWidth
                        label="Kg/m2"
                        variant="outlined"
                        InputProps={{
                          endAdornment: <InputAdornment position="end">Kg/m2</InputAdornment>
                        }}
                        value={painVitalSignsData.bmi || ''}
                        onChange={(event: any) => {
                          const selected = event.target.value;
                          const newInputData= { ...painVitalSignsData, bmi: selected };
                          setPainVitalSignsData(newInputData);
                          handlePainVitalSigns(newInputData);
                        }}
                        />
                  </Grid>

                  {/* BMI Percentile Section */}
                  <Grid item xs={12} md={3}>
                    <Typography variant="h5" color="dark">BMI Percentile:</Typography>
                    <TextField
                        fullWidth
                        label="%"
                        variant="outlined"
                        InputProps={{
                          endAdornment: <InputAdornment position="end">%</InputAdornment>
                        }}
                        value={painVitalSignsData.bmi_percentile || ''}
                        onChange={(event: any) => {
                          const selected = event.target.value;
                          const newInputData= { ...painVitalSignsData, bmi_percentile: selected };
                          setPainVitalSignsData(newInputData);
                          handlePainVitalSigns(newInputData);
                        }}
                      />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Typography variant="h5" color="dark">Body Height:</Typography>
                    <TextField
                        fullWidth
                        label="inches"
                        variant="outlined"
                        InputProps={{
                          endAdornment: <InputAdornment position="end">inches</InputAdornment>
                        }}
                        value={painVitalSignsData.body_height_inches || ''}
                        onChange={(event: any) => {
                          const selected = event.target.value;
                          const newInputData= { ...painVitalSignsData, body_height_inches: selected };
                          setPainVitalSignsData(newInputData);
                          handlePainVitalSigns(newInputData);
                        }}
                      />
                  </Grid>

                  <Grid item xs={12} md={12}>
                    <Typography variant="h5" color="dark">Body Weight:</Typography>
                    <Grid container spacing={2}>
                    <Grid item xs={12} md={3} >
                      <TextField
                        fullWidth
                        label="lbs"
                        variant="outlined"
                        InputProps={{
                          endAdornment: <InputAdornment position="end">lbs</InputAdornment>
                        }}
                        value={painVitalSignsData.body_weight_lbs || ''}
                        onChange={(event: any) => {
                          const selected = event.target.value;
                          const newInputData= { ...painVitalSignsData, body_weight_lbs: selected };
                          setPainVitalSignsData(newInputData);
                          handlePainVitalSigns(newInputData);
                        }}
                      />
                    </Grid>
                    <Grid item xs={12} md={3} >
                      <TextField
                        fullWidth
                        label="kg"
                        variant="outlined"
                        InputProps={{
                          endAdornment: <InputAdornment position="end">kg</InputAdornment>
                        }}
                        value={painVitalSignsData.body_weight_kg || ''}
                        onChange={(event: any) => {
                          const selected = event.target.value;
                          const newInputData= { ...painVitalSignsData, body_weight_kg: selected };
                          setPainVitalSignsData(newInputData);
                          handlePainVitalSigns(newInputData);
                        }}
                      />
                    </Grid>
                    <Grid item xs={12} md={6}>
                    <FormControl fullWidth>
                        <InputLabel>Weight Source:</InputLabel>
                        <Select label="Method" value={painVitalSignsData.weight_source || ''} onChange={(event: any) => {
                          const selected = event.target.value;
                          const newInputData= { ...painVitalSignsData, weight_source: selected };
                          setPainVitalSignsData(newInputData);
                          handlePainVitalSigns(newInputData);
                        }}>
                          <MenuItem value="actual">Actual</MenuItem>
                          <MenuItem value="reported">Reported</MenuItem>
                        </Select>
                      </FormControl>
                    </Grid>
                        </Grid>
                  </Grid>

                  <Grid item xs={12} md={12}>
                    <Typography variant="h5" color="dark">Abdominal Girth:</Typography>
                    <Grid container spacing={2}>
                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        label="cm"
                        variant="outlined"
                        InputProps={{
                          endAdornment: <InputAdornment position="end">cm</InputAdornment>
                        }}
                        value={painVitalSignsData.abdominal_girth_cm || ''}
                        onChange={(event: any) => {
                          const selected = event.target.value;
                          const newInputData= { ...painVitalSignsData, abdominal_girth_cm: selected };
                          setPainVitalSignsData(newInputData);
                          handlePainVitalSigns(newInputData);
                        }}
                      />
                    </Grid>
                    <Grid item xs={12} md={6}>
                    <TextField
                        fullWidth
                        label="Measurement Location - Abdominal Girth"
                        variant="outlined"
                        value={painVitalSignsData.abdominal_girth_location || ''}
                        onChange={(event: any) => {
                          const selected = event.target.value;
                          const newInputData= { ...painVitalSignsData, abdominal_girth_location: selected };
                          setPainVitalSignsData(newInputData);
                          handlePainVitalSigns(newInputData);
                        }}
                      />
                    </Grid>
                        </Grid>
                  </Grid>
               
              </Grid>
            </div>
          </Grid>
       
        </Grid>
          
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <div style={{
                borderLeft: '5px solid #0AA369',
                borderRadius: '5px',
                boxShadow: '0px 0px 5px 2px rgba(0, 0, 0, 0.1)',
                opacity: canEditPainHope ? 1 : 0.9,
                pointerEvents: canEditPainHope ? 'auto' : 'none'
              }}>
                <div style={{ backgroundColor: '#44BB769F', color: '#ffffff', borderTopRightRadius: '5px', paddingLeft: '10px' }}>
                  <h2>Scales, Tools, & Lab Data Review</h2>
                </div>
                <Grid container spacing={3} sx={{ p: 2 }}>
                  <Grid item xs={12}>
                    <Typography variant="h5" color="dark">Scales & Tools and Value/Reading THIS VISIT:</Typography>
                    <Grid container spacing={3}>
                      <Grid item xs={12} md={6}>
                        <Typography variant="h6" color="dark">Mid Arm Circumference (MAC):</Typography>
                        <TextField
                          fullWidth
                          label="Include unit of measure / location on arm"
                          variant="outlined"
                              value={painScalesToolsLabData.mid_arm_circumference || ''}
                              onChange={(event: any) => {
                                const selected = event.target.value;
                                const newInputData= { ...painScalesToolsLabData, mid_arm_circumference: selected };
                                setPainScalesToolsLabData(newInputData);
                                handlePainScalesToolsLabData(newInputData);
                              }}
                        />
                      </Grid>
                      <Grid item xs={12} md={6}>
                        <Typography variant="h6" color="dark">Mid-Thigh Circumference (MTC):</Typography>
                        <TextField
                          fullWidth
                          label="Include unit of measure / location on thigh"
                          variant="outlined"
                          value={painScalesToolsLabData.mid_thigh_circumference || ''}
                          onChange={(event: any) => {
                            const selected = event.target.value;
                            const newInputData= { ...painScalesToolsLabData, mid_thigh_circumference: selected };
                            setPainScalesToolsLabData(newInputData);
                            handlePainScalesToolsLabData(newInputData);
                          }}
                        />
                      </Grid>
                      <Grid item xs={12} md={6}>
                        <Typography variant="h6" color="dark">SLEEP (time in last 24 hours):</Typography>
                        <TextField
                          fullWidth
                          variant="outlined"
                          value={painScalesToolsLabData.sleep_hours || ''}
                          onChange={(event: any) => {
                            const selected = event.target.value;
                            const newInputData= { ...painScalesToolsLabData, sleep_hours: selected };
                            setPainScalesToolsLabData(newInputData);
                            handlePainScalesToolsLabData(newInputData);
                          }}
                        />
                      </Grid>
                      <Grid item xs={12} md={6}>
                        <Typography variant="h6" color="dark">FAST:</Typography>
                        <TextField
                          fullWidth
                          variant="outlined"
                          value={painScalesToolsLabData.fast || ''}
                          onChange={(event: any) => {
                            const selected = event.target.value;
                            const newInputData= { ...painScalesToolsLabData, fast: selected };
                            setPainScalesToolsLabData(newInputData);
                            handlePainScalesToolsLabData(newInputData);
                          }}
                        />
                      </Grid>
                      <Grid item xs={12} md={6}>
                        <Typography variant="h6" color="dark">NYHA:</Typography>
                        <TextField
                          fullWidth
                          variant="outlined"
                          value={painScalesToolsLabData.nyha || ''}
                          onChange={(event: any) => {
                            const selected = event.target.value;
                            const newInputData= { ...painScalesToolsLabData, nyha: selected };
                            setPainScalesToolsLabData(newInputData);
                            handlePainScalesToolsLabData(newInputData);
                          }}
                        />
                      </Grid>
                      <Grid item xs={12} md={6}>
                        <Typography variant="h6" color="dark">PPS:</Typography>
                        <TextField
                          fullWidth
                          variant="outlined"
                          value={painScalesToolsLabData.pps || ''}
                          onChange={(event: any) => {
                            const selected = event.target.value;
                            const newInputData= { ...painScalesToolsLabData, pps: selected };
                            setPainScalesToolsLabData(newInputData);
                            handlePainScalesToolsLabData(newInputData);
                          }}
                        />
                      </Grid>
                    </Grid>
                  </Grid>
                  

                    <Grid item xs={12}>
                      <Typography variant="h5" color="dark">Lab (POC or Other) and Value/Reading THIS VISIT</Typography>
                    <Grid container item xs={12} spacing={3}>
                      <Grid item xs={12} md={6}>
                        <TextField
                          fullWidth
                          variant="outlined"
                          label="Blood Sugar"
                          value={painScalesToolsLabData.blood_sugar || ''}
                          onChange={(event: any) => {
                            const selected = event.target.value;
                            const newInputData= { ...painScalesToolsLabData, blood_sugar: selected };
                            setPainScalesToolsLabData(newInputData);
                            handlePainScalesToolsLabData(newInputData);
                          }}
                        />
                      </Grid>
                      <Grid item xs={12} md={6}>
                        <TextField
                          fullWidth
                          variant="outlined"
                          label="PT/INR"
                          value={painScalesToolsLabData.pt_inr || ''}
                          onChange={(event: any) => {
                            const selected = event.target.value;
                            const newInputData= { ...painScalesToolsLabData, pt_inr: selected };
                            setPainScalesToolsLabData(newInputData);
                            handlePainScalesToolsLabData(newInputData);
                          }}
                        />
                      </Grid>
                      <Grid item xs={12} md={6}>
                        <TextField
                          fullWidth
                          variant="outlined"
                          label="Other Reading 2"
                          value={painScalesToolsLabData.other_reading_2 || ''}
                          onChange={(event: any) => {
                            const selected = event.target.value;
                            const newInputData= { ...painScalesToolsLabData, other_reading_2: selected };
                            setPainScalesToolsLabData(newInputData);
                            handlePainScalesToolsLabData(newInputData);
                          }}
                        />
                      </Grid>
                      <Grid item xs={12} md={6}>
                        <TextField
                          fullWidth
                          variant="outlined"
                          label="Other Reading 3"
                          value={painScalesToolsLabData.other_reading_3 || ''}
                          onChange={(event: any) => {
                            const selected = event.target.value;
                            const newInputData= { ...painScalesToolsLabData, other_reading_3: selected };
                            setPainScalesToolsLabData(newInputData);
                            handlePainScalesToolsLabData(newInputData);
                          }}
                        />
                      </Grid>
                      <Grid item xs={12} md={6}>
                        <TextField
                          fullWidth
                          variant="outlined"  
                          label="Other Reading 4"
                          value={painScalesToolsLabData.other_reading_4 || ''}
                          onChange={(event: any) => {
                            const selected = event.target.value;
                            const newInputData= { ...painScalesToolsLabData, other_reading_4: selected };
                            setPainScalesToolsLabData(newInputData);
                            handlePainScalesToolsLabData(newInputData);
                          }}
                        />
                      </Grid>
                    </Grid>
                    </Grid>
                </Grid>
              </div>
            </Grid>
          </Grid>


          <Grid container spacing={3}>
            <Grid item xs={12}>
              <div style={{
                borderLeft: '5px solid #0AA369',
                borderRadius: '5px', 
                boxShadow: '0px 0px 5px 2px rgba(0, 0, 0, 0.1)',
                opacity: canEditPainHope ? 1 : 0.9,
                pointerEvents: canEditPainHope ? 'auto' : 'none'
              }}>
                <div style={{ backgroundColor: '#44BB769F', color: '#ffffff', borderTopRightRadius: '5px', paddingLeft: '10px' }}>
                  <h2>Pain </h2>
                </div>
                <Grid container spacing={3} sx={{ p: 3 }}>
                  <Grid item xs={12}>
                    <Typography variant="h5" color="dark">Pain level severity:</Typography>
                    <Stack direction="row" spacing={2}>
                      <Typography>1-3 = mild</Typography>
                      <Typography>4-6 = moderate</Typography> 
                      <Typography>7-10 = severe</Typography>
                    </Stack>
                  </Grid>

                  <Grid item xs={12}>
                    <Grid container spacing={2}>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          fullWidth
                              label="Worst pain level experienced"
                              value={painLevelSeverityStore.worst_pain_level} 
                              onChange={(event: any) => {
                                const selected = event.target.value;
                                const newInputData= { ...painLevelSeverityStore, worst_pain_level: selected };
                                setPainLevelSeverityStore(newInputData);
                                http.post('/pain/pain-assessment/store', newInputData)
                                  .then(response => {
                                    console.log('Saved successfully', response);
                                    // Refresh data after successful save
                                    painLevelSeverityById();
                                  })
                                  .catch(error => {
                                    console.error('Error saving:', error);
                                  }); 
                              }}
                          variant="outlined"
                        />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          fullWidth 
                          label="Acceptable level of pain"
                            value={painLevelSeverityStore.acceptable_level_of_pain} 
                            onChange={(event: any) => {
                              const selected = event.target.value;
                              const newInputData= { ...painLevelSeverityStore, acceptable_level_of_pain: selected };
                                setPainLevelSeverityStore(newInputData);
                                http.post('/pain/pain-assessment/store', newInputData)
                                  .then(response => {
                                    console.log('Saved successfully', response);
                                    // Refresh data after successful save
                                    painLevelSeverityById();
                                  })
                                  .catch(error => {
                                    console.error('Error saving:', error);
                                  });
                            }}
                          variant="outlined"
                        />
                      </Grid>
                    </Grid>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Typography variant="h5" color="dark">Pain level now:</Typography>
                    <TextField
                      fullWidth
                      variant="outlined"
                      type="number"
                      value={painLevelSeverityStore.pain_level_now} 
                      onChange={(event: any) => {
                        const selected = event.target.value;
                        const newInputData= { ...painLevelSeverityStore, pain_level_now: selected };
                        setPainLevelSeverityStore(newInputData);
                        http.post('/pain/pain-assessment/store', newInputData)
                          .then(response => {
                            console.log('Saved successfully', response);
                            // Refresh data after successful save
                            painLevelSeverityById();
                          })
                          .catch(error => {
                            console.error('Error saving:', error);
                          });
                      }}
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Typography variant="h5" color="dark">Best pain level experienced:</Typography>
                    <TextField
                      fullWidth
                      variant="outlined" 
                      type="number"
                      value={painLevelSeverityStore.best_pain_level} 
                      onChange={(event: any) => {
                        const selected = event.target.value;
                        const newInputData= { ...painLevelSeverityStore, best_pain_level: selected };
                        setPainLevelSeverityStore(newInputData);
                        http.post('/pain/pain-assessment/store', newInputData)
                          .then(response => {
                            console.log('Saved successfully', response);
                            // Refresh data after successful save
                            painLevelSeverityById();
                          })
                          .catch(error => {
                            console.error('Error saving:', error);
                          });
                      }}
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Typography variant="h5" color="dark">Primary pain site:</Typography>
                    <TextField
                      fullWidth
                      variant="outlined"
                      placeholder="e.g. Coccyx-fracture"
                      value={painLevelSeverityStore.primary_pain_site} 
                      onChange={(event: any) => {
                        const selected = event.target.value;
                        const newInputData= { ...painLevelSeverityStore, primary_pain_site: selected };
                        setPainLevelSeverityStore(newInputData);
                        http.post('/pain/pain-assessment/store', newInputData)
                          .then(response => {
                            console.log('Saved successfully', response);
                            // Refresh data after successful save
                            painLevelSeverityById();
                          })
                          .catch(error => {
                            console.error('Error saving:', error);
                          });
                      }}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <Typography variant="h5" color="dark">Pain rated by:</Typography>
                    <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
                      {ratedByData.map((item) => (
                        <FormControlLabel 
                          key={item.id}
                          control={<Checkbox checked={checkedRatedBy[item.id]} onChange={() => handlePainRatedBy(item.id)} />} 
                          label={getOptionLabel(item)}
                        />
                      ))}
                    
                    </Stack>
                  </Grid>
                  <Grid item xs={12}>
                    <Typography variant="h5" color="dark">Type of pain rating scale used:</Typography>
                    <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
                      {painRatingScaleData.map((item) => (
                        <FormControlLabel 
                          key={item.id}
                          control={<Checkbox checked={checkedPainRatingScale[item.id]} onChange={() => handlePainRatingScale(item.id)} />} 
                          label={getOptionLabel(item)}
                        />
                      ))}
                    </Stack>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Typography variant="h5" color="dark">Pain duration:</Typography>
                    <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
                      {painDurationData.map((item) => (
                        <FormControlLabel 
                          key={item.id}
                          control={<Checkbox checked={checkedPainDuration[item.id]} onChange={() => handlePainDuration(item.id)} />} 
                          label={getOptionLabel(item)}
                        />
                      ))}
                      
                    </Stack>
                  </Grid>
                  <Grid item xs={12}>
                    <Typography variant="h5" color="dark">Pain frequency:</Typography>
                    <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
                      {painFrequencyData.map((item) => (
                        <FormControlLabel 
                          key={item.id}
                          control={<Checkbox checked={checkedPainFrequency[item.id]} onChange={() => handlePainFrequency(item.id)} />} 
                          label={getOptionLabel(item)}
                        />
                      ))}
                      
                    </Stack>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Typography variant="h5" color="dark">Pain observations:</Typography>
                    <Stack  spacing={2}>
                      {painObservationsData.map((item) => (
                        <FormControlLabel 
                          key={item.id}
                          control={<Checkbox checked={checkedPainObservations[item.id]} onChange={() => handlePainObservation(item.id)} />} 
                          label={getOptionLabel(item)}
                        />
                      ))}
                    
                    </Stack>
                     
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Typography variant="h5" color="dark">Worsened by:</Typography>
                    <Stack >
                      {painWorsenedByData.map((item) => (
                        <FormControlLabel 
                          key={item.id}
                          control={<Checkbox checked={checkedPainWorsenedBy[item.id]} onChange={() => handlePainWorsenedBy(item.id)} />} 
                          label={getOptionLabel(item)}
                        />
                      ))}
                     
                    </Stack>
                  </Grid>
                  <Grid item xs={12}>
                    <Typography variant="h5" color="dark">Pain character:</Typography>
                    <Stack spacing={1}>
                      {painCharacterData.map((item) => (
                        <FormControlLabel 
                          key={item.id}
                          control={<Checkbox checked={checkedPainCharacter[item.id]} onChange={() => handlePainCharacter(item.id)} />} 
                          label={getOptionLabel(item)}
                        />
                      ))}
                    </Stack>
                  </Grid>
                
                  <Grid item xs={12} md={6}>
                    <Typography variant="h5" color="dark">Relieved by:</Typography>
                    <Stack spacing={2}>
                      <Grid container spacing={2}>
                        <Stack>
                            {painRelievedByData.map((item) => (
                              <FormControlLabel 
                                key={item.id}
                                control={<Checkbox checked={checkedPainRelievedBy[item.id]} onChange={() => handlePainRelievedBy(item.id)} />} 
                                label={getOptionLabel(item)}
                              />
                            ))}
                        </Stack>
                      </Grid>
                     
                    </Stack>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Typography variant="h5" color="dark">Effects on function/quality of life:</Typography>
                    <Stack>
                      {effectsOnFunctionData.map((item) => (
                        <FormControlLabel 
                          key={item.id}
                          control={<Checkbox checked={checkedEffectsOnFunction[item.id]} onChange={() => handleEffectsOnFunction(item.id)} />} 
                          label={getOptionLabel(item)}
                        />
                      ))}
                    </Stack>
                  </Grid>
                  <Grid item xs={12}>
                    <Typography variant="h5" color="dark">Breakthrough pain:</Typography>
                    <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
                      {breakthroughPainData.map((item) => (
                        <FormControlLabel 
                          key={item.id}
                          control={<Checkbox checked={checkedBreakthroughPain[item.id]} onChange={() => handleBreakthroughPain(item.id)} />} 
                          label={getOptionLabel(item)}
                        />
                      ))}
                    </Stack>
                  </Grid>

                <Grid item xs={12}>
                <Grid container spacing={3} sx={{ p: 2 }}>
                <Typography variant="h3" color="dark" >Pain Assessment In Advanced Dementia Scale - PAINAD</Typography>
                  <Grid item xs={12} sx={{ p: 0 }}>
                  <Typography variant="h3" color="dark">Instructions</Typography>
                    <Typography variant="body1" paragraph>
                      • Observe the patient for five minutes before scoring his or her behaviors.
                    </Typography>
                    <Typography variant="body1" paragraph>
                      • Assess patient during periods of activity, such as turning, ambulating, and transferring.
                    </Typography>
                    <Typography variant="body1" paragraph>
                      • Assess patient for each of the 5 behaviors observed.
                    </Typography>
                    <Typography variant="body1" paragraph>
                      • Obtain a total score by adding scores from the five behaviors.
                    </Typography>
                    <Typography variant="body1" paragraph>
                      • Total score can range from 0 to 10.
                    </Typography>
                    <Typography variant="body1" sx={{ fontWeight: 'bold', mt: 2 }}>
                      Note - the 0 - 10 score of the PAINAD scale is not the same as the 0 to 10 verbal descriptive pain rating scale.
                    </Typography>
                  </Grid>
                </Grid>
            </Grid>
                <Grid container spacing={3} sx={{ p: 3 }}>
                  <Grid item xs={12}>
                    <Typography variant="h5" color="dark">Breathing (independent of vocalization):</Typography>
                    <Stack spacing={1.25}>
                      <FormControl component="fieldset">
                        <RadioGroup 
                          value={painAssessmentInDementiaScaleStore.breathing}
                          onChange={(e) => {
                          const score = parseInt(e.target.value);
                          setBreathingScore(score);
                          const totalScore = (
                            score + 
                            (painAssessmentInDementiaScaleStore.vocalization ? parseInt(painAssessmentInDementiaScaleStore.vocalization) : 0) +
                            (painAssessmentInDementiaScaleStore.facial_expression ? parseInt(painAssessmentInDementiaScaleStore.facial_expression) : 0) +
                            (painAssessmentInDementiaScaleStore.body_language ? parseInt(painAssessmentInDementiaScaleStore.body_language) : 0) +
                            (painAssessmentInDementiaScaleStore.consolability ? parseInt(painAssessmentInDementiaScaleStore.consolability) : 0)
                          );
                          const updatedData = {
                            ...painAssessmentInDementiaScaleStore,
                            breathing: e.target.value,
                            total_score: totalScore.toString(),
                            patient_id: id
                          };
                          // Update state immediately for fast UI response
                          setPainAssessmentInDementiaScaleStore(updatedData);
                          
                          // Save in background without waiting for response
                          http.post('/pain/pain-assessment-in-dementia-scale/store', updatedData)
                            .then(response => {
                              console.log('Saved successfully', response);
                              // Refresh data after successful save
                              painAssessmentInDementiaScaleById();
                            })
                            .catch(error => {
                              console.error('Error saving:', error);
                            });
                        }}>
                          {breathingData.map((item) => (
                            <FormControlLabel 
                              key={item.id}
                              control={
                                <Radio 
                                  value={item.id}
                                  checked={painAssessmentInDementiaScaleStore.breathing === item.id}
                                />
                              }
                              label={getOptionLabel(item)}
                            />
                          ))}
                        </RadioGroup>
                      </FormControl>
                    </Stack>
                  </Grid>

                  <Grid item xs={12}>
                    <Typography variant="h5" color="dark">Negative vocalization:</Typography>
                    <Stack spacing={1.25}>
                      <FormControl component="fieldset">
                        <RadioGroup 
                          value={painAssessmentInDementiaScaleStore.vocalization}
                          onChange={(e) => {
                          const score = parseInt(e.target.value);
                          setVocalizationScore(score);
                          const totalScore = (
                            score + 
                            (painAssessmentInDementiaScaleStore.breathing ? parseInt(painAssessmentInDementiaScaleStore.breathing) : 0) +
                            (painAssessmentInDementiaScaleStore.facial_expression ? parseInt(painAssessmentInDementiaScaleStore.facial_expression) : 0) +
                            (painAssessmentInDementiaScaleStore.body_language ? parseInt(painAssessmentInDementiaScaleStore.body_language) : 0) +
                            (painAssessmentInDementiaScaleStore.consolability ? parseInt(painAssessmentInDementiaScaleStore.consolability) : 0)
                          );
                          const updatedData = {
                            ...painAssessmentInDementiaScaleStore,
                            vocalization: e.target.value,
                            total_score: totalScore.toString(),
                            patient_id: id
                          };
                          setPainAssessmentInDementiaScaleStore(updatedData);
                          http.post('/pain/pain-assessment-in-dementia-scale/store', updatedData)
                            .then(response => {
                              console.log('Saved successfully', response);
                              // Refresh data after successful save
                              painAssessmentInDementiaScaleById();
                            })
                            .catch(error => {
                              console.error('Error saving:', error);
                            });
                        }}>
                          {negativeVocalizationData.map((item) => (
                            <FormControlLabel 
                              key={item.id}
                              control={<Radio 
                                value={item.id}
                                checked={painAssessmentInDementiaScaleStore.vocalization === item.id}
                              />} 
                              label={getOptionLabel(item)}
                            />
                          ))}
                        </RadioGroup>
                      </FormControl>
                    </Stack>
                  </Grid>

                  <Grid item xs={12}>
                    <Typography variant="h5" color="dark">Facial expression:</Typography>
                    <Stack spacing={1.25}>
                      <FormControl component="fieldset">
                        <RadioGroup 
                          value={painAssessmentInDementiaScaleStore.facial_expression}
                          onChange={(e) => {
                          const score = parseInt(e.target.value);
                            setFacialScore(score);
                          const totalScore = (
                            score + 
                            (painAssessmentInDementiaScaleStore.breathing ? parseInt(painAssessmentInDementiaScaleStore.breathing) : 0) +
                            (painAssessmentInDementiaScaleStore.vocalization ? parseInt(painAssessmentInDementiaScaleStore.vocalization) : 0) +
                            (painAssessmentInDementiaScaleStore.body_language ? parseInt(painAssessmentInDementiaScaleStore.body_language) : 0) +
                            (painAssessmentInDementiaScaleStore.consolability ? parseInt(painAssessmentInDementiaScaleStore.consolability) : 0)
                          );
                          const updatedData = {
                            ...painAssessmentInDementiaScaleStore,
                            facial_expression: e.target.value,
                            total_score: totalScore.toString(),
                            patient_id: id
                          };
                          setPainAssessmentInDementiaScaleStore(updatedData);
                          http.post('/pain/pain-assessment-in-dementia-scale/store', updatedData)
                            .then(response => {
                              console.log('Saved successfully', response);
                              // Refresh data after successful save
                              painAssessmentInDementiaScaleById();
                            })
                            .catch(error => {
                              console.error('Error saving:', error);
                            });
                        }}>
                          {facialExpressionData.map((item) => (
                            <FormControlLabel 
                                key={item.id}
                                control={<Radio value={item.id} checked={painAssessmentInDementiaScaleStore.facial_expression === item.id} />} 
                              label={getOptionLabel(item)}
                            />
                          ))}
                        </RadioGroup>
                      </FormControl>
                    </Stack>
                  </Grid>

                  <Grid item xs={12}>
                    <Typography variant="h5" color="dark">Body language:</Typography>
                    <Stack spacing={1.25}>
                      <FormControl component="fieldset">
                        <RadioGroup 
                          value={painAssessmentInDementiaScaleStore.body_language}
                          onChange={(e) => {
                          const score = parseInt(e.target.value);
                          setBodyScore(score);
                          const totalScore = (
                            score + 
                            (painAssessmentInDementiaScaleStore.breathing ? parseInt(painAssessmentInDementiaScaleStore.breathing) : 0) +
                            (painAssessmentInDementiaScaleStore.vocalization ? parseInt(painAssessmentInDementiaScaleStore.vocalization) : 0) +
                            (painAssessmentInDementiaScaleStore.facial_expression ? parseInt(painAssessmentInDementiaScaleStore.facial_expression) : 0) +
                            (painAssessmentInDementiaScaleStore.consolability ? parseInt(painAssessmentInDementiaScaleStore.consolability) : 0)
                          );
                          const updatedData = {
                            ...painAssessmentInDementiaScaleStore,
                            body_language: e.target.value,
                            total_score: totalScore.toString(),
                            patient_id: id
                          };
                          setPainAssessmentInDementiaScaleStore(updatedData);
                          http.post('/pain/pain-assessment-in-dementia-scale/store', updatedData)
                            .then(response => {
                              console.log('Saved successfully', response);
                              // Refresh data after successful save
                              painAssessmentInDementiaScaleById();
                            })
                            .catch(error => {
                              console.error('Error saving:', error);
                            });
                        }}>
                          {bodyLanguageData.map((item) => (
                            <FormControlLabel 
                              key={item.id}
                              control={<Radio value={item.id} checked={painAssessmentInDementiaScaleStore.body_language === item.id} />} 
                              label={getOptionLabel(item)}
                            />
                          ))} 
                        </RadioGroup>
                      </FormControl>
                    </Stack>
                  </Grid>

                  <Grid item xs={12}>
                    <Typography variant="h5" color="dark">Consolability:</Typography>
                    <Stack spacing={1.25}>
                      <FormControl component="fieldset">
                        <RadioGroup 
                          value={painAssessmentInDementiaScaleStore.consolability}
                          onChange={(e) => {
                          const score = parseInt(e.target.value);
                          setConsolabilityBodyScore(score);
                          const totalScore = (
                            score + 
                            (painAssessmentInDementiaScaleStore.breathing ? parseInt(painAssessmentInDementiaScaleStore.breathing) : 0) +
                            (painAssessmentInDementiaScaleStore.vocalization ? parseInt(painAssessmentInDementiaScaleStore.vocalization) : 0) +
                            (painAssessmentInDementiaScaleStore.facial_expression ? parseInt(painAssessmentInDementiaScaleStore.facial_expression) : 0) +
                            (painAssessmentInDementiaScaleStore.body_language ? parseInt(painAssessmentInDementiaScaleStore.body_language) : 0)
                          );
                          const updatedData = {
                            ...painAssessmentInDementiaScaleStore,
                            consolability: e.target.value,
                            total_score: (breathingScore + vocalizationScore + facialScore + bodyScore + score).toString(),
                            patient_id: id
                          };
                          setPainAssessmentInDementiaScaleStore(updatedData);
                          http.post('/pain/pain-assessment-in-dementia-scale/store', updatedData)
                            .then(response => {
                              console.log('Saved successfully', response);
                              // Refresh data after successful save
                              painAssessmentInDementiaScaleById();
                            })
                            .catch(error => {
                              console.error('Error saving:', error);
                            });
                        }}>
                          {consolabilityData.map((item) => (
                            <FormControlLabel 
                              key={item.id}
                              control={<Radio value={item.id} checked={painAssessmentInDementiaScaleStore.consolability === item.id} />} 
                              label={getOptionLabel(item)}
                            />
                          ))}
                        </RadioGroup>
                      </FormControl>
                    </Stack>
                  </Grid>

                  <Grid item xs={12}>
                    <Typography variant="h5" color="dark">
                      Total Score: {breathingScore + vocalizationScore + facialScore + bodyScore + consolabilityBodyScore}/10
                    </Typography>
                  </Grid>
                </Grid>
                </Grid>
              </div>
            </Grid>
          </Grid>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <div style={{
                borderLeft: '5px solid #0AA369',
                borderRadius: '5px',
                boxShadow: '0px 0px 5px 2px rgba(0, 0, 0, 0.1)',
                opacity: canEditPainHope ? 1 : 0.9,
                pointerEvents: canEditPainHope ? 'auto' : 'none'
              }}>
                <div style={{ backgroundColor: '#44BB769F', color: '#ffffff', borderTopRightRadius: '5px', paddingLeft: '10px' }}>
                  <h2>FLACC Behavioral Pain Assessment Scale</h2>
                </div>
                <Grid container spacing={3} sx={{ p: 3 }}>
                  <Grid item xs={12} md={6}>
                    <Typography variant="h5" color="dark">Face:</Typography>
                    <Stack spacing={1.25}>
                      <FormControl component="fieldset">
                        <RadioGroup   value={flaccBehavioralPain.face}
                          onChange={(e) => {
                          const score = parseInt(e.target.value);
                          setFaceScore(score);
                          const totalScore = (
                            score + 
                            (flaccBehavioralPain.legs ? parseInt(flaccBehavioralPain.legs) : 0) +
                            (flaccBehavioralPain.activity ? parseInt(flaccBehavioralPain.activity) : 0) +
                            (flaccBehavioralPain.cry ? parseInt(flaccBehavioralPain.cry) : 0) +
                            (flaccBehavioralPain.consolability ? parseInt(flaccBehavioralPain.consolability) : 0)
                          );
                          const updatedData = {
                            ...flaccBehavioralPain,
                            face: e.target.value,
                            total_score: totalScore.toString(),
                            patient_id: id
                          };
                          setFlaccBehavioralPain(updatedData);
                          http.post('/pain/flacc-behavioral-pain/store', updatedData)
                            .then(response => {
                              console.log('Saved successfully', response);
                              // Refresh data after successful save
                              flaccBehavioralPainById();
                            })
                            .catch(error => {
                              console.error('Error saving:', error);
                            });
                        }}>
                          {faceData.map((item) => (
                            <FormControlLabel 
                              key={item.id}
                              control={<Radio value={item.id} checked={flaccBehavioralPain.face === item.id} />} 
                              label={getOptionLabel(item)}
                            />
                          ))}
                        </RadioGroup>
                      </FormControl>
                    </Stack>
                  </Grid>

                  <Grid item xs={12} md={6}>
                    <Typography variant="h5" color="dark">Legs:</Typography>
                    <Stack spacing={1.25}>
                      <FormControl component="fieldset">
                        <RadioGroup value={flaccBehavioralPain.legs}
                          onChange={(e) => {
                          const score = parseInt(e.target.value);
                          setLegsScore(score);
                          const totalScore = (
                            score + 
                            (flaccBehavioralPain.face ? parseInt(flaccBehavioralPain.face) : 0) +
                            (flaccBehavioralPain.activity ? parseInt(flaccBehavioralPain.activity) : 0) +
                            (flaccBehavioralPain.cry ? parseInt(flaccBehavioralPain.cry) : 0) +
                            (flaccBehavioralPain.consolability ? parseInt(flaccBehavioralPain.consolability) : 0)
                          );
                          const updatedData = {
                            ...flaccBehavioralPain,
                            legs: e.target.value,
                            total_score: totalScore.toString(),
                            patient_id: id
                          };
                          setFlaccBehavioralPain(updatedData);
                          http.post('/pain/flacc-behavioral-pain/store', updatedData)
                            .then(response => {
                              console.log('Saved successfully', response);
                              // Refresh data after successful save
                              flaccBehavioralPainById();
                            })
                            .catch(error => {
                              console.error('Error saving:', error);
                            });
                        }}>
                          {legsData.map((item) => (
                            <FormControlLabel 
                              key={item.id}
                              control={<Radio value={item.id} checked={flaccBehavioralPain.legs === item.id} />} 
                              label={getOptionLabel(item)}
                            />
                          ))}
                        </RadioGroup>
                      </FormControl>
                    </Stack>
                  </Grid>

                  <Grid item xs={12} md={6}>
                    <Typography variant="h5" color="dark">Activity:</Typography>
                    <Stack spacing={1.25}>
                      <FormControl component="fieldset">
                          <RadioGroup value={flaccBehavioralPain.activity}
                          onChange={(e) => {
                          const score = parseInt(e.target.value);
                          setActivityScore(score);
                          const totalScore = (
                            score + 
                            (flaccBehavioralPain.face ? parseInt(flaccBehavioralPain.face) : 0) +
                            (flaccBehavioralPain.legs ? parseInt(flaccBehavioralPain.legs) : 0) +
                            (flaccBehavioralPain.cry ? parseInt(flaccBehavioralPain.cry) : 0) +
                            (flaccBehavioralPain.consolability ? parseInt(flaccBehavioralPain.consolability) : 0)
                          );
                          const  updatedData = {
                            ...flaccBehavioralPain,
                            activity: e.target.value,
                            total_score: totalScore.toString(),
                            patient_id: id
                          };  
                          setFlaccBehavioralPain(updatedData);
                          http.post('/pain/flacc-behavioral-pain/store', updatedData)
                            .then(response => {
                              console.log('Saved successfully', response);
                              // Refresh data after successful save
                              flaccBehavioralPainById();
                            })
                            .catch(error => {
                              console.error('Error saving:', error);
                            });
                        }}>
                          {activityData.map((item) => (
                            <FormControlLabel 
                              key={item.id}
                              control={<Radio value={item.id} checked={flaccBehavioralPain.activity === item.id} />} 
                              label={getOptionLabel(item)}
                            />
                          ))}
                        </RadioGroup>
                      </FormControl>
                    </Stack>
                  </Grid>
              
                  <Grid item xs={12} md={6}>
                    <Typography variant="h5" color="dark">Cry:</Typography>
                    <Stack spacing={1.25}>
                      <FormControl component="fieldset">
                        <RadioGroup value={flaccBehavioralPain.cry}
                          onChange={ (e) => {
                          const score = parseInt(e.target.value);
                          setCryScore(score);
                          const totalScore = (
                            score + 
                            (flaccBehavioralPain.face ? parseInt(flaccBehavioralPain.face) : 0) +
                            (flaccBehavioralPain.legs ? parseInt(flaccBehavioralPain.legs) : 0) +
                            (flaccBehavioralPain.activity ? parseInt(flaccBehavioralPain.activity) : 0) +
                            (flaccBehavioralPain.consolability ? parseInt(flaccBehavioralPain.consolability) : 0)
                          );
                          const updatedData = {
                            ...flaccBehavioralPain,
                            cry: e.target.value,
                            total_score: totalScore.toString(),
                            patient_id: id
                          };
                          setFlaccBehavioralPain(updatedData);
                          http.post('/pain/flacc-behavioral-pain/store', updatedData)
                            .then(response => {
                              console.log('Saved successfully', response);
                              // Refresh data after successful save
                              flaccBehavioralPainById();
                            })
                            .catch(error => {
                              console.error('Error saving:', error);
                            });
                        }}>
                          {cryData.map((item) => (
                            <FormControlLabel 
                              key={item.id}
                              control={<Radio value={item.id} checked={flaccBehavioralPain.cry === item.id} />} 
                              label={getOptionLabel(item)}
                            />
                          ))}
                        </RadioGroup>
                      </FormControl>
                    </Stack>
                  </Grid>

                  <Grid item xs={12} md={6}>
                    <Typography variant="h5" color="dark">Consolability:</Typography>
                    <Stack spacing={1.25}>
                      <FormControl component="fieldset">
                        <RadioGroup value={flaccBehavioralPain.consolability}
                          onChange={(e) => {
                          const score = parseInt(e.target.value);
                          setConsolabilityScore(score);
                          const totalScore = (
                            score + 
                            (flaccBehavioralPain.face ? parseInt(flaccBehavioralPain.face) : 0) +
                            (flaccBehavioralPain.legs ? parseInt(flaccBehavioralPain.legs) : 0) +
                            (flaccBehavioralPain.activity ? parseInt(flaccBehavioralPain.activity) : 0) +
                            (flaccBehavioralPain.cry ? parseInt(flaccBehavioralPain.cry) : 0)
                          );
                          const updatedData = {
                            ...flaccBehavioralPain,
                            consolability: e.target.value,
                            total_score: totalScore.toString(),
                            patient_id: id
                          };
                          setFlaccBehavioralPain( updatedData);
                          http.post('/pain/flacc-behavioral-pain/store', updatedData)
                            .then(response => {
                              console.log('Saved successfully', response);
                              // Refresh data after successful save
                              flaccBehavioralPainById();
                            })
                            .catch(error => {
                              console.error('Error saving:', error);
                            });
                        }}>
                          {consolabilityData.map((item) => (
                            <FormControlLabel 
                              key={item.id}
                              control={<Radio value={item.id} checked={flaccBehavioralPain.consolability === item.id} />} 
                              label={getOptionLabel(item)}
                            />
                          ))}
                        </RadioGroup>
                      </FormControl>
                    </Stack>
                  </Grid>

                  <Grid item xs={12}>
                    <Typography variant="h5" color="dark">
                      Total Score: {faceScore + legsScore + activityScore + cryScore + consolabilityScore}/10
                    </Typography>
                  </Grid>
                </Grid>
              </div>
            </Grid>
          </Grid>

          <Grid container spacing={3}>
            <Grid item xs={12}>
              <div style={{
                borderLeft: '5px solid #0AA369',
                borderRadius: '5px',
                boxShadow: '0px 0px 5px 2px rgba(0, 0, 0, 0.1)',
                opacity: canEditPainHope ? 1 : 0.9,
                pointerEvents: canEditPainHope ? 'auto' : 'none'
              }}>
                <div style={{ backgroundColor: '#44BB769F', color: '#ffffff', borderTopRightRadius: '5px', paddingLeft: '10px' }}>
                  <h2>J0900. Pain Screening</h2>
                </div>
                <Grid container spacing={3} sx={{ p: 3 }}>
                  <Grid item xs={12}>
                    <Typography variant="h5" color="dark">A. Was the patient screened for pain?</Typography>
                    <Stack spacing={1.25}>
                      <FormControl component="fieldset">
                        <RadioGroup value={painScreening.patient_screened} onChange={(e) => {
                          const updatedData = { ...painScreening, patient_screened: e.target.value, patient_id: id };
                          setPainScreening(updatedData);
                          http.post('/pain/pain-screening/store', updatedData)
                            .then(response => {
                              console.log('Saved successfully', response);
                              // Refresh data after successful save
                              painScreeningById();
                            })
                            .catch(error => {
                              console.error('Error saving:', error);
                            });
                        }}>
                          <FormControlLabel value="0" control={<Radio checked={parseInt(painScreening.patient_screened) === 0} />} label="No → Skip to J0905, Pain Active Problem" />
                          <FormControlLabel value="1" control={<Radio checked={parseInt(painScreening.patient_screened) === 1} />} label="Yes" />
                        </RadioGroup>
                      </FormControl>
                    </Stack>
                  </Grid>

                  <Grid item xs={12}>
                    <Typography variant="h5" color="dark">B. Date of first screening for pain:</Typography>
                    <Grid item xs={12} md={6}>
                      <Stack spacing={1.25}>
                        <OutlinedInput type="date" value={painScreening.date_of_first_pain} onChange={(e) => {
                          const updatedData = { ...painScreening, date_of_first_pain: e.target.value, patient_id: id };
                          setPainScreening(updatedData);
                          http.post('/pain/pain-screening/store', updatedData)
                            .then(response => {
                              console.log('Saved successfully', response);
                              // Refresh data after successful save
                              painScreeningById();
                            })
                            .catch(error => {
                              console.error('Error saving:', error);
                            });
                        }} />
                      </Stack>
                    </Grid>
                  </Grid>

                  <Grid item xs={12}>
                    <Typography variant="h5" color="dark">C. The patient's pain severity was:</Typography>
                    <Stack spacing={1.25}>
                      <FormControl component="fieldset">
                        <RadioGroup value={painScreening.pain_severity} onChange={(e) => {
                          const updatedData = { ...painScreening, pain_severity: e.target.value, patient_id: id };
                          setPainScreening(updatedData);
                          http.post('/pain/pain-screening/store', updatedData)
                            .then(response => {
                              console.log('Saved successfully', response);
                              // Refresh data after successful save
                              painScreeningById();
                            })
                            .catch(error => {
                              console.error('Error saving:', error);
                            });
                        }}>
                          {painSeverityData.map((item) => (
                            <FormControlLabel 
                              key={item.id}
                                control={<Radio value={item.id} checked={painScreening.pain_severity === item.id} />} 
                              label={getOptionLabel(item)}
                            />
                          ))}
                        </RadioGroup>
                      </FormControl>
                    </Stack>
                  </Grid>

                  <Grid item xs={12}>
                    <Typography variant="h5" color="dark">D. Type of standardized pain tool used:</Typography>
                    <Stack spacing={1.25}>
                      <FormControl component="fieldset">
                        <RadioGroup value={painScreening.standardized_tool_pain_used} onChange={(e) => {
                          const updatedData = { ...painScreening, standardized_tool_pain_used: e.target.value, patient_id: id };
                          setPainScreening(updatedData);
                          http.post('/pain/pain-screening/store', updatedData)
                            .then(response => {
                              console.log('Saved successfully', response);
                              // Refresh data after successful save
                              painScreeningById();
                            })
                            .catch(error => {
                              console.error('Error saving:', error);
                            });
                        }}>
                          {standardizedPainToolData.map((item) => (
                            <FormControlLabel 
                              key={item.id}
                              control={<Radio value={item.id} checked={painScreening.standardized_tool_pain_used === item.id} />} 
                              label={getOptionLabel(item)}
                            />
                          ))}
                        </RadioGroup>
                      </FormControl>
                    </Stack>
                  </Grid>
                </Grid>
              </div>
            </Grid>
          </Grid>

          <Grid container spacing={3}>
            <Grid item xs={12}>
              <div style={{
                borderLeft: '5px solid #0AA369',
                borderRadius: '5px',
                boxShadow: '0px 0px 5px 2px rgba(0, 0, 0, 0.1)',
                opacity: canEditPainHope ? 1 : 0.9,
                pointerEvents: canEditPainHope ? 'auto' : 'none'
              }}>
                <div style={{ backgroundColor: '#44BB769F', color: '#ffffff', borderTopRightRadius: '5px', paddingLeft: '10px' }}>
                  <h2>J0905 - Pain Active Problem</h2>
                </div>
                <Grid container spacing={3} sx={{ p: 3 }}>
                  <Grid item xs={12}>
                    <Typography variant="h5" color="dark">A. Is pain an active problem for the patient?</Typography>
                    <Stack spacing={1.25}>
                      <FormControl component="fieldset">
                        <RadioGroup value={painActiveProblem.pain_active_problem_patient} onChange={(e) => {
                          const updatedData = { ...painActiveProblem, pain_active_problem_patient: e.target.value, patient_id: id };
                          setPainActiveProblem(updatedData);
                          http.post('/pain/pain-active-problem/store', updatedData)
                            .then(response => {
                              console.log('Saved successfully', response);
                              // Refresh data after successful save
                              painActiveProblemById();
                            })
                            .catch(error => {
                              console.error('Error saving:', error);
                            });
                        }}> 
                          <FormControlLabel 
                            value="0" 
                            control={<Radio checked={parseInt(painActiveProblem.pain_active_problem_patient) === 0} />} 
                            label="0. No → Skip to J2030, Screening for Shortness of Breath" 
                          />
                          <FormControlLabel 
                            value="1" 
                            control={<Radio checked={parseInt(painActiveProblem.pain_active_problem_patient) === 1} />} 
                            label="1. Yes" 
                          />
                        </RadioGroup>
                      </FormControl>
                    </Stack>
                  </Grid>
                  <Grid item xs={12}>
                    <Typography variant="h5" color="dark">Comments:</Typography>
                    <TextField
                      fullWidth
                      variant="outlined"
                      value={painActiveProblem.comments}
                      onChange={(e) => {
                        const updatedData = { ...painActiveProblem, comments: e.target.value, patient_id: id };
                        setPainActiveProblem(updatedData);
                        http.post('/pain/pain-active-problem/store', updatedData)
                          .then(response => {
                            console.log('Saved successfully', response);
                            // Refresh data after successful save
                            painActiveProblemById();
                          })
                          .catch(error => {
                            console.error('Error saving:', error);
                          });
                      }}
                      multiline
                      rows={2}
                    />
                  </Grid>
                </Grid>
              </div>
            </Grid>
          </Grid>

          <Grid container spacing={3}>
            <Grid item xs={12}>
              <div style={{
                borderLeft: '5px solid #0AA369',
                borderRadius: '5px',
                boxShadow: '0px 0px 5px 2px rgba(0, 0, 0, 0.1)',
                opacity: canEditPainHope ? 1 : 0.9,
                pointerEvents: canEditPainHope ? 'auto' : 'none'
              }}>
                <div style={{ backgroundColor: '#44BB769F', color: '#ffffff', borderTopRightRadius: '5px', paddingLeft: '10px' }}>
                  <h2>J0910 - Comprehensive Pain Assessment</h2>
                </div>
                <Grid container spacing={3} sx={{ p: 3 }}>
                  <Grid item xs={12}>
                    <Typography variant="h5" color="dark">A. Was a comprehensive pain assessment done?</Typography>
                    <Stack spacing={1.25}>
                      <FormControl component="fieldset">
                        <RadioGroup value={comprehensivePainAssessment.comprehensive_pain} onChange={(e) => {
                          const updatedData = { ...comprehensivePainAssessment, comprehensive_pain: e.target.value, patient_id: id };
                          setComprehensivePainAssessment(updatedData);
                          http.post('/pain/comprehensive-pain-assessment/store', updatedData)
                            .then(response => {
                              console.log('Saved successfully', response);
                              // Refresh data after successful save
                              comprehensivePainIncludedById();
                            })  
                            .catch(error => {
                              console.error('Error saving:', error);
                            });
                        }}>
                          <FormControlLabel 
                            value="0" 
                            control={<Radio checked={parseInt(comprehensivePainAssessment.comprehensive_pain) === 0} />} 
                            label="0. No → Skip to J2030, Screening for Shortness of Breath" 
                          />
                          <FormControlLabel 
                            value="1" 
                            control={<Radio checked={parseInt(comprehensivePainAssessment.comprehensive_pain) === 1} />} 
                            label="1. Yes" 
                          />
                        </RadioGroup>
                      </FormControl>
                    </Stack>
                  </Grid>

                  <Grid item xs={12}>
                    <Typography variant="h5" color="dark">B. Date of comprehensive pain assessment:</Typography>
                    <OutlinedInput 
                      type="date"
                      value={comprehensivePainAssessment.date_of_assessment}
                      onChange={(e) => {
                        const updatedData = { ...comprehensivePainAssessment, date_of_assessment: e.target.value, patient_id: id };
                        setComprehensivePainAssessment(updatedData);
                        http.post('/pain/comprehensive-pain-assessment/store', updatedData)
                          .then(response => {
                            console.log('Saved successfully', response);
                            // Refresh data after successful save
                            comprehensivePainIncludedById();
                          })
                          .catch(error => {
                            console.error('Error saving:', error);
                          });
                      }}    
                      fullWidth
                      sx={{ maxWidth: 250 }}
                    />
                  </Grid>

                  <Grid item xs={12}>
                    <Typography variant="h5" color="dark" gutterBottom>C. Comprehensive pain assessment included:</Typography>
                    <Typography variant="subtitle2" color="textSecondary" gutterBottom>Check all that apply</Typography>
                    <Stack spacing={1}>
                      {comprehensivePainIncludedData.map((item) => (
                        <FormControlLabel 
                          key={item.id}
                          control={<Checkbox value={item.id} checked={checkedComprehensivePainIncluded[item.id] } 
                          onChange={(e) => {
                            handleComprehensivePainIncluded(item.id);
                          }}
                          
                          />} 
                          label={getOptionLabel(item)}
                        />
                      ))}
                    </Stack>
                  </Grid>

                  <Grid item xs={12}>
                    <Typography variant="h5" color="dark">Comments:</Typography>
                    <TextField
                      fullWidth
                      variant="outlined"
                      multiline
                      value={comprehensivePainAssessment.comments}
                      onChange={(e) => {
                        const updatedData = { ...comprehensivePainAssessment, comments: e.target.value, patient_id: id,comprehensive_pain_included: comprehensivePainAssessment.comprehensive_pain_included};
                        setComprehensivePainAssessment(updatedData);
                        const data = {
                          comprehensive_pain: comprehensivePainAssessment.comprehensive_pain,
                          date_of_assessment: comprehensivePainAssessment.date_of_assessment,
                          comprehensive_pain_included: comprehensivePainAssessment.comprehensive_pain_included,
                          comments: updatedData.comments,
                          patient_id: id
                        }
                        http.post('/pain/comprehensive-pain-assessment/store', updatedData)
                          .then(response => {
                            console.log('Saved successfully', response);
                            // Refresh data after successful save
                            comprehensivePainIncludedById();
                          })
                          .catch(error => {
                            console.error('Error saving:', error);
                          });
                      }} 
                      rows={3}
                      placeholder="Enter any additional comments about the pain assessment"
                    />
                  </Grid>
                </Grid>
              </div>
            </Grid>
          </Grid>

          <Grid container spacing={3}>
            <Grid item xs={12}>
              <div style={{
                borderLeft: '5px solid #0AA369',
                borderRadius: '5px',
                boxShadow: '0px 0px 5px 2px rgba(0, 0, 0, 0.1)',
                opacity: canEditPainHope ? 1 : 0.9,
                pointerEvents: canEditPainHope ? 'auto' : 'none'
              }}>
                <div style={{ backgroundColor: '#44BB769F', color: '#ffffff', borderTopRightRadius: '5px', paddingLeft: '10px' }}>
                  <h2>Pain</h2>
                </div>
                <Grid container spacing={3} sx={{ p: 3 }}>
                <Grid item xs={12}>
                  <Typography variant="h5" color="dark">Summary of Problem:</Typography>
                  <Stack spacing={3}>
                    <Grid item xs={12}>
                      <Typography variant="subtitle1" color="dark" sx={{mb:2}}>
                       
                      </Typography>
                      <Grid container spacing={2}>
                      <Grid item xs={12} md={6}>
                      <FormControl fullWidth>
                        <TextField
                          fullWidth
                          label=" Patient/Caregiver goals"
                          value={painSummaryInterventionsGoalsData.summary_of_problem} 
                          onChange={(e) => {
                            const updatedData = { ...painSummaryInterventionsGoalsData, summary_of_problem: e.target.value, patient_id: id };
                            setPainSummaryInterventionsGoalsData(updatedData);
                            http.post('/pain/pain-summary-interventions-goals/store', updatedData)
                              .then(response => {
                                console.log('Saved successfully', response);
                                // Refresh data after successful save
                                painSummaryInterventionsGoalsById();
                              })
                          }}
                          variant="outlined"
                          sx={{ mb: 2 }}
                        />
                      </FormControl>
                      </Grid>
                        
                      </Grid>
                    </Grid>
                    </Stack>
                </Grid>
                  <Grid item xs={12}>
                    <Typography variant="h5" color="dark" sx={{mb:2}}>Pain Interventions:</Typography>
                      <Grid container spacing={2}>

                      <Grid item xs={12} md={6}>
                        <FormControl fullWidth>
                          <TextField
                            fullWidth
                            label="Administer pain medication(s) as prescribed"
                            placeholder="Enter medication details"
                            variant="outlined"
                            value={painSummaryInterventionsGoalsData.pain_interventions_administer_medication}
                            onChange={(e) => {
                              const updatedData = { ...painSummaryInterventionsGoalsData, pain_interventions_administer_medication: e.target.value, patient_id: id };
                              setPainSummaryInterventionsGoalsData(updatedData);
                              http.post('/pain/pain-summary-interventions-goals/store', updatedData)
                                .then(response => {
                                  console.log('Saved successfully', response);
                                  // Refresh data after successful save
                                  painSummaryInterventionsGoalsById();
                                })
                                .catch(error => {
                                  console.error('Error saving:', error);
                                });
                            }}
                            sx={{ mb: 2 }}
                          />
                        </FormControl>
                      </Grid>
                      <Grid item xs={12} md={6}>  
                        <FormControl fullWidth>
                          <TextField
                            type="date"
                            label="Start Effective Date"
                            value={painSummaryInterventionsGoalsData.pain_interventions_administer_medication_start_date}
                            onChange={(e) => {
                              const updatedData = { ...painSummaryInterventionsGoalsData, pain_interventions_administer_medication_start_date: e.target.value, patient_id: id };
                              setPainSummaryInterventionsGoalsData(updatedData);
                              http.post('/pain/pain-summary-interventions-goals/store', updatedData)
                                .then(response => {
                                  console.log('Saved successfully', response);
                                  // Refresh data after successful save
                                  painSummaryInterventionsGoalsById();
                                })
                                .catch(error => {
                                  console.error('Error saving:', error);
                                });
                            }}  
                            InputLabelProps={{
                              shrink: true,
                            }}
                            variant="outlined"
                            sx={{ mb: 2 }}
                          />
                        </FormControl>
                      </Grid>
                      <Grid item xs={12} md={6}>  
                        <FormControl fullWidth>
                          <TextField
                            fullWidth
                              label="Assess effectiveness of pain relief measures each visit"
                            value={painSummaryInterventionsGoalsData.pain_interventions_assess_effectiveness}
                            onChange={(e) => {
                              const updatedData = { ...painSummaryInterventionsGoalsData, pain_interventions_assess_effectiveness: e.target.value, patient_id: id };
                              setPainSummaryInterventionsGoalsData(updatedData);
                              http.post('/pain/pain-summary-interventions-goals/store', updatedData)
                                .then(response => {
                                  console.log('Saved successfully', response);
                                  // Refresh data after successful save
                                  painSummaryInterventionsGoalsById();
                                })
                                .catch(error => {
                                  console.error('Error saving:', error);
                                });
                            }}  
                            variant="outlined"
                            sx={{ mb: 2 }}
                          />
                        </FormControl>
                      </Grid>
                      <Grid item xs={12} md={6}>  
                        <FormControl fullWidth>
                          <TextField
                            type="date" 
                            label="Start Effective Date"
                            value={painSummaryInterventionsGoalsData.pain_interventions_assess_effectiveness_start_date}
                            onChange={(e) => {
                              const updatedData = { ...painSummaryInterventionsGoalsData, pain_interventions_assess_effectiveness_start_date: e.target.value, patient_id: id };
                              setPainSummaryInterventionsGoalsData(updatedData);
                              http.post('/pain/pain-summary-interventions-goals/store', updatedData)
                                .then(response => {
                                  console.log('Saved successfully', response);
                                  // Refresh data after successful save
                                  painSummaryInterventionsGoalsById();
                                })
                                .catch(error => {
                                  console.error('Error saving:', error);
                                });
                            }}  
                            InputLabelProps={{
                              shrink: true,
                            }}
                            variant="outlined"
                            sx={{ mb: 2 }}
                          />
                        </FormControl>
                      </Grid>
                        <Grid item xs={12} md={6}>  
                        <FormControl fullWidth>
                          <TextField
                            fullWidth
                            label="Assess pain status each visit"
                            value={painSummaryInterventionsGoalsData.pain_interventions_assess_pain_status}
                            onChange={(e) => {
                              const updatedData = { ...painSummaryInterventionsGoalsData, pain_interventions_assess_pain_status: e.target.value, patient_id: id };
                              setPainSummaryInterventionsGoalsData(updatedData);
                              http.post('/pain/pain-summary-interventions-goals/store', updatedData)
                                .then(response => {
                                  console.log('Saved successfully', response);
                                  // Refresh data after successful save
                                  painSummaryInterventionsGoalsById();
                                })
                                .catch(error => {
                                  console.error('Error saving:', error);
                                });
                            }}
                            variant="outlined"
                            sx={{ mb: 2 }}
                          />
                        </FormControl>
                      </Grid>
                      <Grid item xs={12} md={6}>  
                        <FormControl fullWidth>
                          <TextField
                            type="date"
                            label="Start Effective Date"
                            value={painSummaryInterventionsGoalsData.pain_interventions_assess_pain_status_start_date}
                            onChange={(e) => {
                              const updatedData = { ...painSummaryInterventionsGoalsData, pain_interventions_assess_pain_status_start_date: e.target.value, patient_id: id };
                              setPainSummaryInterventionsGoalsData(updatedData);
                              http.post('/pain/pain-summary-interventions-goals/store', updatedData)
                                .then(response => {
                                  console.log('Saved successfully', response);
                                  // Refresh data after successful save
                                  painSummaryInterventionsGoalsById();
                                })
                                .catch(error => {
                                  console.error('Error saving:', error);
                                });
                            }}  
                            InputLabelProps={{
                              shrink: true,
                            }}
                            variant="outlined"
                            sx={{ mb: 2 }}
                          />
                        </FormControl>
                      </Grid>
                      <Grid item xs={12} md={6}>  
                        <FormControl fullWidth>
                          <TextField
                            fullWidth
                            label="Teach non-pharmacologic pain relief measures"
                            value={painSummaryInterventionsGoalsData.pain_interventions_non_pharmacological}
                            onChange={(e) => {
                              const updatedData = { ...painSummaryInterventionsGoalsData, pain_interventions_non_pharmacological: e.target.value, patient_id: id };
                              setPainSummaryInterventionsGoalsData(updatedData);
                              http.post('/pain/pain-summary-interventions-goals/store', updatedData)
                                .then(response => {
                                  console.log('Saved successfully', response);
                                  // Refresh data after successful save
                                  painSummaryInterventionsGoalsById();
                                })
                                .catch(error => {
                                  console.error('Error saving:', error);
                                });
                            }}
                            variant="outlined"
                            sx={{ mb: 2 }}
                          />
                        </FormControl>
                      </Grid>
                      <Grid item xs={12} md={6}>  
                        <FormControl fullWidth>
                          <TextField
                            type="date"
                            label="Start Effective Date"
                            value={painSummaryInterventionsGoalsData.pain_interventions_non_pharmacological_start_date}
                            onChange={(e) => {
                              const updatedData = { ...painSummaryInterventionsGoalsData, pain_interventions_non_pharmacological_start_date: e.target.value, patient_id: id };
                              setPainSummaryInterventionsGoalsData(updatedData);
                              http.post('/pain/pain-summary-interventions-goals/store', updatedData)
                                .then(response => {
                                  console.log('Saved successfully', response);
                                  // Refresh data after successful save
                                  painSummaryInterventionsGoalsById();
                                })
                                .catch(error => {
                                  console.error('Error saving:', error);
                                });
                            }}  
                            InputLabelProps={{
                              shrink: true,
                            }}
                            variant="outlined"
                            sx={{ mb: 2 }}
                          />
                        </FormControl>
                          </Grid>
                      </Grid>
                  </Grid>
                <Grid item xs={12}>
                  <Typography variant="h5" color="dark" sx={{ mt: 3 }}>
                    Pain Goals
                  </Typography>
                  <Stack spacing={3}>
                    <Grid item xs={12}>
                      <Typography variant="subtitle1" color="dark" sx={{mb:2}}>
                       
                      </Typography>
                      <Grid container spacing={2}>
                      <Grid item xs={12} md={6}>
                      <FormControl fullWidth>
                        <TextField
                          fullWidth
                          label=" Patient/Caregiver goals"
                          value={painSummaryInterventionsGoalsData.pain_goals_caregiver}
                          onChange={(e) => {
                            const updatedData = { ...painSummaryInterventionsGoalsData, pain_goals_caregiver: e.target.value, patient_id: id };
                            setPainSummaryInterventionsGoalsData(updatedData);
                            http.post('/pain/pain-summary-interventions-goals/store', updatedData)
                              .then(response => {
                                console.log('Saved successfully', response);
                                // Refresh data after successful save
                                painSummaryInterventionsGoalsById();
                              })
                          }}
                          variant="outlined"  
                          sx={{ mb: 2 }}
                        />
                      </FormControl>
                      </Grid>
                      <Grid item xs={12} md={6}>
                      <FormControl fullWidth>
                        <TextField
                          fullWidth
                          label="pain rating of ≤ 1/10 will be maintained by"
                          value={painSummaryInterventionsGoalsData.pain_goals_rating}
                          onChange={(e) => {
                            const updatedData = { ...painSummaryInterventionsGoalsData, pain_goals_rating: e.target.value, patient_id: id };
                            setPainSummaryInterventionsGoalsData(updatedData);
                            http.post('/pain/pain-summary-interventions-goals/store', updatedData)
                              .then(response => {
                                console.log('Saved successfully', response);
                                // Refresh data after successful save
                                painSummaryInterventionsGoalsById();
                              })
                          }}
                          variant="outlined"
                          sx={{ mb: 2 }}
                        />
                      </FormControl>
                      </Grid>
                        <Grid item xs={12} md={6}>
                          <FormControl fullWidth>
                            <TextField
                              type="date"
                              label="Achieve By Date"
                              value={painSummaryInterventionsGoalsData.pain_goals_start_date}
                              onChange={(e) => {
                                const updatedData = { ...painSummaryInterventionsGoalsData, pain_goals_start_date: e.target.value, patient_id: id };
                                setPainSummaryInterventionsGoalsData(updatedData);
                                http.post('/pain/pain-summary-interventions-goals/store', updatedData)
                                  .then(response => {
                                    console.log('Saved successfully', response);
                                    // Refresh data after successful save
                                    painSummaryInterventionsGoalsById();
                                  })
                              }}
                              InputLabelProps={{
                                shrink: true,
                              }}
                              variant="outlined"
                              sx={{ mb: 2 }}
                            />
                          </FormControl>
                        </Grid>
                        <Grid item xs={12} md={6}>
                          <FormControl fullWidth>
                            <TextField
                              type="date" 
                              label="Start Effective Date"
                              value={painSummaryInterventionsGoalsData.pain_goals_end_date}
                              onChange={(e) => {
                                const updatedData = { ...painSummaryInterventionsGoalsData, pain_goals_end_date: e.target.value, patient_id: id };
                                setPainSummaryInterventionsGoalsData(updatedData);
                                http.post('/pain/pain-summary-interventions-goals/store', updatedData)
                                  .then(response => {
                                    console.log('Saved successfully', response);
                                    // Refresh data after successful save
                                    painSummaryInterventionsGoalsById();
                                  })
                              }}
                              InputLabelProps={{
                                shrink: true,
                              }}
                              variant="outlined"
                              sx={{ mb: 2 }}
                            />
                          </FormControl>
                        </Grid>
                      </Grid>
                    </Grid>

                    <Grid item xs={12}>
                      <Typography variant="subtitle1" color="dark" sx={{mb:2}}>
                        Patient/Caregiver will verbalize pain relief measures including pharmacologic and non-pharmacologic measures by:
                      </Typography>
                      <FormControl fullWidth>
                        <TextField
                          fullWidth
                          label="Discussion method"
                          value={painSummaryInterventionsGoalsData.pain_caregiver_discussion_methods}
                          onChange={(e) => {
                            const updatedData = { ...painSummaryInterventionsGoalsData, pain_caregiver_discussion_methods: e.target.value, patient_id: id };
                            setPainSummaryInterventionsGoalsData(updatedData);
                            http.post('/pain/pain-summary-interventions-goals/store', updatedData)
                              .then(response => {
                                console.log('Saved successfully', response);
                                // Refresh data after successful save
                                painSummaryInterventionsGoalsById();
                              })
                          }}
                          variant="outlined"
                          sx={{ mb: 2 }}
                        />
                      </FormControl>
                      <Grid container spacing={2}>
                        <Grid item xs={12} md={6}>
                          <FormControl fullWidth>
                            <TextField
                              type="date"
                              label="Achieve By Date"
                              value={painSummaryInterventionsGoalsData.pain_achive_by_date}
                              onChange={(e) => {
                                const updatedData = { ...painSummaryInterventionsGoalsData, pain_achive_by_date: e.target.value, patient_id: id };
                                setPainSummaryInterventionsGoalsData(updatedData);
                                http.post('/pain/pain-summary-interventions-goals/store', updatedData)
                                  .then(response => {
                                    console.log('Saved successfully', response);
                                    // Refresh data after successful save
                                    painSummaryInterventionsGoalsById();
                                  })
                              }}
                              InputLabelProps={{
                                shrink: true,
                              }}
                              variant="outlined"
                              sx={{ mb: 2 }}
                            />
                          </FormControl>
                        </Grid>
                        <Grid item xs={12} md={6}>
                          <FormControl fullWidth>
                            <TextField
                              type="date"
                              label="Start Effective Date"
                              value={painSummaryInterventionsGoalsData.pain_achive_by_date_start_date}
                              onChange={(e) => {
                                const updatedData = { ...painSummaryInterventionsGoalsData, pain_achive_by_date_start_date: e.target.value, patient_id: id };
                                setPainSummaryInterventionsGoalsData(updatedData);
                                http.post('/pain/pain-summary-interventions-goals/store', updatedData)
                                  .then(response => {
                                    console.log('Saved successfully', response);
                                    // Refresh data after successful save
                                    painSummaryInterventionsGoalsById();
                                  })
                              }}  
                              InputLabelProps={{
                                shrink: true,
                              }}
                              variant="outlined"
                              sx={{ mb: 2 }}
                            />
                          </FormControl>
                        </Grid>
                      </Grid>
                    </Grid>
                  </Stack>
                </Grid>
                </Grid>
              </div>
            </Grid>
          </Grid>
        </>
    
    </>
  );
};

export default PainPage;


