package com.glassshop.ai.config;

import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import com.glassshop.ai.entity.Glass;
import com.glassshop.ai.repository.GlassRepository;

@Configuration
public class GlassDataLoader {

    @Bean
    CommandLineRunner loadGlassData(GlassRepository repo) {
        return args -> {

            if (repo.count() == 0) {

                Glass g5 = new Glass();
                g5.setType("5MM");
                g5.setThickness(5);
                g5.setUnit("FEET");

                Glass g8 = new Glass();
                g8.setType("8MM");
                g8.setThickness(8);
                g8.setUnit("FEET");

                Glass g10 = new Glass();
                g10.setType("10MM");
                g10.setThickness(10);
                g10.setUnit("FEET");

                repo.save(g5);
                repo.save(g8);
                repo.save(g10);

                System.out.println("✅ Glass master data loaded");
            }
        };
    }
}
