/**
 * Validation Module Barrel Export
 */

export {
  // GPS
  GPSCoordinatesSchema,
  GPSStringSchema,
  parseGPSCoordinates,
  validateGPSCoordinates,

  // Phone
  PhoneNumberSchema,
  validatePhoneNumber,

  // Contacts
  ContactSchema,
  ContactListSchema,

  // ETA
  ETASchema,
  parseETA,

  // Form
  RideStartFormSchema,
  validateRideStartForm,

  // Driver
  DriverInfoSchema,

  // URL
  SafeUrlSchema,
  isValidUrl,
} from './schemas';

export type {
  GPSCoordinates,
  Contact,
  RideStartForm,
  DriverInfo,
} from './schemas';
