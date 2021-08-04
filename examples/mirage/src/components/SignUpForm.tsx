import styles from "./SignUpForm.module.css";
import { ReactComponent as UploadIcon } from "../assets/svg/upload.svg";
import { useClerk, useSignUp, withClerk } from "@clerk/clerk-react";
import { useRef, useState } from "react";
import { SubmitHandler, useForm } from "react-hook-form";
import { Button } from "./Button";
import { Input } from "./Input";
import { SignUpFormLayout } from "./layout/SignUpFormLayout";
import { Title } from "./Title";
import { useHistory } from "react-router-dom";

const SIMPLE_REGEX_PATTERN = /^\w+([-+.']\w+)*@\w+([-.]\w+)*\.\w+([-.]\w+)*$/;

type SignUpInputs = {
  email: string;
  code: string;
  firstName: string;
  lastName: string;
  username: string;
  photo?: File[];
};

enum FormSteps {
  EMAIL,
  CODE,
  FIRST_NAME,
  LAST_NAME,
  USERNAME,
  PHOTO,
  SUBMIT,
}

function SignUpForm() {
  const history = useHistory();
  const signUp = useSignUp();
  const clerk = useClerk();
  const [formStep, setFormStep] = useState(FormSteps.EMAIL);
  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors },
  } = useForm<SignUpInputs>({ mode: "all" });
  const [photoSrc, setPhotoSrc] = useState<string>("");
  const fileRef = useRef<HTMLInputElement | null>(null);
  const { ref: fileUploadRef, onChange: onFileChangeHookForm } =
    register("photo");

  const promptForFile = () => {
    fileRef.current?.click();
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.currentTarget.files ?? [];
    if (files[0]) {
      setPhotoSrc(URL.createObjectURL(files[0]));
    }
  };

  const incrementFormStep = function () {
    setFormStep((formStep) => formStep + 1);
  };

  const emailVerification = async function () {
    await sendClerkOtp();
    setFormStep((formStep) => formStep + 1);
  };

  const verifyOtp = async function () {
    const otp = getValues("code");
    const signUpAttempt = await signUp.attemptEmailAddressVerification({
      code: otp,
    });
    if (signUpAttempt.verifications.emailAddress.status === "verified") {
      incrementFormStep();
    }
  };

  const sendClerkOtp = async function () {
    const emailAddress = getValues("email");
    const signUpAttempt = await signUp.create({
      emailAddress,
    });
    await signUpAttempt.prepareEmailAddressVerification();
  };

  const onSubmit: SubmitHandler<SignUpInputs> = async ({
    firstName,
    username,
    lastName,
  }) => {
    const signUpAttempt = await signUp.update({
      username,
      firstName,
      lastName,
    });
    if (signUpAttempt.status === "complete") {
      await clerk.setSession(signUpAttempt.createdSessionId);
      const photo = getValues("photo")?.[0];
      if (photo) {
        await clerk.user?.setProfileImage(photo);
      }
      history.replace("/");
    }
  };

  return (
    <SignUpFormLayout>
      <form
        onSubmit={handleSubmit(async (formData) => await onSubmit(formData))}
      >
        <div className={styles.signUpFields}>
          {formStep === FormSteps.EMAIL && (
            <>
              <Title>What’s your email address?</Title>
              <Input
                {...register("email", {
                  required: true,
                  pattern: SIMPLE_REGEX_PATTERN,
                })}
              />
              <Button
                disabled={!getValues("email") || Boolean(errors["email"])}
                onClick={async () => await emailVerification()}
              >
                Continue
              </Button>
            </>
          )}
          {formStep === FormSteps.CODE && (
            <>
              <Title>Enter the confirmation code</Title>
              <span className={styles.sub}>
                A 6-digit code was just sent to <br />
                {getValues("email")}
              </span>
              <Input
                {...register("code", {
                  required: true,
                  maxLength: 6,
                  minLength: 6,
                })}
              />
              <Button
                disabled={!getValues("code") || Boolean(errors["code"])}
                onClick={async () => await verifyOtp()}
              >
                Continue
              </Button>
            </>
          )}
          {formStep === FormSteps.FIRST_NAME && (
            <>
              <Title>What’s your first name?</Title>
              <Input
                {...register("firstName", { required: true, minLength: 2 })}
              />
              <Button
                onClick={incrementFormStep}
                disabled={
                  !getValues("firstName") || Boolean(errors["firstName"])
                }
              >
                Continue
              </Button>
            </>
          )}
          {formStep === FormSteps.LAST_NAME && (
            <>
              <Title>What’s your last name?</Title>
              <Input
                {...register("lastName", { required: true, minLength: 2 })}
              />
              <Button
                onClick={incrementFormStep}
                disabled={!getValues("lastName") || Boolean(errors["lastName"])}
              >
                Continue
              </Button>
            </>
          )}
          {formStep === FormSteps.USERNAME && (
            <>
              <Title>Create your username</Title>
              <Input
                {...register("username", { required: true, minLength: 2 })}
              />
              <Button
                onClick={incrementFormStep}
                disabled={!getValues("username") || Boolean(errors["username"])}
              >
                Continue
              </Button>
            </>
          )}
          {formStep === FormSteps.PHOTO && (
            <>
              <Title>Upload a photo</Title>
              <input
                onChange={(e) => {
                  onFileChangeHookForm(e);
                  onFileChange(e);
                }}
                name="photo"
                ref={(e) => {
                  fileUploadRef(e);
                  fileRef.current = e;
                }}
                type="file"
                accept="image/jpeg,
              image/png,
              image/gif,
              image/webp"
                className={styles.fileInput}
              />
              {photoSrc ? (
                <img
                  src={photoSrc}
                  className={styles.profileImg}
                  alt="profile"
                />
              ) : (
                <button
                  type="button"
                  onClick={promptForFile}
                  className={styles.fileButton}
                >
                  <UploadIcon />
                </button>
              )}
              <Button
                disabled={!getValues("photo")}
                onClick={incrementFormStep}
              >
                Continue
              </Button>
              <button
                type="button"
                className={styles.skipUpload}
                onClick={incrementFormStep}
              >
                Skip
              </button>
            </>
          )}
          {formStep === FormSteps.SUBMIT && (
            <Button type="submit">Create your account &nbsp; 🎉</Button>
          )}
        </div>
      </form>
    </SignUpFormLayout>
  );
}

export const SignUpFormWithClerk = withClerk(SignUpForm);
