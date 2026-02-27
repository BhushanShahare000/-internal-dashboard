import { z } from 'zod';
import { insertUserSchema, insertTimeEntrySchema, users, timeEntries, projects } from './schema';

export const errorSchemas = {
  validation: z.object({ message: z.string(), field: z.string().optional() }),
  notFound: z.object({ message: z.string() }),
  internal: z.object({ message: z.string() }),
  unauthorized: z.object({ message: z.string() }),
};

export const api = {
  auth: {
    register: {
      method: 'POST' as const,
      path: '/api/register' as const,
      input: insertUserSchema,
      responses: {
        201: z.custom<typeof users.$inferSelect>(),
        400: errorSchemas.validation,
      }
    },
    login: {
      method: 'POST' as const,
      path: '/api/login' as const,
      input: insertUserSchema,
      responses: {
        200: z.custom<typeof users.$inferSelect>(),
        401: errorSchemas.unauthorized,
      }
    },
    logout: {
      method: 'POST' as const,
      path: '/api/logout' as const,
      responses: {
        200: z.any(),
      }
    },
    me: {
      method: 'GET' as const,
      path: '/api/user' as const,
      responses: {
        200: z.custom<typeof users.$inferSelect>(),
        401: errorSchemas.unauthorized,
      }
    }
  },
  projects: {
    list: {
      method: 'GET' as const,
      path: '/api/projects' as const,
      responses: { 200: z.array(z.custom<typeof projects.$inferSelect>()) }
    },
  },
  timeEntries: {
    list: {
      method: 'GET' as const,
      path: '/api/time-entries' as const,
      responses: { 200: z.array(z.custom<any>()) }
    },
    listAll: {
      method: 'GET' as const,
      path: '/api/admin/time-entries' as const,
      responses: { 200: z.array(z.custom<any>()) }
    },
    create: {
      method: 'POST' as const,
      path: '/api/time-entries' as const,
      input: insertTimeEntrySchema,
      responses: {
        201: z.custom<typeof timeEntries.$inferSelect>(),
        400: errorSchemas.validation,
      }
    }
  },
  users: {
    list: {
      method: 'GET' as const,
      path: '/api/admin/users' as const,
      responses: { 200: z.array(z.custom<typeof users.$inferSelect>()) }
    }
  }
};

export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}
