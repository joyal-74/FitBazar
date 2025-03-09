import User from '../model/userModel.js'
import { OK, NOT_FOUND, INTERNAL_SERVER_ERROR } from '../config/statusCodes.js'



const userInfo = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = 8;
        const skip = (page - 1) * limit;
        const filter = {};

        // Apply filtering based on isBlocked value from the query params
        if (req.query.isBlocked === "true") {
            filter.isBlocked = true;
        } else if (req.query.isBlocked === "false") {
            filter.isBlocked = false;
        }

        // Apply search query (case-insensitive search only on name)
        if (req.query.query) {
            const searchRegex = new RegExp(req.query.query, "i");
            filter.name = searchRegex;  // Search only by name
        }

        // Fetch filtered and searched users
        const customers = await User.find(filter)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        // Get the count of users that match the filter
        const totalCustomers = await User.countDocuments(filter);
        const totalPages = Math.ceil(totalCustomers / limit);

        res.render("admin/customers", {
            title: "Customers",
            errorMessage: "",
            customer: customers,
            currentPage: page,
            totalPages: totalPages,
            totalcustomers: totalCustomers,
            selectedFilter: req.query.isBlocked || "all", // Preserve selected filter
            searchQuery: req.query.query || "", // Preserve search query
        });

    } catch (error) {
        console.error("User info fetch error:", error);
        res.status(INTERNAL_SERVER_ERROR).json({ error: "Internal server error." });
    }
};




const userDeatails = async (req,res)=>{
    const id = req.query.user;

    const customer = await User.findOne({userId : id})
    res.render('admin/viewcustomers', {title : `Customer details`, customer})
}

const toggleBlockStatus = async (req, res) => {
    try {
        const id = req.query.user;
        const { isBlocked } = req.body;

        const customer = await User.findOne({userId : id});
        if (!customer) {
            return res.status(NOT_FOUND).json({ error: "Customer not found" });
        }

        customer.isBlocked = isBlocked;
        await customer.save();

        res.status(OK).json({ message: "Status updated successfully" });
    } catch (error) {
        console.error("Error updating status:", error);
        res.status(INTERNAL_SERVER_ERROR).json({ error: "Internal Server Error" });
    }
};


const filterCustomers = async (req, res) => {
    try {
        const { isBlocked } = req.query;
        let filter = {};

        const page = parseInt(req.query.page) || 1;
        const limit = 8;
        const skip = (page - 1) * limit;

        if (isBlocked === 'true') {
            filter.isBlocked = true;
        } else if (isBlocked === 'false') {
            filter.isBlocked = false;
        }

        const customers = await User.find(filter)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        const totalcustomers = await User.countDocuments(filter);
        const totalPages = Math.ceil(totalcustomers / limit);

        res.render("admin/customers", {
            title: "Customers",
            errorMessage: "",
            customers,
            currentPage: page,
            totalPages: totalPages,
            totalcustomers: totalcustomers,
            selectedFilter: isBlocked !== undefined ? isBlocked : "all",
            searchQuery: "",
        });

    } catch (error) {
        console.error("Filter error:", error);
        res.status(INTERNAL_SERVER_ERROR).json({ error: "Internal server error." });
    }
};


const changeBlockStatus = async (req, res) => {
    try {
        const { userId, isBlocked } = req.body;

        const customer = await User.findOne({ userId });
        if (!customer) {
            return res.status(NOT_FOUND).json({ error: "Customer not found" });
        }

        customer.isBlocked = isBlocked === "true"; // Convert string to boolean
        await customer.save();

        res.redirect(`/admin/viewcustomers?user=${userId}`); // Redirect back to customer page
    } catch (error) {
        console.error("Error updating status:", error);
        res.status(INTERNAL_SERVER_ERROR).send("Internal Server Error"); // Simple error handling
    }
};
    

export default { userInfo, toggleBlockStatus, userDeatails, filterCustomers, changeBlockStatus }