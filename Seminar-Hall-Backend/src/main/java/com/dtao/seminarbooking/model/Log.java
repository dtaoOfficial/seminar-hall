package com.dtao.seminarbooking.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import java.time.LocalDateTime;

@Document(collection = "system_logs")
public class Log {
    @Id
    private String id;

    private String action;      // e.g., "CREATE_SEMINAR", "DELETE_USER"
    private String actorEmail;  // Who did it? (email or "ANONYMOUS")
    private String actorRole;   // "ADMIN" or "DEPT"
    private String targetId;    // ID of the object affected (Seminar ID or User ID)
    private String details;     // e.g., "Changed status PENDING -> APPROVED"
    private String ipAddress;   // The real IP
    private LocalDateTime timestamp;

    public Log() {}

    public Log(String action, String actorEmail, String actorRole, String targetId, String details, String ipAddress) {
        this.action = action;
        this.actorEmail = actorEmail;
        this.actorRole = actorRole;
        this.targetId = targetId;
        this.details = details;
        this.ipAddress = ipAddress;
        this.timestamp = LocalDateTime.now();
    }

    // Getters & Setters
    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getAction() { return action; }
    public void setAction(String action) { this.action = action; }
    public String getActorEmail() { return actorEmail; }
    public void setActorEmail(String actorEmail) { this.actorEmail = actorEmail; }
    public String getActorRole() { return actorRole; }
    public void setActorRole(String actorRole) { this.actorRole = actorRole; }
    public String getTargetId() { return targetId; }
    public void setTargetId(String targetId) { this.targetId = targetId; }
    public String getDetails() { return details; }
    public void setDetails(String details) { this.details = details; }
    public String getIpAddress() { return ipAddress; }
    public void setIpAddress(String ipAddress) { this.ipAddress = ipAddress; }
    public LocalDateTime getTimestamp() { return timestamp; }
    public void setTimestamp(LocalDateTime timestamp) { this.timestamp = timestamp; }
}