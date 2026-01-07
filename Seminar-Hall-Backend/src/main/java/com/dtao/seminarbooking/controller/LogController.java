package com.dtao.seminarbooking.controller;

import com.dtao.seminarbooking.model.Log;
import com.dtao.seminarbooking.repo.LogRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/logs")
public class LogController {

    @Autowired
    private LogRepository logRepository;

    // Get all logs (Latest first)
    @GetMapping
    public ResponseEntity<List<Log>> getAllLogs() {
        return ResponseEntity.ok(logRepository.findAllByOrderByTimestampDesc());
    }

    // Get logs by specific user email (for filtering)
    @GetMapping("/user/{email}")
    public ResponseEntity<List<Log>> getLogsByUser(@PathVariable String email) {
        return ResponseEntity.ok(logRepository.findByActorEmail(email));
    }
}