import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';

const storage = multer.diskStorage({});


const uploads = multer({
    storage,
}).any();

// Cloudinary Upload Function
const handleUploads = async (req, res, next) => {
    try {
        if (!req.files || req.files.length === 0) {
            return next(); // No files to upload, continue to next middleware
        }

        req.uploadedImages = [];

        for (const file of req.files) {
            const uploadedImage = await cloudinary.uploader.upload(file.path);
            req.uploadedImages.push(uploadedImage.secure_url);
        }

        next(); // Pass control to the next middleware
    } catch (error) {
        console.error('Error uploading images:', error);
        return res.status(500).json({ error: 'Image upload failed' });
    }
};

export { uploads, handleUploads };
