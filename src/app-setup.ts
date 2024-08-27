import { INestApplication, ValidationPipe } from '@nestjs/common';

export function setupApp(app: INestApplication) {
  app.useGlobalPipes(
    new ValidationPipe(),
  );
}
