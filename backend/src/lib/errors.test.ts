import { describe, it, expect } from '@jest/globals';
import {
  PolicyEngineError,
  ValidationError,
  NotFoundError,
  ConflictError,
  UnauthorizedError,
  ForbiddenError,
  formatErrorResponse
} from './errors';

describe('Error Classes', () => {
  it('should create PolicyEngineError with correct properties', () => {
    const error = new PolicyEngineError('Test error', 500, 'TEST_ERROR', { detail: 'test' });

    expect(error).toBeInstanceOf(Error);
    expect(error.message).toBe('Test error');
    expect(error.statusCode).toBe(500);
    expect(error.code).toBe('TEST_ERROR');
    expect(error.details).toEqual({ detail: 'test' });
    expect(error.name).toBe('PolicyEngineError');
  });

  it('should create ValidationError with 400 status', () => {
    const error = new ValidationError('Invalid input', { field: 'email' });

    expect(error.statusCode).toBe(400);
    expect(error.code).toBe('VALIDATION_ERROR');
    expect(error.message).toBe('Invalid input');
    expect(error.details).toEqual({ field: 'email' });
  });

  it('should create NotFoundError with correct message', () => {
    const error = new NotFoundError('User', 'user-123');

    expect(error.statusCode).toBe(404);
    expect(error.code).toBe('NOT_FOUND');
    expect(error.message).toBe("User with id 'user-123' not found");
  });

  it('should create NotFoundError without id', () => {
    const error = new NotFoundError('Resource');

    expect(error.message).toBe('Resource not found');
  });

  it('should create ConflictError with 409 status', () => {
    const error = new ConflictError('Resource already exists');

    expect(error.statusCode).toBe(409);
    expect(error.code).toBe('CONFLICT');
  });

  it('should create UnauthorizedError with 401 status', () => {
    const error = new UnauthorizedError('Invalid credentials');

    expect(error.statusCode).toBe(401);
    expect(error.code).toBe('UNAUTHORIZED');
  });

  it('should create ForbiddenError with 403 status', () => {
    const error = new ForbiddenError('Access denied');

    expect(error.statusCode).toBe(403);
    expect(error.code).toBe('FORBIDDEN');
  });
});

describe('formatErrorResponse', () => {
  it('should format error response correctly', () => {
    const error = new ValidationError('Test error', { field: 'name' });
    const response = formatErrorResponse(error, '/api/test');

    expect(response).toHaveProperty('error');
    expect(response.error).toHaveProperty('code', 'VALIDATION_ERROR');
    expect(response.error).toHaveProperty('message', 'Test error');
    expect(response.error).toHaveProperty('details', { field: 'name' });
    expect(response.error).toHaveProperty('timestamp');
    expect(response.error).toHaveProperty('path', '/api/test');
  });

  it('should format error response without path', () => {
    const error = new NotFoundError('User', '123');
    const response = formatErrorResponse(error);

    expect(response.error).not.toHaveProperty('path');
  });
});
