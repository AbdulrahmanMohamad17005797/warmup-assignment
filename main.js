// ─────────────────────────────────────────────────────────────
// SHARED HELPERS
// ─────────────────────────────────────────────────────────────
 
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
    
}

// ============================================================
// Function 4: metQuota(date, activeTime)
// date: (typeof string) formatted as yyyy-mm-dd
// activeTime: (typeof string) formatted as h:mm:ss
// Returns: boolean
// ============================================================
function metQuota(date, activeTime) {
    
}

// ============================================================
// Function 5: addShiftRecord(textFile, shiftObj)
// textFile: (typeof string) path to shifts text file
// shiftObj: (typeof object) has driverID, driverName, date, startTime, endTime
// Returns: object with 10 properties or empty object {}
// ============================================================
function addShiftRecord(textFile, shiftObj) {
    // TODO: Implement this function
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
    // TODO: Implement this function
}

// ============================================================
// Function 7: countBonusPerMonth(textFile, driverID, month)
// textFile: (typeof string) path to shifts text file
// driverID: (typeof string)
// month: (typeof string) formatted as mm or m
// Returns: number (-1 if driverID not found)
// ============================================================
function countBonusPerMonth(textFile, driverID, month) {
    // TODO: Implement this function
}

// ============================================================
// Function 8: getTotalActiveHoursPerMonth(textFile, driverID, month)
// textFile: (typeof string) path to shifts text file
// driverID: (typeof string)
// month: (typeof number)
// Returns: string formatted as hhh:mm:ss
// ============================================================
function getTotalActiveHoursPerMonth(textFile, driverID, month) {
    // TODO: Implement this function
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
    // TODO: Implement this function
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
    // TODO: Implement this function
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
