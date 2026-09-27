import { notificationRouteByType } from "./notifications";
import type { NotificationRoute, NotificationType } from "./types";

export type NotificationPermissionState = "authorized" | "provisional" | "denied" | "not-determined";

export interface RuntimeNotificationPermission {
  granted: boolean;
  status: "granted" | "denied" | "undetermined" | string;
  iosAuthorizationStatus?: number;
}

const iosAuthorization = {
  authorized: 2,
  provisional: 3,
  ephemeral: 4
} as const;

const allowedRoutes = new Set<NotificationRoute>([
  "/",
  "/prayer",
  "/events",
  "/donate",
  "/media",
  "/programs",
  "/youth",
  "/contact",
  "/more",
  "/community",
  "/halal-restaurants",
  "/notifications",
  "/quran-academy"
]);

export function isNotificationPermissionAuthorized(permission: RuntimeNotificationPermission) {
  return permission.granted ||
    permission.iosAuthorizationStatus === iosAuthorization.authorized ||
    permission.iosAuthorizationStatus === iosAuthorization.provisional ||
    permission.iosAuthorizationStatus === iosAuthorization.ephemeral;
}

export function resolveNotificationPermissionState(permission: RuntimeNotificationPermission): NotificationPermissionState {
  if (permission.iosAuthorizationStatus === iosAuthorization.provisional) return "provisional";
  if (isNotificationPermissionAuthorized(permission)) return "authorized";
  if (permission.status === "denied") return "denied";
  return "not-determined";
}

export function resolveNotificationRoute(data: Record<string, unknown> | undefined): NotificationRoute {
  const explicitRoute = typeof data?.route === "string" ? data.route : undefined;
  if (explicitRoute && allowedRoutes.has(explicitRoute as NotificationRoute)) return explicitRoute as NotificationRoute;
  const type = typeof data?.type === "string" ? data.type : undefined;
  if (type && type in notificationRouteByType) return notificationRouteByType[type as NotificationType];
  return "/";
}

export function resolveNotificationDestination(data: Record<string, unknown> | undefined) {
  const route = resolveNotificationRoute(data);
  if (route === "/prayer" && typeof data?.prayer === "string" && ["fajr", "dhuhr", "asr", "maghrib", "isha"].includes(data.prayer)) {
    return `/prayer?prayer=${encodeURIComponent(data.prayer)}`;
  }
  if (route === "/events" && typeof data?.eventId === "string" && data.eventId.trim()) {
    return `/event-detail?id=${encodeURIComponent(data.eventId.trim())}`;
  }
  return route;
}
