/**
 * Date utilities for consistent date handling without timezone issues
 */
import { months } from "@arrays.d.ts";

/**
 * Formats a "YYYY-MM-DD HH:mm:ss" string to datetime-local input format
 * @param dateTimeString - Database date string "YYYY-MM-DD HH:mm:ss"
 * @returns datetime-local format "YYYY-MM-DDTHH:mm"
 */
function formatToDateTimeLocal(dateTimeString: string): string {
    const parts = dateTimeString.split(' ');
    if (parts.length !== 2) {
        throw new Error('Invalid date-time format');
    }

    const [datePart, timePart] = parts;
    const timeWithoutSeconds = timePart.substring(0, 5); // Take only HH:mm

    return `${datePart}T${timeWithoutSeconds}`;
}

/**
 * Gets current date-time in "YYYY-MM-DD HH:mm:ss" format
 * @returns Current local date-time string
 */
function getCurrentDateTime(): string {
    const now = new Date();

    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');

    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

/**
 * Gets current date-time in datetime-local input format
 * @returns Current local date-time for datetime-local input
 */
function getCurrentDateTimeLocal(): string {
    const now = new Date();

    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');

    return `${year}-${month}-${day}T${hours}:${minutes}`;
}

/**
 * Formats a date string for display.
 *
 * @param dateTimeString - Database date string in the format "YYYY-MM-DD HH:mm:ss".
 *   Example: "2024-06-01 14:30:00"
 * @param options - Formatting options:
 *   - includeTime: Whether to include the time part (default: true).
 *   - includeSeconds: Whether to include seconds in the time part (default: false).
 *   - dateStyle: The style of the date part. Options:
 *       - 'normal': "DD/MM/YYYY" (e.g., "01/06/2024")
 *       - 'long': "DD Month YYYY" (e.g., "01 June 2024")
 *   - pm: Whether to format the time in 12-hour format with am/pm (default: true).
 * @returns Formatted date string according to the specified options.
 *
 * @example
 * formatDate("2024-06-01 14:30:00", { dateStyle: 'normal' }); // "01/06/2024 14:30"
 * formatDate("2024-06-01 14:30:00", { dateStyle: 'long', includeTime: false }); // "01 June 2024"
 * formatDate("2024-06-01 14:30:00", { dateStyle: 'normal', includeTime: false }); // "01/06/2024"
 * formatDate("2024-06-01 14:30:00", { dateStyle: 'db' }); // "01-06-2024 14:30:00"
 * formatDate("2024-06-01 14:30:00", { dateStyle: 'db', includeTime: false }); // "01-06-2024"
 * formatDate("2024-06-01 14:30:00", { includeSeconds: true }); // "01/06/2024 14:30:00"
 * formatDate("2024-06-01 14:30:00", { dateStyle: 'long', pm: true }); // "01 June 2024 2:30:00 pm"
 */
function formatDate(
    dateTimeString: string,
    options: {
        includeTime?: boolean;
        includeSeconds?: boolean;
        dateStyle?: 'normal' | 'long' | 'db';
        pm?: boolean;
    } = {}
): string {
    const {
        includeTime = true,
        includeSeconds = false,
        dateStyle = 'normal',
        pm = true, // Fixed: was documented as false but actually defaults to true
    } = options;

    const isIso = dateTimeString.includes('T');
    const dbRegex = /^\d{4}-\d{2}-\d{2}(?: \d{2}:\d{2}(?::\d{2})?)?$/;

    // Special handling for DB-style output
    if (dateStyle === 'db') {
        return formatAsDbStyle(dateTimeString, isIso, dbRegex, includeTime);
    }

    // Parse date and time parts
    const { datePart, timePart } = parseDateTimeParts(dateTimeString, isIso, dbRegex);

    // Format date according to style
    const formattedDate = formatDatePart(datePart, dateStyle);

    // If no time part or time is not requested, return date only
    if (!timePart || !includeTime) {
        return formattedDate;
    }

    // Format time according to options
    const formattedTime = formatTimePart(timePart, {
        includeSeconds,
        pm
    });

    return `${formattedDate} ${formattedTime}`;
}

// Helper function to handle DB-style formatting
function formatAsDbStyle(
    dateTimeString: string,
    isIso: boolean,
    dbRegex: RegExp,
    includeTime: boolean
): string {
    if (isIso) {
        return handleIsoDbFormat(dateTimeString, includeTime);
    } else if (dbRegex.test(dateTimeString)) {
        return handleDbFormat(dateTimeString, includeTime);
    } else {
        throw new Error('Invalid date-time format');
    }
}

// Helper function to handle ISO format for DB style
function handleIsoDbFormat(dateTimeString: string, includeTime: boolean): string {
    const tzOffsetRegex = /([zZ]|[+-]\d{2}:?\d{2})$/;
    const hasOffset = tzOffsetRegex.test(dateTimeString);

    if (!hasOffset) {
        // timezone-less -> treat as UTC
        const iso = dateTimeString.endsWith('Z') ? dateTimeString : `${dateTimeString}Z`;
        const d = new Date(iso);
        if (isNaN(d.getTime())) throw new Error('Invalid date-time format');
        const Y = d.getUTCFullYear();
        const M = String(d.getUTCMonth() + 1).padStart(2, '0');
        const D = String(d.getUTCDate()).padStart(2, '0');
        if (!includeTime) return `${Y}-${M}-${D}`;
        const hh = String(d.getUTCHours()).padStart(2, '0');
        const mm = String(d.getUTCMinutes()).padStart(2, '0');
        const ss = String(d.getUTCSeconds()).padStart(2, '0');
        return `${Y}-${M}-${D} ${hh}:${mm}:${ss}`;
    }

    // Has offset -> extract date and time components directly
    const core = dateTimeString.replace(tzOffsetRegex, '');
    const [datePartIso, timePartIso = '00:00:00'] = core.split('T');
    let time = timePartIso.split('.')[0]; // drop fractional seconds
    if (!time.includes(':')) time = `${time}:00:00`;
    const [h = '00', m = '00', s = '00'] = time.split(':');
    const hh = String(h).padStart(2, '0');
    const mm = String(m).padStart(2, '0');
    const ss = String(s).padStart(2, '0');
    if (!includeTime) return datePartIso;
    return `${datePartIso} ${hh}:${mm}:${ss}`;
}

// Helper function to handle DB format for DB style
function handleDbFormat(dateTimeString: string, includeTime: boolean): string {
    const parts = dateTimeString.split(' ');
    const date = parts[0];
    if (!includeTime) return date;
    const time = parts.length >= 2 ? parts[1] : '00:00:00';
    const [h = '00', m = '00', s = '00'] = time.split(':');
    const hh = String(h).padStart(2, '0');
    const mm = String(m).padStart(2, '0');
    const ss = String(s).padStart(2, '0');
    return `${date} ${hh}:${mm}:${ss}`;
}

// Helper function to parse date and time parts
function parseDateTimeParts(
    dateTimeString: string,
    isIso: boolean,
    dbRegex: RegExp
): { datePart: string; timePart: string | undefined } {
    let datePart: string;
    let timePart: string | undefined;

    if (isIso) {
        const tzOffsetRegex = /([zZ]|[+-]\d{2}:?\d{2})$/;
        const hasOffset = tzOffsetRegex.test(dateTimeString);

        if (!hasOffset) {
            // timezone-less ISO -> treat as UTC
            const iso = dateTimeString.endsWith('Z') ? dateTimeString : `${dateTimeString}Z`;
            const d = new Date(iso);
            if (isNaN(d.getTime())) throw new Error('Invalid date-time format');
            const Y = d.getUTCFullYear();
            const M = String(d.getUTCMonth() + 1).padStart(2, '0');
            const D = String(d.getUTCDate()).padStart(2, '0');
            datePart = `${Y}-${M}-${D}`;
            const hh = String(d.getUTCHours()).padStart(2, '0');
            const mm = String(d.getUTCMinutes()).padStart(2, '0');
            const ss = String(d.getUTCSeconds()).padStart(2, '0');
            timePart = `${hh}:${mm}:${ss}`;
        } else {
            // ISO with offset -> preserve the local components
            const core = dateTimeString.replace(tzOffsetRegex, '');
            const [dateIso, timeIso = '00:00:00'] = core.split('T');
            datePart = dateIso;
            let time = timeIso.split('.')[0];
            if (!time.includes(':')) time = `${time}:00:00`;
            const [h = '00', m = '00', s = '00'] = time.split(':');
            const hh = String(h).padStart(2, '0');
            const mm = String(m).padStart(2, '0');
            const ss = String(s).padStart(2, '0');
            timePart = `${hh}:${mm}:${ss}`;
        }
    } else if (dbRegex.test(dateTimeString)) {
        const parts = dateTimeString.split(' ');
        datePart = parts[0];
        timePart = parts.length >= 2 ? parts.slice(1).join(' ') : undefined;
    } else {
        throw new Error('Invalid date-time format');
    }

    return { datePart, timePart };
}

// Helper function to format date part according to style
function formatDatePart(datePart: string, dateStyle: 'normal' | 'long' | 'db'): string {
    const [year, month, day] = datePart.split('-');

    switch (dateStyle) {
        case 'long':
            return `${day} ${months[parseInt(month, 10) - 1].label} ${year}`;
        default: // 'normal' or 'db'
            return `${day}/${month}/${year}`;
    }
}

// Helper function to format time part according to options
function formatTimePart(
    timePart: string,
    options: {
        includeSeconds: boolean;
        pm: boolean;
    }
): string {
    let hours = 0, minutes = 0, seconds = 0;
    const timeParts = timePart.split(':');
    if (timeParts.length >= 2) {
        hours = Number(timeParts[0]);
        minutes = Number(timeParts[1]);
        seconds = Number(timeParts[2] || '0');
    }

    if (options.pm) {
        const period = hours >= 12 ? 'pm' : 'am';
        const adjustedHours = hours % 12 || 12;
        if (options.includeSeconds) {
            return `${adjustedHours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')} ${period}`;
        } else {
            return `${adjustedHours}:${String(minutes).padStart(2, '0')} ${period}`;
        }
    } else {
        if (options.includeSeconds) {
            return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
        } else {
            return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
        }
    }
}

/**
 * Gets the date part only from a date-time string
 * @param dateTimeString - Database date string "YYYY-MM-DD HH:mm:ss"
 * @returns Date part "YYYY-MM-DD"
 */
function getDatePart(dateTimeString: string): string {
    return dateTimeString.split(' ')[0];
}

/**
 * Gets the time part only from a date-time string
 * @param dateTimeString - Database date string "YYYY-MM-DD HH:mm:ss"
 * @param pm - Optional parameter to indicate if the time should be in 12-hour format with am/pm
 *            (default: false, which returns 24-hour format)
 * @returns Time part "HH:mm:ss" (24-hour) or "HH:mm:ss am/pm" (12-hour)
 *
 * @example
 * getTimePart("2024-06-01 14:30:45") // "14:30:45"
 * getTimePart("2024-06-01 14:30:45", true) // "2:30:45 pm"
 */
function getTimePart(dateTimeString: string, pm: boolean = false): string {
    const timePart = dateTimeString.split(' ')[1];
    if (!timePart) {
        throw new Error('Invalid date-time format');
    }
    const [hoursStr, minutesStr, secondsStr] = timePart.split(':');
    const hours = Number(hoursStr);
    const minutes = Number(minutesStr);
    const seconds = Number(secondsStr);

    if (pm) {
        const period = hours >= 12 ? 'pm' : 'am';
        const adjustedHours = hours % 12 || 12; // Convert 0 to 12 for 12-hour format
        return `${adjustedHours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')} ${period}`;
    } else {
        return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    }
}

/**
 * Gets the time part only from a date-time string without seconds
 * @param dateTimeString - Database date string "YYYY-MM-DD HH:mm:ss"
 * @returns Time part "HH:mm am/pm"
 */
function getTimePartWithoutSeconds(dateTimeString: string): string {
    const timePart = dateTimeString.split(' ')[1] || '00:00:00';
    const [hours, minutes] = timePart.split(':').map(Number);

    const period = hours >= 12 ? 'pm' : 'am';
    const adjustedHours = hours % 12 || 12; // Convert 0 to 12 for 12-hour format

    return `${adjustedHours}:${String(minutes).padStart(2, '0')} ${period}`;
}

function getCurrentDate(): string {
    const now = new Date();

    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
}

// Note: formatDate now accepts date-only strings ("YYYY-MM-DD") and
// will return only the date part when a time component is not present. The
// previous helper `formatDateOnlyForDisplay` was removed to keep the API small.

/**
 * Formats a number as currency (EUR, es-ES locale by default)
 * @param amount - The numeric value to format
 * @param currency - The currency code (default: 'EUR')
 * @param locale - The locale string (default: 'es-ES')
 * @returns Formatted currency string
 */
function formatCurrency(amount: number, currency = 'EUR', locale = 'es-ES'): string {
    return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency,
        minimumFractionDigits: 2,
    }).format(amount);
}

/**
 * Formats a JS timestamp (milliseconds) to "D/M/YYYY, h:mm:ss am/pm"
 * Example: 15/8/2025, 10:29:43 pm
 */
function formatTimestampToDisplay(timestamp: number): string {
    const d = new Date(timestamp);
    const day = d.getDate(); // no leading zero
    const month = d.getMonth() + 1; // no leading zero
    const year = d.getFullYear();

    let hours = d.getHours();
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const seconds = String(d.getSeconds()).padStart(2, '0');

    const period = hours >= 12 ? 'pm' : 'am'; // lowercase as requested
    hours = hours % 12 || 12; // convert to 12-hour clock, 0 -> 12

    return `${day}/${month}/${year}, ${hours}:${minutes}:${seconds} ${period}`;
}

export {
    formatToDateTimeLocal,
    getCurrentDateTime,
    getCurrentDateTimeLocal,
    formatDate,
    getDatePart,
    getTimePart,
    getTimePartWithoutSeconds,
    getCurrentDate,
    formatCurrency,
    formatTimestampToDisplay
}