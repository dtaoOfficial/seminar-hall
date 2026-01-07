package com.dtao.seminarbooking.controller;

import com.dtao.seminarbooking.model.Seminar;
import com.dtao.seminarbooking.service.LogService; // ✅ IMPORTED
import com.dtao.seminarbooking.service.SeminarService;
import jakarta.servlet.http.HttpServletRequest; // ✅ IMPORTED
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * ✅ RequestController (Enhanced)
 * Handles viewing seminar booking requests with Security Logging.
 */
@RestController
@RequestMapping("/api/requests")
public class RequestController {

    private static final Logger log = LoggerFactory.getLogger(RequestController.class);

    private final SeminarService seminarService;
    private final LogService logService; // ✅ INJECTED

    // Constructor Injection is better for testing/stability
    @Autowired
    public RequestController(SeminarService seminarService, LogService logService) {
        this.seminarService = seminarService;
        this.logService = logService;
    }

    /**
     * ✅ Fetch all seminars
     * Logs: "VIEW_ALL_REQUESTS"
     */
    @GetMapping
    public ResponseEntity<List<Seminar>> getRequests(@RequestParam(required = false) String status, HttpServletRequest request) { // ✅ Added Request

        // 1. LOGGING (Audit who viewed the list)
        // Note: If you use polling on this endpoint, this log might fill up fast.
        // Currently, AllSeminarsPage loads this once on mount, so it is safe.
        String filterLog = (status == null) ? "All" : status;
        logService.logAction(
                request,
                "VIEW_ALL_REQUESTS",
                "ADMIN", // Assuming mostly Admins use this endpoint
                "SYSTEM",
                "N/A",
                "Viewed Master Record List. Filter: " + filterLog
        );

        List<Seminar> all = seminarService.getAllSeminars();

        if (status != null && !status.isBlank()) {
            String normalized = status.trim().toUpperCase();
            List<Seminar> filtered = all.stream()
                    .filter(s -> s.getStatus() != null && s.getStatus().toUpperCase().equals(normalized))
                    .collect(Collectors.toList());
            return ResponseEntity.ok(filtered);
        }

        return ResponseEntity.ok(all);
    }

    /**
     * ✅ Get one seminar by ID
     * Logs: "VIEW_REQUEST_DETAILS"
     */
    @GetMapping("/{id}")
    public ResponseEntity<Seminar> getRequestById(@PathVariable String id, HttpServletRequest request) { // ✅ Added Request

        return seminarService.getById(id)
                .map(s -> {
                    // ✅ LOGGING
                    logService.logAction(
                            request,
                            "VIEW_REQUEST_DETAILS",
                            "ADMIN",
                            "ADMIN",
                            id,
                            "Viewed details for: " + s.getSlotTitle()
                    );
                    return ResponseEntity.ok(s);
                })
                .orElse(ResponseEntity.notFound().build());
    }

    /**
     * ✅ Status summary for dashboards
     * Logs: "VIEW_SUMMARY"
     */
    @GetMapping("/summary")
    public ResponseEntity<Map<String, Long>> getSummary(HttpServletRequest request) { // ✅ Added Request

        // ✅ LOGGING (Optional - good to track dashboard hits)
        // logService.logAction(request, "VIEW_SUMMARY", "ADMIN", "SYSTEM", "N/A", "Loaded Dashboard Stats");

        List<Seminar> all = seminarService.getAllSeminars();
        Map<String, Long> counts = all.stream()
                .collect(Collectors.groupingBy(
                        s -> s.getStatus() == null ? "UNKNOWN" : s.getStatus().toUpperCase(),
                        Collectors.counting()
                ));
        return ResponseEntity.ok(counts);
    }
}