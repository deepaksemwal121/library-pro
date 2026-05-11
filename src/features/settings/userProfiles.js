import { useEffect, useState } from "react";
import supabase from "../../../helpers/supabase";
import { clearUserProfileCache } from "../../../helpers/libraryContext";

export const ROLE_OPTIONS = ["admin", "manager"];

export const roleLabel = (role) => (role === "admin" ? "Admin" : "Manager");

const mapProfileFromDb = (profile, authUser = null) => ({
  id: profile.id,
  fullName: profile.full_name || authUser?.user_metadata?.full_name || authUser?.email || "User",
  email: profile.email || authUser?.email || "",
  role: profile.role || "manager",
  createdAt: profile.created_at,
  updatedAt: profile.updated_at,
});

export const ensureCurrentUserProfile = async () => {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) throw userError;
  if (!user) return null;

  const { data: existingProfile, error: fetchError } = await supabase
    .from("user_profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (fetchError) throw fetchError;
  if (existingProfile) return mapProfileFromDb(existingProfile, user);

  const { count: profileCount, error: countError } = await supabase.from("user_profiles").select("id", { count: "exact", head: true });
  if (countError) throw countError;

  const profilePayload = {
    id: user.id,
    full_name: user.user_metadata?.full_name || user.email?.split("@")[0] || "Admin",
    email: user.email || "",
    role: Number(profileCount || 0) === 0 ? "admin" : "manager",
  };

  const { data: createdProfile, error: createError } = await supabase
    .from("user_profiles")
    .insert(profilePayload)
    .select()
    .single();

  if (createError) throw createError;

  clearUserProfileCache();
  return mapProfileFromDb(createdProfile, user);
};

export const fetchCurrentUserProfile = async () => ensureCurrentUserProfile();

export const fetchUserProfiles = async () => {
  const { data, error } = await supabase.from("user_profiles").select("*").order("created_at", { ascending: false });
  if (error) throw error;
  return (data || []).map((profile) => mapProfileFromDb(profile));
};

export const updateCurrentUserProfile = async ({ fullName, email }) => {
  const profile = await ensureCurrentUserProfile();
  if (!profile) return null;

  const normalizedEmail = email.trim();
  const normalizedFullName = fullName.trim();
  const authPayload = {
    data: { full_name: normalizedFullName },
  };

  if (normalizedEmail && normalizedEmail !== profile.email) {
    authPayload.email = normalizedEmail;
  }

  const { error: authError } = await supabase.auth.updateUser(authPayload);
  if (authError) throw authError;

  const { data, error } = await supabase
    .from("user_profiles")
    .update({
      full_name: normalizedFullName,
      email: normalizedEmail || profile.email,
    })
    .eq("id", profile.id)
    .select()
    .single();

  if (error) throw error;

  clearUserProfileCache();
  return mapProfileFromDb(data);
};

export const updateUserProfileRole = async (profileId, role) => {
  if (!ROLE_OPTIONS.includes(role)) {
    throw new Error("Invalid role selected.");
  }

  const { data, error } = await supabase.from("user_profiles").update({ role }).eq("id", profileId).select().single();
  if (error) throw error;

  clearUserProfileCache();
  return mapProfileFromDb(data);
};

export const addUserProfile = async ({ fullName, email, password, role }) => {
  if (!ROLE_OPTIONS.includes(role)) {
    throw new Error("Invalid role selected.");
  }

  const { data: currentSessionData } = await supabase.auth.getSession();
  const currentSession = currentSessionData.session;

  const { data, error } = await supabase.auth.signUp({
    email: email.trim(),
    password,
    options: {
      data: {
        full_name: fullName.trim(),
      },
    },
  });

  if (currentSession?.access_token && currentSession?.refresh_token) {
    await supabase.auth.setSession({
      access_token: currentSession.access_token,
      refresh_token: currentSession.refresh_token,
    });
  }

  if (error) throw error;
  if (!data.user) throw new Error("Supabase did not return the created user.");

  const profilePayload = {
    id: data.user.id,
    full_name: fullName.trim(),
    email: email.trim(),
    role,
  };

  const { data: profile, error: profileError } = await supabase
    .from("user_profiles")
    .upsert(profilePayload, { onConflict: "id" })
    .select()
    .single();

  if (profileError) throw profileError;

  return mapProfileFromDb(profile);
};

export const useCurrentUserProfile = () => {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let ignore = false;

    const loadProfile = async () => {
      try {
        const loadedProfile = await fetchCurrentUserProfile();
        if (!ignore) setProfile(loadedProfile);
      } catch (error) {
        console.error("Failed to load current user profile:", error);
        if (!ignore) setProfile(null);
      } finally {
        if (!ignore) setLoading(false);
      }
    };

    loadProfile();

    const handleProfileChange = () => {
      loadProfile();
    };

    window.addEventListener("librarypro-user-profile-updated", handleProfileChange);

    return () => {
      ignore = true;
      window.removeEventListener("librarypro-user-profile-updated", handleProfileChange);
    };
  }, []);

  return { profile, loading };
};

export const notifyUserProfileUpdated = () => {
  window.dispatchEvent(new CustomEvent("librarypro-user-profile-updated"));
};
