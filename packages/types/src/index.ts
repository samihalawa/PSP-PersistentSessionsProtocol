export interface Cookie {
  name: string;
  value: string;
  domain: string;
  path: string;
  expires: number;
  httpOnly: boolean;
  secure: boolean;
  sameSite?: 'Strict' | 'Lax' | 'None';
}

export interface LocalStorageEntry {
  domain: string;
  data: Record<string, string>;
}

export interface SessionProfile {
  id: string;
  name: string;
  cookies: Cookie[];
  localStorage: LocalStorageEntry[];
  userAgent?: string;
  viewport?: { width: number; height: number };
  createdAt: string; // ISO Date
  updatedAt: string; // ISO Date
}

export interface ConnectResponse {
  browserWSEndpoint: string;
  browserId: string;
  session: SessionProfile;
}
