function generateOrderId() {
    const prefix = "FBZ";
    const now = Date.now().toString(36).toUpperCase(); 
    const randomPart = Math.random().toString(36).substr(2, 5).toUpperCase();

    return `${prefix}-${now}-${randomPart}`;
}

export default generateOrderId;