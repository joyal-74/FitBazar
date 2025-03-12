import { v2 as cloudinary } from "cloudinary";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import multer from "multer";


const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
      folder: "fitbazar_products",
      allowed_formats: ["jpg", "png", "jpeg", "webp"],
      // transformation: [{ width: 500, height: 500, crop: "limit" }],
    },
});


const upload = multer({ storage });

export default upload;
