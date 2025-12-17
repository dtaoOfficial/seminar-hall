package com.dtao.seminarbooking.config;

import com.dtao.seminarbooking.model.User;
import com.dtao.seminarbooking.repo.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.Instant;
import java.util.Optional;

@Configuration
public class DataInitializer implements CommandLineRunner {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Override
    public void run(String... args) throws Exception {
        try {
            String adminEmail = "1nh23mc079@newhorizonindia.edu";

            Optional<User> existing = userRepository.findByEmail(adminEmail);
            if (existing.isPresent()) {
                System.out.println("✅ Admin user already exists: " + adminEmail);
                return;
            }

            // Create default admin
            User admin = new User();
            admin.setName("MAHESWAR REDDY KURAPARTHI");
            admin.setDepartment("MCA");
            admin.setEmail(adminEmail);
            admin.setPhone("8688492015");
            admin.setRole("ADMIN");
            admin.setCreatedBy("system");
            admin.setCreatedAt(Instant.now());
            admin.setActive(true);

            // Password — auto encrypted
            admin.setPassword(passwordEncoder.encode("Mahesh@8688"));

            userRepository.save(admin);

            System.out.println("🎉 Default ADMIN user created successfully!");
            System.out.println("   Email: " + adminEmail);
            System.out.println("   Password: Mahesh@8688");
        } catch (Exception ex) {
            System.err.println("⚠️ Failed to initialize default admin: " + ex.getMessage());
            ex.printStackTrace();
        }
    }
}
