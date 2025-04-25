// sidebar css

/* Ensure global font consistency */

* {
    font-family: 'Outfit', sans-serif;
}

/* Sidebar Container */
.sidebar-container {
    position: relative;
}

/* Sidebar Styling (from provided CSS, enhanced for responsiveness) */
.sidebar {
    background: #ffffff;
    height: calc(100vh - 70px);
    position: sticky;
    top: 68px;
    border-right: 1px solid #eee;
    padding: 0 25px;
    overflow-y: auto;
    transition: all 0.3s ease-in-out;
}

/* Sidebar Links (from provided CSS) */
.sidebar-link {
    font-size: 16px;
    font-weight: 500;
    padding: 12px 20px;
    border-radius: 8px;
    margin: 5px 10px;
    color: #333;
    transition: all 0.3s ease-in-out;
}

.sidebar-link:hover {
    background-color: #f4eaf6;
    color: #5b3f64 !important;
}

.sidebar-link.active {
    background-color: #5b3f64;
    color: #ffffff !important;
    font-weight: bold;
    box-shadow: 0 2px 10px rgba(45, 106, 79, 0.2);
    border-left: 4px solid #5b3f64;
}

/* Toggle Button Styling */
.sidebar-toggle {
    position: fixed;
    top: 15px;
    left: 15px;
    z-index: 1000;
    background-color: #5b3f64;
    color: #ffffff;
    border: none;
    padding: 10px;
    border-radius: 5px;
    transition: background-color 0.3s ease;
}

.sidebar-toggle:hover {
    background-color: #706677;
}

/* Responsive Sidebar */
@media (max-width: 767.98px) {
    .sidebar {
        position: fixed;
        top: 0;
        left: -100%;
        width: 250px;
        height: 100vh;
        z-index: 999;
        transition: left 0.3s ease-in-out;
    }

    .sidebar.active {
        left: 0;
    }

    /* Overlay when sidebar is open */
    .sidebar-container.active::after {
        content: '';
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.5);
        z-index: 998;
    }
}

/* Adjust layout for larger screens */
@media (min-width: 768px) {
    .sidebar {
        left: 0;
        width: 100%;
    }

    .sidebar-toggle {
        display: none;
    }
}

/* Ensure sidebar links are full-width on mobile */
@media (max-width: 576px) {
    .sidebar-link {
        font-size: 14px;
        padding: 10px 15px;
    }
}