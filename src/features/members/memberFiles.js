import supabase from "../../../helpers/supabase";

const MEMBER_DOCUMENTS_BUCKET = "member-documents";
const MAX_LOSSLESS_IMAGE_PIXELS = 24_000_000;

const getSafeFileName = (fileName) =>
  fileName
    .toLowerCase()
    .replace(/[^a-z0-9.]+/g, "-")
    .replace(/^-+|-+$/g, "");

const getFileExtension = (fileName, fallback = "jpg") => (fileName.includes(".") ? fileName.split(".").pop() : fallback);

const getFileNameWithoutExtension = (fileName) => fileName.replace(/\.[^.]+$/, "");

const createImageBitmapFromFile = async (file) => {
  if (typeof createImageBitmap === "function") {
    return createImageBitmap(file);
  }

  return new Promise((resolve, reject) => {
    const image = new Image();
    const objectUrl = URL.createObjectURL(file);

    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(image);
    };

    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Could not decode image."));
    };

    image.src = objectUrl;
  });
};

const compressImageLosslessly = async (file) => {
  if (!file?.type?.startsWith("image/") || file.type === "image/svg+xml") {
    return file;
  }

  try {
    const image = await createImageBitmapFromFile(file);
    const width = image.width || image.naturalWidth;
    const height = image.height || image.naturalHeight;

    if (!width || !height || width * height > MAX_LOSSLESS_IMAGE_PIXELS) {
      image.close?.();
      return file;
    }

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d", { alpha: true });

    if (!context) {
      image.close?.();
      return file;
    }

    context.drawImage(image, 0, 0);
    image.close?.();

    const compressedBlob = await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));

    if (!compressedBlob || compressedBlob.size >= file.size) {
      return file;
    }

    const safeBaseName = getSafeFileName(getFileNameWithoutExtension(file.name)) || "member-image";

    return new File([compressedBlob], `${safeBaseName}.png`, {
      type: "image/png",
      lastModified: file.lastModified || Date.now(),
    });
  } catch (error) {
    console.warn("Using original image because lossless compression failed:", error);
    return file;
  }
};

export const uploadMemberFile = async (memberId, file, folder) => {
  if (!file) return null;

  const uploadFile = await compressImageLosslessly(file);
  const extension = getFileExtension(uploadFile.name);
  const safeFileName = getSafeFileName(uploadFile.name) || `${folder}.${extension}`;
  const filePath = `${memberId}/${folder}/${Date.now()}-${safeFileName}`;

  const { error } = await supabase.storage.from(MEMBER_DOCUMENTS_BUCKET).upload(filePath, uploadFile, {
    cacheControl: "3600",
    contentType: uploadFile.type || file.type || "application/octet-stream",
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
