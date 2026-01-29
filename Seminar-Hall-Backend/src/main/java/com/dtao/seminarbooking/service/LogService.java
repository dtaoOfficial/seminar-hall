package com.dtao.seminarbooking.service;

import com.dtao.seminarbooking.model.Log;
import com.dtao.seminarbooking.repo.LogRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import jakarta.servlet.http.HttpServletRequest;
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

        // --- CRITICAL FIX START ---
        // We must extract the IP Address HERE (Synchronously) while the request is valid.
        // If we do this inside CompletableFuture, the request object might be destroyed (recycled) by then.
        String clientIp = getClientIp(request);
        // --- CRITICAL FIX END ---

        CompletableFuture.runAsync(() -> {
            try {
                // Now we use the string 'clientIp' we captured earlier, instead of 'request'
                Log entry = new Log(action, email, role, targetId, details, clientIp);
                logRepository.save(entry);
                log.info("[AUDIT] Action: {}, User: {}, IP: {}", action, email, clientIp);
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