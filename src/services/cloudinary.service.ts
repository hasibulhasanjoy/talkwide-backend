import { v2 as cloudinary } from "cloudinary";

import AppError from "../utils/appError.class.js";

export const uploadImageToCloudinary = async (
  fileBuffer: Buffer,
  folder: string = "talkwide/posts"
): Promise<{ url: string; publicId: string }> => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: "image",
      },
      (error, result) => {
        if (error || !result) {
          return reject(new AppError("Failed to upload image to cloud storage", 500));
        }
        resolve({
          url: result.secure_url,
          publicId: result.public_id,
        });
      }
    );
    uploadStream.end(fileBuffer);
  });
};

export const deleteImageFromCloudinary = async (publicId: string): Promise<void> => {
  try {
    await cloudinary.uploader.destroy(publicId);
  } catch {
    console.error(`Failed to delete Cloudinary asset: ${publicId}`);
  }
};
