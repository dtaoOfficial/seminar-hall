package com.dtao.seminarbooking.service;

import com.dtao.seminarbooking.model.Seminar;
import com.dtao.seminarbooking.model.Seminar.DaySlot;
import com.dtao.seminarbooking.payload.CalendarDaySummary;
import com.dtao.seminarbooking.repo.SeminarRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

@Service
public class SeminarService {

    @Autowired
    private SeminarRepository seminarRepository;

    private static final Pattern EMAIL_PATTERN = Pattern.compile("^[A-Za-z0-9._%+-]+@newhorizonindia\\.edu$");
    private static final Pattern PHONE_PATTERN = Pattern.compile("^[6-9][0-9]{9}$");
    private static final DateTimeFormatter DATE_FMT = DateTimeFormatter.ISO_LOCAL_DATE;
    private static final long MAX_BOOKING_DAYS = 7L;

    // =========================================================================
    // 1. CREATE SEMINAR
    // =========================================================================
    public Seminar addSeminar(Seminar seminar) {
        // Admin Creation Check
        if (seminar.getCreatedBy() != null && !"ADMIN".equalsIgnoreCase(seminar.getCreatedBy().trim())) {
            throw new RuntimeException("createdBy may only be set to 'ADMIN' by admin endpoints.");
        }
        String status = seminar.getStatus() == null ? "" : seminar.getStatus().toUpperCase();
        if ("APPROVED".equals(status) && (seminar.getCreatedBy() == null || seminar.getCreatedBy().isBlank())) {
            seminar.setCreatedBy("ADMIN");
        }

        // Validations
        validateEmailPhoneOrThrow(seminar);
        validatePayloadShapeOrThrow(seminar);

        // Conflict Check (The Brain)
        checkTimeConflictsForAdd(seminar);

        if (seminar.getAppliedAt() == null) {
            seminar.setAppliedAt(Instant.now().toString());
        }
        return seminarRepository.save(seminar);
    }

    // =========================================================================
    // 2. UPDATE SEMINAR
    // =========================================================================
    public Seminar updateSeminar(String id, Seminar updatedSeminar) {
        return seminarRepository.findById(id).map(existing -> {
            if (updatedSeminar.getCreatedBy() != null && !"ADMIN".equalsIgnoreCase(updatedSeminar.getCreatedBy().trim())) {
                throw new RuntimeException("createdBy may only be set to 'ADMIN' by admin endpoints.");
            }

            // Update Fields
            if (updatedSeminar.getHallName() != null) existing.setHallName(updatedSeminar.getHallName());
            if (updatedSeminar.getDate() != null) existing.setDate(updatedSeminar.getDate());
            if (updatedSeminar.getStartDate() != null) existing.setStartDate(updatedSeminar.getStartDate());
            if (updatedSeminar.getEndDate() != null) existing.setEndDate(updatedSeminar.getEndDate());
            if (updatedSeminar.getSlot() != null) existing.setSlot(updatedSeminar.getSlot());
            if (updatedSeminar.getSlotTitle() != null) existing.setSlotTitle(updatedSeminar.getSlotTitle());
            if (updatedSeminar.getBookingName() != null) existing.setBookingName(updatedSeminar.getBookingName());
            if (updatedSeminar.getEmail() != null) existing.setEmail(updatedSeminar.getEmail());
            if (updatedSeminar.getDepartment() != null) existing.setDepartment(updatedSeminar.getDepartment());
            if (updatedSeminar.getPhone() != null) existing.setPhone(updatedSeminar.getPhone());
            if (updatedSeminar.getStartTime() != null) existing.setStartTime(updatedSeminar.getStartTime());
            if (updatedSeminar.getEndTime() != null) existing.setEndTime(updatedSeminar.getEndTime());
            if (updatedSeminar.getRemarks() != null) existing.setRemarks(updatedSeminar.getRemarks());
            if (updatedSeminar.getStatus() != null) existing.setStatus(updatedSeminar.getStatus());
            if (updatedSeminar.getCancellationReason() != null) existing.setCancellationReason(updatedSeminar.getCancellationReason());
            if (updatedSeminar.getDaySlots() != null) existing.setDaySlots(updatedSeminar.getDaySlots());

            // Re-Validate
            validateEmailPhoneOrThrow(existing);
            validatePayloadShapeOrThrow(existing);
            checkTimeConflictsForUpdate(existing, id);

            return seminarRepository.save(existing);
        }).orElse(null);
    }

    // =========================================================================
    // 3. CORE CONFLICT LOGIC (THE BRAIN) 🧠
    // =========================================================================

    private void checkTimeConflictsForAdd(Seminar seminar) {
        checkConflictsInternal(seminar, null);
    }

    private void checkTimeConflictsForUpdate(Seminar seminar, String excludeId) {
        checkConflictsInternal(seminar, excludeId);
    }

    /**
     * The Master Conflict Checker.
     * Handles Time-Wise vs Time-Wise, Day-Wise vs Day-Wise, and Cross-Type conflicts.
     */
    private void checkConflictsInternal(Seminar req, String excludeId) {
        String hall = req.getHallName();
        if (hall == null || hall.isBlank()) throw new RuntimeException("Hall name is required.");

        // --- CASE A: TIME-WISE BOOKING (Single Date) ---
        if (req.getDate() != null) {
            String date = req.getDate();
            String start = req.getStartTime();
            String end = req.getEndTime();

            // Rule: Reverse Time
            if (!isTimeOrderValid(start, end)) {
                throw new RuntimeException("Sorry, reverse time not possible.");
            }

            // Find existing bookings on this date (Time-wise OR overlapping Day-wise)
            List<Seminar> conflicts = getSeminarsForDay(date, hall).stream()
                    .filter(s -> excludeId == null || !s.getId().equals(excludeId))
                    .collect(Collectors.toList());

            for (Seminar e : conflicts) {
                // Existing is Day-Wise (Full or Range)
                if (e.getStartDate() != null) {
                    // Does it have custom slots?
                    if (e.getDaySlots() != null && e.getDaySlots().containsKey(date)) {
                        DaySlot ds = e.getDaySlots().get(date);
                        if (isOverlapping(start, end, ds.getStartTime(), ds.getEndTime())) {
                            throw new RuntimeException("Sorry, this slot is not available.");
                        }
                    } else {
                        // No specific slot = FULL DAY BOOKED
                        throw new RuntimeException("Full day booked, not possible.");
                    }
                }
                // Existing is Time-Wise
                else {
                    if (isOverlapping(start, end, e.getStartTime(), e.getEndTime())) {
                        throw new RuntimeException("Sorry, this slot is not available.");
                    }
                }
            }
        }

        // --- CASE B: DAY-WISE BOOKING (Range) ---
        if (req.getStartDate() != null && req.getEndDate() != null) {
            String startD = req.getStartDate();
            String endD = req.getEndDate();

            // Validate Range Logic
            LocalDate sDate = LocalDate.parse(startD, DATE_FMT);
            LocalDate eDate = LocalDate.parse(endD, DATE_FMT);
            if (eDate.isBefore(sDate)) throw new RuntimeException("End date cannot be before start date.");

            long days = ChronoUnit.DAYS.between(sDate, eDate) + 1;
            if (days > MAX_BOOKING_DAYS) throw new RuntimeException("Max booking duration is " + MAX_BOOKING_DAYS + " days.");

            // Iterate EVERY day in range to check for ANY conflict
            LocalDate curr = sDate;
            while (!curr.isAfter(eDate)) {
                String dStr = curr.format(DATE_FMT);

                // Find existing on this specific day
                List<Seminar> onThisDay = getSeminarsForDay(dStr, hall).stream()
                        .filter(s -> excludeId == null || !s.getId().equals(excludeId))
                        .collect(Collectors.toList());

                if (!onThisDay.isEmpty()) {
                    // We found an existing booking on this day.

                    // 1. If User wants FULL DAY here (no specific slot in request map)
                    if (req.getDaySlots() == null || !req.getDaySlots().containsKey(dStr)) {
                        // ANY booking on this day blocks a Full Day request
                        throw new RuntimeException("These days are already booked, booking not possible.");
                    }
                    // 2. If User wants PARTIAL TIME here
                    else {
                        DaySlot reqSlot = req.getDaySlots().get(dStr);
                        if (!isTimeOrderValid(reqSlot.getStartTime(), reqSlot.getEndTime())) {
                            throw new RuntimeException("Sorry, reverse time not possible on " + dStr);
                        }

                        for (Seminar e : onThisDay) {
                            String eStart = null, eEnd = null;

                            // Get Existing Time
                            if (e.getDate() != null) {
                                eStart = e.getStartTime(); eEnd = e.getEndTime();
                            } else if (e.getDaySlots() != null && e.getDaySlots().containsKey(dStr)) {
                                DaySlot ds = e.getDaySlots().get(dStr);
                                eStart = ds.getStartTime(); eEnd = ds.getEndTime();
                            }

                            // If existing has NO time (it is Full Day) -> Conflict
                            if (eStart == null) throw new RuntimeException("These days are already booked, booking not possible.");

                            // Check Overlap
                            if (isOverlapping(reqSlot.getStartTime(), reqSlot.getEndTime(), eStart, eEnd)) {
                                throw new RuntimeException("Sorry, this slot is not available on " + dStr);
                            }
                        }
                    }
                }
                curr = curr.plusDays(1);
            }
        }
    }

    // =========================================================================
    // 4. READ & HELPER METHODS
    // =========================================================================

    /**
     * Gets ALL bookings that touch a specific date (Time-wise OR Day-Range).
     */
    public List<Seminar> getSeminarsForDay(String date, String hallName) {
        // 1. Exact Date Matches
        List<Seminar> timeBased = seminarRepository.findByDateAndHallName(date, hallName);

        // 2. Overlapping Ranges (Start <= date <= End)
        List<Seminar> rangeBased = seminarRepository.findByHallNameAndStartDateLessThanEqualAndEndDateGreaterThanEqual(hallName, date, date);

        // Merge unique results
        Set<Seminar> combined = new HashSet<>(timeBased);
        combined.addAll(rangeBased);
        return new ArrayList<>(combined);
    }

    public List<Seminar> getAllSeminars() { return seminarRepository.findAll(); }
    public Optional<Seminar> getById(String id) { return seminarRepository.findById(id); }
    public List<Seminar> getSeminarsByDate(String date) { return seminarRepository.findByDate(date); }
    public List<Seminar> getByHallAndDate(String date, String hallName) { return seminarRepository.findByDateAndHallName(date, hallName); }
    public List<Seminar> getByDepartmentAndEmail(String dept, String email) { return seminarRepository.findByDepartmentAndEmail(dept, email); }
    public List<Seminar> getByStatus(String status) { return seminarRepository.findByStatusIgnoreCase(status); }

    public void deleteSeminar(String id) { seminarRepository.deleteById(id); }

    public Seminar requestCancel(String id, String reason, String remarks) {
        return seminarRepository.findById(id).map(existing -> {
            existing.setStatus("CANCEL_REQUESTED");
            if (reason != null && !reason.isBlank()) existing.setCancellationReason(reason);
            String prev = existing.getRemarks() == null ? "" : existing.getRemarks();
            if (remarks != null && !remarks.isBlank()) existing.setRemarks(prev.isBlank() ? remarks : prev + " | " + remarks);
            return seminarRepository.save(existing);
        }).orElse(null);
    }

    // =========================================================================
    // 5. CALENDAR GENERATION LOGIC
    // =========================================================================

    public List<CalendarDaySummary> getCalendarMonthSummary(String hallName, int year, int month) {
        LocalDate start = LocalDate.of(year, month, 1);
        LocalDate end = start.withDayOfMonth(start.lengthOfMonth());
        String startStr = start.format(DATE_FMT);
        String endStr = end.format(DATE_FMT);

        Map<LocalDate, Integer> counts = new HashMap<>();
        String hallNorm = (hallName == null || hallName.isBlank()) ? null : hallName.trim();

        // 1. Time-Wise Bookings in Month
        List<Seminar> timeBookings;
        if (hallNorm != null) timeBookings = seminarRepository.findByHallNameAndDateBetween(hallNorm, startStr, endStr);
        else timeBookings = seminarRepository.findByDateBetween(startStr, endStr);

        for (Seminar s : timeBookings) {
            if (s.getDate() != null) {
                try {
                    LocalDate d = LocalDate.parse(s.getDate(), DATE_FMT);
                    counts.put(d, counts.getOrDefault(d, 0) + 1);
                } catch (Exception e) {}
            }
        }

        // 2. Day-Range Bookings Overlapping Month
        List<Seminar> rangeBookings;
        if (hallNorm != null) rangeBookings = seminarRepository.findByHallNameAndStartDateLessThanEqualAndEndDateGreaterThanEqual(hallNorm, endStr, startStr);
        else rangeBookings = seminarRepository.findByStartDateLessThanEqualAndEndDateGreaterThanEqual(endStr, startStr);

        for (Seminar s : rangeBookings) {
            try {
                LocalDate sd = LocalDate.parse(s.getStartDate(), DATE_FMT);
                LocalDate ed = LocalDate.parse(s.getEndDate(), DATE_FMT);
                LocalDate curr = sd.isBefore(start) ? start : sd;
                LocalDate limit = ed.isAfter(end) ? end : ed;
                while (!curr.isAfter(limit)) {
                    counts.put(curr, counts.getOrDefault(curr, 0) + 1);
                    curr = curr.plusDays(1);
                }
            } catch (Exception e) {}
        }

        List<CalendarDaySummary> result = new ArrayList<>();
        LocalDate cursor = start;
        while (!cursor.isAfter(end)) {
            int c = counts.getOrDefault(cursor, 0);
            result.add(new CalendarDaySummary(cursor, c == 0, c));
            cursor = cursor.plusDays(1);
        }
        return result;
    }

    // =========================================================================
    // 6. VALIDATORS & UTILS
    // =========================================================================

    private void validateEmailPhoneOrThrow(Seminar s) {
        if (s.getEmail() == null || !EMAIL_PATTERN.matcher(s.getEmail()).matches()) {
            throw new RuntimeException("Invalid email! Must end with @newhorizonindia.edu");
        }
        if (s.getPhone() == null || !PHONE_PATTERN.matcher(s.getPhone()).matches()) {
            throw new RuntimeException("Invalid phone number! Must be 10 digits starting with 6/7/8/9");
        }
    }

    private void validatePayloadShapeOrThrow(Seminar s) {
        boolean hasTime = s.getDate() != null && s.getStartTime() != null && s.getEndTime() != null;
        boolean hasRange = s.getStartDate() != null && s.getEndDate() != null;

        if (s.getDaySlots() != null && !hasRange) {
            throw new RuntimeException("daySlots provided without startDate/endDate");
        }
        if (!hasTime && !hasRange && (s.getSlot() == null || s.getSlot().isBlank())) {
            throw new RuntimeException("Invalid booking payload. Provide valid time or date range.");
        }
    }

    private boolean isTimeOrderValid(String start, String end) {
        if (start == null || end == null) return false;
        return toMinutes(end) > toMinutes(start);
    }

    private boolean isOverlapping(String s1, String e1, String s2, String e2) {
        if (s1 == null || e1 == null || s2 == null || e2 == null) return true; // Full Day assumed
        int start1 = toMinutes(s1);
        int end1 = toMinutes(e1);
        int start2 = toMinutes(s2);
        int end2 = toMinutes(e2);
        return start1 < end2 && start2 < end1;
    }

    private int toMinutes(String hhmm) {
        String[] parts = hhmm.split(":");
        return Integer.parseInt(parts[0]) * 60 + Integer.parseInt(parts[1]);
    }
}