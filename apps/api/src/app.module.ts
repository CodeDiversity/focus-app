import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { PrismaModule } from './modules/prisma/prisma.module';
import { OnboardingModule } from './modules/onboarding/onboarding.module';
import { SemestersModule } from './modules/semesters/semesters.module';
import { CoursesModule } from './modules/courses/courses.module';
import { AssignmentsModule } from './modules/assignments/assignments.module';
import { CalendarModule } from './modules/calendar/calendar.module';
import { AvailabilityModule } from './modules/availability/availability.module';
import { StudyPlansModule } from './modules/study-plans/study-plans.module';

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
    AssignmentsModule,
    CalendarModule,
    // SP-128A: the availability-slots CRUD surface (EP04, D404-11).
    AvailabilityModule,
    // EP06A: the study-preferences surface (D06-4) — the preferences half
    // of the study-planning module; EP06B/EP06D extend it.
    StudyPlansModule,
  ],
})
export class AppModule {}
