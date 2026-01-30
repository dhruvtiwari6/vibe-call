/*
  Warnings:

  - You are about to drop the column `status` on the `User` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "public"."Messages" ADD COLUMN     "duration" DOUBLE PRECISION,
ADD COLUMN     "fileUrl" TEXT,
ADD COLUMN     "resourceType" TEXT;

-- AlterTable
ALTER TABLE "public"."User" DROP COLUMN "status";
