import { useEffect, useState } from "react";
import { Building2, ImageUp, Save, ShieldCheck, Trash2, UserPlus, Users } from "lucide-react";
import { getReadableTextColor, fetchLibrarySettings, saveLibrarySettings } from "./librarySettings";
import {
  ROLE_OPTIONS,
  addUserProfile,
  fetchCurrentUserProfile,
  fetchUserProfiles,
  notifyUserProfileUpdated,
  roleLabel,
  updateCurrentUserProfile,
  updateUserProfileRole,
} from "./userProfiles";

const getHexFromRgb = (red, green, blue) =>
  `#${[red, green, blue].map((value) => Math.round(value).toString(16).padStart(2, "0")).join("")}`;

const getDominantLogoColor = (dataUrl) =>
  new Promise((resolve) => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => {
      const canvas = document.createElement("canvas");
      const size = 48;
      canvas.width = size;
      canvas.height = size;

      const context = canvas.getContext("2d", { willReadFrequently: true });
      context.drawImage(image, 0, 0, size, size);

      const { data } = context.getImageData(0, 0, size, size);
      const colorCounts = new Map();

      for (let index = 0; index < data.length; index += 16) {
        const alpha = data[index + 3];
        if (alpha < 128) continue;

        const red = data[index];
        const green = data[index + 1];
        const blue = data[index + 2];
        const saturation = Math.max(red, green, blue) - Math.min(red, green, blue);

        if (red > 235 && green > 235 && blue > 235) continue;
        if (red < 20 && green < 20 && blue < 20) continue;
        if (saturation < 18) continue;

        const roundedColor = getHexFromRgb(Math.round(red / 24) * 24, Math.round(green / 24) * 24, Math.round(blue / 24) * 24);
        colorCounts.set(roundedColor, (colorCounts.get(roundedColor) || 0) + 1);
      }

      const dominantColor = [...colorCounts.entries()].sort((first, second) => second[1] - first[1])[0]?.[0];
      resolve(dominantColor || "#2563eb");
    };
    image.onerror = () => resolve("#2563eb");
    image.src = dataUrl;
  });

export const Settings = () => {
  const [formData, setFormData] = useState({
    libraryName: "Library Pro",
    logoDataUrl: "",
    themeColor: "#2563eb",
  });
  const [isLoadingSettings, setIsLoadingSettings] = useState(true);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [notice, setNotice] = useState("");
  const [uploadError, setUploadError] = useState("");
  const [profileNotice, setProfileNotice] = useState({ tone: "", text: "" });
  const [teamNotice, setTeamNotice] = useState({ tone: "", text: "" });
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isAddingUser, setIsAddingUser] = useState(false);
  const [isLoadingProfiles, setIsLoadingProfiles] = useState(true);
  const [currentUserProfile, setCurrentUserProfile] = useState(null);
  const [currentUserForm, setCurrentUserForm] = useState({
    fullName: "",
    email: "",
  });
  const [teamProfiles, setTeamProfiles] = useState([]);
  const [newUser, setNewUser] = useState({
    fullName: "",
    email: "",
    password: "",
    role: "manager",
  });

  const loadSettings = async () => {
    setIsLoadingSettings(true);
    try {
      const settings = await fetchLibrarySettings();
      setFormData(settings);
    } catch (error) {
      setNotice(`Error loading settings: ${error.message}`);
      setFormData({
        libraryName: "Library Pro",
        logoDataUrl: "",
        themeColor: "#2563eb",
      });
    } finally {
      setIsLoadingSettings(false);
    }
  };

  const refreshProfiles = async () => {
    setIsLoadingProfiles(true);
    try {
      const [loadedCurrentProfile, loadedProfiles] = await Promise.all([fetchCurrentUserProfile(), fetchUserProfiles()]);
      setCurrentUserProfile(loadedCurrentProfile);
      setCurrentUserForm({
        fullName: loadedCurrentProfile?.fullName || "",
        email: loadedCurrentProfile?.email || "",
      });
      setTeamProfiles(loadedProfiles);
    } catch (error) {
      setProfileNotice({ tone: "error", text: error.message });
    } finally {
      setIsLoadingProfiles(false);
    }
  };

  useEffect(() => {
    loadSettings();
    refreshProfiles();
  }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setNotice("");
    setIsSavingSettings(true);

    try {
      const savedSettings = await saveLibrarySettings(formData);
      setFormData(savedSettings);
      setNotice("Library settings saved and synced across devices.");
    } catch (error) {
      setNotice(`Error saving settings: ${error.message}`);
    } finally {
      setIsSavingSettings(false);
    }
  };

  const handleSaveAdminProfile = async (event) => {
    event.preventDefault();
    setProfileNotice({ tone: "", text: "" });

    if (!currentUserForm.fullName.trim()) {
      setProfileNotice({ tone: "error", text: "Name is required." });
      return;
    }

    setIsSavingProfile(true);

    try {
      const updatedProfile = await updateCurrentUserProfile(currentUserForm);
      setCurrentUserProfile(updatedProfile);
      setCurrentUserForm({
        fullName: updatedProfile?.fullName || "",
        email: updatedProfile?.email || "",
      });
      await refreshProfiles();
      notifyUserProfileUpdated();
      setProfileNotice({
        tone: "success",
        text:
          currentUserForm.email !== currentUserProfile?.email
            ? "Profile updated. Supabase may send a confirmation email before the login email changes."
            : "Profile updated in database.",
      });
    } catch (error) {
      setProfileNotice({ tone: "error", text: error.message });
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleAddTeamMember = async (event) => {
    event.preventDefault();
    setTeamNotice({ tone: "", text: "" });

    if (!newUser.fullName.trim() || !newUser.email.trim() || !newUser.password) {
      setTeamNotice({ tone: "error", text: "Name, email, and password are required." });
      return;
    }

    if (newUser.password.length < 6) {
      setTeamNotice({ tone: "error", text: "Password must be at least 6 characters." });
      return;
    }

    setIsAddingUser(true);
    try {
      await addUserProfile(newUser);
      await refreshProfiles();
      setNewUser({ fullName: "", email: "", password: "", role: "manager" });
      setTeamNotice({ tone: "success", text: "User created and saved in database." });
    } catch (error) {
      setTeamNotice({ tone: "error", text: error.message });
    } finally {
      setIsAddingUser(false);
    }
  };

  const handleRoleChange = async (profileId, role) => {
    setTeamNotice({ tone: "", text: "" });

    try {
      await updateUserProfileRole(profileId, role);
      await refreshProfiles();
      notifyUserProfileUpdated();
      setTeamNotice({ tone: "success", text: "Role updated in database." });
    } catch (error) {
      setTeamNotice({ tone: "error", text: error.message });
    }
  };

  const handleLogoUpload = (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    setUploadError("");
    setNotice("");

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setUploadError("Please upload an image file.");
      return;
    }

    if (file.size > 1_500_000) {
      setUploadError("Logo image should be under 1.5 MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = async () => {
      const logoDataUrl = String(reader.result || "");
      const themeColor = await getDominantLogoColor(logoDataUrl);
      setFormData((previous) => ({ ...previous, logoDataUrl, themeColor }));
    };
    reader.onerror = () => setUploadError("Could not read the selected logo.");
    reader.readAsDataURL(file);
  };

  const handleRemoveLogo = () => {
    setFormData((previous) => ({ ...previous, logoDataUrl: "", themeColor: "#2563eb" }));
    setUploadError("");
    setNotice("");
  };

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Settings</h2>
        <p className="mt-1 text-sm text-slate-500">
          Manage how your library appears across the admin workspace. Changes sync to all your devices.
        </p>
      </div>

      {isLoadingSettings ? (
        <div className="flex items-center justify-center rounded-md border border-slate-200 bg-white p-8">
          <span className="text-sm text-slate-600">Loading settings...</span>
        </div>
      ) : formData ? (
        <form onSubmit={handleSubmit} className="border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-800">
            <Building2 size={18} className="text-blue-600" />
            Library Profile
          </div>

          <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="library-name">
            Library name
          </label>
          <input
            id="library-name"
            type="text"
            value={formData.libraryName}
            onChange={(event) => {
              setFormData((previous) => ({ ...previous, libraryName: event.target.value }));
              setNotice("");
            }}
            className="w-full rounded-md border border-slate-300 bg-slate-50 px-3 py-2 text-sm outline-blue-500"
            placeholder="Library Pro"
          />
          <p className="mt-1 text-xs text-slate-500">This name appears next to the logo in the sidebar.</p>

          <div className="mt-5 grid gap-4 sm:grid-cols-[96px_minmax(0,1fr)]">
            <div
              className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-md border border-slate-200"
              style={{ backgroundColor: formData.themeColor, color: getReadableTextColor(formData.themeColor) }}
            >
              {formData.logoDataUrl ? (
                <img src={formData.logoDataUrl} alt={`${formData.libraryName} logo`} className="h-full w-full object-cover" />
              ) : (
                <Building2 size={34} />
              )}
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="library-logo">
                Library logo
              </label>
              <div className="flex flex-col gap-2 sm:flex-row">
                <label
                  htmlFor="library-logo"
                  className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  <ImageUp size={16} />
                  Upload Logo
                </label>
                <input id="library-logo" type="file" accept="image/*" className="sr-only" onChange={handleLogoUpload} />
                {formData.logoDataUrl && (
                  <button
                    type="button"
                    onClick={handleRemoveLogo}
                    className="inline-flex items-center justify-center gap-2 rounded-md border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-100"
                  >
                    <Trash2 size={16} />
                    Remove
                  </button>
                )}
              </div>
              <p className="mt-1 text-xs text-slate-500">The sidebar theme color is picked from the uploaded logo.</p>
              {uploadError && <p className="mt-2 text-sm font-medium text-red-700">{uploadError}</p>}
              <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">
                <span className="h-4 w-4 rounded-sm border border-slate-200" style={{ backgroundColor: formData.themeColor }} />
                Theme color {formData.themeColor}
              </div>
            </div>
          </div>

          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
            <button
              type="submit"
              disabled={isSavingSettings || isLoadingSettings}
              className="inline-flex items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-semibold shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
              style={{ backgroundColor: formData?.themeColor || "#2563eb", color: getReadableTextColor(formData?.themeColor || "#2563eb") }}
            >
              <Save size={16} />
              {isSavingSettings ? "Saving..." : "Save Settings"}
            </button>
            {notice && (
              <span className={`text-sm font-medium ${notice.startsWith("Error") ? "text-red-700" : "text-emerald-700"}`}>{notice}</span>
            )}
          </div>
        </form>
      ) : null}

      <form onSubmit={handleSaveAdminProfile} className="border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-800">
          <ShieldCheck size={18} style={{ color: formData?.themeColor || "#2563eb" }} />
          Current User
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="admin-name">
              Name
            </label>
            <input
              id="admin-name"
              type="text"
              value={currentUserForm.fullName}
              onChange={(event) => {
                setCurrentUserForm((previous) => ({ ...previous, fullName: event.target.value }));
                setProfileNotice({ tone: "", text: "" });
              }}
              className="w-full rounded-md border border-slate-300 bg-slate-50 px-3 py-2 text-sm outline-blue-500"
              placeholder="Deepak Semwal"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="admin-email">
              Email
            </label>
            <input
              id="admin-email"
              type="email"
              value={currentUserForm.email}
              onChange={(event) => {
                setCurrentUserForm((previous) => ({ ...previous, email: event.target.value }));
                setProfileNotice({ tone: "", text: "" });
              }}
              className="w-full rounded-md border border-slate-300 bg-slate-50 px-3 py-2 text-sm outline-blue-500"
              placeholder="admin@example.com"
            />
          </div>
        </div>
        <div className="mt-3 text-xs font-medium text-slate-500">
          Role: <span className="text-slate-800">{roleLabel(currentUserProfile?.role)}</span>
        </div>

        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
          <button
            type="submit"
            disabled={isSavingProfile}
            className="inline-flex items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-semibold shadow-sm disabled:cursor-not-allowed disabled:opacity-60"
            style={{
              backgroundColor: formData?.themeColor || "#2563eb",
              color: getReadableTextColor(formData?.themeColor || "#2563eb"),
            }}
          >
            <Save size={16} />
            {isSavingProfile ? "Saving..." : "Save User"}
          </button>
          {profileNotice.text && (
            <span
              className={`text-sm font-medium ${profileNotice.tone === "error" ? "text-red-700" : profileNotice.tone === "warning" ? "text-amber-700" : "text-emerald-700"}`}
            >
              {profileNotice.text}
            </span>
          )}
        </div>
      </form>

      <section className="border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-800">
          <Users size={18} style={{ color: formData?.themeColor || "#2563eb" }} />
          Managers and Admins
        </div>
        {currentUserProfile?.role !== "admin" && <p className="mb-3 text-sm text-amber-700">Only admins can add users or change roles.</p>}

        <form onSubmit={handleAddTeamMember} className="grid gap-3 lg:grid-cols-[1fr_1fr_150px_1fr_auto]">
          <input
            type="text"
            value={newUser.fullName}
            disabled={currentUserProfile?.role !== "admin"}
            onChange={(event) => setNewUser((previous) => ({ ...previous, fullName: event.target.value }))}
            className="rounded-md border border-slate-300 bg-slate-50 px-3 py-2 text-sm outline-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
            placeholder="Full name"
          />
          <input
            type="email"
            value={newUser.email}
            disabled={currentUserProfile?.role !== "admin"}
            onChange={(event) => setNewUser((previous) => ({ ...previous, email: event.target.value }))}
            className="rounded-md border border-slate-300 bg-slate-50 px-3 py-2 text-sm outline-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
            placeholder="Email"
          />
          <select
            value={newUser.role}
            disabled={currentUserProfile?.role !== "admin"}
            onChange={(event) => setNewUser((previous) => ({ ...previous, role: event.target.value }))}
            className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {ROLE_OPTIONS.map((role) => (
              <option key={role} value={role}>
                {roleLabel(role)}
              </option>
            ))}
          </select>
          <input
            type="password"
            value={newUser.password}
            disabled={currentUserProfile?.role !== "admin"}
            onChange={(event) => setNewUser((previous) => ({ ...previous, password: event.target.value }))}
            className="rounded-md border border-slate-300 bg-slate-50 px-3 py-2 text-sm outline-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
            placeholder="Temporary password"
          />
          <button
            type="submit"
            disabled={isAddingUser || currentUserProfile?.role !== "admin"}
            className="inline-flex items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-semibold shadow-sm disabled:cursor-not-allowed disabled:opacity-60"
            style={{ backgroundColor: formData.themeColor, color: getReadableTextColor(formData.themeColor) }}
          >
            <UserPlus size={16} />
            {isAddingUser ? "Adding..." : "Add"}
          </button>
        </form>

        {teamNotice.text && (
          <p
            className={`mt-3 text-sm font-medium ${teamNotice.tone === "error" ? "text-red-700" : teamNotice.tone === "warning" ? "text-amber-700" : "text-emerald-700"}`}
          >
            {teamNotice.text}
          </p>
        )}

        <div className="mt-5 divide-y divide-slate-100 border border-slate-200">
          {isLoadingProfiles ? (
            <div className="p-3 text-sm text-slate-500">Loading users...</div>
          ) : teamProfiles.length === 0 ? (
            <div className="p-3 text-sm text-slate-500">No managers or admins found.</div>
          ) : (
            teamProfiles.map((member) => (
              <div
                key={`${member.email}-${member.id}`}
                className="flex flex-col gap-2 p-3 text-sm sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <div className="font-semibold text-slate-900">{member.fullName}</div>
                  <div className="text-slate-500">{member.email}</div>
                </div>
                <select
                  value={member.role}
                  disabled={currentUserProfile?.role !== "admin"}
                  onChange={(event) => handleRoleChange(member.id, event.target.value)}
                  className="w-fit rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-600 disabled:bg-slate-100"
                  aria-label={`Role for ${member.fullName}`}
                >
                  {ROLE_OPTIONS.map((role) => (
                    <option key={role} value={role}>
                      {roleLabel(role)}
                    </option>
                  ))}
                </select>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
};
