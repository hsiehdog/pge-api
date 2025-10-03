/*
  Warnings:

  - You are about to drop the `EnergyUsage` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
DROP TABLE "public"."EnergyUsage";

-- CreateTable
CREATE TABLE "energy_usage" (
    "id" SERIAL NOT NULL,
    "usage_hour" TIMESTAMP(3) NOT NULL,
    "kilowatt_hours" DECIMAL(65,30) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "energy_usage_pkey" PRIMARY KEY ("id")
);
