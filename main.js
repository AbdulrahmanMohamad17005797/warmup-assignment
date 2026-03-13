const fs = require("fs");
// SHARED HELPERS
 
/** Parse "h:mm:ss am/pm" → total seconds since midnight */
function parseAmPmToSeconds(timeStr) {
    timeStr = timeStr.trim().toLowerCase();
    const isPM = timeStr.endsWith("pm");
    const isAM = timeStr.endsWith("am");
    const timePart = timeStr.slice(0, -2).trim();
    const [h, m, s] = timePart.split(":").map(Number);
    let hours = h;
    if (isPM && hours !== 12) hours += 12;
    if (isAM && hours === 12) hours = 0;
    return hours * 3600 + m * 60 + s;
}
 
/** Parse "h:mm:ss" or "hhh:mm:ss" → total seconds */
function hmsToSeconds(hms) {
    const [h, m, s] = hms.split(":").map(Number);
    return h * 3600 + m * 60 + s;
}
 
/** Format total seconds → "h:mm:ss" (hours NOT zero-padded) */
function secondsToHms(totalSec) {
    totalSec = Math.max(0, totalSec);
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}
 
/** Format total seconds → "hhh:mm:ss" (hours zero-padded to 3 digits) */
function secondsToHHHmmss(totalSec) {
    totalSec = Math.max(0, totalSec);
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    return `${String(h).padStart(3, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}
 
/**
 * Read shifts.txt into an array of trimmed, non-empty lines,
 * automatically skipping a header line if one exists
 * (detected by the first column not starting with a digit or letter 'D').
 */
function readShiftLines(textFile) {
    if (!fs.existsSync(textFile)) return [];
    const lines = fs.readFileSync(textFile, "utf8")
        .split("\n")
        .map(l => l.trim())
        .filter(l => l.length > 0);
    // Skip header: header first column is "DriverID" (not an actual ID)
    if (lines.length > 0 && lines[0].split(",")[0].trim().toLowerCase() === "driverid") {
        lines.shift();
    }
    return lines;
}
 
/**
 * Read driverRates.txt and return the row for a given driverID as an array,
 * or null if not found.
 * Columns: DriverID, DayOff, BasePay, Tier
 */
function readRateLine(rateFile, driverID) {
    if (!fs.existsSync(rateFile)) return null;
    const lines = fs.readFileSync(rateFile, "utf8")
        .split("\n")
        .map(l => l.trim())
        .filter(l => l.length > 0);
    for (const line of lines) {
        const cols = line.split(",");
        if (cols[0].trim() === driverID) return cols.map(c => c.trim());
    }
    return null;
}
// ============================================================
// Function 1: getShiftDuration(startTime, endTime)
// startTime: (typeof string) formatted as hh:mm:ss am or hh:mm:ss pm
// endTime: (typeof string) formatted as hh:mm:ss am or hh:mm:ss pm
// Returns: string formatted as h:mm:ss
// ============================================================
function getShiftDuration(startTime, endTime) {
    const startSec = parseAmPmToSeconds(startTime);
    const endSec   = parseAmPmToSeconds(endTime);
    let diffSec = endSec - startSec;
    if (diffSec < 0) diffSec += 24 * 3600; // crosses midnight
    return secondsToHms(diffSec);
}

// ============================================================
// Function 2: getIdleTime(startTime, endTime)
// startTime: (typeof string) formatted as hh:mm:ss am or hh:mm:ss pm
// endTime: (typeof string) formatted as hh:mm:ss am or hh:mm:ss pm
// Returns: string formatted as h:mm:ss
// ============================================================
function getIdleTime(startTime, endTime) {
    const WINDOW_START = 8  * 3600; // 08:00:00
    const WINDOW_END   = 22 * 3600; // 22:00:00
 
    let startSec = parseAmPmToSeconds(startTime);
    let endSec   = parseAmPmToSeconds(endTime);
    if (endSec <= startSec) endSec += 24 * 3600; // crosses midnight
 
    let idleSec = 0;
    // Time before delivery window
    if (startSec < WINDOW_START) {
        idleSec += Math.min(endSec, WINDOW_START) - startSec;
    }
    // Time after delivery window
    if (endSec > WINDOW_END) {
        idleSec += endSec - Math.max(startSec, WINDOW_END);
    }
 
    return secondsToHms(idleSec);
}

// ============================================================
// Function 3: getActiveTime(shiftDuration, idleTime)
// shiftDuration: (typeof string) formatted as h:mm:ss
// idleTime: (typeof string) formatted as h:mm:ss
// Returns: string formatted as h:mm:ss
// ============================================================
function getActiveTime(shiftDuration, idleTime) {
    const activeSec = Math.max(0, hmsToSeconds(shiftDuration) - hmsToSeconds(idleTime));
    return secondsToHms(activeSec);
}

// ============================================================
// Function 4: metQuota(date, activeTime)
// date: (typeof string) formatted as yyyy-mm-dd
// activeTime: (typeof string) formatted as h:mm:ss
// Returns: boolean
// ============================================================
function metQuota(date, activeTime) {
  const parts = date.split("-").map(Number);
    const year  = parts[0];
    const month = parts[1];
    const day   = parts[2];
 
    const isEid = (year === 2025 && month === 4 && day >= 10 && day <= 30);
    const quotaSec = isEid ? 6 * 3600 : 8 * 3600 + 24 * 60;
 
    return hmsToSeconds(activeTime) >= quotaSec;  
}

// ============================================================
// Function 5: addShiftRecord(textFile, shiftObj)
// textFile: (typeof string) path to shifts text file
// shiftObj: (typeof object) has driverID, driverName, date, startTime, endTime
// Returns: object with 10 properties or empty object {}
// ============================================================
function addShiftRecord(textFile, shiftObj) {
   const { driverID, driverName, date, startTime, endTime } = shiftObj;
 
    // Read raw lines preserving header if present
    let rawLines = [];
    let header   = null;
    if (fs.existsSync(textFile)) {
        rawLines = fs.readFileSync(textFile, "utf8")
            .split("\n")
            .map(l => l.trim())
            .filter(l => l.length > 0);
    }
 
    // Separate header from data lines
    if (rawLines.length > 0 &&
        rawLines[0].split(",")[0].trim().toLowerCase() === "driverid") {
        header   = rawLines[0];
        rawLines = rawLines.slice(1);
    }
 
    // 1. Duplicate check: same driverID AND same date
    for (const line of rawLines) {
        const cols = line.split(",");
        if (cols[0].trim() === driverID && cols[2].trim() === date) {
            return {};
        }
    }
 
    // 2. Compute derived fields
    const shiftDuration = getShiftDuration(startTime, endTime);
    const idleTime      = getIdleTime(startTime, endTime);
    const activeTime    = getActiveTime(shiftDuration, idleTime);
    const quota         = metQuota(date, activeTime);
    const hasBonus      = false;
 
    const newRecord = {
        driverID, driverName, date, startTime, endTime,
        shiftDuration, idleTime, activeTime,
        metQuota: quota, hasBonus
    };
 
    const newLine = [
        driverID, driverName, date, startTime, endTime,
        shiftDuration, idleTime, activeTime, quota, hasBonus
    ].join(",");
 
    // 3. Insert after last record of same driverID, or append at end
    let lastIndexOfDriver = -1;
    for (let i = 0; i < rawLines.length; i++) {
        if (rawLines[i].split(",")[0].trim() === driverID) {
            lastIndexOfDriver = i;
        }
    }
 
    if (lastIndexOfDriver === -1) {
        rawLines.push(newLine);
    } else {
        rawLines.splice(lastIndexOfDriver + 1, 0, newLine);
    }
 
    // Re-attach header if it existed
    const allLines = header ? [header, ...rawLines] : rawLines;
    fs.writeFileSync(textFile, allLines.join("\n") + "\n", "utf8");
 
    return newRecord;
}
// ============================================================
// Function 6: setBonus(textFile, driverID, date, newValue)
// textFile: (typeof string) path to shifts text file
// driverID: (typeof string)
// date: (typeof string) formatted as yyyy-mm-dd
// newValue: (typeof boolean)
// Returns: nothing (void)
// ============================================================
function setBonus(textFile, driverID, date, newValue) {
    if (!fs.existsSync(textFile)) return;
 
    const lines = fs.readFileSync(textFile, "utf8").split("\n");
 
    const updated = lines.map(line => {
        const trimmed = line.trim();
        if (trimmed.length === 0) return line;
 
        const cols = trimmed.split(",");
        // Skip header line
        if (cols[0].trim().toLowerCase() === "driverid") return line;
 
        if (cols[0].trim() === driverID && cols[2].trim() === date) {
            cols[9] = String(newValue);
            return cols.join(",");
        }
        return line;
    });
 
    fs.writeFileSync(textFile, updated.join("\n"), "utf8");
}

// ============================================================
// Function 7: countBonusPerMonth(textFile, driverID, month)
// textFile: (typeof string) path to shifts text file
// driverID: (typeof string)
// month: (typeof string) formatted as mm or m
// Returns: number (-1 if driverID not found)
// ============================================================
function countBonusPerMonth(textFile, driverID, month) {
    const lines = readShiftLines(textFile);
    if (lines.length === 0) return -1;
 
    const targetMonth = parseInt(month, 10);
    let driverFound = false;
    let bonusCount  = 0;
 
    for (const line of lines) {
        const cols = line.split(",");
        if (cols[0].trim() !== driverID) continue;
 
        driverFound = true;
        const lineMonth = parseInt(cols[2].trim().split("-")[1], 10);
        const bonus     = cols[9].trim().toLowerCase();
 
        if (lineMonth === targetMonth && bonus === "true") {
            bonusCount++;
        }
    }
 
    return driverFound ? bonusCount : -1;
}

// ============================================================
// Function 8: getTotalActiveHoursPerMonth(textFile, driverID, month)
// textFile: (typeof string) path to shifts text file
// driverID: (typeof string)
// month: (typeof number)
// Returns: string formatted as hhh:mm:ss
// ============================================================
function getTotalActiveHoursPerMonth(textFile, driverID, month) {
    const lines = readShiftLines(textFile);
    let totalSec = 0;
 
    for (const line of lines) {
        const cols = line.split(",");
        if (cols[0].trim() !== driverID) continue;
 
        const lineMonth = parseInt(cols[2].trim().split("-")[1], 10);
        if (lineMonth !== month) continue;
 
        // cols[7] = activeTime
        totalSec += hmsToSeconds(cols[7].trim());
    }
 
    return secondsToHms(totalSec);
}

// ============================================================
// Function 9: getRequiredHoursPerMonth(textFile, rateFile, bonusCount, driverID, month)
// textFile: (typeof string) path to shifts text file
// rateFile: (typeof string) path to driver rates text file
// bonusCount: (typeof number) total bonuses for given driver per month
// driverID: (typeof string)
// month: (typeof number)
// Returns: string formatted as hhh:mm:ss
// ============================================================
function getRequiredHoursPerMonth(textFile, rateFile, bonusCount, driverID, month) {
    const DAY_NAMES = ["sunday","monday","tuesday","wednesday","thursday","friday","saturday"];
 
    // Get driver's day off from rateFile (col[1])
    const rateRow = readRateLine(rateFile, driverID);
    const dayOff  = rateRow ? rateRow[1].toLowerCase() : null;
 
    const lines = readShiftLines(textFile);
    let totalRequiredSec = 0;
 
    for (const line of lines) {
        const cols = line.split(",");
        if (cols[0].trim() !== driverID) continue;
 
        const dateStr   = cols[2].trim();
        const dateParts = dateStr.split("-").map(Number);
        const lineMonth = dateParts[1];
        if (lineMonth !== month) continue;
 
        // Skip if this date falls on the driver's day off
        if (dayOff !== null) {
            const dateObj = new Date(dateParts[0], dateParts[1] - 1, dateParts[2]);
            if (DAY_NAMES[dateObj.getDay()] === dayOff) continue;
        }
 
        // Quota for this date
        const year   = dateParts[0];
        const day    = dateParts[2];
        const isEid  = (year === 2025 && lineMonth === 4 && day >= 10 && day <= 30);
        totalRequiredSec += isEid ? 6 * 3600 : 8 * 3600 + 24 * 60;
    }
 
    // Each bonus reduces required hours by 2 hours
    totalRequiredSec -= bonusCount * 2 * 3600;
 
    return secondsToHms(totalRequiredSec);
}

// ============================================================
// Function 10: getNetPay(driverID, actualHours, requiredHours, rateFile)
// driverID: (typeof string)
// actualHours: (typeof string) formatted as hhh:mm:ss
// requiredHours: (typeof string) formatted as hhh:mm:ss
// rateFile: (typeof string) path to driver rates text file
// Returns: integer (net pay)
// ============================================================
function getNetPay(driverID, actualHours, requiredHours, rateFile) {
    const tierAllowance = { 1: 50, 2: 20, 3: 10, 4: 3 };
 
    const rateRow = readRateLine(rateFile, driverID);
    if (!rateRow) return 0;
 
    const basePay = Number(rateRow[2]);
    const tier    = Number(rateRow[3]);
    const allowedMissingHours = tierAllowance[tier] || 0;
 
    const actualSec   = hmsToSeconds(actualHours);
    const requiredSec = hmsToSeconds(requiredHours);
 
    // No deduction when actual meets or exceeds required
    if (actualSec >= requiredSec) return basePay;
 
    const missingTotalSec   = requiredSec - actualSec;
    const missingTotalHours = Math.floor(missingTotalSec / 3600); // full hours only
 
    const billableHours        = Math.max(0, missingTotalHours - allowedMissingHours);
    const deductionRatePerHour = Math.floor(basePay / 185);
    const salaryDeduction      = billableHours * deductionRatePerHour;
 
    return basePay - salaryDeduction;
}

module.exports = {
    getShiftDuration,
    getIdleTime,
    getActiveTime,
    metQuota,
    addShiftRecord,
    setBonus,
    countBonusPerMonth,
    getTotalActiveHoursPerMonth,
    getRequiredHoursPerMonth,
    getNetPay
};
