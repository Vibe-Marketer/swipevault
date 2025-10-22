export const COOKIE_NAME = "swipevault_session";
export const ONE_YEAR_MS = 1000 * 60 * 60 * 24 * 365;

export const APP_TITLE = "SwipeVault";
export const APP_LOGO = "/logo.png";

// Google OAuth login URL
export const getLoginUrl = () => {
  return "/api/auth/google";
};