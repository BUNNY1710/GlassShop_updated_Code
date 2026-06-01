package com.glassshop.ai.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.glassshop.ai.entity.User;
import com.glassshop.ai.repository.UserRepository;

@RestController
@RequestMapping("/admin")
@PreAuthorize("hasRole('ADMIN')")
public class AdminController {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @PostMapping("/create-staff")
    public String createStaff(@RequestBody User staff) {

        Authentication auth =
            SecurityContextHolder.getContext().getAuthentication();

        User admin = userRepository
            .findByUserName(auth.getName())
            .orElseThrow();

        staff.setPassword(passwordEncoder.encode(staff.getPassword()));
        staff.setRole("STAFF");
        staff.setShop(admin.getShop());

        userRepository.save(staff);
        return "Staff created successfully";
    }
}
