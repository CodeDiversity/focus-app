import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { PrismaModule } from './modules/prisma/prisma.module';
import { OnboardingModule } from './modules/onboarding/onboarding.module';
import { SemestersModule } from './modules/semesters/semesters.module';
import { CoursesModule } from './modules/courses/courses.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      ignoreEnvFile: process.env.NODE_ENV === 'test',
      envFilePath: ['.env.local', '.env'],
    }),
    AuthModule,
    UsersModule,
    PrismaModule,
    OnboardingModule,
    // SP-107B: onboarding-minimal academic-structure create endpoints
    // (EP02 extends these modules, D107-9).
    SemestersModule,
    CoursesModule,
  ],
})
export class AppModule {}
