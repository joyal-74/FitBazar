import { v2 as cloudinary } from "cloudinary";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import multer from "multer";
import path from "path";


const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: "fitbazar_products",
        allowed_formats: ["jpg", "png", "jpeg", "webp"],
        // transformation: [{ width: 500, height: 500, crop: "limit" }],
    },
});

const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        const filetypes = /jpeg|jpg|png|webp/;
        const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = filetypes.test(file.mimetype);
        if (extname && mimetype) {
            cb(null, true);
        } else {
            cb(new Error('Only JPEG, JPG, PNG, and WEBP images are allowed'));
        }
    }
});

export default upload;