import { registerDecorator, ValidationOptions, ValidationArguments, IsUrl } from "class-validator";

export function IsUsername(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: "isUsername",
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: any, args: ValidationArguments) {
          if (typeof value !== "string") {
            return false;
          }

          // Username: alphanumeric with optional underscore/dot, 3-30 chars
          // Must start with a letter
          const usernameRegex = /^[a-zA-Z][a-zA-Z0-9._]{2,29}$/;
          return usernameRegex.test(value);
        },
        defaultMessage(args: ValidationArguments) {
          return `${args.property} must be a valid username (3-30 characters, alphanumeric with optional underscore/dot, must start with a letter)`;
        },
      },
    });
  };
}

export function IsName(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: "isName",
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate(value: any) {
          if (typeof value !== "string") {
            return false;
          }

          const name = value.trim();

          // 2 to 100 characters
          if (name.length < 2 || name.length > 100) {
            return false;
          }

          // Allow letters, spaces, apostrophe and hyphen
          const nameRegex = /^[A-Za-z]+([ '-][A-Za-z]+)*$/;

          return nameRegex.test(name);
        },

        defaultMessage(args: ValidationArguments) {
          return `${args.property} must contain only letters, spaces, apostrophes (') or hyphens (-).`;
        },
      },
    });
  };
}

export function IsAlphanumericName(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: "isAlphanumericName",
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate(value: any) {
          if (typeof value !== "string") {
            return false;
          }

          const name = value.trim();

          if (name.length < 2 || name.length > 100) {
            return false;
          }

          const nameRegex = /^[A-Za-z0-9]+([ '-][A-Za-z0-9]+)*$/;

          return nameRegex.test(name);
        },

        defaultMessage(args: ValidationArguments) {
          return `${args.property} must contain only letters, numbers, spaces, apostrophes (') or hyphens (-).`;
        },
      },
    });
  };
}

// export function IsMobileNumber(validationOptions?: ValidationOptions) {
//   return function (object: Object, propertyName: string) {
//     registerDecorator({
//       name: "isMobileNumber",
//       target: object.constructor,
//       propertyName: propertyName,
//       options: validationOptions,
//       validator: {
//         validate(value: any, args: ValidationArguments) {
//           if (typeof value !== "string") {
//             return false;
//           }

//           // Mobile number: 10-15 digits, optional + prefix and spaces/hyphens
//           // First check if it matches the basic format
//           const mobileRegex = /^[\+]?[\d\s-]+$/;
//           if (!mobileRegex.test(value)) {
//             return false;
//           }

//           // Extract only digits to count them
//           const digits = value.replace(/[\s\-+]/g, '');
//           const digitCount = digits.length;

//           // Must have 10-15 digits total
//           return digitCount >= 10 && digitCount <= 15;
//         },
//         defaultMessage(args: ValidationArguments) {
//           return `${args.property} must be a valid mobile number (10-15 digits, optional country code)`;
//         },
//       },
//     });
//   };
// }


export function IsMobileNumber(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: "isMobileNumber",
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate(value: any) {

          if (value === null || value === undefined) {
            return false;
          }

          // Convert number to string
          const mobile = String(value);

          // Only digits
          if (!/^\d{10}$/.test(mobile)) {
            return false;
          }

          // Indian mobile number starts with 6-9
          return /^[6-9]\d{9}$/.test(mobile);
        },

        defaultMessage(args: ValidationArguments) {
          return `${args.property} must be a valid 10-digit mobile number`;
        },
      },
    });
  };
}

export function IsLandlineNumber(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: "isLandlineNumber",
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate(value: any) {
          if (value === null || value === undefined || value === "") {
            return false;
          }

          return /^\d+$/.test(String(value));
        },

        defaultMessage(args: ValidationArguments) {
          return `${args.property} must contain only numbers`;
        },
      },
    });
  };
}

export function IsPassword(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: "isPassword",
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: any, args: ValidationArguments) {
          if (typeof value !== "string") {
            return false;
          }

          // Password requirements:
          // - Minimum 8 characters
          // - At least one uppercase letter
          // - At least one lowercase letter
          // - At least one digit
          // - At least one special character
          const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]{8,}$/;
          return passwordRegex.test(value);
        },
        defaultMessage(args: ValidationArguments) {
          return `${args.property} must be at least 8 characters with at least one uppercase letter, one lowercase letter, one digit, and one special character (@$!%*?&#)`;
        },
      },
    });
  };
}


export function IsDomain(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: "isDomain",
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate(value: any, args: ValidationArguments) {
          if (typeof value !== "string") {
            return false;
          }

          // Accepts: example.com, www.example.com, https://example.com
          const domainRegex =
            /^(https?:\/\/)?(www\.)?[a-zA-Z0-9-]+(\.[a-zA-Z0-9-]+)+([\/?#].*)?$/;

          return domainRegex.test(value.trim());
        },

        defaultMessage(args: ValidationArguments) {
          return `${args.property} must be a valid domain (e.g. example.com)`;
        },
      },
    });
  };
}

export function IsDescription(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: "isDescription",
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate(value: any) {
          if (typeof value !== "string") {
            return false;
          }

          const description = value.trim();

          // Length: 5 to 500 characters
          if (description.length < 5 || description.length > 500) {
            return false;
          }

          // Allow letters, numbers, spaces and common punctuation
          const descriptionRegex =
            /^[A-Za-z0-9\s.,()'":;!?&%\-_/]+$/;

          return descriptionRegex.test(description);
        },

        defaultMessage(args: ValidationArguments) {
          return `${args.property} must be between 5 and 500 characters and may contain letters, numbers, spaces, and common punctuation.`;
        },
      },
    });
  };
}


