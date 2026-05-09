import supabase from "../../../helpers/supabase";

const MEMBER_DOCUMENTS_BUCKET = "member-documents";

const getSafeFileName = (fileName) =>
  fileName
    .toLowerCase()
    .replace(/[^a-z0-9.]+/g, "-")
    .replace(/^-+|-+$/g, "");

export const uploadMemberFile = async (memberId, file, folder) => {
  if (!file) return null;

  const extension = file.name.includes(".") ? file.name.split(".").pop() : "jpg";
  const safeFileName = getSafeFileName(file.name) || `${folder}.${extension}`;
  const filePath = `${memberId}/${folder}/${Date.now()}-${safeFileName}`;

  const { error } = await supabase.storage.from(MEMBER_DOCUMENTS_BUCKET).upload(filePath, file, {
    cacheControl: "3600",
    upsert: false,
  });

  if (error) {
    throw error;
  }

  return filePath;
};

export const getMemberFileSignedUrl = async (path) => {
  if (!path) return "";

  const { data, error } = await supabase.storage.from(MEMBER_DOCUMENTS_BUCKET).createSignedUrl(path, 60 * 60);

  if (error) {
    console.error("Could not create member file URL:", error);
    return "";
  }

  return data.signedUrl;
};
