"use client";

import { FC, useEffect, useRef, useState } from "react";
import { Eye, EyeOff, XCircle } from "lucide-react";
import {
  EMobileAuthSteps,
  EMobileAuthModes,
  API_BASE_URL,
  E_PASSWORD_STRENGTH,
} from "@plane/constants";
import type {
  TMobileAuthSteps,
  TMobileAuthModes,
} from "@plane/constants";
import type { ICsrfTokenData } from "@plane/types";
import { Button, Input, Spinner } from "@plane/ui";
import { getPasswordStrength } from "@plane/utils";
// services
import mobileAuthService from "@/plane-web/services/mobile.service";
// components
import { MobilePasswordStrengthMeter } from "./password-strength-meter";

type TMobileAuthPasswordForm = {
  authMode: TMobileAuthModes;
  invitationId: string | undefined;
  email: string;
  handleEmail: (value: string) => void;
  handleAuthStep: (value: TMobileAuthSteps) => void;
  generateEmailUniqueCode: (email: string) => Promise<{ code: string } | undefined>;
  isSMTPConfigured: boolean;
};

type TFormValues = {
  email: string;
  password: string;
  passwordConfirmation: string;
};
type TShowPassword = {
  password: boolean;
  passwordConfirmation: boolean;
};

const defaultFormValues: TFormValues = {
  email: "",
  password: "",
  passwordConfirmation: "",
};

export const MobileAuthPasswordForm: FC<TMobileAuthPasswordForm> = (props) => {
  const { authMode, invitationId, email, handleEmail, handleAuthStep, generateEmailUniqueCode, isSMTPConfigured } =
    props;
  // ref
  const authFormRef = useRef<HTMLFormElement>(null);
  // states
  const [csrfPromise, setCsrfPromise] = useState<Promise<ICsrfTokenData> | undefined>(undefined);
  const [formData, setFormData] = useState<TFormValues>({ ...defaultFormValues, email });
  const [showPassword, setShowPassword] = useState<TShowPassword>({ password: false, passwordConfirmation: false });
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [passwordInputFocused, setPasswordInputFocused] = useState<TShowPassword>({
    password: false,
    passwordConfirmation: false,
  });

  useEffect(() => {
    if (csrfPromise === undefined) {
      const promise = mobileAuthService.requestCSRFToken();
      setCsrfPromise(promise);
    }
  }, [csrfPromise]);

  const handleFormChange = (key: keyof TFormValues, value: string) =>
    setFormData((prev) => ({ ...prev, [key]: value }));

  const handleShowPassword = (key: keyof TShowPassword) => setShowPassword((prev) => ({ ...prev, [key]: !prev[key] }));

  const handlePasswordInputFocused = (key: keyof TShowPassword) =>
    setPasswordInputFocused((prev) => ({ ...prev, [key]: !prev[key] }));

  const handleCSRFToken = async () => {
    if (!authFormRef || !authFormRef.current) return;
    const token = await csrfPromise;
    if (!token?.csrf_token) return;
    const csrfElement = authFormRef.current.querySelector("input[name=csrfmiddlewaretoken]");
    csrfElement?.setAttribute("value", token?.csrf_token);
  };

  const handleEmailClear = () => {
    handleEmail("");
    handleAuthStep(EMobileAuthSteps.EMAIL);
  };

  const redirectToUniqueCodeSignIn = () => {
    handleAuthStep(EMobileAuthSteps.UNIQUE_CODE);
    // generate unique code
    generateEmailUniqueCode(email);
  };

  // signup password confirmation derived values and handlers
  const isPasswordConfirmationRequired = authMode === EMobileAuthModes.SIGN_UP;
  const isPasswordStrengthValid = getPasswordStrength(formData.password) === E_PASSWORD_STRENGTH.STRENGTH_VALID;

  const verifyPasswordStrength = () => {
    if (isPasswordStrengthValid) return;
    handleFormChange("password", "");
    handleFormChange("passwordConfirmation", "");
  };

  const isPasswordConfirmationEnabled =
    formData.password.length > 0 && isPasswordStrengthValid && formData.password === formData.passwordConfirmation;

  const isPasswordConfirmationErrorStatus =
    formData.passwordConfirmation.length > 0 && formData.password !== formData.passwordConfirmation;

  const isButtonDisabled =
    !formData.password || !isPasswordStrengthValid || isSubmitting || isPasswordConfirmationErrorStatus;

  const handleFormSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!isPasswordConfirmationRequired || !isPasswordStrengthValid) {
      verifyPasswordStrength();
      return;
    }

    setIsSubmitting(true);
    const payload = {
      email: formData.email,
      password: formData.password,
    };

    await handleCSRFToken();

    if (authMode === EMobileAuthModes.SIGN_IN) {
      mobileAuthService
        .signIn(payload)
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
        .signUp(payload)
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

  return (
    <form onSubmit={handleFormSubmit} ref={authFormRef} className="mt-5 space-y-4">
      <input type="hidden" name="csrfmiddlewaretoken" value="" />
      <div>
        <div className="space-y-1">
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
              disabled={!isPasswordConfirmationRequired}
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
      </div>

      <div>
        <div className="space-y-1">
          <label className="text-sm text-onboarding-text-300 font-medium" htmlFor="password">
            Password
          </label>
          <div className="relative flex items-center rounded-md bg-onboarding-background-200">
            <Input
              type={showPassword?.password ? "text" : "password"}
              name="password"
              value={formData.password}
              onChange={(e) => handleFormChange("password", e.target.value)}
              placeholder="Enter password"
              className="disable-autofill-style h-[46px] w-full border border-onboarding-border-100 !bg-onboarding-background-200 pr-12 placeholder:text-onboarding-text-400"
              autoFocus
              onFocus={() => handlePasswordInputFocused("password")}
              onBlur={() => handlePasswordInputFocused("password")}
            />
            {showPassword?.password ? (
              <EyeOff
                className="absolute right-3 h-5 w-5 stroke-custom-text-400 hover:cursor-pointer"
                onClick={() => handleShowPassword("password")}
              />
            ) : (
              <Eye
                className="absolute right-3 h-5 w-5 stroke-custom-text-400 hover:cursor-pointer"
                onClick={() => handleShowPassword("password")}
              />
            )}
          </div>
        </div>
        {isPasswordConfirmationRequired &&
          ((formData.password.length > 0 && !isPasswordStrengthValid) || passwordInputFocused.password) && (
            <MobilePasswordStrengthMeter password={formData.password} isFocused={passwordInputFocused.password} />
          )}
      </div>

      {isPasswordConfirmationRequired && (
        <div>
          <div className="space-y-1">
            <label className="text-sm text-onboarding-text-300 font-medium" htmlFor="password">
              Confirm Password
            </label>
            <div className="relative flex items-center rounded-md bg-onboarding-background-200">
              <Input
                type={showPassword?.passwordConfirmation ? "text" : "password"}
                name="passwordConfirmation"
                value={formData.passwordConfirmation}
                onChange={(e) => handleFormChange("passwordConfirmation", e.target.value)}
                placeholder="Enter password"
                className="disable-autofill-style h-[46px] w-full border border-onboarding-border-100 !bg-onboarding-background-200 pr-12 placeholder:text-onboarding-text-400"
                disabled={!isPasswordConfirmationEnabled}
                onFocus={() => handlePasswordInputFocused("passwordConfirmation")}
                onBlur={() => handlePasswordInputFocused("passwordConfirmation")}
              />
              {showPassword?.passwordConfirmation ? (
                <EyeOff
                  className="absolute right-3 h-5 w-5 stroke-custom-text-400 hover:cursor-pointer"
                  onClick={() => handleShowPassword("passwordConfirmation")}
                />
              ) : (
                <Eye
                  className="absolute right-3 h-5 w-5 stroke-custom-text-400 hover:cursor-pointer"
                  onClick={() => handleShowPassword("passwordConfirmation")}
                />
              )}
            </div>
          </div>
          {isPasswordConfirmationErrorStatus && (
            <span className="text-sm text-red-500">Passwords don&apos;t match</span>
          )}
        </div>
      )}

      <div className="space-y-2.5">
        <Button type="submit" variant="primary" className="w-full" size="lg" disabled={isButtonDisabled}>
          {isSubmitting ? <Spinner height="20px" width="20px" /> : isSMTPConfigured ? "Continue" : "Go to workspace"}
        </Button>

        {isSMTPConfigured && (
          <Button
            type="button"
            onClick={redirectToUniqueCodeSignIn}
            variant="outline-primary"
            className="w-full"
            size="lg"
          >
            Sign in with unique code
          </Button>
        )}
      </div>
    </form>
  );
};
