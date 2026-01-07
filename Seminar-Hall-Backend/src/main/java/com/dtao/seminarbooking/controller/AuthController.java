package com.dtao.seminarbooking.controller;

import com.dtao.seminarbooking.security.CustomUserDetailsService;
import com.dtao.seminarbooking.security.JwtTokenProvider;
import com.dtao.seminarbooking.service.LogService; // ✅ IMPORTED
import com.dtao.seminarbooking.service.OtpService;
import jakarta.servlet.http.HttpServletRequest; // ✅ IMPORTED
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private static final Logger log = LoggerFactory.getLogger(AuthController.class);

    @Autowired
    private OtpService otpService;

    @Autowired
    private JwtTokenProvider jwtTokenProvider;

    @Autowired
    private CustomUserDetailsService customUserDetailsService;

    @Autowired
    private LogService logService; // ✅ INJECTED

    // ========================
    // 🔐 PASSWORD RECOVERY FLOW
    // ========================
    @PostMapping("/forgot-password")
    public ResponseEntity<?> forgotPassword(@RequestBody Map<String, String> req, HttpServletRequest request) { // ✅ Added Request
        String email = req.get("email");

        if (otpService.generateOtp(email)) {
            // ✅ LOGGING: Success
            logService.logAction(
                    request,
                    "FORGOT_PASSWORD_REQ",
                    email,
                    "ANONYMOUS",
                    "N/A",
                    "OTP generated and sent for password recovery"
            );
            return ResponseEntity.ok(Map.of("message", "OTP sent to email if account exists."));
        }

        // ✅ LOGGING: Failed Attempt (User not found)
        logService.logAction(
                request,
                "FORGOT_PASSWORD_FAIL",
                email,
                "ANONYMOUS",
                "N/A",
                "Failed reset attempt: Email not found"
        );

        return ResponseEntity.badRequest().body(Map.of("error", "Email not found"));
    }

    @PostMapping("/verify-otp")
    public ResponseEntity<?> verifyOtp(@RequestBody Map<String, String> req, HttpServletRequest request) { // ✅ Added Request
        String email = req.get("email");
        String otp = req.get("otp");

        String status = otpService.verifyOtp(email, otp);

        // ✅ LOGGING: Based on outcome
        String actionType = "VALID".equals(status) ? "OTP_VERIFIED" : "OTP_FAILED";
        logService.logAction(
                request,
                actionType,
                email,
                "ANONYMOUS",
                "N/A",
                "OTP Verification Result: " + status
        );

        return switch (status) {
            case "VALID" -> ResponseEntity.ok(Map.of("message", "OTP verified. You can reset password now."));
            case "EXPIRED" -> ResponseEntity.badRequest().body(Map.of("error", "OTP expired. Please request a new one."));
            case "INVALID" -> ResponseEntity.badRequest().body(Map.of("error", "Invalid OTP. Please try again."));
            case "NO_TOKEN" -> ResponseEntity.badRequest().body(Map.of("error", "No active OTP found. Please request again."));
            case "USER_NOT_FOUND" -> ResponseEntity.badRequest().body(Map.of("error", "No account found for this email."));
            default -> ResponseEntity.badRequest().body(Map.of("error", "Verification failed."));
        };
    }

    @PostMapping("/reset-password")
    public ResponseEntity<?> resetPassword(@RequestBody Map<String, String> req, HttpServletRequest request) { // ✅ Added Request
        String email = req.get("email");
        String newPassword = req.get("newPassword");

        if (otpService.resetPassword(email, newPassword)) {
            // ✅ LOGGING: Password Changed
            logService.logAction(
                    request,
                    "RESET_PASSWORD_SUCCESS",
                    email,
                    "ANONYMOUS",
                    "N/A",
                    "User successfully changed password via OTP flow"
            );
            return ResponseEntity.ok(Map.of("message", "Password updated. You can login now."));
        }

        // ✅ LOGGING: Failure
        logService.logAction(request, "RESET_PASSWORD_FAIL", email, "ANONYMOUS", "N/A", "Failed to update password in DB");
        return ResponseEntity.badRequest().body(Map.of("error", "Failed to reset password"));
    }

    // =========================
    // 🔁 JWT REFRESH TOKEN FLOW
    // =========================
    @PostMapping("/refresh-token")
    public ResponseEntity<?> refreshToken(@RequestHeader(value = "Authorization", required = false) String header, HttpServletRequest request) { // ✅ Added Request
        try {
            String token = header != null && header.startsWith("Bearer ") ? header.substring(7) : null;
            if (token == null || !jwtTokenProvider.validateToken(token)) {
                logService.logAction(request, "REFRESH_TOKEN_FAIL", "UNKNOWN", "UNKNOWN", "N/A", "Invalid or missing token");
                return ResponseEntity.status(401).body(Map.of("error", "Invalid token"));
            }

            String username = jwtTokenProvider.getUsernameFromToken(token);
            if (username == null || username.isBlank()) {
                return ResponseEntity.status(401).body(Map.of("error", "Invalid token payload"));
            }

            UserDetails userDetails = customUserDetailsService.loadUserByUsername(username);
            if (userDetails == null) {
                return ResponseEntity.status(401).body(Map.of("error", "User not found"));
            }

            UsernamePasswordAuthenticationToken auth =
                    new UsernamePasswordAuthenticationToken(userDetails, null, userDetails.getAuthorities());

            // false = not rememberMe (short session). Match your login behavior as needed.
            String newToken = jwtTokenProvider.generateToken(auth, false);
            long expiresIn = jwtTokenProvider.getExpiresInSeconds(false);

            log.info("Refreshed token for user={}", username);

            // ✅ LOGGING: Token Refreshed
            logService.logAction(
                    request,
                    "REFRESH_TOKEN",
                    username,
                    "USER",
                    "N/A",
                    "Session token refreshed"
            );

            return ResponseEntity.ok(Map.of("token", newToken, "expiresIn", expiresIn));
        } catch (Exception ex) {
            log.error("refreshToken failed: {}", ex.getMessage(), ex);
            return ResponseEntity.status(500).body(Map.of("error", "Server error during token refresh"));
        }
    }
}