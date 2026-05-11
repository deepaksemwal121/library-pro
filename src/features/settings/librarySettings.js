import { useEffect, useState } from "react";

const STORAGE_KEY = "librarypro-library-settings";
const SETTINGS_EVENT = "librarypro-library-settings-updated";
const DEFAULT_SETTINGS = {
  libraryName: "Library Pro",
  logoDataUrl: "",
  themeColor: "#2563eb",
};

const HEX_COLOR_PATTERN = /^#[0-9a-f]{6}$/i;

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
    const savedSettings = localStorage.getItem(STORAGE_KEY);
    const settings = normalizeSettings(savedSettings ? JSON.parse(savedSettings) : DEFAULT_SETTINGS);
    applyLibraryTheme(settings);
    return settings;
  } catch {
    applyLibraryTheme(DEFAULT_SETTINGS);
    return DEFAULT_SETTINGS;
  }
};

export const saveLibrarySettings = (settings) => {
  const normalizedSettings = normalizeSettings(settings);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(normalizedSettings));
  applyLibraryTheme(normalizedSettings);
  window.dispatchEvent(new CustomEvent(SETTINGS_EVENT, { detail: normalizedSettings }));
  return normalizedSettings;
};

export const useLibrarySettings = () => {
  const [settings, setSettings] = useState(loadLibrarySettings);

  useEffect(() => {
    const handleSettingsChange = (event) => {
      const updatedSettings = event.detail || loadLibrarySettings();
      applyLibraryTheme(updatedSettings);
      setSettings(updatedSettings);
    };

    const handleStorageChange = (event) => {
      if (event.key === STORAGE_KEY) {
        const updatedSettings = loadLibrarySettings();
        applyLibraryTheme(updatedSettings);
        setSettings(updatedSettings);
      }
    };

    window.addEventListener(SETTINGS_EVENT, handleSettingsChange);
    window.addEventListener("storage", handleStorageChange);

    return () => {
      window.removeEventListener(SETTINGS_EVENT, handleSettingsChange);
      window.removeEventListener("storage", handleStorageChange);
    };
  }, []);

  return settings;
};
