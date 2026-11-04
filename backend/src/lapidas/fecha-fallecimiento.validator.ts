import {
  registerDecorator,
  type ValidationArguments,
  type ValidationOptions,
} from 'class-validator';

/**
 * Cota inferior de una fecha de fallecimiento. Antes de 1900 la fecha es
 * imposible para la app: o es un typo, o es un cliente fabricando datos.
 */
const FECHA_MINIMA = Date.UTC(1900, 0, 1);

/**
 * Valida que `fechaFallecimiento` sea una fecha real entre 1900 y hoy (E001).
 *
 * Se compara como instante y no como cadena: `new Date('2025-01-01')` es
 * medianoche UTC, así que la fecha de hoy siempre queda por debajo de `Date.now`
 * sin importar la zona horaria del servidor.
 *
 * No reemplaza a `@IsDateString`: ese decorador da el mensaje de formato y este
 * el de rango. Juntos, un `'no-es-fecha'` también se rechaza acá porque
 * `new Date(...)` da `NaN`.
 */
export function EsFechaDeFallecimiento(options?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'esFechaDeFallecimiento',
      target: object.constructor,
      propertyName,
      options,
      validator: {
        validate(value: unknown) {
          if (typeof value !== 'string') return false;
          const instante = new Date(value).getTime();
          if (Number.isNaN(instante)) return false;
          return instante >= FECHA_MINIMA && instante <= Date.now();
        },
        defaultMessage(args: ValidationArguments) {
          return `${args.property} debe estar entre 1900-01-01 y hoy`;
        },
      },
    });
  };
}
