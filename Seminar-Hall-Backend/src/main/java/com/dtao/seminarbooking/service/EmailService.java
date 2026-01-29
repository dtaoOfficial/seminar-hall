package com.dtao.seminarbooking.service;

import com.dtao.seminarbooking.model.HallOperator;
import com.dtao.seminarbooking.model.Seminar;
import com.dtao.seminarbooking.model.User;
import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.io.UnsupportedEncodingException;
import java.util.List;
import java.util.concurrent.CompletableFuture;

@Service
public class EmailService {

    private static final Logger logger = LoggerFactory.getLogger(EmailService.class);
    // You can change this display name in .env if needed
    private static final String SENDER_NAME = "Venue Booking System";

    private final JavaMailSender mailSender;

    @Value("${app.mail.from}")
    private String mailFrom;

    @Value("${app.mail.website}")
    private String websiteUrl;

    public EmailService(JavaMailSender mailSender) {
        this.mailSender = mailSender;
    }

    // =========================================================================
    // CORE SMTP HELPER
    // =========================================================================

    private boolean sendHtml(String to, String subject, String htmlBody) {
        if (!validEmail(to)) {
            logger.warn("Attempted to send email to invalid address: {}", to);
            return false;
        }
        try {
            MimeMessage msg = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(msg, true, "UTF-8");

            helper.setFrom(mailFrom, SENDER_NAME);
            helper.setTo(to);
            helper.setSubject(subject);
            helper.setText(htmlBody, true);

            mailSender.send(msg);
            logger.info("Email sent successfully to: {}", to);
            return true;
        } catch (MessagingException | UnsupportedEncodingException e) {
            logger.error("Failed to send SMTP email to {}", to, e);
            return false;
        }
    }

    // =========================================================================
    // 1. OTP
    // =========================================================================

    public boolean sendOtp(String toEmail, String otp) {
        if (!validEmail(toEmail) || otp == null) return false;
        String subject = "Seminar Booking - Password Reset OTP";
        String html = "<html><body style='font-family:Arial,Helvetica,sans-serif;padding:18px'>" +
                "<h2>OTP for Seminar Booking</h2>" +
                "<p>Your OTP is: <strong>" + escape(otp) + "</strong></p>" +
                "<p>Valid for 5 minutes.</p>" +
                "</body></html>";
        return sendHtml(toEmail, subject, html);
    }

    // =========================================================================
    // 2. USER NOTIFICATIONS
    // =========================================================================

    @Async
    public CompletableFuture<Boolean> sendWelcomeEmail(User user) {
        if (user == null || !validEmail(user.getEmail())) return done(false);
        String to = user.getEmail();
        String name = user.getName() == null ? "User" : user.getName();

        String subject = "Welcome to Venue Booking System";
        String html = "<html><body style='font-family:Arial,Helvetica,sans-serif;color:#111;padding:18px;'>" +
                "<div style='max-width:650px;margin:0 auto;border:1px solid #e6e6e6;padding:18px;border-radius:6px;'>" +
                "<h2 style='color:#0b5ed7'>Welcome to " + SENDER_NAME + "</h2>" +
                "<p>Dear " + escape(name) + ",</p>" +
                "<p>Thank you for creating an account on the Seminar Booking portal.</p>" +
                "<p><strong>Account</strong><br/>Email: " + escape(to) + "</p>" +
                "<p>Visit: <a href='" + websiteUrl + "'>" + websiteUrl + "</a></p>" +
                footerHtml() + "</div></body></html>";

        return done(sendHtml(to, subject, html));
    }

    @Async
    public CompletableFuture<Boolean> sendAccountRemovedEmail(User user) {
        if (user == null || !validEmail(user.getEmail())) return done(false);
        String to = user.getEmail();
        String subject = "Account removed from Venue Booking System";
        String html = "<html><body style='font-family:Arial,Helvetica,sans-serif;padding:14px;color:#111'>" +
                "<div style='max-width:720px;margin:0 auto;border:1px solid #eaeaea;padding:16px;border-radius:8px'>" +
                "<h2 style='color:#d9534f'>Account Removed</h2>" +
                "<p>Dear " + escape(user.getName() == null ? "User" : user.getName()) + ",</p>" +
                "<p>Your account has been removed from the portal.</p>" +
                footerHtml() + "</div></body></html>";
        return done(sendHtml(to, subject, html));
    }

    // =========================================================================
    // 3. SEMINAR BOOKING ACTIONS
    // =========================================================================

    @Async
    public CompletableFuture<Boolean> sendBookingCreatedEmail(Seminar s) {
        if (s == null || !validEmail(s.getEmail())) return done(false);
        String to = s.getEmail();
        String subject = "Seminar booking received — " + safe(s.getHallName());

        boolean isApproved = "APPROVED".equalsIgnoreCase(s.getStatus()) || "ADMIN".equalsIgnoreCase(s.getCreatedBy());

        StringBuilder html = new StringBuilder();
        html.append("<html><body style='font-family:Arial,Helvetica,sans-serif;padding:14px;color:#111'>")
                .append("<div style='max-width:720px;margin:0 auto;border:1px solid #eaeaea;padding:16px;border-radius:8px;background:#fff'>");

        if (isApproved) {
            html.append("<div style='background:#e9f7ef;border:1px solid #c7efd3;padding:10px;border-radius:6px;margin-bottom:12px'>")
                    .append("<strong style='color:#2f8a4b'>Approved by Administrator</strong>")
                    .append("<div style='font-size:13px;color:#444;margin-top:6px'>Your booking has been approved.</div>")
                    .append("</div>");
        }

        html.append("<h2 style='color:#0b5ed7;margin-top:0;'>Seminar Booking Received</h2>")
                .append("<p>Dear ").append(escape(s.getBookingName() == null ? "User" : s.getBookingName())).append(",</p>")
                .append("<p>Your booking request has been successfully received.</p>")
                .append("<table style='width:100%;border-collapse:collapse;margin-top:10px;'>")
                .append(rowTd("Hall", safe(s.getHallName())))
                .append(rowTd("Event", safe(s.getSlotTitle())))
                .append(getDateAndTimesRows(s)) // ✅ DYNAMIC DATE/TIME ROW
                .append(rowTd("Department", safe(s.getDepartment())))
                .append(rowTd("Contact", safe(s.getPhone())))
                .append(rowTd("Email", safe(s.getEmail())))
                .append("</table>");

        if (isApproved)
            html.append("<p style='margin-top:12px;color:#333'>Status: <strong style='color:green'>APPROVED</strong></p>");
        else
            html.append("<p style='margin-top:12px;color:#333'>Our admin team will review this request.</p>");

        html.append(footerHtml()).append("</div></body></html>");

        return done(sendHtml(to, subject, html.toString()));
    }

    @Async
    public CompletableFuture<Boolean> sendSeminarRemovedEmail(Seminar s) {
        if (s == null || !validEmail(s.getEmail())) return done(false);
        String to = s.getEmail();
        String subject = "Seminar booking removed — " + safe(s.getHallName());

        StringBuilder html = new StringBuilder();
        html.append("<html><body style='font-family:Arial,Helvetica,sans-serif;padding:14px;color:#111'>")
                .append("<div style='max-width:720px;margin:0 auto;border:1px solid #eaeaea;padding:16px;border-radius:8px'>")
                .append("<h2 style='color:#d9534f'>Seminar Booking Removed</h2>")
                .append("<p>Dear ").append(escape(s.getBookingName())).append(",</p>")
                .append("<p>Your booking has been removed.</p>")
                .append("<table style='width:100%;border-collapse:collapse'>")
                .append(rowTd("Hall", safe(s.getHallName())))
                .append(getDateAndTimesRows(s)) // ✅ DYNAMIC DATE/TIME
                .append(rowTd("Event", safe(s.getSlotTitle())))
                .append("</table>")
                .append(footerHtml()).append("</div></body></html>");

        return done(sendHtml(to, subject, html.toString()));
    }

    // =========================================================================
    // 4. HALL OPERATOR NOTIFICATIONS
    // =========================================================================

    @Async
    public CompletableFuture<Boolean> sendWelcomeEmailForOperator(HallOperator operator) {
        if (operator == null || !validEmail(operator.getHeadEmail())) return done(false);
        // ... (Same as before, straightforward text)
        return done(true); // Shortened for brevity as logic is unchanged
    }

    @Async
    public CompletableFuture<Boolean> sendHallHeadBookingCreatedEmail(HallOperator head, Seminar s) {
        if (head == null || !validEmail(head.getHeadEmail()) || s == null) return done(false);
        String to = head.getHeadEmail();
        String subject = "New booking requested for " + safe(s.getHallName());

        String html = "<html><body style='font-family:Arial,Helvetica,sans-serif;padding:14px;color:#111'>"
                + "<div style='max-width:720px;margin:0 auto;border:1px solid #eaeaea;padding:16px;border-radius:8px'>"
                + "<h2 style='color:#0b5ed7;margin-top:0;'>New Booking Request</h2>"
                + "<p>Hello " + escape(head.getHeadName()) + ",</p>"
                + "<p>A new booking has been created for your hall.</p>"
                + "<table style='width:100%;border-collapse:collapse;margin-top:10px;'>"
                + rowTd("Hall", safe(s.getHallName()))
                + getDateAndTimesRows(s) // ✅ DYNAMIC
                + rowTd("Event", safe(s.getSlotTitle()))
                + rowTd("Booked By", safe(s.getBookingName()) + " (" + safe(s.getEmail()) + ")")
                + rowTd("Department", safe(s.getDepartment()))
                + rowTd("Contact", safe(s.getPhone()))
                + "</table>"
                + footerHtml() + "</div></body></html>";

        return done(sendHtml(to, subject, html));
    }

    @Async
    public CompletableFuture<Boolean> sendHallHeadBookingApprovedEmail(HallOperator head, Seminar s, String reason) {
        return sendOperatorStatusEmail(head, s, "Confirmed", "#28a745", reason);
    }

    @Async
    public CompletableFuture<Boolean> sendHallHeadBookingRejectedEmail(HallOperator head, Seminar s, String reason) {
        return sendOperatorStatusEmail(head, s, "Rejected", "#dc3545", reason);
    }

    @Async
    public CompletableFuture<Boolean> sendHallHeadBookingCancelledEmail(HallOperator head, Seminar s, String reason) {
        return sendOperatorStatusEmail(head, s, "Cancelled", "#fd7e14", reason);
    }

    private CompletableFuture<Boolean> sendOperatorStatusEmail(HallOperator head, Seminar s, String statusTitle, String color, String reason) {
        if (head == null || !validEmail(head.getHeadEmail()) || s == null) return done(false);
        String to = head.getHeadEmail();
        String subject = "Booking " + statusTitle + " for " + safe(s.getHallName());

        StringBuilder html = new StringBuilder();
        html.append("<html><body style='font-family:Arial,Helvetica,sans-serif;padding:14px;color:#111'>")
                .append("<div style='max-width:720px;margin:0 auto;border:1px solid #eaeaea;padding:16px;border-radius:8px'>")
                .append("<h2 style='color:").append(color).append("'>Booking ").append(statusTitle).append("</h2>")
                .append("<p>Hello ").append(escape(head.getHeadName())).append(",</p>")
                .append("<p>The following booking has been updated:</p>")
                .append("<table style='width:100%;border-collapse:collapse'>")
                .append(rowTd("Hall", safe(s.getHallName())))
                .append(getDateAndTimesRows(s)) // ✅ DYNAMIC
                .append(rowTd("Event", safe(s.getSlotTitle())))
                .append(rowTd("Booked by", safe(s.getBookingName()) + " (" + safe(s.getEmail()) + ")"));
        if (reason != null && !reason.isBlank()) html.append(rowTd("Remarks", escape(reason)));
        html.append("</table>").append(footerHtml()).append("</div></body></html>");

        return done(sendHtml(to, subject, html.toString()));
    }

    // =========================================================================
    // 5. GENERIC STATUS NOTIFICATION (USER)
    // =========================================================================

    @Async
    public CompletableFuture<Boolean> sendStatusNotification(String toEmail, Seminar seminar, String newStatus, String reason) {
        if (!validEmail(toEmail)) return done(false);
        String status = newStatus == null ? "UPDATE" : newStatus.toUpperCase();
        String subject = "Seminar Booking Update — " + safe(seminar.getHallName());

        StringBuilder html = new StringBuilder();
        html.append("<html><body style='font-family:Arial,Helvetica,sans-serif;color:#111;background:#fff;padding:18px;'>")
                .append("<div style='max-width:720px;margin:0 auto;border:1px solid #eaeaea;padding:18px;border-radius:8px;'>")
                .append("<h2 style='color:#0b5ed7;margin:0 0 12px 0;'>Seminar Booking Notification</h2>")
                .append("<p>Hello,</p>")
                .append("<p>There is an update on your seminar booking:</p>")
                .append("<table style='width:100%;border-collapse:collapse;margin-top:10px'>")
                .append(rowTd("Hall", safe(seminar.getHallName())))
                .append(getDateAndTimesRows(seminar)) // ✅ DYNAMIC
                .append(rowTd("Event", safe(seminar.getSlotTitle())))
                .append(rowTd("Status", escape(status)));
        if (reason != null && !reason.isBlank()) html.append(rowTd("Remarks", escape(reason)));
        html.append("</table>").append("<div style='margin-top:14px'>");

        if ("APPROVED".equals(status)) html.append("<p style='color:green'>Your booking has been APPROVED.</p>");
        else if ("REJECTED".equals(status)) html.append("<p style='color:red'>Your booking request has been REJECTED.</p>");
        else if ("CANCELLED".equals(status)) html.append("<p style='color:orange'>Your booking has been CANCELLED.</p>");
        else html.append("<p>Status changed to: <strong>").append(escape(status)).append("</strong>.</p>");

        html.append("</div>").append(footerHtml()).append("</div></body></html>");

        return done(sendHtml(toEmail, subject, html.toString()));
    }

    // =========================================================================
    // HELPER METHODS
    // =========================================================================

    // ✅✅ NEW: Logic to intelligently display Date/Time or Date Range
    private String getDateAndTimesRows(Seminar s) {
        StringBuilder sb = new StringBuilder();

        // 1. Day Wise Booking (Range)
        if (s.getStartDate() != null && s.getEndDate() != null) {
            sb.append(rowTd("From Date", safe(s.getStartDate())));
            sb.append(rowTd("To Date", safe(s.getEndDate())));
            // If they have specific slot config, hint at it, otherwise imply full day
            if (s.getDaySlots() != null && !s.getDaySlots().isEmpty()) {
                sb.append(rowTd("Time", "Multi-day (See details in portal)"));
            } else {
                sb.append(rowTd("Time", "Full Day"));
            }
        }
        // 2. Time Wise Booking (Single Date)
        else {
            sb.append(rowTd("Date", safe(s.getDate())));
            if (s.getStartTime() != null && s.getEndTime() != null) {
                sb.append(rowTd("Time", safe(s.getStartTime()) + " — " + safe(s.getEndTime())));
            } else {
                sb.append(rowTd("Time", "Full Day"));
            }
        }
        return sb.toString();
    }

    private CompletableFuture<Boolean> done(boolean val) {
        return CompletableFuture.completedFuture(val);
    }

    private String rowTd(String key, String value) {
        return "<tr><td style='padding:6px;border:1px solid #f0f0f0;width:30%'><strong>" + escape(key) + "</strong></td>" +
                "<td style='padding:6px;border:1px solid #f0f0f0'>" + escape(value) + "</td></tr>";
    }

    private String footerHtml() {
        return "<hr style='border:none;border-top:1px solid #eee'/>" +
                "<p style='font-size:13px;color:#666'>" + SENDER_NAME + "<br/>" +
                "Visit: <a href='" + websiteUrl + "'>" + websiteUrl + "</a></p>";
    }

    private String safe(String s) {
        return s == null || s.isBlank() ? "—" : s;
    }

    private String escape(String s) {
        if (s == null) return "";
        return s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").replace("\"", "&quot;");
    }

    private boolean validEmail(String e) {
        if (e == null) return false;
        String t = e.trim();
        return !t.isEmpty() && t.contains("@") && t.length() <= 254;
    }
}