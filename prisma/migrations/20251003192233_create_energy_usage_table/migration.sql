-- CreateTable
CREATE TABLE "EnergyUsage" (
    "id" SERIAL NOT NULL,
    "usage_hour" TIMESTAMP(3) NOT NULL,
    "kilowatt_hours" DECIMAL(65,30) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EnergyUsage_pkey" PRIMARY KEY ("id")
);
