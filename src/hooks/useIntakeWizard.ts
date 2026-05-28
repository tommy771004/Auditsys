import { useState } from "react";
export interface IntakeFormState {
  companyName: string;
  contactEmail: string;
  url: string;
  goals: string[];
  stack: string[];
  teamSize: string;
  notes: string;
}

interface UseIntakeWizardResult {
  currentStep: number;
  formState: IntakeFormState;
  isLoading: boolean;
  isError: boolean;
  isSuccess: boolean;
  errorKey: string | null;
  progressValue: number;
  updateField: <Key extends keyof IntakeFormState>(field: Key, value: IntakeFormState[Key]) => void;
  toggleSelection: (field: "goals" | "stack", value: string) => void;
  nextStep: () => void;
  previousStep: () => void;
  submitWizard: () => Promise<void>;
}

const TOTAL_STEPS = 3;

function isValidUrl(value: string): boolean {
  try {
    const parsedUrl = new URL(value);
    return parsedUrl.protocol === "http:" || parsedUrl.protocol === "https:";
  } catch {
    return false;
  }
}

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function validateStep(step: number, formState: IntakeFormState): string | null {
  if (!formState.url.trim()) {
    return "validation.requiredUrl";
  }

  if (!isValidUrl(formState.url.trim())) {
    return "validation.invalidUrl";
  }

  if (step >= 1 && formState.goals.length === 0) {
    return "validation.requiredGoal";
  }

  if (step >= 2 && formState.stack.length === 0) {
    return "validation.requiredStack";
  }

  if (step >= 3 && !formState.companyName.trim()) {
    return "validation.requiredCompany";
  }

  if (step >= 3 && !formState.contactEmail.trim()) {
    return "validation.requiredEmail";
  }

  if (step >= 3 && !isValidEmail(formState.contactEmail.trim())) {
    return "validation.invalidEmail";
  }

  return null;
}

export function useIntakeWizard(): UseIntakeWizardResult {
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [formState, setFormState] = useState<IntakeFormState>({
    companyName: "",
    contactEmail: "",
    url: "",
    goals: [],
    stack: [],
    teamSize: "mid",
    notes: "",
  });
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isError, setIsError] = useState<boolean>(false);
  const [isSuccess, setIsSuccess] = useState<boolean>(false);
  const [errorKey, setErrorKey] = useState<string | null>(null);

  const resetStatus = () => {
    setIsError(false);
    setIsSuccess(false);
    setErrorKey(null);
  };

  const updateField = <Key extends keyof IntakeFormState>(field: Key, value: IntakeFormState[Key]) => {
    resetStatus();
    setFormState((currentValue) => ({
      ...currentValue,
      [field]: value,
    }));
  };

  const toggleSelection = (field: "goals" | "stack", value: string) => {
    resetStatus();
    setFormState((currentValue) => {
      const nextValues = currentValue[field].includes(value)
        ? currentValue[field].filter((item) => item !== value)
        : [...currentValue[field], value];

      return {
        ...currentValue,
        [field]: nextValues,
      };
    });
  };

  const nextStep = () => {
    const validationError = validateStep(currentStep, formState);

    if (validationError) {
      setIsError(true);
      setErrorKey(validationError);
      return;
    }

    resetStatus();
    setCurrentStep((currentValue) => Math.min(currentValue + 1, TOTAL_STEPS));
  };

  const previousStep = () => {
    resetStatus();
    setCurrentStep((currentValue) => Math.max(currentValue - 1, 1));
  };

  const submitWizard = async () => {
    const validationError = validateStep(TOTAL_STEPS, formState);

    if (validationError) {
      setIsError(true);
      setErrorKey(validationError);
      return;
    }

    resetStatus();
    setIsLoading(true);

    try {
      // Small delay for UI feedback
      await new Promise((resolve) => window.setTimeout(resolve, 600));

      // Instead of running the LLM audit here, we just signal success
      // and let AuditConsole.tsx handle the actual API call to /api/intake.
      // We will save the form state in Home/Intake to pass to the console.
      
      setIsSuccess(true);
    } catch (error: any) {
      setIsError(true);
      setErrorKey("validation.submitFailed");
    } finally {
      setIsLoading(false);
    }
  };

  return {
    currentStep,
    formState,
    isLoading,
    isError,
    isSuccess,
    errorKey,
    progressValue: (currentStep / TOTAL_STEPS) * 100,
    updateField,
    toggleSelection,
    nextStep,
    previousStep,
    submitWizard,
  };
}
