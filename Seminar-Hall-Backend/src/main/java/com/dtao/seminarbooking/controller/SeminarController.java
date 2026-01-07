package com.dtao.seminarbooking.controller;

import com.dtao.seminarbooking.model.HallOperator;
import com.dtao.seminarbooking.model.Seminar;
import com.dtao.seminarbooking.service.EmailService;
import com.dtao.seminarbooking.service.HallOperatorService;
import com.dtao.seminarbooking.service.LogService;
import com.dtao.seminarbooking.service.SeminarService;
import jakarta.servlet.http.HttpServletRequest; // Ensure spring-boot-starter-web is present
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.security.Principal; // ✅ IMPORTED FOR REAL EMAIL LOGGING
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.concurrent.CompletableFuture;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/seminars")
public class SeminarController {

    private static final Logger log = LoggerFactory.getLogger(SeminarController.class);

    private final SeminarService seminarService;
    private final EmailService emailService;
    private final HallOperatorService hallOperatorService;
    private final LogService logService; // ✅ NEW: Logging Service

    private static final DateTimeFormatter DATE_FMT = DateTimeFormatter.ISO_LOCAL_DATE;

    public SeminarController(SeminarService seminarService,
                             EmailService emailService,
                             HallOperatorService hallOperatorService,
                             LogService logService) {
        this.seminarService = seminarService;
        this.emailService = emailService;
        this.hallOperatorService = hallOperatorService;
        this.logService = logService;
    }

    @PostMapping
    public ResponseEntity<?> createSeminar(@RequestBody Seminar seminar, HttpServletRequest request) {
        try {
            // ✅ 1. FORCE PENDING STATUS (Security)
            seminar.setStatus("PENDING");
            // If remarks are empty, set a default
            if (seminar.getRemarks() == null || seminar.getRemarks().isBlank()) {
                seminar.setRemarks("Waiting for Admin Approval");
            }

            Seminar saved = seminarService.addSeminar(seminar);

            // ✅ 2. LOGGING
            logService.logAction(
                    request,
                    "CREATE_REQUEST",
                    saved.getEmail(),
                    "DEPT",
                    saved.getId(),
                    "Requested " + saved.getHallName() + " for " + saved.getSlotTitle()
            );

            // 3. Send booking confirmation to requester (Acknowledgement)
            try {
                CompletableFuture<Boolean> f = emailService.sendBookingCreatedEmail(saved);
                attachLogging(f, "sendBookingCreatedEmail", saved.getEmail());
            } catch (Exception ex) {
                log.error("[SeminarController] Failed to initiate booking-created email: {}", ex.getMessage(), ex);
            }

            // 4. Notify ALL hall operators for this hall (New Request Alert)
            try {
                if (saved.getHallName() != null) {
                    List<HallOperator> heads = hallOperatorService.findByHallName(saved.getHallName());
                    for (HallOperator head : heads) {
                        try {
                            CompletableFuture<Boolean> f = emailService.sendHallHeadBookingCreatedEmail(head, saved);
                            attachLogging(f, "sendHallHeadBookingCreatedEmail", head.getHeadEmail());
                        } catch (Exception ex) {
                            log.error("[SeminarController] Failed to initiate hall-head booking-created email for head={} : {}",
                                    head == null ? "null" : head.getHeadEmail(), ex.getMessage(), ex);
                        }
                    }
                }
            } catch (Exception ex) {
                log.error("[SeminarController] Error while finding hall operators on create: {}", ex.getMessage(), ex);
            }

            return ResponseEntity.ok(saved);
        } catch (RuntimeException ex) {
            return ResponseEntity.badRequest().body(Map.of("error", ex.getMessage()));
        } catch (Exception ex) {
            log.error("[SeminarController] createSeminar unexpected error: {}", ex.getMessage(), ex);
            return ResponseEntity.status(500).body(Map.of("error", "Server error"));
        }
    }

    @GetMapping
    public ResponseEntity<List<Seminar>> getAllSeminars() {
        return ResponseEntity.ok(seminarService.getAllSeminars());
    }

    @GetMapping("/{id}")
    public ResponseEntity<Seminar> getById(@PathVariable String id) {
        return seminarService.getById(id).map(ResponseEntity::ok).orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/date/{date}")
    public ResponseEntity<List<Seminar>> getSeminarsByDate(@PathVariable String date) {
        return ResponseEntity.ok(seminarService.getSeminarsByDate(date));
    }

    @GetMapping("/hall/{hallName}/date/{date}")
    public ResponseEntity<List<Seminar>> getByHallAndDate(
            @PathVariable String hallName,
            @PathVariable String date) {
        return ResponseEntity.ok(seminarService.getByHallAndDate(date, hallName));
    }

    // ----------------- CALENDAR ENDPOINTS -----------------
    @GetMapping("/calendar")
    public ResponseEntity<?> getCalendarMonthSummary(
            @RequestParam(required = false) String hallName,
            @RequestParam Integer year,
            @RequestParam Integer month) {
        try {
            if (year == null || month == null) {
                return ResponseEntity.badRequest().body(Map.of("error", "year and month are required (month: 1-12)"));
            }
            if (month < 1 || month > 12) {
                return ResponseEntity.badRequest().body(Map.of("error", "month must be between 1 and 12"));
            }

            // reuse existing service method or logic
            LocalDate start = LocalDate.of(year, month, 1);
            LocalDate end = start.withDayOfMonth(start.lengthOfMonth());
            List<Seminar> all = seminarService.getAllSeminars();
            String hallNameNorm = (hallName == null || hallName.isBlank()) ? null : hallName.trim();
            Map<LocalDate, Integer> counts = new HashMap<>();

            for (Seminar s : all) {
                if (hallNameNorm != null) {
                    if (s.getHallName() == null || !s.getHallName().equalsIgnoreCase(hallNameNorm)) continue;
                }
                // Only count APPROVED bookings for calendar availability?
                // Usually we count approved. If you want to hide pending, uncomment this:
                // if (!"APPROVED".equalsIgnoreCase(s.getStatus())) continue;

                if (s.getDate() != null) {
                    try {
                        LocalDate d = LocalDate.parse(s.getDate(), DATE_FMT);
                        if (!d.isBefore(start) && !d.isAfter(end)) counts.put(d, counts.getOrDefault(d, 0) + 1);
                    } catch (Exception ex) {}
                }
                if (s.getStartDate() != null && s.getEndDate() != null) {
                    try {
                        LocalDate sd = LocalDate.parse(s.getStartDate(), DATE_FMT);
                        LocalDate ed = LocalDate.parse(s.getEndDate(), DATE_FMT);
                        LocalDate from = sd.isBefore(start) ? start : sd;
                        LocalDate to = ed.isAfter(end) ? end : ed;
                        if (!to.isBefore(from)) {
                            LocalDate curr = from;
                            while (!curr.isAfter(to)) {
                                counts.put(curr, counts.getOrDefault(curr, 0) + 1);
                                curr = curr.plusDays(1);
                            }
                        }
                    } catch (Exception ex) {}
                }
                if (s.getDaySlots() != null && !s.getDaySlots().isEmpty()) {
                    for (String key : s.getDaySlots().keySet()) {
                        try {
                            LocalDate d = LocalDate.parse(key, DATE_FMT);
                            if (!d.isBefore(start) && !d.isAfter(end)) counts.put(d, counts.getOrDefault(d, 0) + 1);
                        } catch (Exception ex) {}
                    }
                }
            }

            List<CalendarDaySummary> result = new ArrayList<>();
            LocalDate cursor = start;
            while (!cursor.isAfter(end)) {
                int c = counts.getOrDefault(cursor, 0);
                result.add(new CalendarDaySummary(cursor, c == 0, c));
                cursor = cursor.plusDays(1);
            }
            return ResponseEntity.ok(result);
        } catch (Exception ex) {
            log.error("[SeminarController] getCalendarMonthSummary error: {}", ex.getMessage(), ex);
            return ResponseEntity.status(500).body(Map.of("error", "Server error"));
        }
    }

    @GetMapping("/day/{date}")
    public ResponseEntity<?> getSeminarsForDay(
            @PathVariable String date,
            @RequestParam(required = false) String hallName) {
        try {
            if (hallName != null && !hallName.isBlank()) {
                return ResponseEntity.ok(seminarService.getByHallAndDate(date, hallName));
            } else {
                return ResponseEntity.ok(seminarService.getSeminarsByDate(date));
            }
        } catch (Exception ex) {
            log.error("[SeminarController] getSeminarsForDay error: {}", ex.getMessage(), ex);
            return ResponseEntity.status(500).body(Map.of("error", "Server error"));
        }
    }

    // ----------------- UPDATE / APPROVE / REJECT -----------------
    @PutMapping("/{id}")
    public ResponseEntity<?> updateSeminar(
            @PathVariable String id,
            @RequestBody Seminar updatedSeminar,
            HttpServletRequest request,
            Principal principal) { // ✅ Added Principal for Real User Email
        try {
            Seminar before = seminarService.getById(id).orElse(null);
            String beforeStatus = before == null ? "UNKNOWN" : (before.getStatus() == null ? "UNKNOWN" : before.getStatus().toUpperCase());

            Seminar seminar = seminarService.updateSeminar(id, updatedSeminar);
            if (seminar == null) {
                return ResponseEntity.notFound().build();
            }

            String afterStatus = seminar.getStatus() == null ? "UNKNOWN" : seminar.getStatus().toUpperCase();

            // ✅ LOGGING STATUS CHANGE
            if (!beforeStatus.equals(afterStatus)) {
                String action = "UPDATE_STATUS";
                if ("APPROVED".equals(afterStatus)) action = "APPROVE_SEMINAR";
                if ("REJECTED".equals(afterStatus)) action = "REJECT_SEMINAR";
                if ("CANCELLED".equals(afterStatus)) action = "CANCEL_SEMINAR";

                // ✅ Use Real Email or Fallback
                String actorEmail = (principal != null) ? principal.getName() : "ADMIN";

                logService.logAction(
                        request,
                        action,
                        actorEmail, // Real Email Logged Here
                        "ADMIN",
                        id,
                        "Status changed from " + beforeStatus + " to " + afterStatus + ". Remarks: " + updatedSeminar.getRemarks()
                );

                // Send Emails
                if (afterStatus.equals("APPROVED") || afterStatus.equals("REJECTED")
                        || afterStatus.equals("CANCELLED") || afterStatus.equals("CANCEL_REQUESTED")) {

                    String reason = updatedSeminar.getRemarks();
                    if ((reason == null || reason.isBlank()) && updatedSeminar.getCancellationReason() != null) {
                        reason = updatedSeminar.getCancellationReason();
                    }

                    // 1) Notify Requester
                    try {
                        CompletableFuture<Boolean> f = emailService.sendStatusNotification(seminar.getEmail(), seminar, afterStatus, reason);
                        attachLogging(f, "sendStatusNotification(" + afterStatus + ")", seminar.getEmail());
                    } catch (Exception ex) {
                        log.error("[SeminarController] Failed to notify requester", ex);
                    }

                    // 2) Notify Operators
                    try {
                        if (seminar.getHallName() != null) {
                            List<HallOperator> heads = hallOperatorService.findByHallName(seminar.getHallName());
                            for (HallOperator head : heads) {
                                if ("APPROVED".equals(afterStatus)) emailService.sendHallHeadBookingApprovedEmail(head, seminar, reason);
                                else if ("REJECTED".equals(afterStatus)) emailService.sendHallHeadBookingRejectedEmail(head, seminar, reason);
                                else if ("CANCELLED".equals(afterStatus)) emailService.sendHallHeadBookingCancelledEmail(head, seminar, reason);
                            }
                        }
                    } catch (Exception ex) {
                        log.error("[SeminarController] Error notifying operators", ex);
                    }
                }
            } else {
                // Just a detail update
                logService.logAction(request, "UPDATE_DETAILS", "ADMIN", "ADMIN", id, "Updated booking details");
            }

            return ResponseEntity.ok(seminar);
        } catch (RuntimeException ex) {
            return ResponseEntity.badRequest().body(Map.of("error", ex.getMessage()));
        } catch (Exception ex) {
            log.error("[SeminarController] updateSeminar unexpected error: {}", ex.getMessage(), ex);
            return ResponseEntity.status(500).body(Map.of("error", "Server error"));
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteSeminar(@PathVariable String id, HttpServletRequest request, Principal principal) { // ✅ Added Principal
        seminarService.getById(id).ifPresent(seminar -> {

            String actorEmail = (principal != null) ? principal.getName() : "ADMIN";

            // ✅ LOGGING DELETE
            logService.logAction(request, "DELETE_SEMINAR", actorEmail, "ADMIN", id, "Deleted seminar: " + seminar.getSlotTitle());

            try {
                CompletableFuture<Boolean> f = emailService.sendSeminarRemovedEmail(seminar);
                attachLogging(f, "sendSeminarRemovedEmail", seminar.getEmail());
            } catch (Exception ex) {
                log.error("[SeminarController] Failed to initiate seminar-removed email: {}", ex.getMessage(), ex);
            }

            try {
                if (seminar.getHallName() != null) {
                    List<HallOperator> heads = hallOperatorService.findByHallName(seminar.getHallName());
                    for (HallOperator head : heads) {
                        try {
                            CompletableFuture<Boolean> f = emailService.sendHallHeadBookingCancelledEmail(head, seminar, "Booking removed from portal");
                            attachLogging(f, "sendHallHeadBookingCancelledEmail", head.getHeadEmail());
                        } catch (Exception ex) {
                            log.error("[SeminarController] Failed to notify hall head on delete", ex);
                        }
                    }
                }
            } catch (Exception ex) {
                log.error("[SeminarController] Error notifying hall operator on deletion", ex);
            }
        });

        seminarService.deleteSeminar(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/history")
    public ResponseEntity<List<Seminar>> getHistory(
            @RequestParam String department,
            @RequestParam String email) {
        return ResponseEntity.ok(seminarService.getByDepartmentAndEmail(department, email));
    }

    @PutMapping("/{id}/cancel-request")
    public ResponseEntity<?> requestCancel(@PathVariable String id, @RequestBody Map<String, String> body, HttpServletRequest request) { // ✅ Added Request
        try {
            String remarks = body.getOrDefault("remarks", null);
            String cancellationReason = body.getOrDefault("cancellationReason", null);
            Seminar updated = seminarService.requestCancel(id, cancellationReason, remarks);
            if (updated == null) {
                return ResponseEntity.notFound().build();
            }

            // ✅ LOGGING CANCEL REQUEST
            logService.logAction(
                    request,
                    "CANCEL_REQUEST",
                    updated.getEmail(),
                    "DEPT",
                    id,
                    "Requested cancellation. Reason: " + cancellationReason
            );

            // Emails...
            try {
                emailService.sendStatusNotification(updated.getEmail(), updated, "CANCEL_REQUESTED", cancellationReason);
            } catch (Exception ex) {
                log.error("[SeminarController] Failed to notify requester of cancel-request", ex);
            }

            try {
                if (updated.getHallName() != null) {
                    List<HallOperator> heads = hallOperatorService.findByHallName(updated.getHallName());
                    for (HallOperator head : heads) {
                        emailService.sendHallHeadBookingCreatedEmail(head, updated); // Re-using created template as notification
                    }
                }
            } catch (Exception ex) {
                log.error("[SeminarController] Error notifying hall operator on cancel-request", ex);
            }

            return ResponseEntity.ok(updated);
        } catch (RuntimeException ex) {
            return ResponseEntity.badRequest().body(Map.of("error", ex.getMessage()));
        } catch (Exception ex) {
            log.error("[SeminarController] requestCancel unexpected error: {}", ex.getMessage(), ex);
            return ResponseEntity.status(500).body(Map.of("error", "Server error"));
        }
    }

    @GetMapping("/search")
    public ResponseEntity<List<Seminar>> search(
            @RequestParam(required = false) String department,
            @RequestParam(required = false) String hall,
            @RequestParam(required = false) String date,
            @RequestParam(required = false) String slot
    ) {
        List<Seminar> all = seminarService.getAllSeminars();
        List<Seminar> filtered = all.stream()
                .filter(s -> department == null || department.isBlank() ||
                        (s.getDepartment() != null && s.getDepartment().equalsIgnoreCase(department)))
                .filter(s -> hall == null || hall.isBlank() ||
                        (s.getHallName() != null && s.getHallName().equalsIgnoreCase(hall)))
                .filter(s -> date == null || date.isBlank() ||
                        (s.getDate() != null && s.getDate().equals(date)))
                .filter(s -> slot == null || slot.isBlank() ||
                        (s.getSlot() != null && s.getSlot().toLowerCase().contains(slot.toLowerCase())))
                .toList();
        return ResponseEntity.ok(filtered);
    }

    private void attachLogging(CompletableFuture<Boolean> future, String operation, String target) {
        if (future == null) return;
        future.whenComplete((ok, ex) -> {
            if (ex != null) {
                log.error("[Email] {} failed for target={} : {}", operation, target, ex.getMessage(), ex);
            } else {
                if (Boolean.TRUE.equals(ok)) {
                    log.info("[Email] {} succeeded for target={}", operation, target);
                } else {
                    log.warn("[Email] {} returned false for target={}", operation, target);
                }
            }
        });
    }

    public static class CalendarDaySummary {
        private String date;
        private boolean free;
        private int bookingCount;

        public CalendarDaySummary() {}

        public CalendarDaySummary(LocalDate date, boolean free, int bookingCount) {
            this.date = date.format(DATE_FMT);
            this.free = free;
            this.bookingCount = bookingCount;
        }

        public String getDate() { return date; }
        public void setDate(String date) { this.date = date; }
        public boolean isFree() { return free; }
        public void setFree(boolean free) { this.free = free; }
        public int getBookingCount() { return bookingCount; }
        public void setBookingCount(int bookingCount) { this.bookingCount = bookingCount; }
    }
}