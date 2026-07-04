import axios, { type AxiosInstance } from "axios";
import { API_BASE_URL } from "@plane/constants";
import type {
  ICsrfTokenData,
  IEmailCheckData,
  IEmailCheckResponse,
  IUser,
  IWorkspaceMemberInvitation,
} from "@plane/types";

export class MobileAuthService {
  axiosInstance: AxiosInstance;
  constructor() {
    this.axiosInstance = axios.create({
      baseURL: API_BASE_URL,
      withCredentials: true,
    });
  }

  requestCSRFToken = async (): Promise<ICsrfTokenData> =>
    this.axiosInstance
      .get("/auth/get-csrf-token/")
      .then((response) => response.data)
      .catch((error) => {
        throw error;
      });

  emailCheck = async (data: IEmailCheckData): Promise<IEmailCheckResponse> =>
    this.axiosInstance
      .post("/auth/mobile/email-check/", data, { headers: {} })
      .then((response) => response?.data)
      .catch((error) => {
        throw error?.response?.data;
      });

  generateUniqueCode = async (data: { email: string }): Promise<void> =>
    this.axiosInstance
      .post("/auth/mobile/magic-generate/", data, { headers: {} })
      .then((response) => response?.data)
      .catch((error) => {
        throw error?.response?.data;
      });

  currentUser = async (): Promise<IUser> =>
    this.axiosInstance
      .get("/api/users/me/")
      .then((response) => response?.data)
      .catch((error) => {
        throw error?.response;
      });

  signOut = async (): Promise<void> =>
    this.axiosInstance
      .post("/auth/mobile/sign-out/", {})
      .then((response) => response.data)
      .catch((error) => {
        throw error;
      });

  // mobile sign in with password
  signIn = async (data: { email: string; password: string }): Promise<{ token: string }> =>
    this.axiosInstance
      .post("/auth/mobile/sign-in/", data, { headers: {} })
      .then((response) => response?.data)
      .catch((error) => {
        throw error?.response?.data;
      });

  // mobile sign up with password
  signUp = async (data: { email: string; password: string }): Promise<{ token: string }> =>
    this.axiosInstance
      .post("/auth/mobile/sign-up/", data, { headers: {} })
      .then((response) => response?.data)
      .catch((error) => {
        throw error?.response?.data;
      });

  // mobile sign in with magic code
  signInMagicCode = async (data: { email: string; code: string }): Promise<{ token: string }> =>
    this.axiosInstance
      .post("/auth/mobile/magic-sign-in/", data, { headers: {} })
      .then((response) => response?.data)
      .catch((error) => {
        throw error?.response?.data;
      });

  // mobile sign up with magic code
  signUpMagicCode = async (data: { email: string; code: string }): Promise<{ token: string }> =>
    this.axiosInstance
      .post("/auth/mobile/magic-sign-up/", data, { headers: {} })
      .then((response) => response?.data)
      .catch((error) => {
        throw error?.response?.data;
      });

  // mobile workspace invitation
  fetchWorkspaceInvitation = async (data: {
    invitation_id: string;
    email: string;
  }): Promise<IWorkspaceMemberInvitation | undefined> =>
    this.axiosInstance
      .get(`/api/mobile/workspace-invitation/${data?.invitation_id}/${data?.email}/`)
      .then((response) => response.data)
      .catch((error) => {
        throw error;
      });
}

const mobileAuthService = new MobileAuthService();

export default mobileAuthService;
