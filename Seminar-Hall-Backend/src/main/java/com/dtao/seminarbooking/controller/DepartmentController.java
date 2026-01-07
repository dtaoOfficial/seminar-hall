package com.dtao.seminarbooking.controller;

import com.dtao.seminarbooking.model.Department;
import com.dtao.seminarbooking.model.Seminar;
import com.dtao.seminarbooking.payload.CalendarDaySummary;
import com.dtao.seminarbooking.service.DepartmentService;
import com.dtao.seminarbooking.service.LogService; // ✅ IMPORTED
import jakarta.servlet.http.HttpServletRequest; // ✅ IMPORTED
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/departments")
public class DepartmentController {

    @Autowired
    private DepartmentService service;

    @Autowired
    private LogService logService; // ✅ INJECTED

    // =========================
    // Existing CRUD endpoints
    // =========================
    @PostMapping
    public ResponseEntity<Department> add(@RequestBody Department d, HttpServletRequest request) { // ✅ Added Request
        Department saved = service.addDepartment(d);

        // ✅ LOGGING
        logService.logAction(
                request,
                "CREATE_DEPARTMENT",
                "ADMIN",
                "ADMIN",
                saved.getId(),
                "Added new department: " + saved.getName()
        );

        return ResponseEntity.ok(saved);
    }

    @GetMapping
    public ResponseEntity<List<Department>> getAll() {
        // Optional: Log viewing all departments if strict audit is needed
        return ResponseEntity.ok(service.getAllDepartments());
    }

    @PutMapping("/{id}")
    public ResponseEntity<Department> update(@PathVariable String id, @RequestBody Department d, HttpServletRequest request) { // ✅ Added Request
        Department updated = service.updateDepartment(id, d);

        // ✅ LOGGING
        logService.logAction(
                request,
                "UPDATE_DEPARTMENT",
                "ADMIN",
                "ADMIN",
                id,
                "Updated department details for: " + (updated != null ? updated.getName() : id)
        );

        return ResponseEntity.ok(updated);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable String id, HttpServletRequest request) { // ✅ Added Request
        service.deleteDepartment(id);

        // ✅ LOGGING
        logService.logAction(
                request,
                "DELETE_DEPARTMENT",
                "ADMIN",
                "ADMIN",
                id,
                "Deleted department ID: " + id
        );

        return ResponseEntity.noContent().build();
    }

    // =========================
    // ✅ Department Calendar APIs
    // =========================
    @GetMapping("/calendar")
    public ResponseEntity<List<CalendarDaySummary>> getDepartmentCalendar(
            @RequestParam String department,
            @RequestParam int year,
            @RequestParam int month,
            HttpServletRequest request // ✅ Added Request
    ) {
        // ✅ LOGGING (Track calendar usage)
        /* Uncomment if you want to track every calendar view.
           Might create many logs if used frequently.
        */
        // logService.logAction(request, "VIEW_DEPT_CALENDAR", "DEPT", "SYSTEM", department, "Viewed calendar for " + month + "/" + year);

        return ResponseEntity.ok(service.getDepartmentCalendar(department, year, month));
    }

    @GetMapping("/day")
    public ResponseEntity<List<Seminar>> getDepartmentSeminarsByDate(
            @RequestParam String department,
            @RequestParam String date,
            HttpServletRequest request // ✅ Added Request
    ) {
        return ResponseEntity.ok(service.getDepartmentSeminarsByDate(department, date));
    }
}