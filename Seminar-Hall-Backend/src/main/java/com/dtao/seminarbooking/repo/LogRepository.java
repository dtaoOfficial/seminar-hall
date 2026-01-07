package com.dtao.seminarbooking.repo;

import com.dtao.seminarbooking.model.Log;
import org.springframework.data.mongodb.repository.MongoRepository;
import java.util.List;

public interface LogRepository extends MongoRepository<Log, String> {
    // Find logs by email (to see what a specific user did)
    List<Log> findByActorEmail(String email);
    
    // Find logs by action (to see all "DELETE" events)
    List<Log> findByAction(String action);
    
    // Find logs sorted by time (Latest first)
    List<Log> findAllByOrderByTimestampDesc();
}