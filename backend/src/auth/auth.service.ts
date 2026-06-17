import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { User } from '../users/user.entity';
import { UsersService } from '../users/users.service';
import type { StravaTokenResponse } from './auth.types';

const STRAVA_AUTHORIZE_URL = 'https://www.strava.com/oauth/authorize';
const STRAVA_TOKEN_URL = 'https://www.strava.com/api/v3/oauth/token';

/** Scopes demandés : profil complet (inclut bikes[]) + toutes activités. */
const STRAVA_SCOPES = [
  'read',
  'profile:read_all',
  'activity:read_all',
] as const;

/** Marge avant expiration (s) en-dessous de laquelle on rafraîchit le token de façon préventive. */
const TOKEN_REFRESH_MARGIN_S = 60;

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly users: UsersService,
  ) {
    if (!this.clientId || !this.clientSecret) {
      this.logger.warn(
        "STRAVA_CLIENT_ID / STRAVA_CLIENT_SECRET absents de .env — l'OAuth Strava échouera tant qu'ils ne sont pas renseignés (le reste de l'API fonctionne).",
      );
    }
  }

  private get clientId(): string {
    return this.config.get<string>('STRAVA_CLIENT_ID') ?? '';
  }

  private get clientSecret(): string {
    return this.config.get<string>('STRAVA_CLIENT_SECRET') ?? '';
  }

  private get callbackUrl(): string {
    return (
      this.config.get<string>('STRAVA_CALLBACK_URL') ??
      'http://localhost:3001/auth/callback'
    );
  }

  /** Construit l'URL d'autorisation Strava vers laquelle rediriger l'utilisateur. */
  buildAuthorizeUrl(state: string): string {
    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: this.callbackUrl,
      response_type: 'code',
      // 'force' : Strava réaffiche toujours l'écran d'autorisation, même si
      // l'app est déjà autorisée. Sinon l'aller-retour OAuth est invisible
      // (redirection instantanée) et on a l'impression de ne pas passer par Strava.
      approval_prompt: 'force',
      scope: STRAVA_SCOPES.join(','),
      state,
    });
    return `${STRAVA_AUTHORIZE_URL}?${params.toString()}`;
  }

  /**
   * Échange le `code` reçu au callback contre des tokens + l'athlète,
   * puis persiste (ou met à jour) l'utilisateur en base.
   */
  async exchangeCodeForToken(code: string): Promise<User> {
    const data = await this.postToken({
      client_id: this.clientId,
      client_secret: this.clientSecret,
      code,
      grant_type: 'authorization_code',
    });

    if (!data.athlete) {
      throw new UnauthorizedException(
        "Réponse Strava inattendue : athlète manquant lors de l'échange du code.",
      );
    }

    return this.users.findOrCreate(data.athlete, {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      tokenExpiresAt: data.expires_at,
    });
  }

  /**
   * Renvoie un access token valide, en rafraîchissant via le refresh token
   * si le token est expiré (ou sur le point de l'être). Met à jour la DB si besoin.
   */
  async getValidAccessToken(user: User): Promise<string> {
    const nowS = Math.floor(Date.now() / 1000);
    if (user.tokenExpiresAt - nowS > TOKEN_REFRESH_MARGIN_S) {
      return user.accessToken;
    }

    this.logger.debug('Access token Strava expiré, rafraîchissement…');
    const data = await this.postToken({
      client_id: this.clientId,
      client_secret: this.clientSecret,
      grant_type: 'refresh_token',
      refresh_token: user.refreshToken,
    });

    await this.users.updateTokens(user, {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      tokenExpiresAt: data.expires_at,
    });

    return data.access_token;
  }

  /** Appel bas niveau de POST /oauth/token. */
  private async postToken(
    body: Record<string, string>,
  ): Promise<StravaTokenResponse> {
    const res = await fetch(STRAVA_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams(body).toString(),
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      this.logger.error(
        `POST /oauth/token a échoué (${res.status}): ${detail}`,
      );
      throw new UnauthorizedException(
        `Échec de l'authentification Strava (HTTP ${res.status}).`,
      );
    }

    return (await res.json()) as StravaTokenResponse;
  }
}
