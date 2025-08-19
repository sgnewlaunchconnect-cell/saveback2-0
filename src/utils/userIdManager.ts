/**
 * Central anonymous user ID management
 */

const ANONYMOUS_USER_KEY = 'anonymousUserId';

export const getUserId = (): string => {
  let anonymousUserId = localStorage.getItem(ANONYMOUS_USER_KEY);
  if (!anonymousUserId) {
    anonymousUserId = crypto.randomUUID();
    localStorage.setItem(ANONYMOUS_USER_KEY, anonymousUserId);
  }
  return anonymousUserId;
};

export const clearUserId = (): void => {
  localStorage.removeItem(ANONYMOUS_USER_KEY);
};

export const setUserId = (userId: string): void => {
  localStorage.setItem(ANONYMOUS_USER_KEY, userId);
};