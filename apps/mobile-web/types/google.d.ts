// Type declarations for Google Identity Services (GIS)
// https://developers.google.com/identity/gsi/web/reference/js-reference

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (response: GoogleCredentialResponse) => void;
            auto_select?: boolean;
            cancel_on_tap_outside?: boolean;
            context?: "signin" | "signup" | "use";
            itp_support?: boolean;
            login_uri?: string;
            native_callback?: (response: GoogleCredentialResponse) => void;
            nonce?: string;
            state_cookie_domain?: string;
            ux_mode?: "popup" | "redirect";
          }) => void;
          renderButton: (
            element: HTMLElement,
            config: {
              theme?: "outline" | "filled_blue" | "filled_black";
              size?: "large" | "medium" | "small";
              type?: "standard" | "icon";
              text?: "signin_with" | "signup_with" | "continue_with" | "signin";
              shape?: "rectangular" | "pill" | "circle" | "square";
              logo_alignment?: "left" | "center";
              width?: string | number;
              locale?: string;
            },
          ) => void;
          prompt: (momentListener?: (notification: PromptMomentNotification) => void) => void;
          disableAutoSelect: () => void;
          storeCredential: (
            credential: { id: string; password: string },
            callback?: () => void,
          ) => void;
          cancel: () => void;
          revoke: (hint: string, callback?: (response: RevocationResponse) => void) => void;
        };
      };
    };
  }
}

interface GoogleCredentialResponse {
  credential: string;
  select_by?:
    | "auto"
    | "user"
    | "user_1tap"
    | "user_2tap"
    | "btn"
    | "btn_confirm"
    | "btn_add_session"
    | "btn_confirm_add_session";
  clientId?: string;
}

interface PromptMomentNotification {
  isDisplayMoment: () => boolean;
  isDisplayed: () => boolean;
  isNotDisplayed: () => boolean;
  getNotDisplayedReason: () =>
    | "browser_not_supported"
    | "invalid_client"
    | "missing_client_id"
    | "opt_out_or_no_session"
    | "secure_http_required"
    | "suppressed_by_user"
    | "unregistered_origin"
    | "unknown_reason";
  isSkippedMoment: () => boolean;
  getSkippedReason: () => "auto_cancel" | "user_cancel" | "tap_outside" | "issuing_failed";
  isDismissedMoment: () => boolean;
  getDismissedReason: () => "credential_returned" | "cancel_called" | "flow_restarted";
  getMomentType: () => "display" | "skipped" | "dismissed";
}

interface RevocationResponse {
  successful: boolean;
  error?: string;
}

export {};
