import { addMinutes, format, isBefore, parseISO, startOfDay, endOfDay, eachMinuteOfInterval, isWithinInterval, isSameDay } from 'date-fns';

export interface TimeSlot {
    start: string;
    end: string;
    available: boolean;
}

export interface AvailabilityWindow {
    day: number; // 0-6 (Sun-Sat)
    slots: { start: string; end: string }[];
}

/**
 * Generates slots for a specific day based on availability and busy periods.
 */
export function generateAvailableSlots(
    date: Date,
    durationInMinutes: number,
    availability: AvailabilityWindow[],
    busySlots: { start: string; end: string }[]
): TimeSlot[] {
    const dayOfWeek = date.getDay();
    const dayAvailability = availability.find(a => a.day === dayOfWeek);

    if (!dayAvailability) return [];

    const slots: TimeSlot[] = [];

    dayAvailability.slots.forEach(window => {
        const windowStart = new Date(`${format(date, 'yyyy-MM-dd')}T${window.start}:00`);
        const windowEnd = new Date(`${format(date, 'yyyy-MM-dd')}T${window.end}:00`);

        let currentSlotStart = windowStart;

        while (isBefore(addMinutes(currentSlotStart, durationInMinutes), windowEnd) || addMinutes(currentSlotStart, durationInMinutes).getTime() === windowEnd.getTime()) {
            const currentSlotEnd = addMinutes(currentSlotStart, durationInMinutes);

            // Check if slot overlaps with any busy period
            const isBusy = busySlots.some(busy => {
                const bStart = parseISO(busy.start);
                const bEnd = parseISO(busy.end);

                // Overlap condition: (StartA < EndB) and (EndA > StartB)
                return isBefore(currentSlotStart, bEnd) && isBefore(bStart, currentSlotEnd);
            });

            slots.push({
                start: currentSlotStart.toISOString(),
                end: currentSlotEnd.toISOString(),
                available: !isBusy
            });

            currentSlotStart = currentSlotEnd;
        }
    });

    return slots;
}
