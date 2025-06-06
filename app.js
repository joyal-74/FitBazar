import express from "express";
import path from "path";
import nocache from "nocache";
const app = express()
import session from "express-session";
import { fileURLToPath } from "url";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import passport from './config/passport.js'

import expressLayouts from "express-ejs-layouts";
import db from "./config/db.js";

import dotenv from "dotenv";
dotenv.config();

import userRoutes from './routes/user.js';
import adminRoutes from './routes/admin.js'
import googleRoutes from './routes/googleRoute.js';
import homeRoute from './routes/homeRoute.js'
import paymentRoutes from './routes/paymenRoute.js';

const PORT = process.env.PORT

app.use(nocache());

app.use(session({
        secret: process.env.SESSION_KEY,
        resave: false,
        saveUninitialized: false,
        cookie: {
            maxAge: 1000 * 60 * 60 * 48 // 48 hours
        }
    })
);

app.use(passport.initialize());
app.use(passport.session());

// Set EJS as the view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '/views'));

// Use express-ejs-layouts
app.use(expressLayouts);
app.set('layout', 'layouts/layout')

// Serve static files from the "public" directory
app.use(express.static(path.join(__dirname, 'public')));

app.use(express.json())
app.use(express.urlencoded({extended: true}))

db();

app.use('/user', userRoutes);
app.use('/admin', adminRoutes);
app.use('/auth', googleRoutes);
app.use('/', homeRoute);
app.use('/user/payments', paymentRoutes);

// cannot get page 404 error
app.use((req, res, next) => {
    res.status(404).render("error",{title : "Page not found"});
});

app.listen(PORT,()=> console.log(`server running on ${PORT} 
admin : http://localhost:${PORT}/admin/login
user  : http://localhost:${PORT}/user/login`))