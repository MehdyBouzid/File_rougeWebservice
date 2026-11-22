import { BadRequestException } from '@nestjs/common';
import {
  registerDecorator,
  type ValidationArguments,
  type ValidationOptions,
} from 'class-validator';

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const RFC3339_DATE_TIME_REGEX =
  /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d+))?(Z|[+-]\d{2}:\d{2})$/;

export function isUuid(value: string): boolean {
  return UUID_REGEX.test(value);
}

export function isValidRfc3339DateTime(value: unknown): boolean {
  if (typeof value !== 'string') return false;
  const match = RFC3339_DATE_TIME_REGEX.exec(value);
  if (!match) return false;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const hour = Number(match[4]);
  const minute = Number(match[5]);
  const second = Number(match[6]);

  if (month < 1 || month > 12) return false;
  if (day < 1 || day > 31) return false;
  if (hour > 23 || minute > 59 || second > 59) return false;

  // Vérifie que le jour existe réellement dans le mois (ex. rejette 2026-02-30).
  const calendarCheck = new Date(Date.UTC(year, month - 1, day));
  if (
    calendarCheck.getUTCFullYear() !== year ||
    calendarCheck.getUTCMonth() !== month - 1 ||
    calendarCheck.getUTCDate() !== day
  ) {
    return false;
  }

  return !Number.isNaN(Date.parse(value));
}

export function IsRfc3339DateTime(validationOptions?: ValidationOptions) {
  return (object: object, propertyName: string) => {
    registerDecorator({
      name: 'isRfc3339DateTime',
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate(value: unknown): boolean {
          return isValidRfc3339DateTime(value);
        },
        defaultMessage(args: ValidationArguments): string {
          return `${args.property} doit être une date RFC 3339 valide avec fuseau horaire.`;
        },
      },
    });
  };
}

export function toStrictQueryInt({ value }: { value: unknown }): unknown {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }
  if (typeof value === 'number') {
    return value;
  }
  if (typeof value === 'string' && /^-?\d+$/.test(value.trim())) {
    return Number.parseInt(value.trim(), 10);
  }
  return value;
}

export function parseAndValidateDateRange(
  startDate?: string,
  endDate?: string,
): { start?: Date; end?: Date } {
  const start = startDate ? new Date(startDate) : undefined;
  const end = endDate ? new Date(endDate) : undefined;

  if (start && Number.isNaN(start.getTime())) {
    throw new BadRequestException('Paramètre startDate invalide.');
  }
  if (end && Number.isNaN(end.getTime())) {
    throw new BadRequestException('Paramètre endDate invalide.');
  }
  if (start && end && start.getTime() > end.getTime()) {
    throw new BadRequestException(
      'La date de début doit être antérieure ou égale à la date de fin.',
    );
  }

  return { start, end };
}
