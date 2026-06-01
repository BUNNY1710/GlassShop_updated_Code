package com.glassshop.ai.service;

import java.util.List;
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.glassshop.ai.dto.CustomerDto;
import com.glassshop.ai.entity.Customer;
import com.glassshop.ai.entity.Shop;
import com.glassshop.ai.entity.User;
import com.glassshop.ai.repository.CustomerRepository;
import com.glassshop.ai.repository.UserRepository;

@Service
public class CustomerService {

    @Autowired
    private CustomerRepository customerRepository;

    @Autowired
    private UserRepository userRepository;

    private Shop getCurrentShop() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated() || "anonymousUser".equals(auth.getName())) {
            throw new RuntimeException("User not authenticated");
        }
        String username = auth.getName();
        User user = userRepository.findByUserName(username)
                .orElseThrow(() -> new RuntimeException("User not found"));
        Shop shop = user.getShop();
        if (shop == null) {
            throw new RuntimeException("User is not linked to any shop");
        }
        return shop;
    }

    @Transactional
    public CustomerDto createCustomer(CustomerDto customerDto) {
        Shop shop = getCurrentShop();
        
        Customer customer = new Customer();
        customer.setShop(shop);
        customer.setName(customerDto.getName());
        customer.setMobile(customerDto.getMobile());
        customer.setEmail(customerDto.getEmail());
        customer.setAddress(customerDto.getAddress());
        customer.setGstin(customerDto.getGstin());
        customer.setState(customerDto.getState());
        customer.setCity(customerDto.getCity());
        customer.setPincode(customerDto.getPincode());
        
        Customer saved = customerRepository.save(customer);
        return convertToDto(saved);
    }

    public List<CustomerDto> getAllCustomers() {
        Shop shop = getCurrentShop();
        return customerRepository.findByShopOrderByNameAsc(shop)
                .stream()
                .map(this::convertToDto)
                .collect(Collectors.toList());
    }

    public CustomerDto getCustomerById(Long id) {
        Shop shop = getCurrentShop();
        Customer customer = customerRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Customer not found"));
        
        if (!customer.getShop().getId().equals(shop.getId())) {
            throw new RuntimeException("Customer does not belong to your shop");
        }
        
        return convertToDto(customer);
    }

    @Transactional
    public CustomerDto updateCustomer(Long id, CustomerDto customerDto) {
        Shop shop = getCurrentShop();
        Customer customer = customerRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Customer not found"));
        
        if (!customer.getShop().getId().equals(shop.getId())) {
            throw new RuntimeException("Customer does not belong to your shop");
        }
        
        customer.setName(customerDto.getName());
        customer.setMobile(customerDto.getMobile());
        customer.setEmail(customerDto.getEmail());
        customer.setAddress(customerDto.getAddress());
        customer.setGstin(customerDto.getGstin());
        customer.setState(customerDto.getState());
        customer.setCity(customerDto.getCity());
        customer.setPincode(customerDto.getPincode());
        
        Customer saved = customerRepository.save(customer);
        return convertToDto(saved);
    }

    public List<CustomerDto> searchCustomers(String query) {
        Shop shop = getCurrentShop();
        return customerRepository.findByShopAndNameContainingIgnoreCase(shop, query)
                .stream()
                .map(this::convertToDto)
                .collect(Collectors.toList());
    }

    @Transactional
    public void deleteCustomer(Long id) {
        Shop shop = getCurrentShop();
        Customer customer = customerRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Customer not found"));
        
        if (!customer.getShop().getId().equals(shop.getId())) {
            throw new RuntimeException("Customer does not belong to your shop");
        }
        
        customerRepository.delete(customer);
    }

    private CustomerDto convertToDto(Customer customer) {
        CustomerDto dto = new CustomerDto();
        dto.setId(customer.getId());
        dto.setName(customer.getName());
        dto.setMobile(customer.getMobile());
        dto.setEmail(customer.getEmail());
        dto.setAddress(customer.getAddress());
        dto.setGstin(customer.getGstin());
        dto.setState(customer.getState());
        dto.setCity(customer.getCity());
        dto.setPincode(customer.getPincode());
        return dto;
    }
}

