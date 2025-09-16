export interface GoogleUser {
  id: string;
  email: string;
  name?: string;
  picture?: string;
  given_name?: string;
  family_name?: string;
  locale?: string;
}

export interface GoogleSignInResponse {
  credential?: string;
  clientId?: string;
  select_by?: string;
}

export interface AuthError {
  code: string;
  message: string;
  status?: number;
}

export interface AuthCallbackParams {
  access_token?: string;
  expires_in?: string;
  refresh_token?: string;
  token_type?: string;
  type?: 'recovery' | 'signup' | 'signin' | 'magiclink';
  error?: string;
  error_description?: string;
}

export interface PasswordResetToken {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token?: string;
  user: {
    id: string;
    email: string;
    aud: string;
    role: string;
    email_confirmed_at: string;
    recovery_sent_at?: string;
  };
}

export interface PasswordStrength {
  length: boolean;
  lowercase: boolean;
  uppercase: boolean;
  number: boolean;
  special: boolean;
  score: number; // 0-4 strength score
}

export interface AuthModalState {
  isOpen: boolean;
  mode: 'signin' | 'signup' | 'reset';
  loading: boolean;
  error?: string;
  success?: string;
}

export interface AuthFormData {
  email: string;
  password: string;
  confirmPassword?: string;
  displayName?: string;
  acceptTerms?: boolean;
}

export interface AuthProviderConfig {
  google: {
    clientId: string;
    redirectUri: string;
    scopes: string[];
  };
  supabase: {
    url: string;
    anonKey: string;
    redirectTo: string;
  };
}