import { Prisma } from '@/generated/prisma';

/**
 * Turns an error caught in an API route into a message safe to show a user.
 *
 * Prisma errors carry the full query (ids, field names, values) in their
 * message, so they are mapped to plain sentences. Errors thrown deliberately
 * by our own code (`throw new Error("...")`) are already user-facing and are
 * passed through unchanged. The original error should still be logged.
 */
export function toUserMessage(error: unknown, fallback = 'Something went wrong. Please try again.'): string {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    switch (error.code) {
      case 'P2002':
        return 'A record with the same details already exists.';
      case 'P2003':
        return 'One of the selected items no longer exists. Please refresh the page and try again.';
      case 'P2025':
        return 'This record could not be found. It may have been changed or removed.';
      default:
        return fallback;
    }
  }
  if (
    error instanceof Prisma.PrismaClientValidationError ||
    error instanceof Prisma.PrismaClientUnknownRequestError ||
    error instanceof Prisma.PrismaClientRustPanicError
  ) {
    return fallback;
  }
  if (error instanceof Prisma.PrismaClientInitializationError) {
    return 'Unable to connect to the database. Please try again shortly.';
  }
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}
