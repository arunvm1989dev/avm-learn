package com.example.demo;
import org.springframework.web.bind.annotation.*;
import java.util.*;
@RestController
@RequestMapping("/employees")
public class EmployeeController {
 private final Map<Long,Employee> db=new HashMap<>();
 @PostMapping
 public Employee create(@RequestBody Employee e){db.put(e.getId(),e);return e;}
 @GetMapping
 public Collection<Employee> getAll(){return db.values();}
 @GetMapping("/{id}")
 public Employee get(@PathVariable Long id){return db.get(id);}
 @PutMapping("/{id}")
 public Employee update(@PathVariable Long id,@RequestBody Employee e){e.setId(id);db.put(id,e);return e;}
 @DeleteMapping("/{id}")
 public String delete(@PathVariable Long id){db.remove(id);return "Deleted";}
}