# KT Document Template

The agent produces a JSON object matching this schema, then passes it to
`doc_generator.js` which builds the Word document.

Edit this file to add/remove sections — the generator reads `SECTION_ORDER`
to decide what to render and in what order.

---

## JSON Schema

```json
{
  "serviceOverview": {
    "name": "artifact name from pom/gradle",
    "description": "3+ sentence description of what this service does",
    "purpose": "business reason this service exists",
    "springBootVersion": "e.g. 3.2.1",
    "javaVersion": "e.g. 17",
    "buildTool": "maven | gradle",
    "packagingType": "jar | war",
    "mainClass": "fully qualified main class",
    "basePackage": "root Java package"
  },

  "architecture": {
    "pattern": "Layered MVC | Hexagonal | Event-Driven | CQRS | Clean",
    "description": "3+ sentence architectural description",
    "layers": [
      {
        "name": "layer name",
        "description": "responsibility of this layer",
        "packages": ["com.example.controller"],
        "classes": ["OrderController", "UserController"]
      }
    ],
    "externalDependencies": [
      {
        "type": "Database | Cache | MessageBroker | ExternalAPI",
        "name": "PostgreSQL",
        "purpose": "how and why it is used",
        "connectionConfigKey": "spring.datasource.url"
      }
    ],
    "securityMechanism": "JWT / OAuth2 / Basic Auth / API Key / None — with detail",
    "designPatterns": ["Repository pattern via OrderRepository", "Builder in OrderRequest"],
    "crossCuttingConcerns": ["Logging via SLF4J", "Caching via @Cacheable"]
  },

  "apiEndpoints": [
    {
      "method": "GET | POST | PUT | DELETE | PATCH",
      "path": "/api/v1/orders/{id}",
      "controllerClass": "OrderController",
      "handlerMethod": "getOrderById",
      "description": "what this endpoint does",
      "requestBody": "JSON schema or 'None'",
      "responseBody": "JSON schema",
      "responseCode": "200",
      "authRequired": true,
      "roles": ["ROLE_USER"],
      "validations": ["@NotNull on orderId"],
      "notes": "optional caching or pagination notes"
    }
  ],

  "dataModel": [
    {
      "entityName": "Order",
      "tableName": "orders",
      "type": "JPA Entity | MongoDB Document | DTO",
      "description": "business meaning",
      "fields": [
        {
          "name": "id",
          "type": "UUID",
          "constraints": "primary key, not null",
          "description": "unique order identifier"
        }
      ],
      "relationships": [
        {
          "type": "OneToMany | ManyToOne | ManyToMany | OneToOne",
          "targetEntity": "OrderItem",
          "fetchType": "LAZY | EAGER",
          "description": "business meaning of relationship"
        }
      ]
    }
  ],

  "serviceLayer": [
    {
      "className": "OrderService",
      "description": "owns all order business logic",
      "dependencies": ["OrderRepository", "PaymentClient", "InventoryService"],
      "keyMethods": [
        {
          "name": "createOrder",
          "description": "validates cart, reserves inventory, persists order",
          "transactional": true,
          "transactionPropagation": "REQUIRED"
        }
      ]
    }
  ],

  "codeFlow": [
    {
      "scenario": "Create new order",
      "trigger": "POST /api/v1/orders",
      "description": "narrative overview of what happens",
      "steps": [
        {
          "stepNumber": 1,
          "layer": "Controller",
          "class": "OrderController",
          "method": "createOrder",
          "description": "validates JWT, deserialises CreateOrderRequest, calls OrderService"
        }
      ],
      "errorHandling": "how errors in this flow are caught and returned"
    }
  ],

  "configuration": {
    "profiles": ["default", "dev", "prod"],
    "keyProperties": [
      {
        "key": "spring.datasource.url",
        "description": "PostgreSQL connection string",
        "defaultValue": "required",
        "profile": "all"
      }
    ],
    "environmentVariables": [
      {
        "name": "DB_PASSWORD",
        "description": "database password",
        "required": true,
        "example": "changeme_in_prod"
      }
    ]
  },

  "messaging": {
    "hasMessaging": true,
    "broker": "Kafka | RabbitMQ | SQS | None",
    "producers": [
      {
        "topic": "order-placed",
        "eventClass": "OrderPlacedEvent",
        "producerClass": "OrderEventPublisher",
        "triggerDescription": "published after successful order creation"
      }
    ],
    "consumers": [
      {
        "topic": "payment-confirmed",
        "eventClass": "PaymentConfirmedEvent",
        "consumerClass": "PaymentConfirmedListener",
        "description": "updates order status to PAID",
        "errorHandling": "DLQ after 3 retries"
      }
    ]
  },

  "scheduledJobs": [
    {
      "jobName": "Expire stale orders",
      "cronExpression": "0 0 2 * * *",
      "class": "OrderExpiryJob",
      "method": "expireStaleOrders",
      "description": "cancels orders in PENDING state older than 24h",
      "sideEffects": "updates DB, publishes order-expired events"
    }
  ],

  "exceptionHandling": {
    "globalHandlerClass": "GlobalExceptionHandler",
    "customExceptions": [
      {
        "className": "OrderNotFoundException",
        "httpStatus": "404",
        "description": "thrown when order ID not found in DB"
      }
    ],
    "errorResponseFormat": "{ error: string, code: string, timestamp: ISO8601 }",
    "loggingStrategy": "ERROR level for 5xx, WARN for 4xx, no stack trace to client"
  },

  "testing": {
    "unitTestFrameworks": ["JUnit5", "Mockito", "AssertJ"],
    "integrationTestFrameworks": ["Spring Boot Test", "Testcontainers"],
    "hasUnitTests": true,
    "hasIntegrationTests": true,
    "testCoverageNotes": "observed gaps and strengths",
    "testDataStrategy": "Testcontainers PostgreSQL for integration tests"
  },

  "deployment": {
    "containerized": true,
    "dockerfilePath": "Dockerfile",
    "dockerComposeFile": "docker-compose.yml",
    "kubernetesManifestsPath": "k8s/",
    "ciCdPlatform": "GitHub Actions",
    "ciCdFiles": [".github/workflows/ci.yml"],
    "healthCheckEndpoint": "/actuator/health",
    "metricsEndpoint": "/actuator/prometheus",
    "deploymentNotes": "any notable deployment specifics"
  },

  "localSetup": {
    "prerequisites": ["Java 17", "Docker", "Maven 3.8+"],
    "steps": [
      "docker-compose up -d (starts PostgreSQL and Redis)",
      "mvn spring-boot:run -Dspring.profiles.active=dev"
    ],
    "requiredEnvVars": ["DB_PASSWORD", "JWT_SECRET"],
    "defaultPort": "8080",
    "swaggerUrl": "http://localhost:8080/swagger-ui.html"
  },

  "knownComplexities": [
    {
      "area": "Distributed transactions",
      "description": "OrderService and InventoryService share a saga pattern with manual compensation",
      "recommendation": "read SagaOrchestrator.java carefully before making any changes"
    }
  ],

  "handoverNotes": [
    {
      "priority": "HIGH | MEDIUM | LOW",
      "category": "Security | Performance | Technical Debt | Operational | Business Logic | Testing",
      "note": "concrete note the new team must know"
    }
  ]
}
```

---

## Section order

The generator renders sections in this order. Edit `SECTION_ORDER` in
`doc_generator.js` to reorder, add, or remove.

1. Cover page
2. Table of contents
3. Executive summary
4. Architecture & design
5. Architecture diagram (Mermaid)
6. REST API reference
7. Data model
8. Service layer
9. Code flows
10. Configuration reference
11. Messaging & events
12. Scheduled jobs
13. Exception handling
14. Testing strategy
15. Deployment & DevOps
16. Local setup
17. Known complexities
18. Handover checklist
