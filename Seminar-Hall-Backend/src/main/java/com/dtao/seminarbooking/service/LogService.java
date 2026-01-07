package com.dtao.seminarbooking.service;

import com.dtao.seminarbooking.model.Log;
import com.dtao.seminarbooking.repo.LogRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import jakarta.servlet.http.HttpServletRequest; // Use 'javax.servlet' if on older Spring Boot
import java.util.concurrent.CompletableFuture;

@Service
public class LogService {

    private static final Logger log = LoggerFactory.getLogger(LogService.class);
    private final LogRepository logRepository;

    public LogService(LogRepository logRepository) {
        this.logRepository = logRepository;
    }

    /**
     * Async method to save logs so it doesn't slow down the main app.
     */
    public void logAction(HttpServletRequest request, String action, String email, String role, String targetId, String details) {
        CompletableFuture.runAsync(() -> {
            try {
                String ip = getClientIp(request);
                Log entry = new Log(action, email, role, targetId, details, ip);
                logRepository.save(entry);
                log.info("[AUDIT] Action: {}, User: {}, IP: {}", action, email, ip);
            } catch (Exception e) {
                log.error("Failed to save audit log", e);
            }
        });
    }

    // Helper to get real IP even behind proxy/load balancer
    private String getClientIp(HttpServletRequest request) {
        if (request == null) return "UNKNOWN";
        String ip = request.getHeader("X-Forwarded-For");
        if (ip == null || ip.isEmpty() || "unknown".equalsIgnoreCase(ip)) {
            ip = request.getHeader("Proxy-Client-IP");
        }
        if (ip == null || ip.isEmpty() || "unknown".equalsIgnoreCase(ip)) {
            ip = request.getHeader("WL-Proxy-Client-IP");
        }
        if (ip == null || ip.isEmpty() || "unknown".equalsIgnoreCase(ip)) {
            ip = request.getRemoteAddr();
        }
        // If multiple IPs (proxy chain), take the first one
        if (ip != null && ip.contains(",")) {
            ip = ip.split(",")[0].trim();
        }
        return ip;
    }
}