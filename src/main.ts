import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common'; //ADDED
import { NestExpressApplication } from "@nestjs/platform-express" //for ip address
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.set('trust proxy', 1);

  const config = new DocumentBuilder()
    .setTitle('NestJS API')
    .setDescription('The API description')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api-docs', app, document);

  app.useGlobalPipes(new ValidationPipe({
      whitelist: true,           // Strips properties not in DTO
      forbidNonWhitelisted: true, // Throws error if extra properties sent (recommended)
      transform: true,            // Auto-transform payloads to DTO instances
    })); //ADDED
  app.enableCors({
    origin: process.env.FRONTEND_URL || '*', // your frontend URL
    credentials: true, // if sending cookies or auth headers
  });
  await app.listen(process.env.PORT ?? 3000, '0.0.0.0');
}
bootstrap();
