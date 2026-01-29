package com.dtao.seminarbooking.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.DBRef;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;
import java.util.Map;

@Document(collection = "seminars")
public class Seminar {

    @Id
    private String id;

    // "Custom" (Time Wise) or "DayRange" (Day Wise)
    private String slot;

    private String hallName;
    private String bookingName; // Faculty / Coordinator Name
    private String email;
    private String department;
    private String phone;
    private String slotTitle;   // Event Name
    private String remarks;
    private String status;      // APPROVED, PENDING, REJECTED, CANCEL_REQUESTED

    // Audit
    private String appliedAt;   // ISO String of LocalDateTime
    private String createdBy;   // "USER", "ADMIN", "DEPARTMENT"
    private String cancellationReason;

    // =========================================================================
    // 1. TIME-WISE BOOKING FIELDS (Single Day Partial)
    // =========================================================================
    private String date;        // YYYY-MM-DD
    private String startTime;   // HH:mm (24h)
    private String endTime;     // HH:mm (24h)

    // =========================================================================
    // 2. DAY-WISE BOOKING FIELDS (Multi-Day / Full Day)
    // =========================================================================
    private String startDate;   // YYYY-MM-DD
    private String endDate;     // YYYY-MM-DD

    // Map for custom slots within a day range.
    // Key: "YYYY-MM-DD" -> Value: DaySlot object (start/end)
    // If a date in the range is NOT in this map, it is considered a FULL DAY booking.
    private Map<String, DaySlot> daySlots;

    // --- Relations ---
    @DBRef
    private SeminarHall hall;

    // --- Constructors ---
    public Seminar() {}

    // --- Helper Class for Day Slots ---
    public static class DaySlot {
        private String startTime;
        private String endTime;

        public DaySlot() {}
        public DaySlot(String startTime, String endTime) {
            this.startTime = startTime;
            this.endTime = endTime;
        }
        public String getStartTime() { return startTime; }
        public void setStartTime(String startTime) { this.startTime = startTime; }
        public String getEndTime() { return endTime; }
        public void setEndTime(String endTime) { this.endTime = endTime; }
    }

    // =========================================================================
    // GETTERS & SETTERS
    // =========================================================================

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getSlot() { return slot; }
    public void setSlot(String slot) { this.slot = slot; }

    public String getHallName() { return hallName; }
    public void setHallName(String hallName) { this.hallName = hallName; }

    public String getBookingName() { return bookingName; }
    public void setBookingName(String bookingName) { this.bookingName = bookingName; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public String getDepartment() { return department; }
    public void setDepartment(String department) { this.department = department; }

    public String getPhone() { return phone; }
    public void setPhone(String phone) { this.phone = phone; }

    public String getSlotTitle() { return slotTitle; }
    public void setSlotTitle(String slotTitle) { this.slotTitle = slotTitle; }

    public String getRemarks() { return remarks; }
    public void setRemarks(String remarks) { this.remarks = remarks; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getAppliedAt() { return appliedAt; }
    public void setAppliedAt(String appliedAt) { this.appliedAt = appliedAt; }

    public String getCreatedBy() { return createdBy; }
    public void setCreatedBy(String createdBy) { this.createdBy = createdBy; }

    public String getCancellationReason() { return cancellationReason; }
    public void setCancellationReason(String cancellationReason) { this.cancellationReason = cancellationReason; }

    public String getDate() { return date; }
    public void setDate(String date) { this.date = date; }

    public String getStartTime() { return startTime; }
    public void setStartTime(String startTime) { this.startTime = startTime; }

    public String getEndTime() { return endTime; }
    public void setEndTime(String endTime) { this.endTime = endTime; }

    public String getStartDate() { return startDate; }
    public void setStartDate(String startDate) { this.startDate = startDate; }

    public String getEndDate() { return endDate; }
    public void setEndDate(String endDate) { this.endDate = endDate; }

    public Map<String, DaySlot> getDaySlots() { return daySlots; }
    public void setDaySlots(Map<String, DaySlot> daySlots) { this.daySlots = daySlots; }

    public SeminarHall getHall() { return hall; }
    public void setHall(SeminarHall hall) { this.hall = hall; }
}