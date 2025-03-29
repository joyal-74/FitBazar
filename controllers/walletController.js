import User from "../model/userModel.js"

const loadWallet = async(req, res) =>{
    try {
        const userId = req.session.user._id

        const user = await User.findOne({_id : userId})

        const [firstName] = user.name.split(" ");

        res.render('user/wallet', {title : 'Wallet page', user, firstName})
    } catch (error) {
        
    }
}

export default {loadWallet}