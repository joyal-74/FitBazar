import cloudinary from "../config/cloudinary.js";

const uploadImages = async (files) => {
    const uploadPromises = files.map((file) =>
      cloudinary.uploader.upload(file.path)
    );
    const results = await Promise.all(uploadPromises);
    return results.map((result) => result.secure_url);
  };

export default {uploadImages};