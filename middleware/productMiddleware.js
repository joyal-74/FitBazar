import { v2 as cloudinary } from "cloudinary";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import multer from "multer";


const storage = new CloudinaryStorage({
    cloudinary,
    params: {
        folder: "fitbazar-products",
        format: async () => "png",
        public_id: (req, file) => file.originalname.split(".")[0],
        transformation: [{ width: 500, height: 500, crop: "fill" }]
    }
});

const upload = multer({ storage });

export default upload;
