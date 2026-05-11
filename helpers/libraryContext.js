/**
 * Library Context Utilities
 * Provides helper functions for getting current user's library and role information
 */

import supabase from "./supabase";

/**
 * Cache for user profile to avoid repeated DB queries
 */
let userProfileCache = null;
let cacheTimestamp = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

/**
 * Fetch current user's profile with library and role information
 * Includes caching to minimize database queries
 *
 * @returns {Promise<{
 *   id: string,
 *   libraryId: string | null,
 *   role: string,
 *   fullName: string,
 *   email: string,
 *   isAdmin: boolean
 * } | null>}
 */
export async function getCurrentUserProfile() {
  const now = Date.now();

  // Return cached profile if still valid
  if (
    userProfileCache &&
    now - cacheTimestamp < CACHE_DURATION
  ) {
    return userProfileCache;
  }

  try {
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();

    if (!authUser) {
      return null;
    }

    const { data, error } = await supabase
      .from("user_profiles")
      .select("id, full_name, email, role")
      .eq("id", authUser.id)
      .maybeSingle();

    if (error) {
      console.error("Error fetching user profile:", error);
      return {
        id: authUser.id,
        libraryId: null,
        role: "manager",
        fullName: authUser.user_metadata?.full_name || authUser.email,
        email: authUser.email,
        isAdmin: false,
      };
    }

    const profile = {
      id: data?.id || authUser.id,
      libraryId: null,
      role: data?.role || "manager",
      fullName: data?.full_name || authUser.user_metadata?.full_name || authUser.email,
      email: data?.email || authUser.email,
      isAdmin: data?.role === "admin",
    };

    // Cache the profile
    userProfileCache = profile;
    cacheTimestamp = now;

    return profile;
  } catch (error) {
    console.error("Error in getCurrentUserProfile:", error);
    return null;
  }
}

/**
 * Get current user's library ID
 * Returns null if user is admin (can see all libraries)
 *
 * @returns {Promise<string | null>}
 */
export async function getCurrentLibraryId() {
  const profile = await getCurrentUserProfile();
  return profile?.libraryId || null;
}

/**
 * Get current user's role name
 *
 * @returns {Promise<string>}
 */
export async function getUserRole() {
  const profile = await getCurrentUserProfile();
  return profile?.role || "manager";
}

/**
 * Check if current user is admin
 *
 * @returns {Promise<boolean>}
 */
export async function isUserAdmin() {
  const profile = await getCurrentUserProfile();
  return profile?.isAdmin || false;
}

/**
 * Clear the user profile cache
 * Call this after login/logout or when user data changes
 */
export function clearUserProfileCache() {
  userProfileCache = null;
  cacheTimestamp = 0;
}

/**
 * Build a Supabase query with library filtering for current user
 * Automatically adds library_id filter if user is not admin
 *
 * @param {Object} query - Supabase query builder (e.g., supabase.from('table').select())
 * @returns {Promise<Object>} - The query object (for chaining)
 */
export async function withLibraryFilter(query) {
  const libraryId = await getCurrentLibraryId();

  if (libraryId) {
    return query.eq("library_id", libraryId);
  }

  // Admin sees all data, no filter applied
  return query;
}

/**
 * Add is_deleted filter to queries (exclude soft-deleted records)
 * Admins can see all records including deleted ones
 *
 * @param {Object} query - Supabase query builder
 * @param {boolean} includeDeleted - Whether to include soft-deleted records (for admins)
 * @returns {Object} - The query object (for chaining)
 */
export function withActiveFilter(query, includeDeleted = false) {
  if (!includeDeleted) {
    return query.eq("is_deleted", false);
  }
  return query;
}
