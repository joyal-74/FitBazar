function generateOrderId() {
    const prefix = "FZORD";
    const now = Date.now().toString(36).slice(-4).toUpperCase();
    const randomPart = Math.random().toString(36).substr(2, 3).toUpperCase();

    return `${prefix}-${now}${randomPart}`;
}

export default generateOrderId;