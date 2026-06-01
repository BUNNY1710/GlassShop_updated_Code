package com.glassshop.ai.entity;

import java.time.LocalDate;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

@Entity
@Table(name = "installation")
public class Installation {

	 	@Id
	    @GeneratedValue(strategy = GenerationType.IDENTITY)
	    private Long id;

	    @ManyToOne
	    @JoinColumn(name = "glass_id", nullable = false)
	    private Glass glass;

	    @ManyToOne
	    @JoinColumn(name = "site_id", nullable = false)
	    private Site site;

	    @Column(name = "quantity", nullable = false)
	    private int quantity;
	    
	    @Column(name = "install_date")
	    private LocalDate installDate;
	    
	    @Column(name = "status", length = 50)
	    private String status;
		public Long getId() {
			return id;
		}
		public void setId(Long id) {
			this.id = id;
		}
		public Glass getGlass() {
			return glass;
		}
		public void setGlass(Glass glass) {
			this.glass = glass;
		}
		public Site getSite() {
			return site;
		}
		public void setSite(Site site) {
			this.site = site;
		}
		public int getQuantity() {
			return quantity;
		}
		public void setQuantity(int quantity) {
			this.quantity = quantity;
		}
		public LocalDate getInstallDate() {
			return installDate;
		}
		public void setInstallDate(LocalDate installDate) {
			this.installDate = installDate;
		}
		public String getStatus() {
			return status;
		}
		public void setStatus(String status) {
			this.status = status;
		} 
	    
	    
}
