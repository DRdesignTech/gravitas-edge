-- AlterTable
ALTER TABLE "UserProfile" ADD COLUMN     "careerPreferences" JSONB,
ADD COLUMN     "certifications" JSONB,
ADD COLUMN     "education" JSONB,
ADD COLUMN     "skills" JSONB,
ADD COLUMN     "workExperience" JSONB;
