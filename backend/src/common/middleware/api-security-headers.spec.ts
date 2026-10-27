import type { NextFunction, Request, Response } from 'express';
import { apiSecurityHeaders } from './api-security-headers';

describe('apiSecurityHeaders', () => {
  it('adds defensive headers and continues the request', () => {
    const response = { setHeader: jest.fn() };
    const next = jest.fn();

    apiSecurityHeaders(
      {} as Request,
      response as unknown as Response,
      next as NextFunction,
    );

    expect(response.setHeader).toHaveBeenCalledWith(
      'X-Content-Type-Options',
      'nosniff',
    );
    expect(response.setHeader).toHaveBeenCalledWith('X-Frame-Options', 'DENY');
    expect(response.setHeader).toHaveBeenCalledWith(
      'Referrer-Policy',
      'no-referrer',
    );
    expect(response.setHeader).toHaveBeenCalledWith(
      'Permissions-Policy',
      'camera=(), microphone=(), geolocation=()',
    );
    expect(response.setHeader).toHaveBeenCalledWith(
      'X-Permitted-Cross-Domain-Policies',
      'none',
    );
    expect(next).toHaveBeenCalledTimes(1);
  });
});
