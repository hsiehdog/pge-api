import { PrismaClient } from "@prisma/client";
import * as fs from "fs";
import * as path from "path";

const prisma = new PrismaClient();

interface ElectricUsageRow {
  type: string;
  date: string;
  startTime: string;
  endTime: string;
  importKwh: string;
  exportKwh: string;
  cost: string;
}

function parseCSVRow(line: string): ElectricUsageRow | null {
  // Split by comma, but handle quoted fields
  const fields = line.split(",").map((field) => field.trim());

  if (fields.length < 7) {
    return null;
  }

  return {
    type: fields[0],
    date: fields[1],
    startTime: fields[2],
    endTime: fields[3],
    importKwh: fields[4],
    exportKwh: fields[5],
    cost: fields[6],
  };
}

function parseDateTime(dateStr: string, timeStr: string): Date {
  // Parse date (YYYY-MM-DD) and time (HH:MM)
  const [year, month, day] = dateStr.split("-").map(Number);
  const [hour, minute] = timeStr.split(":").map(Number);

  return new Date(year, month - 1, day, hour, minute, 0);
}

function parseDecimal(value: string): number {
  // Remove $ sign and parse as decimal
  const cleanValue = value.replace("$", "");
  return parseFloat(cleanValue);
}

function ensureTwoDecimals(value: number): number {
  return Math.round(value * 100) / 100;
}

async function importElectricData() {
  try {
    console.log("Starting electric usage data import...");

    const csvPath = path.join(process.cwd(), "electric_usage_data.csv");
    const csvContent = fs.readFileSync(csvPath, "utf-8");
    const lines = csvContent.split("\n");

    // Find the header row (contains "TYPE,DATE,START TIME...")
    let headerIndex = -1;
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes("TYPE,DATE,START TIME")) {
        headerIndex = i;
        break;
      }
    }

    if (headerIndex === -1) {
      throw new Error("Could not find header row in CSV file");
    }

    // Get data lines after the header
    const dataLines = lines
      .slice(headerIndex + 1)
      .filter((line) => line.trim() !== "");

    console.log(`Found ${dataLines.length} data rows to import`);

    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < dataLines.length; i++) {
      const line = dataLines[i];

      try {
        const row = parseCSVRow(line);
        if (!row) {
          console.log(`Skipping invalid row ${i + headerIndex + 2}: ${line}`);
          errorCount++;
          continue;
        }

        // Parse date and time
        const usageHour = parseDateTime(row.date, row.startTime);

        // Parse decimal values
        const importKwh = ensureTwoDecimals(parseDecimal(row.importKwh));
        const exportKwh = ensureTwoDecimals(parseDecimal(row.exportKwh));
        const cost = ensureTwoDecimals(parseDecimal(row.cost));

        // Insert into database
        await prisma.energyUsage.create({
          data: {
            usage_hour: usageHour,
            import_kilowatt_hours: importKwh,
            export_kilowatt_hours: exportKwh,
            actual_cost: cost,
          },
        });

        successCount++;

        if (successCount % 100 === 0) {
          console.log(`Processed ${successCount} records...`);
        }
      } catch (error) {
        console.error(`Error processing row ${i + headerIndex + 2}: ${error}`);
        errorCount++;
      }
    }

    console.log(`\nImport completed!`);
    console.log(`✅ Successfully imported: ${successCount} records`);
    console.log(`❌ Errors: ${errorCount} records`);
  } catch (error) {
    console.error("Import failed:", error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the import
importElectricData();
