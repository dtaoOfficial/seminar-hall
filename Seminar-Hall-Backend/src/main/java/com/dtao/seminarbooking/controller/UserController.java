package com.dtao.seminarbooking.controller;

import com.dtao.seminarbooking.model.User;
import com.dtao.seminarbooking.payload.LoginRequest;
import com.dtao.seminarbooking.service.EmailService;
import com.dtao.seminarbooking.service.LogService; // ✅ IMPORTED
import com.dtao.seminarbooking.service.UserService;
import com.dtao.seminarbooking.security.JwtTokenProvider;
import jakarta.servlet.http.HttpServletRequest; // ✅ IMPORTED
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.AuthenticationException;
import org.springframework.web.bind.annotation.*;

import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/users")
public class UserController {

    @Autowired
    private UserService userService;

    @Autowired
    private EmailService emailService;

    @Autowired
    private AuthenticationManager authenticationManager;

    @Autowired
    private JwtTokenProvider jwtTokenProvider;

    @Autowired
    private LogService logService; // ✅ INJECTED LOG SERVICE

    @PostMapping
    public ResponseEntity<?> createUser(@RequestBody User user, HttpServletRequest request) { // ✅ Added Request
        try {
            if (user.getCreatedBy() == null) user.setCreatedBy("system");
            User saved = userService.addUser(user);

            // ✅ LOGGING: User Created
            // Assuming the creator is an Admin. If you have the current user's email from JWT, you can put that instead of "ADMIN".
            logService.logAction(
                    request,
                    "CREATE_USER",
                    "ADMIN",
                    "ADMIN",
                    saved.getEmail(),
                    "Created new user: " + saved.getName() + " (" + saved.getDepartment() + ")"
            );

            try {
                emailService.sendWelcomeEmail(saved);
            } catch (Exception ex) {
                System.err.println("[UserController] Welcome email failed: " + ex.getMessage());
                ex.printStackTrace();
            }

            return ResponseEntity.ok(toResponse(saved));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        } catch (Exception ex) {
            ex.printStackTrace();
            return ResponseEntity.status(500).body(Map.of("error", "Server error"));
        }
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody LoginRequest loginRequest, HttpServletRequest request) { // ✅ Added Request
        try {
            if (loginRequest == null || loginRequest.getEmail() == null || loginRequest.getPassword() == null) {
                return ResponseEntity.badRequest().body(Map.of("error", "Email and password required"));
            }

            Authentication authentication;
            try {
                UsernamePasswordAuthenticationToken authToken =
                        new UsernamePasswordAuthenticationToken(loginRequest.getEmail().trim().toLowerCase(), loginRequest.getPassword());
                authentication = authenticationManager.authenticate(authToken);
            } catch (AuthenticationException ae) {
                // Optional: Log failed login attempts for security
                logService.logAction(request, "LOGIN_FAILED", loginRequest.getEmail(), "UNKNOWN", "N/A", "Invalid credentials");
                return ResponseEntity.status(401).body(Map.of("error", "Invalid credentials"));
            }

            boolean rememberMe = loginRequest.isRememberMe();
            String jwt = jwtTokenProvider.generateToken(authentication, rememberMe);
            long expiresIn = jwtTokenProvider.getExpiresInSeconds(rememberMe);

            Optional<User> maybeUser = userService.getUserByEmail(loginRequest.getEmail().trim().toLowerCase());
            if (maybeUser.isEmpty()) {
                return ResponseEntity.status(500).body(Map.of("error", "User record not found after authentication"));
            }
            User user = maybeUser.get();

            String normalizedRole = user.getRole() == null ? "DEPARTMENT" : user.getRole();

            // ✅ LOGGING: Login Success
            logService.logAction(
                    request,
                    "LOGIN",
                    user.getEmail(),
                    normalizedRole,
                    user.getId(),
                    "User logged in successfully"
            );

            Map<String, Object> resp = new HashMap<>();
            resp.put("token", jwt);
            resp.put("expiresIn", expiresIn);
            resp.put("user", toResponse(user));
            resp.put("role", normalizedRole);

            if ("ADMIN".equalsIgnoreCase(normalizedRole)) {
                List<Map<String, Object>> usersForDashboard = userService.getAllUsers()
                        .stream()
                        .map(u -> {
                            Map<String, Object> m = new HashMap<>();
                            m.put("id", u.getId());
                            m.put("name", u.getName());
                            m.put("email", u.getEmail());
                            m.put("department", u.getDepartment());
                            m.put("role", u.getRole());
                            return m;
                        })
                        .collect(Collectors.toList());
                resp.put("users", usersForDashboard);
            }

            return ResponseEntity.ok(resp);
        } catch (Exception e) {
            e.printStackTrace();
            String errMsg = e.getMessage() != null ? e.getMessage() : "Server error during login";
            return ResponseEntity.status(500).body(Map.of("error", errMsg));
        }
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getUserById(@PathVariable String id) {
        return userService.getUserById(id)
                .map(u -> ResponseEntity.ok(toResponse(u)))
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping
    public ResponseEntity<?> getAllUsers() {
        List<User> all = userService.getAllUsers();
        List<Map<String, Object>> resp = all.stream().map(this::toResponse).collect(Collectors.toList());
        return ResponseEntity.ok(resp);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteUser(@PathVariable String id, HttpServletRequest request) { // ✅ Added Request
        Optional<User> maybe = userService.getUserById(id);

        // Capture user details before deleting for the log
        String deletedEmail = maybe.map(User::getEmail).orElse("Unknown");
        String deletedName = maybe.map(User::getName).orElse("Unknown");

        maybe.ifPresent(user -> {
            try {
                emailService.sendAccountRemovedEmail(user);
            } catch (Exception ex) {
                System.err.println("[UserController] Delete-user email failed: " + ex.getMessage());
                ex.printStackTrace();
            }
        });

        userService.deleteUser(id);

        // ✅ LOGGING: User Deleted
        logService.logAction(
                request,
                "DELETE_USER",
                "ADMIN",
                "ADMIN",
                id,
                "Deleted user: " + deletedName + " (" + deletedEmail + ")"
        );

        return ResponseEntity.noContent().build();
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> updateUser(@PathVariable String id, @RequestBody User user, HttpServletRequest request) { // ✅ Added Request
        try {
            return userService.updateUser(id, user)
                    .map(u -> {
                        // ✅ LOGGING: User Updated
                        logService.logAction(
                                request,
                                "UPDATE_USER",
                                "ADMIN",
                                "ADMIN",
                                id,
                                "Updated profile for: " + u.getEmail()
                        );
                        return ResponseEntity.ok(toResponse(u));
                    })
                    .orElse(ResponseEntity.notFound().build());
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(500).body(Map.of("error", "Failed to update user"));
        }
    }

    private Map<String, Object> toResponse(User u) {
        if (u == null) return null;
        Map<String, Object> r = new HashMap<>();
        r.put("id", u.getId());
        r.put("name", u.getName());
        r.put("department", u.getDepartment());
        r.put("email", u.getEmail());
        r.put("phone", u.getPhone());
        r.put("role", u.getRole());
        r.put("createdBy", u.getCreatedBy());
        r.put("createdAt", u.getCreatedAt() == null ? null : u.getCreatedAt().toString());
        r.put("active", u.isActive());
        return r;
    }
}