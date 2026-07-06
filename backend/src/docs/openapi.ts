export const openApiDocument = {
  openapi: "3.0.3",
  info: {
    title: "Sistema RH - Grupo GTF API",
    version: "1.0.0",
    description: "API REST para controle de pedidos de almoço, funcionários, preços, períodos e relatórios."
  },
  servers: [
    {
      url: "http://localhost:3333/api",
      description: "Ambiente local"
    }
  ],
  tags: [
    { name: "Health" },
    { name: "Auth" },
    { name: "Users" },
    { name: "Employees" },
    { name: "Meal Prices" },
    { name: "Meal Records" },
    { name: "Employee Portal" },
    { name: "Billing Periods" },
    { name: "Dashboard" }
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT"
      }
    },
    schemas: {
      Error: {
        type: "object",
        properties: {
          message: { type: "string", example: "Dados inválidos." }
        }
      },
      LoginRequest: {
        type: "object",
        required: ["email", "password"],
        properties: {
          email: { type: "string", format: "email", example: "rh@gtf.com.br" },
          password: { type: "string", example: "123456" }
        }
      },
      Session: {
        type: "object",
        properties: {
          token: { type: "string" },
          user: { $ref: "#/components/schemas/User" }
        }
      },
      User: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          name: { type: "string", example: "RH Grupo GTF" },
          email: { type: "string", format: "email", example: "rh@gtf.com.br" },
          role: { type: "string", enum: ["RH", "GESTORA"] },
          active: { type: "boolean" }
        }
      },
      UserInput: {
        type: "object",
        required: ["name", "email", "role"],
        properties: {
          name: { type: "string", example: "Gestora Operacional" },
          email: { type: "string", format: "email", example: "gestora@gtf.com.br" },
          password: { type: "string", minLength: 6, example: "123456" },
          role: { type: "string", enum: ["RH", "GESTORA"] },
          active: { type: "boolean", default: true }
        }
      },
      Employee: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          name: { type: "string", example: "Maria Eduarda" },
          status: { type: "string", enum: ["ACTIVE", "INACTIVE"] },
          scheduleType: { type: "string", enum: ["MON_FRI", "MON_SUN", "CUSTOM"] },
          admissionDate: { type: "string", format: "date", nullable: true },
          terminationDate: { type: "string", format: "date", nullable: true }
        }
      },
      EmployeeInput: {
        type: "object",
        required: ["name", "scheduleType"],
        properties: {
          name: { type: "string", example: "Maria Eduarda" },
          status: { type: "string", enum: ["ACTIVE", "INACTIVE"], default: "ACTIVE" },
          scheduleType: { type: "string", enum: ["MON_FRI", "MON_SUN", "CUSTOM"], example: "MON_FRI" },
          admissionDate: { type: "string", format: "date", nullable: true },
          terminationDate: { type: "string", format: "date", nullable: true }
        }
      },
      MealPrice: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          value: { type: "number", example: 8.5 },
          validFrom: { type: "string", format: "date", example: "2026-06-01" },
          validTo: { type: "string", format: "date", nullable: true },
          employeeId: { type: "string", format: "uuid", nullable: true }
        }
      },
      MealPriceInput: {
        type: "object",
        required: ["value", "validFrom"],
        properties: {
          value: { type: "number", example: 8.5 },
          validFrom: { type: "string", format: "date", example: "2026-06-01" },
          validTo: { type: "string", format: "date", nullable: true },
          employeeId: { type: "string", format: "uuid", nullable: true }
        }
      },
      MealRecord: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          employeeId: { type: "string", format: "uuid" },
          periodId: { type: "string", format: "uuid" },
          date: { type: "string", format: "date" },
          quantity: { type: "integer", example: 1 },
          confirmationStatus: { type: "string", enum: ["PENDING", "PEGUEI", "NAO_PEGUEI"], default: "PENDING" },
          confirmationSource: { type: "string", enum: ["SISTEMA", "WHATSAPP"], nullable: true },
          confirmedAt: { type: "string", format: "date-time", nullable: true },
          registeredById: { type: "string", format: "uuid" }
        }
      },
      MealRecordBulkInput: {
        type: "object",
        required: ["periodId", "entries"],
        properties: {
          periodId: { type: "string", format: "uuid" },
          entries: {
            type: "array",
            items: {
              type: "object",
              required: ["employeeId", "date", "quantity"],
              properties: {
                employeeId: { type: "string", format: "uuid" },
                date: { type: "string", format: "date", example: "2026-06-18" },
                quantity: { type: "integer", minimum: 0, maximum: 10, example: 1 }
              }
            }
          }
        }
      },
      BillingPeriod: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          label: { type: "string", example: "Junho 2026 - 06/06 a 05/07" },
          startDate: { type: "string", format: "date" },
          endDate: { type: "string", format: "date" },
          status: { type: "string", enum: ["OPEN", "CLOSED"] },
          totalAmount: { type: "number", nullable: true }
        }
      },
      BillingPeriodInput: {
        type: "object",
        required: ["label", "startDate", "endDate"],
        properties: {
          label: { type: "string", example: "Junho 2026 - 06/06 a 05/07" },
          startDate: { type: "string", format: "date", example: "2026-06-06" },
          endDate: { type: "string", format: "date", example: "2026-07-05" }
        }
      },
      MealRecordConfirmation: {
        type: "object",
        properties: {
          employeeId: { type: "string", format: "uuid" },
          employeeName: { type: "string", example: "Maria Eduarda" },
          date: { type: "string", format: "date", example: "2026-07-03" },
          quantity: { type: "integer", example: 1 },
          confirmationStatus: { type: "string", enum: ["PENDING", "PEGUEI", "NAO_PEGUEI"] },
          confirmationSource: { type: "string", enum: ["SISTEMA", "WHATSAPP"], nullable: true },
          confirmedAt: { type: "string", format: "date-time", nullable: true }
        }
      },
      EmployeePortalSearchResult: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          name: { type: "string", example: "Maria Eduarda" }
        }
      },
      EmployeePortalDay: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          date: { type: "string", format: "date", example: "2026-07-03" },
          quantity: { type: "integer", example: 1 },
          confirmationStatus: { type: "string", enum: ["PENDING", "PEGUEI", "NAO_PEGUEI"] },
          confirmationSource: { type: "string", enum: ["SISTEMA", "WHATSAPP"], nullable: true },
          confirmedAt: { type: "string", format: "date-time", nullable: true },
          period: {
            type: "object",
            properties: {
              id: { type: "string", format: "uuid" },
              label: { type: "string" },
              status: { type: "string", enum: ["OPEN", "CLOSED"] }
            }
          }
        }
      },
      EmployeePortalCheckinInput: {
        type: "object",
        required: ["date", "status"],
        properties: {
          date: { type: "string", format: "date", example: "2026-07-03" },
          status: { type: "string", enum: ["PEGUEI", "NAO_PEGUEI"] }
        }
      }
    },
    responses: {
      Unauthorized: {
        description: "Sessão não autenticada.",
        content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } }
      },
      Forbidden: {
        description: "Perfil sem permissão para a ação.",
        content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } }
      },
      ValidationError: {
        description: "Dados inválidos.",
        content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } }
      }
    }
  },
  paths: {
    "/health": {
      get: {
        tags: ["Health"],
        summary: "Verifica se a API está ativa",
        responses: {
          "200": {
            description: "API ativa"
          }
        }
      }
    },
    "/auth/login": {
      post: {
        tags: ["Auth"],
        summary: "Autentica usuário",
        requestBody: {
          required: true,
          content: { "application/json": { schema: { $ref: "#/components/schemas/LoginRequest" } } }
        },
        responses: {
          "200": {
            description: "Sessão criada",
            content: { "application/json": { schema: { $ref: "#/components/schemas/Session" } } }
          },
          "401": { $ref: "#/components/responses/Unauthorized" }
        }
      }
    },
    "/auth/me": {
      get: {
        tags: ["Auth"],
        summary: "Retorna o usuário autenticado",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": { description: "Usuário autenticado" },
          "401": { $ref: "#/components/responses/Unauthorized" }
        }
      }
    },
    "/users": {
      get: {
        tags: ["Users"],
        summary: "Lista usuários",
        security: [{ bearerAuth: [] }],
        responses: { "200": { description: "Lista de usuários" }, "403": { $ref: "#/components/responses/Forbidden" } }
      },
      post: {
        tags: ["Users"],
        summary: "Cria usuário",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: { "application/json": { schema: { allOf: [{ $ref: "#/components/schemas/UserInput" }], required: ["name", "email", "password", "role"] } } }
        },
        responses: { "201": { description: "Usuário criado" }, "422": { $ref: "#/components/responses/ValidationError" } }
      }
    },
    "/users/{id}": {
      put: {
        tags: ["Users"],
        summary: "Atualiza usuário",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        requestBody: {
          required: true,
          content: { "application/json": { schema: { $ref: "#/components/schemas/UserInput" } } }
        },
        responses: { "200": { description: "Usuário atualizado" }, "403": { $ref: "#/components/responses/Forbidden" } }
      }
    },
    "/employees": {
      get: {
        tags: ["Employees"],
        summary: "Lista funcionários",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "search", in: "query", schema: { type: "string" } },
          { name: "status", in: "query", schema: { type: "string", enum: ["ACTIVE", "INACTIVE"] } }
        ],
        responses: { "200": { description: "Lista de funcionários" } }
      },
      post: {
        tags: ["Employees"],
        summary: "Cria funcionário",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: { "application/json": { schema: { $ref: "#/components/schemas/EmployeeInput" } } }
        },
        responses: { "201": { description: "Funcionário criado" }, "403": { $ref: "#/components/responses/Forbidden" } }
      }
    },
    "/employees/{id}": {
      put: {
        tags: ["Employees"],
        summary: "Atualiza funcionário",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        requestBody: {
          required: true,
          content: { "application/json": { schema: { $ref: "#/components/schemas/EmployeeInput" } } }
        },
        responses: { "200": { description: "Funcionário atualizado" } }
      },
      delete: {
        tags: ["Employees"],
        summary: "Inativa funcionário",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        responses: { "200": { description: "Funcionário inativado" } }
      }
    },
    "/meal-prices": {
      get: {
        tags: ["Meal Prices"],
        summary: "Lista preços de almoço",
        security: [{ bearerAuth: [] }],
        responses: { "200": { description: "Lista de preços" } }
      },
      post: {
        tags: ["Meal Prices"],
        summary: "Cria preço com vigência",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: { "application/json": { schema: { $ref: "#/components/schemas/MealPriceInput" } } }
        },
        responses: { "201": { description: "Preço criado" } }
      }
    },
    "/meal-records": {
      get: {
        tags: ["Meal Records"],
        summary: "Lista lançamentos de um período",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "periodId", in: "query", required: true, schema: { type: "string", format: "uuid" } }],
        responses: { "200": { description: "Lista de lançamentos" } }
      }
    },
    "/meal-records/bulk": {
      post: {
        tags: ["Meal Records"],
        summary: "Salva lançamentos em lote",
        description: "Rejeita a requisição inteira com 422 quando houver lançamento em data futura. A referência é o relógio da VPS no fuso America/Sao_Paulo.",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: { "application/json": { schema: { $ref: "#/components/schemas/MealRecordBulkInput" } } }
        },
        responses: {
          "200": { description: "Lançamentos salvos" },
          "409": { description: "Período fechado" },
          "422": { description: "Data futura ou data fora do período selecionado" }
        }
      }
    },
    "/meal-records/confirmations": {
      get: {
        tags: ["Meal Records"],
        summary: "Lista confirmações de almoço para conferência",
        description: "Consulta operacional para RH e Gestora verificarem quem confirmou pelo Portal do Colaborador. O campo confirmationSource já reserva WHATSAPP para integração futura.",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "periodId", in: "query", required: true, schema: { type: "string", format: "uuid" } },
          { name: "date", in: "query", required: false, schema: { type: "string", format: "date" } }
        ],
        responses: {
          "200": {
            description: "Confirmações encontradas",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    confirmations: {
                      type: "array",
                      items: { $ref: "#/components/schemas/MealRecordConfirmation" }
                    }
                  }
                }
              }
            }
          },
          "422": { $ref: "#/components/responses/ValidationError" }
        }
      }
    },
    "/employee-portal/search": {
      get: {
        tags: ["Employee Portal"],
        summary: "Busca pública de funcionários ativos por nome",
        description: "Rota pública sem JWT. Retorna apenas id e nome para o autoatendimento do colaborador.",
        parameters: [{ name: "name", in: "query", required: true, schema: { type: "string", minLength: 2 } }],
        responses: {
          "200": {
            description: "Funcionários encontrados",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    employees: {
                      type: "array",
                      items: { $ref: "#/components/schemas/EmployeePortalSearchResult" }
                    }
                  }
                }
              }
            }
          },
          "422": { $ref: "#/components/responses/ValidationError" }
        }
      }
    },
    "/employee-portal/{employeeId}/calendar": {
      get: {
        tags: ["Employee Portal"],
        summary: "Retorna calendário público de almoços do colaborador",
        description: "Rota pública sem JWT. Mostra apenas dias com lançamento de almoço existente.",
        parameters: [
          { name: "employeeId", in: "path", required: true, schema: { type: "string", format: "uuid" } },
          { name: "month", in: "query", required: false, schema: { type: "string", pattern: "^\\d{4}-\\d{2}$", example: "2026-07" } }
        ],
        responses: {
          "200": {
            description: "Calendário do colaborador",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    employee: { $ref: "#/components/schemas/EmployeePortalSearchResult" },
                    month: { type: "string", example: "2026-07" },
                    days: {
                      type: "array",
                      items: { $ref: "#/components/schemas/EmployeePortalDay" }
                    }
                  }
                }
              }
            }
          },
          "404": { description: "Funcionário não encontrado" },
          "422": { $ref: "#/components/responses/ValidationError" }
        }
      }
    },
    "/employee-portal/{employeeId}/checkin": {
      post: {
        tags: ["Employee Portal"],
        summary: "Confirma se o colaborador pegou almoço",
        description: "Rota pública sem JWT. Bloqueia data futura e período fechado. A referência de hoje é o relógio da VPS no fuso America/Sao_Paulo.",
        parameters: [{ name: "employeeId", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        requestBody: {
          required: true,
          content: { "application/json": { schema: { $ref: "#/components/schemas/EmployeePortalCheckinInput" } } }
        },
        responses: {
          "200": {
            description: "Confirmação salva",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    record: { $ref: "#/components/schemas/EmployeePortalDay" }
                  }
                }
              }
            }
          },
          "404": { description: "Funcionário ou lançamento não encontrado" },
          "422": { description: "Data futura, período fechado ou payload inválido" }
        }
      }
    },
    "/billing-periods": {
      get: {
        tags: ["Billing Periods"],
        summary: "Lista períodos",
        security: [{ bearerAuth: [] }],
        responses: { "200": { description: "Lista de períodos" } }
      },
      post: {
        tags: ["Billing Periods"],
        summary: "Cria período",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: { "application/json": { schema: { $ref: "#/components/schemas/BillingPeriodInput" } } }
        },
        responses: { "201": { description: "Período criado" } }
      }
    },
    "/billing-periods/{id}/close": {
      post: {
        tags: ["Billing Periods"],
        summary: "Fecha período",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        responses: { "200": { description: "Período fechado" }, "409": { description: "Período já fechado" } }
      }
    },
    "/billing-periods/{id}/reopen": {
      post: {
        tags: ["Billing Periods"],
        summary: "Reabre período fechado",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        responses: { "200": { description: "Período reaberto" }, "409": { description: "Período já aberto" } }
      }
    },
    "/billing-periods/{id}/report": {
      get: {
        tags: ["Billing Periods"],
        summary: "Gera relatório do período",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } },
          { name: "format", in: "query", schema: { type: "string", enum: ["xlsx"] } }
        ],
        responses: {
          "200": {
            description: "Relatório em JSON ou arquivo XLSX"
          }
        }
      }
    },
    "/dashboard/summary": {
      get: {
        tags: ["Dashboard"],
        summary: "Retorna indicadores do período",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "periodId", in: "query", required: true, schema: { type: "string", format: "uuid" } }],
        responses: { "200": { description: "Resumo do dashboard" } }
      }
    }
  }
} as const;
