import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import session from 'express-session';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const config = app.get(ConfigService);

  const port = config.get<number>('PORT') ?? 3001;
  const frontendUrl =
    config.get<string>('FRONTEND_URL') ?? 'http://localhost:3000';
  const sessionSecret =
    config.get<string>('SESSION_SECRET') ?? 'dev-insecure-secret-change-me';
  const isProd = config.get<string>('NODE_ENV') === 'production';

  // En prod (derrière un proxy HTTPS type Railway/Render), nécessaire pour les cookies secure.
  if (isProd) {
    app.set('trust proxy', 1);
  }

  app.enableCors({ origin: frontendUrl, credentials: true });

  app.use(
    session({
      secret: sessionSecret,
      resave: false,
      saveUninitialized: false,
      cookie: {
        httpOnly: true,
        sameSite: 'lax',
        secure: isProd,
        maxAge: 1000 * 60 * 60 * 24, // 24h !
      },
    }),
  );

  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  await app.listen(port);
}
void bootstrap();
