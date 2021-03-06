import { isHash, registerDecorator, ValidationOptions } from 'class-validator';

export function IsBase64Hash(
  /** If left empty, try to match: (algo)-(base64 hash digest) */
  algorithm?: string,
  validationOptions?: ValidationOptions
) {
  // eslint-disable-next-line @typescript-eslint/ban-types
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: 'isBase64Hash',
      target: object.constructor,
      propertyName,
      constraints: [algorithm],
      options: validationOptions,
      validator: {
        validate(value: unknown) {
          return isBase64Hash(value, algorithm);
        },
      },
    });
  };
}

export function isBase64Hash(value: unknown, algorithm?: string) {
  if (typeof value !== 'string') return false;
  const fromStr = value.match(/^(.*)-/)?.[1];
  const algo = algorithm ?? fromStr;
  if (!algo) {
    return false; // algo not found
  }
  const hex = Buffer.from(
    value.slice((fromStr?.length > 0 ? fromStr : algo).length + 1),
    'base64'
  ).toString('hex');
  return isHash(hex, algo);
}
