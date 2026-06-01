package com.glassshop.ai.security;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity(prePostEnabled = true)
public class SecurityConfig {

    @Autowired
    private JwtFilter jwtFilter;

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {

        http
            .cors(cors -> {})
            .csrf(csrf -> csrf.disable())

            // ✅ JWT = STATELESS
            .sessionManagement(
                session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS)
            )

            .authorizeHttpRequests(auth -> auth
                // ✅ ADMIN + STAFF (for transfer count - must come before /audit/**)
                .requestMatchers("/audit/transfer-count")
                .hasAnyAuthority("ROLE_ADMIN", "ROLE_STAFF")

                // ✅ PUBLIC (NO TOKEN)
                .requestMatchers(
                    "/auth/login",
                    "/auth/register-shop"
                ).permitAll()

                // ✅ PROFILE (ANY LOGGED IN USER)
                .requestMatchers("/auth/profile")
                .authenticated()

                // ✅ ADMIN ONLY - Specific audit endpoints
                .requestMatchers(
                    "/auth/create-staff",
                    "/auth/staff/**",
                    "/audit/recent",
                    "/ai/**"
                ).hasRole("ADMIN")

                // ✅ ADMIN ONLY - Billing endpoints
                .requestMatchers(
                    "/api/customers/**",
                    "/api/quotations/**",
                    "/api/invoices/**"
                ).hasRole("ADMIN")

                // ✅ ADMIN + STAFF - Stock management
                .requestMatchers(
                    "/stock/recent",
                    "/stock/**"
                ).hasAnyRole("ADMIN", "STAFF")
//                .requestMatchers("/audit/download").hasAuthority("ROLE_ADMIN")
//                .requestMatchers("/stock/download").hasAnyAuthority("ROLE_ADMIN","ROLE_STAFF")


                // ❌ EVERYTHING ELSE BLOCKED
                .anyRequest().authenticated()
            )

            // ✅ JWT FILTER
            .addFilterBefore(jwtFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();
        config.setAllowedOrigins(List.of("http://localhost:3000"));
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "OPTIONS"));
        config.setAllowedHeaders(List.of("*"));
        config.setAllowCredentials(true);

        UrlBasedCorsConfigurationSource source =
                new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return source;
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }
}
