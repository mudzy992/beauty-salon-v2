import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const message =
      exception instanceof HttpException
        ? exception.getResponse()
        : 'Internal server error';

    const body =
      typeof message === 'object' && message !== null && 'message' in message
        ? (message as { message: string | string[] })
        : { message: String(message) };
    const msg = Array.isArray(body.message) ? body.message[0] : body.message;

    // Kod greške dolazi iz `apiError(KOD)` (common/errors/api-error-codes.ts). Bez ovog
    // polja filter bi ga odbacio, a frontend prevodi po kodu — ne po bosanskom tekstu.
    const rawCode =
      typeof message === 'object' && message !== null
        ? (message as { code?: unknown }).code
        : undefined;
    const code = typeof rawCode === 'string' && rawCode ? rawCode : undefined;

    if (status >= 500) {
      this.logger.error(
        `${request.method} ${request.url} ${status}`,
        exception instanceof Error ? exception.stack : undefined,
      );
    }

    response.status(status).json({
      statusCode: status,
      ...(code ? { code } : {}),
      message: msg || (status === 404 ? 'Not Found' : 'Internal server error'),
      error:
        status === 404
          ? 'Not Found'
          : status >= 500
            ? 'Internal Server Error'
            : undefined,
    });
  }
}
