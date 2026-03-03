import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
    const app = await NestFactory.create(AppModule);

    // Global validation pipe
    app.useGlobalPipes(
        new ValidationPipe({
            whitelist: true,
            forbidNonWhitelisted: true,
            transform: true,
        }),
    );

    // CORS
    app.enableCors({
        origin: process.env.WEB_URL || 'http://localhost:3000',
        credentials: true,
    });

    // API prefix
    app.setGlobalPrefix('api/v1');

    // Swagger docs
    const config = new DocumentBuilder()
        .setTitle('VoteSphere API')
        .setDescription('Multi-tenant voting platform API')
        .setVersion('2.0')
        .addBearerAuth()
        .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('docs', app, document);

    const port = process.env.PORT || 4000;
    await app.listen(port);
    console.log(`VoteSphere API running on http://localhost:${port}`);
    console.log(`Swagger docs: http://localhost:${port}/docs`);
}

bootstrap();
