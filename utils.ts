export function toFilenameSafeDateWithMs(unixTimestamp: string) {
    const date = new Date(parseFloat(unixTimestamp) * 1000);
    // Pad single-digit numbers with a leading zero
    const pad = (num: number) => num.toString().padStart(2, '0');
    // Pad milliseconds with leading zeros to ensure three digits
    const padMs = (num: number) => num.toString().padStart(3, '0');

    const year = date.getFullYear();
    const month = pad(date.getMonth() + 1); // getMonth() is 0-indexed
    const day = pad(date.getDate());
    const hours = pad(date.getHours());
    const minutes = pad(date.getMinutes());
    const seconds = pad(date.getSeconds());
    const milliseconds = padMs(date.getMilliseconds());

    // Use a period or hyphen as a separator for the fractional seconds for readability.
    // A period is a standard separator for fractional parts of a number.
    return `${year}-${month}-${day}_${hours}-${minutes}-${seconds}.${milliseconds}`;
}