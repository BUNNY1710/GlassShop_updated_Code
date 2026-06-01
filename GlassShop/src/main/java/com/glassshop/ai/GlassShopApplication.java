package com.glassshop.ai;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class GlassShopApplication {

	public static void main(String[] args) {
		SpringApplication.run(GlassShopApplication.class, args);
	}

}
