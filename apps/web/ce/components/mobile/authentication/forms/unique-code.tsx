"use client";

import { FC, useEffect, useRef, useState } from "react";
import { CircleCheck, XCircle } from "lucide-react";
// plane imports
import { EMobileAuthSteps, EMobileAuthModes, TMobileAuthSteps, TMobileAuthModes, API_BASE_URL } from "@plane/constants";
import { Button, Input, Spinner } from "@plane/ui";
// hooks
import useTimer from "@/hooks/use-timer";
// services
import mobileAuthService from "@/plane-web/services/mobile.service";

type TMobileAuthUniqueCodeForm = {
  authMode: TMobileAuthModes;
  invitationId: string | undefined;
  email: string;
  handleEmail: (value: string) => void;
  handleAuthStep: (value: TMobileAuthSteps) => void;
  generateEmailUniqueCode: (email: string) => Promise<{ code: string } | undefined>;
};

type TFormValues = {
  email: string;
  code: string;
};

const defaultFormValues: TFormValues = {
  email: "",
  code: "",
};

const defaultResetTimerValue = 5;

export const MobileAuthUniqueCodeForm: FC<TMobileAuthUniqueCodeForm> = (props) => {
  const { authMode, invitationId, email, handleEmail, handleAuthStep, generateEmailUniqueCode } = props;
  // ref
  const authFormRef = useRef<HTMLFormElement>(null);
  // hooks
  const { timer: resendTimerCode, setTimer: setResendCodeTimer } = useTimer(0);
  // states
  const [csrfPromise, setCsrfPromise] = useState<Promise<{ csrf_token: string }> | undefined>(undefined);
  const [formData, setFormData] = useState<TFormValues>({ ...defaultFormValues, email });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRequestingNewCode, setIsRequestingNewCode] = useState(false);
  // derived values
  const isRequestNewCodeDisabled = isRequestingNewCode || resendTimerCode > 0;
  const isButtonDisabled = isRequestingNewCode || !formData.code || isSubmitting;

  useEffect(() => {
    if (csrfPromise === undefined) {
      const promise = mobileAuthService.requestCSRFToken();
      setCsrfPromise(promise);
    }
  }, [csrfPromise]);

  // handlers
  const handleFormChange = (key: keyof TFormValues, value: string) =>
    setFormData((prev) => ({ ...prev, [key]: value }));

  const handleCSRFToken = async () => {
    if (!authFormRef || !authFormRef.current) return;
    const token = await csrfPromise;
    if (!token?.csrf_token) return;
    const csrfElement = authFormRef.current.querySelector("input[name=csrfmiddlewaretoken]");
    csrfElement?.setAttribute("value", token?.csrf_token);
  };

  const generateNewEmailUniqueCode = async (email: string) => {
    try {
      setIsRequestingNewCode(true);
      const uniqueCode = await generateEmailUniqueCode(email);
      setResendCodeTimer(defaultResetTimerValue);
      handleFormChange("code", uniqueCode?.code || "");
      setIsRequestingNewCode(false);
    } catch {
      setResendCodeTimer(0);
      console.error("Error while requesting new code");
      setIsRequestingNewCode(false);
    }
  };

  const handleFormSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);

    const payload = {
      email: formData.email,
      code: formData.code,
    };

    await handleCSRFToken();

    if (authMode === EMobileAuthModes.SIGN_IN) {
      mobileAuthService
        .signInMagicCode(payload)
        .then((response) => {
          if (response?.token) window.location.replace(`/m/auth?token=${response?.token}`);
        })
        .catch((error) => {
          if (error?.error_code) window.location.replace(`/m/auth?error_code=${error?.error_code}&email=${email}`);
        })
        .finally(() => {
          setIsSubmitting(false);
        });
    } else {
      mobileAuthService
        .signUpMagicCode(payload)
        .then((response) => {
          if (response?.token) window.location.replace(`/m/auth?token=${response?.token}`);
        })
        .catch((error) => {
          if (error?.error_code) window.location.replace(`/m/auth?error_code=${error?.error_code}&email=${email}`);
        })
        .finally(() => {
          setIsSubmitting(false);
        });
    }
  };

  const handleEmailClear = () => {
    handleEmail("");
    handleAuthStep(EMobileAuthSteps.EMAIL);
  };

  return (
    <form onSubmit={handleFormSubmit} ref={authFormRef} className="mt-5 space-y-4">
      <input type="hidden" name="csrfmiddlewaretoken" value="" />
      <div>
        <label className="text-sm text-onboarding-text-300 font-medium" htmlFor="email">
          Email
        </label>
        <div className="relative flex items-center rounded-md bg-onboarding-background-200">
          <Input
            type="email"
            name="email"
            value={formData.email}
            onChange={(e) => handleFormChange("email", e.target.value)}
            placeholder="name@example.com"
            className="disable-autofill-style h-[46px] w-full border border-onboarding-border-100 !bg-onboarding-background-200 pr-12 placeholder:text-onboarding-text-400"
            autoFocus
          />
          {email.length > 0 && (
            <XCircle
              className="absolute right-3 h-5 w-5 stroke-custom-text-400 hover:cursor-pointer"
              onClick={handleEmailClear}
            />
          )}
        </div>
      </div>

      <div>
        <div className="space-y-1">
          <label className="text-sm text-onboarding-text-300 font-medium" htmlFor="code">
            Unique code
          </label>
          <div className="relative flex items-center rounded-md bg-onboarding-background-200">
            <Input
              type="text"
              name="code"
              value={formData.code}
              onChange={(e) => handleFormChange("code", e.target.value)}
              placeholder="Enter unique code"
              className="disable-autofill-style h-[46px] w-full border border-onboarding-border-100 !bg-onboarding-background-200 pr-12 placeholder:text-onboarding-text-400"
            />
            {formData.code.length > 0 && (
              <CircleCheck className="absolute right-3 h-5 w-5 stroke-custom-text-400" />
            )}
          </div>
        </div>
      </div>

      <div className="space-y-2.5">
        <Button type="submit" variant="primary" className="w-full" size="lg" disabled={isButtonDisabled}>
          {isSubmitting ? <Spinner height="20px" width="20px" /> : "Continue"}
        </Button>
        <Button
          type="button"
          onClick={() => generateNewEmailUniqueCode(email)}
          variant="outline-primary"
          className="w-full"
          size="lg"
          disabled={isRequestNewCodeDisabled}
        >
          {resendTimerCode > 0
            ? `Resend code in ${resendTimerCode} seconds`
            : isRequestingNewCode
              ? "Requesting new code..."
              : "Resend code"}
        </Button>
      </div>
    </form>
  );
};
