'use client';

import {
  Box,
  Typography,
  Stack,
  Grid,
  FormControl,
  FormControlLabel,
  RadioGroup,
  Radio,
  Chip,
  Alert,
  useTheme,
  alpha,
  Divider
} from '@mui/material';
import { useCallback, useMemo } from 'react';
import { Warning2 } from 'iconsax-react';

// ==============================|| INTERFACES ||============================== //

export interface PAINADScores {
  breathing: number | null;
  vocalization: number | null;
  facialExpression: number | null;
  bodyLanguage: number | null;
  consolability: number | null;
}

export interface PAINADScaleProps {
  /** Current scores for each category */
  value: PAINADScores;
  /** Callback when any score changes */
  onChange: (scores: PAINADScores) => void;
  /** Whether the component is disabled */
  disabled?: boolean;
  /** Label for the component */
  label?: string;
  /** Help text to display */
  helpText?: string;
  /** Optional ID for accessibility */
  id?: string;
}

// ==============================|| CONSTANTS ||============================== //

interface CategoryOption {
  value: number;
  label: string;
  description: string;
}

interface CategoryConfig {
  key: keyof PAINADScores;
  name: string;
  description: string;
  options: CategoryOption[];
}

const PAINAD_CATEGORIES: CategoryConfig[] = [
  {
    key: 'breathing',
    name: 'Breathing (Independent of Vocalization)',
    description: 'Observe respiratory pattern and effort',
    options: [
      { value: 0, label: 'Normal', description: 'Normal breathing' },
      { value: 1, label: 'Occasional labored breathing', description: 'Occasional labored breathing, short period of hyperventilation' },
      { value: 2, label: 'Noisy labored breathing', description: 'Noisy labored breathing, long period of hyperventilation, Cheyne-Stokes respirations' }
    ]
  },
  {
    key: 'vocalization',
    name: 'Negative Vocalization',
    description: 'Listen for verbal or non-verbal sounds indicating distress',
    options: [
      { value: 0, label: 'None', description: 'No negative vocalization' },
      { value: 1, label: 'Occasional moan or groan', description: 'Occasional moan or groan, low-level speech with negative or disapproving quality' },
      { value: 2, label: 'Repeated troubled calling out', description: 'Repeated troubled calling out, loud moaning or groaning, crying' }
    ]
  },
  {
    key: 'facialExpression',
    name: 'Facial Expression',
    description: 'Observe face for signs of discomfort',
    options: [
      { value: 0, label: 'Smiling or inexpressive', description: 'Smiling or inexpressive' },
      { value: 1, label: 'Sad, frightened, frown', description: 'Sad, frightened, frown' },
      { value: 2, label: 'Facial grimacing', description: 'Facial grimacing' }
    ]
  },
  {
    key: 'bodyLanguage',
    name: 'Body Language',
    description: 'Observe posture, movements, and muscle tension',
    options: [
      { value: 0, label: 'Relaxed', description: 'Relaxed' },
      { value: 1, label: 'Tense, distressed pacing, fidgeting', description: 'Tense, distressed pacing, fidgeting' },
      { value: 2, label: 'Rigid, fists clenched, knees pulled up', description: 'Rigid, fists clenched, knees pulled up, striking out, pulling or pushing away' }
    ]
  },
  {
    key: 'consolability',
    name: 'Consolability',
    description: 'Assess ability to be comforted by voice or touch',
    options: [
      { value: 0, label: 'No need to console', description: 'No need to console' },
      { value: 1, label: 'Distracted or reassured by voice or touch', description: 'Distracted or reassured by voice or touch' },
      { value: 2, label: 'Unable to console, distract, or reassure', description: 'Unable to console, distract, or reassure' }
    ]
  }
];

const getTotalScoreInterpretation = (total: number): { label: string; color: 'success' | 'warning' | 'error'; description: string } => {
  if (total <= 3) {
    return {
      label: 'Mild Pain',
      color: 'success',
      description: 'Continue current pain management. Reassess as needed.'
    };
  }
  if (total <= 6) {
    return {
      label: 'Moderate Pain',
      color: 'warning',
      description: 'Consider pain intervention. Reassess within 30-60 minutes after intervention.'
    };
  }
  return {
    label: 'Severe Pain',
    color: 'error',
    description: 'Immediate pain intervention required. Reassess within 15-30 minutes after intervention.'
  };
};

// ==============================|| PAINAD SCALE COMPONENT ||============================== //

const PAINADScale = ({
  value,
  onChange,
  disabled = false,
  label = 'PAINAD Scale (Pain Assessment in Advanced Dementia)',
  helpText = 'Observe the patient for 5 minutes before scoring. Score each category based on your observations. This scale is designed for patients who cannot verbalize their pain.',
  id = 'painad-scale'
}: PAINADScaleProps) => {
  const theme = useTheme();

  const handleScoreChange = useCallback((category: keyof PAINADScores, score: number) => {
    if (!disabled) {
      onChange({
        ...value,
        [category]: score
      });
    }
  }, [disabled, onChange, value]);

  const totalScore = useMemo(() => {
    const scores = Object.values(value);
    if (scores.some(s => s === null)) return null;
    return scores.reduce((sum, score) => (sum ?? 0) + (score ?? 0), 0);
  }, [value]);

  const completedCategories = useMemo(() => {
    return Object.values(value).filter(s => s !== null).length;
  }, [value]);

  const isComplete = completedCategories === 5;

  const interpretation = totalScore !== null ? getTotalScoreInterpretation(totalScore) : null;

  return (
    <Box
      id={id}
      role="form"
      aria-labelledby={`${id}-label`}
      sx={{ width: '100%' }}
    >
      {/* Header */}
      <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 1 }}>
        <Typography
          id={`${id}-label`}
          variant="subtitle1"
          fontWeight={600}
        >
          {label}
        </Typography>
        <Chip
          label={`${completedCategories}/5 completed`}
          size="small"
          color={isComplete ? 'success' : 'default'}
        />
      </Stack>

      {/* Help Text */}
      {helpText && (
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ mb: 3 }}
        >
          {helpText}
        </Typography>
      )}

      {/* Categories */}
      <Stack spacing={3}>
        {PAINAD_CATEGORIES.map((category, categoryIndex) => (
          <Box
            key={category.key}
            sx={{
              p: 2,
              borderRadius: 2,
              border: `1px solid ${theme.palette.divider}`,
              bgcolor: value[category.key] !== null
                ? alpha(theme.palette.primary.main, 0.02)
                : 'transparent'
            }}
          >
            <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 0.5 }}>
              {categoryIndex + 1}. {category.name}
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
              {category.description}
            </Typography>

            <FormControl component="fieldset" disabled={disabled} fullWidth>
              <RadioGroup
                aria-label={category.name}
                name={category.key}
                value={value[category.key] ?? ''}
                onChange={(e) => handleScoreChange(category.key, parseInt(e.target.value))}
              >
                <Grid container spacing={1}>
                  {category.options.map((option) => (
                    <Grid item xs={12} key={option.value}>
                      <FormControlLabel
                        value={option.value}
                        control={
                          <Radio
                            size="small"
                            sx={{
                              '&.Mui-checked': {
                                color: option.value === 0
                                  ? theme.palette.success.main
                                  : option.value === 1
                                    ? theme.palette.warning.main
                                    : theme.palette.error.main
                              }
                            }}
                          />
                        }
                        label={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Chip
                              label={option.value}
                              size="small"
                              sx={{
                                minWidth: 24,
                                height: 24,
                                bgcolor: value[category.key] === option.value
                                  ? option.value === 0
                                    ? theme.palette.success.main
                                    : option.value === 1
                                      ? theme.palette.warning.main
                                      : theme.palette.error.main
                                  : alpha(theme.palette.grey[500], 0.1),
                                color: value[category.key] === option.value
                                  ? theme.palette.common.white
                                  : 'inherit',
                                fontWeight: 600
                              }}
                            />
                            <Typography variant="body2">
                              <strong>{option.label}:</strong> {option.description}
                            </Typography>
                          </Box>
                        }
                        sx={{
                          mx: 0,
                          py: 0.5,
                          px: 1,
                          borderRadius: 1,
                          width: '100%',
                          bgcolor: value[category.key] === option.value
                            ? alpha(
                                option.value === 0
                                  ? theme.palette.success.main
                                  : option.value === 1
                                    ? theme.palette.warning.main
                                    : theme.palette.error.main,
                                0.08
                              )
                            : 'transparent',
                          '&:hover': {
                            bgcolor: alpha(theme.palette.primary.main, 0.04)
                          }
                        }}
                      />
                    </Grid>
                  ))}
                </Grid>
              </RadioGroup>
            </FormControl>
          </Box>
        ))}
      </Stack>

      <Divider sx={{ my: 3 }} />

      {/* Total Score Display */}
      <Box
        sx={{
          p: 3,
          borderRadius: 2,
          bgcolor: interpretation
            ? alpha(
                interpretation.color === 'success'
                  ? theme.palette.success.main
                  : interpretation.color === 'warning'
                    ? theme.palette.warning.main
                    : theme.palette.error.main,
                0.1
              )
            : alpha(theme.palette.grey[500], 0.1),
          border: `2px solid ${
            interpretation
              ? interpretation.color === 'success'
                ? theme.palette.success.main
                : interpretation.color === 'warning'
                  ? theme.palette.warning.main
                  : theme.palette.error.main
              : theme.palette.grey[300]
          }`
        }}
      >
        <Stack direction={{ xs: 'column', sm: 'row' }} alignItems="center" justifyContent="space-between" spacing={2}>
          <Box sx={{ textAlign: { xs: 'center', sm: 'left' } }}>
            <Typography variant="overline" color="text.secondary">
              Total Score
            </Typography>
            <Typography
              variant="h2"
              sx={{
                fontWeight: 700,
                color: interpretation
                  ? interpretation.color === 'success'
                    ? theme.palette.success.main
                    : interpretation.color === 'warning'
                      ? theme.palette.warning.main
                      : theme.palette.error.main
                  : 'text.disabled'
              }}
            >
              {totalScore !== null ? totalScore : '--'}/10
            </Typography>
          </Box>

          {interpretation && (
            <Box sx={{ textAlign: { xs: 'center', sm: 'right' } }}>
              <Chip
                label={interpretation.label}
                color={interpretation.color}
                sx={{ fontWeight: 600, mb: 1 }}
              />
              <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 300 }}>
                {interpretation.description}
              </Typography>
            </Box>
          )}

          {!isComplete && (
            <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
              Complete all categories to see interpretation
            </Typography>
          )}
        </Stack>
      </Box>

      {/* Severe Pain Alert */}
      {totalScore !== null && totalScore >= 7 && (
        <Alert
          severity="error"
          icon={<Warning2 size={20} />}
          sx={{ mt: 2 }}
        >
          <Typography variant="subtitle2">Severe Pain Detected</Typography>
          <Typography variant="body2">
            Immediate intervention is recommended. Consider contacting the physician for pain management orders.
          </Typography>
        </Alert>
      )}
    </Box>
  );
};

export default PAINADScale;
