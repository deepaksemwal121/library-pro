import { useEffect, useState } from "react";
import supabase from "../../../helpers/supabase";

const SETTINGS_EVENT = "librarypro-library-settings-updated";
const DEFAULT_SETTINGS = {
  libraryName: "Library Pro",
  logoDataUrl: "",
  themeColor: "#2563eb",
};

const HEX_COLOR_PATTERN = /^#[0-9a-f]{6}$/i;

const mapSettingsFromDb = (settings, fallback = DEFAULT_SETTINGS) =>
  normalizeSettings({
    libraryName: settings?.library_name || fallback.libraryName,
    themeColor: settings?.theme_color || fallback.themeColor,
    logoDataUrl: settings?.logo_data_url || fallback.logoDataUrl,
  });

const getSettingsErrorMessage = (error) => {
  if (error?.code === "42501" || error?.message?.toLowerCase().includes("row-level security")) {
    return "Only admins can change library name and logo settings.";
  }

  return error?.message || "Could not save library settings.";
};

const normalizeSettings = (settings) => ({
  ...DEFAULT_SETTINGS,
  ...(settings || {}),
  libraryName: settings?.libraryName?.trim() || DEFAULT_SETTINGS.libraryName,
  logoDataUrl: settings?.logoDataUrl || "",
  themeColor: HEX_COLOR_PATTERN.test(settings?.themeColor || "") ? settings.themeColor : DEFAULT_SETTINGS.themeColor,
});

export const getReadableTextColor = (hexColor) => {
  const normalizedColor = HEX_COLOR_PATTERN.test(hexColor || "") ? hexColor.slice(1) : DEFAULT_SETTINGS.themeColor.slice(1);
  const red = parseInt(normalizedColor.slice(0, 2), 16);
  const green = parseInt(normalizedColor.slice(2, 4), 16);
  const blue = parseInt(normalizedColor.slice(4, 6), 16);
  const brightness = (red * 299 + green * 587 + blue * 114) / 1000;
  return brightness > 145 ? "#0f172a" : "#ffffff";
};

export const applyLibraryTheme = (settings) => {
  if (typeof document === "undefined") return;

  const normalizedSettings = normalizeSettings(settings);
  const root = document.documentElement;
  root.style.setProperty("--library-theme-color", normalizedSettings.themeColor);
  root.style.setProperty("--library-theme-text-color", getReadableTextColor(normalizedSettings.themeColor));
};

export const loadLibrarySettings = () => {
  try {
    const settings = normalizeSettings(DEFAULT_SETTINGS);
    applyLibraryTheme(settings);
    return settings;
  } catch {
    applyLibraryTheme(DEFAULT_SETTINGS);
    return DEFAULT_SETTINGS;
  }
};

export const fetchLibrarySettings = async () => {
  try {
    const { data, error } = await supabase
      .from("library_settings")
      .select("library_name, theme_color, logo_data_url")
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error("Error fetching library settings:", error);
      return DEFAULT_SETTINGS;
    }

    const settings = mapSettingsFromDb(data);
    applyLibraryTheme(settings);
    return settings;
  } catch (error) {
    console.error("Error in fetchLibrarySettings:", error);
    return DEFAULT_SETTINGS;
  }
};

export const saveLibrarySettings = async (settings) => {
  try {
    const normalizedSettings = normalizeSettings(settings);
    const payload = {
      library_name: normalizedSettings.libraryName,
      theme_color: normalizedSettings.themeColor,
      logo_data_url: normalizedSettings.logoDataUrl,
    };

    const { data: existingSettings, error: fetchError } = await supabase
      .from("library_settings")
      .select("id")
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (fetchError) {
      console.error("Error checking library settings:", fetchError);
      throw new Error(getSettingsErrorMessage(fetchError));
    }

    const query = existingSettings?.id
      ? supabase.from("library_settings").update(payload).eq("id", existingSettings.id)
      : supabase.from("library_settings").insert(payload);

    const { data, error } = await query.select("library_name, theme_color, logo_data_url").maybeSingle();

    if (error) {
      console.error("Error saving library settings:", error);
      throw new Error(getSettingsErrorMessage(error));
    }

    if (!data) {
      throw new Error("Only admins can change library name and logo settings.");
    }

    const savedSettings = mapSettingsFromDb(data, normalizedSettings);

    applyLibraryTheme(savedSettings);
    window.dispatchEvent(new CustomEvent(SETTINGS_EVENT, { detail: savedSettings }));
    return savedSettings;
  } catch (error) {
    console.error("Error in saveLibrarySettings:", error);
    throw error;
  }
};

export const useLibrarySettings = () => {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadSettings = async () => {
      setIsLoading(true);
      const loadedSettings = await fetchLibrarySettings();
      setSettings(loadedSettings);
      setIsLoading(false);
    };

    loadSettings();

    const handleSettingsChange = (event) => {
      const updatedSettings = event.detail || DEFAULT_SETTINGS;
      applyLibraryTheme(updatedSettings);
      setSettings(updatedSettings);
    };

    const subscription = supabase
      .channel("library_settings_changes")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "library_settings",
        },
        async () => {
          const updatedSettings = await fetchLibrarySettings();
          setSettings(updatedSettings);
        },
      )
      .subscribe();

    window.addEventListener(SETTINGS_EVENT, handleSettingsChange);

    return () => {
      window.removeEventListener(SETTINGS_EVENT, handleSettingsChange);
      subscription.unsubscribe();
    };
  }, []);

  return { settings, isLoading };
};
