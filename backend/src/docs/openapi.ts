export const openApiSpec = {
  openapi: "3.0.3",
  info: {
    title: "Finance System Backend API",
    version: "1.0.0",
    description: "Swagger documentation for the Finance System backend wrapper and Supabase-powered APIs.",
  },
  servers: [
    {
      url: "/api",
      description: "Backend base path",
    },
  ],
  tags: [
    { name: "Health" },
    { name: "Auth" },
    { name: "Dashboard" },
    { name: "Records" },
    { name: "Admin" },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
      },
    },
    schemas: {
      ErrorResponse: {
        type: "object",
        properties: {
          error: { type: "string" },
        },
        required: ["error"],
      },
      HealthResponse: {
        type: "object",
        properties: {
          status: { type: "string", example: "ok" },
          service: { type: "string" },
          environment: { type: "string" },
          timestamp: { type: "string", format: "date-time" },
        },
        required: ["status", "service", "environment", "timestamp"],
      },
      LoginResolveResponse: {
        type: "object",
        properties: {
          email: { type: "string", nullable: true },
          username: { type: "string", nullable: true },
        },
      },
      CurrentUserResponse: {
        type: "object",
        properties: {
          user: {
            type: "object",
            properties: {
              id: { type: "string" },
              email: { type: "string", nullable: true },
            },
            required: ["id"],
          },
          role: { type: "string", enum: ["viewer", "analyst", "admin"] },
          profile: {
            type: "object",
            properties: {
              username: { type: "string", nullable: true },
              display_name: { type: "string", nullable: true },
            },
          },
        },
      },
      DashboardBundle: {
        type: "object",
        properties: {
          summary: {
            type: "object",
            properties: {
              total_income: { type: "number" },
              total_expenses: { type: "number" },
              net_balance: { type: "number" },
              record_count: { type: "number" },
            },
          },
          trends: { type: "array", items: { type: "object" } },
          categories: { type: "array", items: { type: "object" } },
          recent: { type: "array", items: { type: "object" } },
        },
      },
      FinancialRecord: {
        type: "object",
        properties: {
          id: { type: "string" },
          user_id: { type: "string" },
          amount: { type: "number" },
          type: { type: "string", enum: ["income", "expense"] },
          category: { type: "string" },
          record_date: { type: "string", format: "date" },
          notes: { type: "string", nullable: true },
          created_at: { type: "string", format: "date-time" },
          updated_at: { type: "string", format: "date-time" },
        },
      },
      UserWithRole: {
        type: "object",
        properties: {
          user_id: { type: "string" },
          username: { type: "string", nullable: true },
          display_name: { type: "string", nullable: true },
          email: { type: "string", nullable: true },
          status: { type: "string", enum: ["active", "inactive"] },
          created_at: { type: "string", format: "date-time" },
          role: { type: "string", enum: ["viewer", "analyst", "admin"] },
          role_id: { type: "string" },
        },
      },
    },
  },
  paths: {
    "/health": {
      get: {
        tags: ["Health"],
        summary: "Health check",
        responses: {
          200: {
            description: "Service status",
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/HealthResponse" } },
            },
          },
        },
      },
    },
    "/auth/resolve-login": {
      post: {
        tags: ["Auth"],
        summary: "Resolve username or email to login email",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  identifier: { type: "string" },
                },
                required: ["identifier"],
              },
            },
          },
        },
        responses: {
          200: {
            description: "Resolved identifier",
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/LoginResolveResponse" } },
            },
          },
          400: { description: "Missing identifier" },
        },
      },
    },
    "/auth/me": {
      get: {
        tags: ["Auth"],
        summary: "Get current authenticated user",
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: "Current user info",
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/CurrentUserResponse" } },
            },
          },
          401: { description: "Unauthorized" },
        },
      },
    },
    "/dashboard": {
      get: {
        tags: ["Dashboard"],
        summary: "Fetch dashboard summary bundle",
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: "Dashboard bundle",
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/DashboardBundle" } },
            },
          },
          401: { description: "Unauthorized" },
        },
      },
    },
    "/records": {
      get: {
        tags: ["Records"],
        summary: "List records with pagination and filters",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "page", in: "query", schema: { type: "integer", example: 1 } },
          { name: "limit", in: "query", schema: { type: "integer", example: 20 } },
          { name: "type", in: "query", schema: { type: "string", example: "income" } },
          { name: "category", in: "query", schema: { type: "string", example: "salary" } },
          { name: "search", in: "query", schema: { type: "string" } },
          { name: "date", in: "query", schema: { type: "string", format: "date" } },
        ],
        responses: {
          200: {
            description: "Paginated record list",
          },
          401: { description: "Unauthorized" },
        },
      },
      post: {
        tags: ["Records"],
        summary: "Create a financial record",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  amount: { type: "number", example: 5000 },
                  type: { type: "string", enum: ["income", "expense"] },
                  category: { type: "string", example: "salary" },
                  record_date: { type: "string", format: "date", example: "2026-04-05" },
                  notes: { type: "string", nullable: true },
                },
                required: ["amount", "type", "category", "record_date"],
              },
            },
          },
        },
        responses: {
          201: {
            description: "Created record",
            content: {
              "application/json": { schema: { type: "object", properties: { record: { $ref: "#/components/schemas/FinancialRecord" } } } },
            },
          },
          400: { description: "Validation error" },
          401: { description: "Unauthorized" },
          403: { description: "Forbidden" },
        },
      },
    },
    "/records/{id}": {
      patch: {
        tags: ["Records"],
        summary: "Update a record",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          200: {
            description: "Updated record",
            content: {
              "application/json": { schema: { type: "object", properties: { record: { $ref: "#/components/schemas/FinancialRecord" } } } },
            },
          },
          400: { description: "Validation error" },
          401: { description: "Unauthorized" },
          403: { description: "Forbidden" },
        },
      },
      delete: {
        tags: ["Records"],
        summary: "Soft delete a record",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          204: { description: "Deleted" },
          401: { description: "Unauthorized" },
          403: { description: "Forbidden" },
        },
      },
    },
    "/admin/users": {
      get: {
        tags: ["Admin"],
        summary: "List users with roles and status",
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: "Users list",
            content: {
              "application/json": { schema: { type: "object", properties: { users: { type: "array", items: { $ref: "#/components/schemas/UserWithRole" } } } } },
            },
          },
          401: { description: "Unauthorized" },
          403: { description: "Forbidden" },
        },
      },
    },
    "/admin/users/{userId}/role": {
      patch: {
        tags: ["Admin"],
        summary: "Update a user's role",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "userId", in: "path", required: true, schema: { type: "string" } }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: { role: { type: "string", enum: ["viewer", "analyst", "admin"] } },
                required: ["role"],
              },
            },
          },
        },
        responses: {
          200: { description: "Role updated" },
          400: { description: "Validation error" },
          401: { description: "Unauthorized" },
          403: { description: "Forbidden" },
        },
      },
    },
    "/admin/users/{userId}/status": {
      patch: {
        tags: ["Admin"],
        summary: "Update a user's status",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "userId", in: "path", required: true, schema: { type: "string" } }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: { status: { type: "string", enum: ["active", "inactive"] } },
                required: ["status"],
              },
            },
          },
        },
        responses: {
          200: { description: "Status updated" },
          400: { description: "Validation error" },
          401: { description: "Unauthorized" },
          403: { description: "Forbidden" },
        },
      },
    },
  },
} as const;
