## 2. System Architecture & Technology Stack

### 2.1 High-Level Architecture

#### 2.1.1 Monolithic Layered Architecture

The School Management System (SMS) adopts a **monolithic layered architecture** organized into four distinct layers. The **Presentation Layer** is a React Single Page Application (SPA) rendered in the browser, handling all UI rendering, form validation, and client-side state. The **API Gateway Layer** runs on Express.js and serves as the sole entry point for HTTP requests, managing routing, JWT verification, rate limiting, and request logging before forwarding to internal services. The **Business Logic Layer** contains domain-specific service modules — student management, attendance tracking, fee calculation, examination grading — isolating core rules from transport and storage concerns. The **Data Access Layer** uses Mongoose ODM (or Sequelize ORM) to abstract all database interactions, providing schema-validated queries and connection pooling without exposing raw driver APIs upstream.

School management domains share tightly coupled data relationships that would incur excessive inter-service communication overhead in a microservices layout, favoring a single deployable unit.

#### 2.1.2 Client-Server Communication

All client-server communication uses **HTTPS**. The API follows RESTful conventions with JSON payloads. **JSON Web Tokens (JWT)** provide stateless authentication: the server issues a signed access token after credential verification, and the client attaches it via the `Authorization: Bearer <token>` header on every subsequent request. This eliminates server-side session storage, enabling horizontal scaling without sticky-session requirements.

Real-time functionality — attendance notifications to parents, fee due reminders, admin announcements — uses **WebSocket connections via Socket.io**. The Socket.io server shares the Express HTTP instance and authenticates connections using the same JWT tokens passed during the handshake. Bidirectional events target specific rooms (`student:{id}`, `class:{id}`, `role:teacher`) to minimize broadcast overhead.

#### 2.1.3 Three-Tier Architecture Diagram

The following diagram illustrates the request flow from browser to database.

```mermaid
flowchart TD
    subgraph "Presentation Tier"
        Browser["Browser (React SPA)"]
    end

    subgraph "Application Tier"
        Nginx["Nginx Reverse Proxy"]
        NodeAPI["Express.js API Server"]
        SocketIO["Socket.io Server"]
        Redis[("Redis Cache")]
    end

    subgraph "Data Tier"
        MongoDB[("MongoDB 7.x")]
        PostgreSQL[("PostgreSQL 15 (alt.)")]
    end

    Browser -->|"HTTPS / REST + WS"| Nginx
    Nginx -->|"/api/*"| NodeAPI
    Nginx -->|"/ws"| SocketIO
    NodeAPI -->|"Query / Cache"| Redis
    NodeAPI -->|"Mongoose ODM"| MongoDB
    NodeAPI -->|"Sequelize ORM"| PostgreSQL
    SocketIO -.->|"Shared HTTP"| NodeAPI
```

### 2.2 Technology Stack Selection

#### 2.2.1 Backend Stack: Node.js 20 LTS with Express.js 4.x

The server runtime is **Node.js 20 LTS**, selected for its non-blocking event-driven architecture that handles the I/O-bound workloads typical of school management systems — concurrent database queries, file uploads, and third-party API calls. Node.js processes requests on a lightweight event loop rather than consuming OS threads, enabling thousands of concurrent connections on modest hardware. **Express.js 4.x** provides a minimal routing and middleware layer; its middleware pattern allows composable addition of authentication, validation, logging, and error handling across all routes. The npm ecosystem supplies battle-tested libraries for every subsystem requirement.

#### 2.2.2 Frontend Stack: React 18 with Functional Components and Hooks

The client application is built on **React 18**, leveraging concurrent rendering features (Automatic Batching, Transitions, Suspense boundaries) for responsive performance during data-heavy operations. All components use the **functional component pattern with Hooks** — `useState` for local state, `useEffect` for side effects, and custom hooks for reusable data-fetching logic. **React Router v6** handles client-side navigation with nested routes, route guards, and lazy-loaded components to reduce initial bundle size. The build toolchain uses **Vite**, providing sub-second development server startup and optimized production builds via Rollup with tree-shaking and code splitting.

#### 2.2.3 Database Selection: MongoDB vs. PostgreSQL

The primary deployment target is **MongoDB 7.x** with **Mongoose 8.x** as the ODM. MongoDB's document-oriented model accommodates evolving school data schemas: student records accumulate fields over time (transfer history, disciplinary notes, extracurricular achievements), eliminating costly migration scripts when requirements change. The architecture retains PostgreSQL 15 compatibility via Sequelize ORM for deployments requiring strict relational consistency or ACID compliance across financial transactions.

| Criterion | MongoDB 7.x + Mongoose | PostgreSQL 15 + Sequelize |
|-----------|------------------------|---------------------------|
| **Data Model** | Document-oriented, schema-flexible collections | Relational, strictly typed tables |
| **Schema Evolution** | Native — add fields without migration | Requires ALTER TABLE migrations |
| **Query Pattern** | Embedded subdocuments reduce joins | SQL JOINs for complex relationships |
| **ACID Transactions** | Multi-document transactions (since 4.0) | Full ACID compliance, row-level locking |
| **Scaling** | Horizontal sharding built-in | Read replicas; vertical scaling primary |
| **Use Case Fit** | Rapid iteration, nested data (student profiles) | Financial records, reporting, compliance |
| **Recommended For** | Primary SMS deployment | Fee/finance module, audit reporting |
| **Learning Curve** | Low for JavaScript developers | Requires SQL proficiency |

For most deployments, MongoDB handles the core workload while PostgreSQL serves as a secondary read replica for financial reporting where relational integrity is paramount.

#### 2.2.4 Supporting Libraries

Key production-grade npm packages include `jsonwebtoken` and `bcrypt` for authentication, `multer` for file uploads, `nodemailer` and `socket.io` for communication, `joi` for validation, `winston` for logging, `helmet` and `express-rate-limit` for security, and `dotenv` with `nodemon` for process management.

### 2.3 Project Structure

#### 2.3.1 Monorepo Organization

The project uses a **single-repository monorepo** with separate `client/` and `server/` directories at the root level. This balances the isolation benefits of separate repositories with the coordination advantages of a unified codebase: atomic commits spanning both layers, simplified CI/CD configuration, and consistent code review. Each directory contains its own `package.json` for independent dependency management. A root-level `package.json` defines workspace scripts for concurrent development startup and shared linting.

#### 2.3.2 Backend Directory Structure

The server directory separates configuration, routing, business logic, and data access into distinct folders.

```
server/
├── config/
│   ├── db.js                  # MongoDB connection
│   └── env.js                 # Env validator
├── controllers/               # HTTP request handlers
│   ├── authController.js
│   ├── studentController.js
│   ├── teacherController.js
│   └── feeController.js
├── models/                    # Mongoose schemas
│   ├── User.js
│   ├── Student.js
│   └── Class.js
├── routes/
│   ├── index.js               # Route aggregator
│   ├── authRoutes.js
│   └── studentRoutes.js
├── middleware/
│   ├── auth.js                # JWT verification
│   ├── errorHandler.js
│   ├── validate.js            # Joi wrapper
│   └── upload.js              # Multer config
├── services/                  # Business logic
│   ├── studentService.js
│   ├── feeCalculationService.js
│   └── notificationService.js
├── utils/
│   ├── ApiResponse.js
│   ├── logger.js              # Winston instance
│   └── helpers.js
├── uploads/                   # File storage
├── .env.example
├── package.json
└── server.js
```

Controllers handle HTTP concerns exclusively; services encapsulate domain rules independent of transport, enabling unit testing without an HTTP server; middleware contains cross-cutting concerns applied via Express's `app.use()` pattern.

#### 2.3.3 Frontend Directory Structure

The client directory organizes React components by feature domain while maintaining shared infrastructure in top-level folders.

```
client/
├── public/
│   └── index.html
├── src/
│   ├── components/
│   │   ├── common/            # Buttons, Modals, Tables
│   │   ├── layout/            # Sidebar, Header, Footer
│   │   └── dashboard/         # KPI cards, Charts
│   ├── pages/                 # Route-level components
│   │   ├── students/
│   │   ├── teachers/
│   │   └── fees/
│   ├── hooks/
│   │   ├── useAuth.js
│   │   ├── useFetch.js
│   │   └── useForm.js
│   ├── context/
│   │   └── AuthContext.jsx
│   ├── services/
│   │   ├── api.js             # Axios instance
│   │   └── studentService.js
│   ├── utils/
│   │   ├── constants.js
│   │   └── formatters.js
│   ├── App.jsx
│   └── main.jsx
├── .env.example
├── package.json
└── vite.config.js
```

The feature-based organization under `src/pages/` mirrors the backend module structure. The `src/services/api.js` file configures a single Axios instance with request interceptors for JWT attachment and response interceptors for global error handling and token refresh.

### 2.4 Development Environment Setup

#### 2.4.1 Prerequisites

Verify the following dependencies are installed. Version compatibility is enforced via the `engines` field in `package.json`.

- **Node.js** 20 LTS or newer (`node --version`). Node.js 20 provides the native `fetch` API, built-in Test Runner, and V8 performance improvements.
- **npm** 10+ (bundled with Node.js 20).
- **MongoDB** 7.x Community Edition locally, or a MongoDB Atlas cluster.
- **PostgreSQL** 15+ (optional — for relational deployments only).
- **Redis** 7+ for caching, session token blacklisting, and Socket.io adapter storage.
- **Git** 2.40+.

All database services can alternatively run via Docker Compose.

#### 2.4.2 Environment Variables Template

The application externalizes all configuration through environment variables. Copy `.env.example` to `.env` and populate with deployment-specific values.

```env
# .env.example — server-side configuration
# Copy to .env and fill in deployment-specific values.

# Server
NODE_ENV=development
PORT=5000

# Database
DATABASE_URL=mongodb://localhost:27017/school_management
# DATABASE_URL=postgresql://user:pass@localhost:5432/school_db

# JWT Authentication
JWT_SECRET=your_jwt_secret_min_32_chars
JWT_EXPIRES_IN=15m
REFRESH_TOKEN_SECRET=your_refresh_secret_key
REFRESH_TOKEN_EXPIRES_IN=7d

# Email (Nodemailer SMTP)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_smtp_username
EMAIL_PASS=your_smtp_app_password
EMAIL_FROM=noreply@yourschool.edu

# SMS Gateway
SMS_API_KEY=your_sms_api_key
SMS_API_URL=https://api.smsprovider.com/send
SMS_SENDER_ID=SCHOOL

# Redis
REDIS_URL=redis://localhost:6379

# File Upload
MAX_FILE_SIZE=5242880
UPLOAD_PATH=./uploads

# Client URL (CORS, email links)
CLIENT_URL=http://localhost:5173
```

The `JWT_SECRET` and `REFRESH_TOKEN_SECRET` must be cryptographically random strings of at least 32 characters, generated via `openssl rand -base64 64`. Separate secrets for access and refresh tokens prevent a compromised access token secret from invalidating the refresh token infrastructure.

#### 2.4.3 Development Workflow

The development environment uses `concurrently` to start both the backend API server and the Vite development server from a single terminal command. The root `package.json` defines the following workspace scripts:

```json
{
  "name": "school-management-system",
  "private": true,
  "workspaces": ["client", "server"],
  "scripts": {
    "dev": "concurrently \"npm run server\" \"npm run client\"",
    "server": "cd server && npm run dev",
    "client": "cd client && npm run dev"
  },
  "devDependencies": {
    "concurrently": "^8.2.0"
  }
}
```

Running `npm run dev` from the project root starts the Express server with `nodemon` (auto-restart on file changes) and the Vite client dev server with Hot Module Replacement (HMR). The backend serves the REST API on `http://localhost:5000`; the React dev server runs on `http://localhost:5173` with API requests proxied via Vite's `server.proxy` configuration.

Database seed scripts in `server/config/seed.js` populate the development database with realistic test data — sample students, teachers, class sections, and fee structures — enabling immediate frontend development. Execute via `npm run seed` in the server directory. The seed script truncates existing collections before insertion.

```mermaid
flowchart LR
    subgraph "Internet"
        Users["Users / Parents / Staff"]
    end

    subgraph "Edge Layer"
        CDN["Cloudflare CDN"]
        NginxProd["Nginx Reverse Proxy"]
    end

    subgraph "Application Layer"
        PM2["PM2 Process Manager"]
        Node1["Node.js :5001"]
        Node2["Node.js :5002"]
        Node3["Node.js :5003"]
    end

    subgraph "Data Layer"
        MongoRepl["MongoDB Replica Set"]
        RedisProd["Redis Cluster"]
    end

    subgraph "Storage"
        S3["S3 Object Storage"]
    end

    Users --> CDN
    CDN --> NginxProd
    NginxProd -->|"Load Balance"| PM2
    PM2 --> Node1 & Node2 & Node3
    Node1 & Node2 & Node3 -->|"Read/Write"| MongoRepl
    Node1 & Node2 & Node3 -->|"Cache"| RedisProd
    MongoRepl -->|"Snapshots"| S3
    Node1 -->|"Uploads"| S3
```
