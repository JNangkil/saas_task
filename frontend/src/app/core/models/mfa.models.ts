export interface MfaSetupRequest {
    password: string;
}

export interface MfaSetupResponse {
    qr_code_url: string;
    secret: string;
    recovery_codes: string[];
}

export interface MfaEnableRequest {
    code: string;
}

export interface MfaEnableResponse {
    message: string;
}

export interface MfaDisableRequest {
    password: string;
}

export interface MfaDisableResponse {
    message: string;
}

export interface MfaVerifyRequest {
    email: string;
    password: string;
    code?: string;
    recovery_code?: string;
}

export interface MfaVerifyResponse {
    access_token: string;
    refresh_token: string;
    token_type: string;
    expires_in: number;
    user: {
        id: number;
        name: string;
        email: string;
        avatar?: string;
    };
}

export interface MfaStatus {
    enabled: boolean;
    setup_completed: boolean;
}

export interface MfaLoginRequest {
    email: string;
    password: string;
}

export interface MfaLoginResponse {
    requires_mfa: boolean;
    mfa_token?: string;
    message?: string;
}