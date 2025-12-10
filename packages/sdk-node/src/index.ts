import axios from 'axios';
import { ConnectResponse, SessionProfile } from '@samihalawa/psp-types';

export class PSPClient {
  private apiUrl: string;
  private apiKey?: string;

  constructor(apiUrl: string = 'http://localhost:3000', apiKey?: string) {
    this.apiUrl = apiUrl.replace(/\/$/, '');
    this.apiKey = apiKey;
  }

  private get headers() {
    return this.apiKey ? { Authorization: `Bearer ${this.apiKey}` } : {};
  }

  async getSession(id: string): Promise<SessionProfile> {
    const { data } = await axios.get<SessionProfile>(`${this.apiUrl}/api/v1/sessions/${id}`, {
      headers: this.headers
    });
    return data;
  }

  async connect(id: string): Promise<ConnectResponse> {
    const { data } = await axios.post<ConnectResponse>(`${this.apiUrl}/api/v1/sessions/${id}/connect`, {}, {
      headers: this.headers
    });
    return data;
  }
}
