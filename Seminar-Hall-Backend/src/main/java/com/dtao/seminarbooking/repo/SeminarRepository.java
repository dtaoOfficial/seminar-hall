package com.dtao.seminarbooking.repo;

import com.dtao.seminarbooking.model.Seminar;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface SeminarRepository extends MongoRepository<Seminar, String> {

    // =========================================================================
    // 1. BASIC FINDERS
    // =========================================================================
    List<Seminar> findByDate(String date);
    List<Seminar> findByDateAndHallName(String date, String hallName);
    List<Seminar> findByDepartmentAndEmail(String department, String email);
    List<Seminar> findByStatusIgnoreCase(String status);

    // =========================================================================
    // 2. RANGE / OVERLAP FINDERS (The "Magic" Queries)
    // =========================================================================

    /**
     * Finds overlapping Day-Wise (Multi-day) bookings.
     * Logic: Overlap exists if (ExistingStart <= ReqEnd) AND (ExistingEnd >= ReqStart).
     * * Usage in Service:
     * findByHallNameAndStartDateLessThanEqualAndEndDateGreaterThanEqual(hall, reqEndDate, reqStartDate)
     */
    List<Seminar> findByHallNameAndStartDateLessThanEqualAndEndDateGreaterThanEqual(
            String hallName,
            String reqEndDate,   // Pass your requested END date here
            String reqStartDate  // Pass your requested START date here
    );

    /**
     * Global version of the above (when hallName is not specified, e.g., Calendar view of all halls)
     */
    List<Seminar> findByStartDateLessThanEqualAndEndDateGreaterThanEqual(
            String reqEndDate,
            String reqStartDate
    );

    // =========================================================================
    // 3. CALENDAR & REPORTING HELPERS
    // =========================================================================

    /**
     * Finds all Time-Wise (Single Date) bookings within a specific range.
     * Useful for fetching a whole month's calendar data.
     */
    List<Seminar> findByHallNameAndDateBetween(
            String hallName,
            String startRange, // e.g., "2026-01-01"
            String endRange    // e.g., "2026-01-31"
    );

    /**
     * Global version of the above (for all halls)
     */
    List<Seminar> findByDateBetween(String startRange, String endRange);

    // =========================================================================
    // 4. DEPARTMENT SPECIFIC (For "My Bookings" / History)
    // =========================================================================

    List<Seminar> findByDepartmentAndDateBetween(
            String department,
            String startDate,
            String endDate
    );

    List<Seminar> findByDepartmentAndStartDateLessThanEqualAndEndDateGreaterThanEqual(
            String department,
            String endDate,
            String startDate
    );
}