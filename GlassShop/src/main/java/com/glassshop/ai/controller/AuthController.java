package com.glassshop.ai.controller;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import com.glassshop.ai.dto.ChangePasswordRequest;
import com.glassshop.ai.dto.CreateStaffRequest;
import com.glassshop.ai.dto.LoginRequest;
import com.glassshop.ai.dto.RegisterShopRequest;
import com.glassshop.ai.entity.Shop;
import com.glassshop.ai.entity.User;
import com.glassshop.ai.repository.ShopRepository;
import com.glassshop.ai.repository.UserRepository;
import com.glassshop.ai.security.JwtUtil;

@RestController
@RequestMapping("/auth")
@CrossOrigin(origins = "http://localhost:3000")
public class AuthController {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private JwtUtil jwtUtil;
    
    @Autowired
    private ShopRepository shopRepository;

    // ✅ Allowed roles (SECURITY)
    private static final Set<String> ALLOWED_ROLES =
            Set.of("ADMIN", "STAFF");

    /* ===============================
       REGISTER USER
       =============================== */
    
    @PostMapping("/register-shop")
    public ResponseEntity<?> registerShop(@RequestBody RegisterShopRequest request) {
        try {
            // Validate request
            if (request.getUsername() == null || request.getUsername().trim().isEmpty()) {
                return ResponseEntity.badRequest().body("Username is required");
            }
            if (request.getPassword() == null || request.getPassword().trim().isEmpty()) {
                return ResponseEntity.badRequest().body("Password is required");
            }
            if (request.getShopName() == null || request.getShopName().trim().isEmpty()) {
                return ResponseEntity.badRequest().body("Shop name is required");
            }

            // Check if username already exists
            if (userRepository.findByUserName(request.getUsername()).isPresent()) {
                return ResponseEntity
                        .status(HttpStatus.CONFLICT)
                        .body("Username already exists. Please choose a different username.");
            }

            // Create shop
            Shop shop = new Shop();
            shop.setShopName(request.getShopName());
            shop.setEmail(request.getEmail());
            shop = shopRepository.save(shop);

            // Create admin user
            User admin = new User();
            admin.setUserName(request.getUsername());
            admin.setPassword(passwordEncoder.encode(request.getPassword()));
            admin.setRole("ROLE_ADMIN");
            admin.setShop(shop);

            userRepository.save(admin);

            return ResponseEntity.ok("Shop registered successfully");
        } catch (DataIntegrityViolationException e) {
            // Handle database constraint violations
            if (e.getMessage() != null && e.getMessage().contains("user_name")) {
                return ResponseEntity
                        .status(HttpStatus.CONFLICT)
                        .body("Username already exists. Please choose a different username.");
            }
            return ResponseEntity
                    .status(HttpStatus.BAD_REQUEST)
                    .body("Registration failed: " + e.getMessage());
        } catch (Exception e) {
            return ResponseEntity
                    .status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Registration failed: " + e.getMessage());
        }
    }





    @PostMapping("/create-staff")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> createStaff(@RequestBody CreateStaffRequest request) {

        Authentication auth =
                SecurityContextHolder.getContext().getAuthentication();

        User admin =
                userRepository.findByUserName(auth.getName())
                        .orElseThrow();

        if (userRepository.findByUserName(request.getUsername()).isPresent()) {
            return ResponseEntity.badRequest().body("Username already exists");
        }

        User staff = new User();
        staff.setUserName(request.getUsername());
        staff.setPassword(passwordEncoder.encode(request.getPassword()));
        staff.setRole("ROLE_STAFF");
        staff.setShop(admin.getShop());

        userRepository.save(staff);

        return ResponseEntity.ok("Staff created successfully");
    }




    
    
    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody User user) {

        if (userRepository.findByUserName(user.getUserName()).isPresent()) {
            return ResponseEntity
                    .badRequest()
                    .body("Username already exists");
        }

        user.setPassword(passwordEncoder.encode(user.getPassword()));

        // ✅ Default role = STAFF
        if (user.getRole() == null || user.getRole().isBlank()) {
            user.setRole("STAFF");
        }

        // ✅ SECURITY: validate role
        if (!ALLOWED_ROLES.contains(user.getRole().toUpperCase())) {
            return ResponseEntity
                    .badRequest()
                    .body("Invalid role selected");
        }

        user.setRole(user.getRole().toUpperCase());

        userRepository.save(user);

        return ResponseEntity.ok("User registered successfully");
    }

    /* ===============================
       LOGIN USER
       =============================== */
    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody LoginRequest request) {
        try {
            // Validate request
            if (request.getUsername() == null || request.getUsername().trim().isEmpty()) {
                return ResponseEntity
                        .status(HttpStatus.BAD_REQUEST)
                        .body("Username is required");
            }
            if (request.getPassword() == null || request.getPassword().trim().isEmpty()) {
                return ResponseEntity
                        .status(HttpStatus.BAD_REQUEST)
                        .body("Password is required");
            }

            // Find user
            Optional<User> optionalUser = userRepository.findByUserName(request.getUsername());
            if (optionalUser.isEmpty()) {
                return ResponseEntity
                        .status(HttpStatus.UNAUTHORIZED)
                        .body("Invalid username or password");
            }

            User user = optionalUser.get();

            // Verify password
            if (!passwordEncoder.matches(request.getPassword(), user.getPassword())) {
                return ResponseEntity
                        .status(HttpStatus.UNAUTHORIZED)
                        .body("Invalid username or password");
            }

            String role = user.getRole(); // MUST be ROLE_ADMIN / ROLE_STAFF

            String token = jwtUtil.generateToken(
                    user.getUserName(),
                    role
            );

            return ResponseEntity.ok(
                    Map.of(
                            "token", token,
                            "role", role
                    )
            );
        } catch (Exception e) {
            return ResponseEntity
                    .status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Login failed: " + e.getMessage());
        }
    }
    
    
//    @GetMapping("/profile")
//    public ResponseEntity<?> getProfile() {
//
//        Authentication auth =
//                SecurityContextHolder.getContext().getAuthentication();
//
//        User user =
//                userRepository.findByUserName(auth.getName())
//                        .orElseThrow();
//
//        String shopName =
//                user.getShop() != null ? user.getShop().getShopName() : "N/A";
//
//        return ResponseEntity.ok(
//                new ProfileResponse(
//                        user.getUserName(),
//                        user.getRole(),
//                        shopName
//                )
//        );
//    }

    @GetMapping("/profile")
    public ResponseEntity<?> profile(Authentication authentication) {

        if (authentication == null) {
            return ResponseEntity.status(401).body("Unauthorized");
        }

        String username = authentication.getName();

        Optional<User> optionalUser = userRepository.findByUserName(username);

        if (optionalUser.isEmpty()) {
            return ResponseEntity
                    .status(404)
                    .body("User not found: " + username);
        }

        User user = optionalUser.get();

        return ResponseEntity.ok(
            Map.of(
                "username", user.getUserName(),
                "role", user.getRole(),
                "shopId", user.getShop() != null ? user.getShop().getId() : null,
                "shopName", user.getShop() != null ? user.getShop().getShopName() : null
            )
        );
    }




    @PostMapping("/change-password")
    public ResponseEntity<?> changePassword(
            @RequestBody ChangePasswordRequest request) {

        Authentication auth =
                SecurityContextHolder.getContext().getAuthentication();

        User user =
                userRepository.findByUserName(auth.getName())
                        .orElseThrow();

        if (!passwordEncoder.matches(
                request.getOldPassword(),
                user.getPassword())) {
            return ResponseEntity
                    .badRequest()
                    .body("Old password is incorrect");
        }

        user.setPassword(
                passwordEncoder.encode(request.getNewPassword())
        );

        userRepository.save(user);

        return ResponseEntity.ok("Password changed successfully");
    }
    
    @GetMapping("/staff")
    @PreAuthorize("hasRole('ADMIN')")
    public List<User> getStaff() {

        Authentication auth =
                SecurityContextHolder.getContext().getAuthentication();

        User admin =
                userRepository.findByUserName(auth.getName())
                        .orElseThrow();

        Long shopId = admin.getShop().getId();

        System.out.println("ADMIN SHOP ID = " + shopId);

        List<User> staff =
                userRepository.findByShopIdAndRole(
                        shopId,
                        "ROLE_STAFF"
                );

        System.out.println("STAFF FOUND = " + staff.size());

        return staff;
    }


    
    @DeleteMapping("/staff/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> removeStaff(@PathVariable Long id) {

        Authentication auth =
                SecurityContextHolder.getContext().getAuthentication();

        User admin =
                userRepository.findByUserName(auth.getName())
                        .orElseThrow();

        User staff =
                userRepository.findById(id)
                        .orElseThrow();

        // 🔐 SECURITY: same shop only
        if (!staff.getShop().getId().equals(admin.getShop().getId())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body("Not allowed");
        }

        userRepository.delete(staff);
        return ResponseEntity.ok("Staff removed");
    }

    
}
