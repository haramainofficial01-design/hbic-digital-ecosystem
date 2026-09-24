export const privacyPolicyUrl = "https://hbic.ca/privacy";
export const privacyContactEmail = "info@hbic.ca";
export const privacyPolicyEffectiveDate = "August 23, 2026";

export const privacyDataSummary = {
  accountRequired: false,
  analyticsEnabled: false,
  advertisingEnabled: false,
  locationCollected: false,
  notificationData: ["notification token", "device platform", "app version", "notification preferences", "hashed installation identifier"],
  privateFormData: ["name when provided", "email", "phone when required", "submission details"],
  localOnlyData: ["theme", "language", "notification preferences", "cached published content"]
} as const;
