-- -- Drop existing tables if they exist
-- DROP TABLE IF EXISTS expense_users;
-- DROP TABLE IF EXISTS expenses;
-- DROP TABLE IF EXISTS group_users;
-- DROP TABLE IF EXISTS groups;
-- DROP TABLE IF EXISTS users;

-- Create the users table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE,
    phone VARCHAR(15) UNIQUE,
    password VARCHAR(255) NOT NULL,
    name VARCHAR(255),
    gender VARCHAR(10),
    date_of_birth DATE,
    country VARCHAR(100),
    profile_picture TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create the groups table
CREATE TABLE IF NOT EXISTS groups (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    currency VARCHAR(10) NOT NULL,
    created_by INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create a junction table to associate users with groups
CREATE TABLE IF NOT EXISTS group_users (
    id SERIAL PRIMARY KEY,
    group_id INT NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_by INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create the expenses table
CREATE TABLE IF NOT EXISTS expenses (
    id SERIAL PRIMARY KEY,
    description TEXT NOT NULL,
    currency VARCHAR(10) NOT NULL,
    amount NUMERIC(10, 2) NOT NULL,
    group_id INT REFERENCES groups(id) ON DELETE CASCADE,
    split_method VARCHAR(50) NOT NULL,
    paid_by_user INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    image_url TEXT,
    flag BOOLEAN DEFAULT FALSE,
    created_by INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);



-- Create the expense_users table
CREATE TABLE IF NOT EXISTS expense_users (
    id SERIAL PRIMARY KEY,
    expense_id INT NOT NULL REFERENCES expenses(id) ON DELETE CASCADE,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    paid_to_user INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    share NUMERIC(10, 2) NOT NULL,
    flag BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create a new table for storing multiple images for groups
CREATE TABLE IF NOT EXISTS group_images (
    id SERIAL PRIMARY KEY,
    group_id INT NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    image_url TEXT NOT NULL,
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

