import User from '../model/userModel.js'



const userInfo = async (req,res)=>{

    const customer = await User.find()
    res.render('admin/customers', {title : "Customers", customer})
}


const userDeatails = async (req,res)=>{
    const id = req.query.id;

    const customer = await User.findById(id)
    res.render('admin/viewcustomers', {title : `${customer.name} details`, customer})
}

export const toggleBlockStatus = async (req, res) => {
    try {
        const id = req.query.user;
        const { isBlocked } = req.body;

        const customer = await User.findById(id);
        if (!customer) {
            return res.status(404).json({ error: "Customer not found" });
        }

        customer.isBlocked = isBlocked;
        await customer.save();

        res.status(200).json({ message: "Status updated successfully" });
    } catch (error) {
        console.error("Error updating status:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
};


export default { userInfo, toggleBlockStatus, userDeatails }