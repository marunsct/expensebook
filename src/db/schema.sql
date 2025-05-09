-- -- Drop existing tables if they exist
-- DROP TABLE IF EXISTS expense_users;
-- DROP TABLE IF EXISTS group_images;
-- DROP TABLE IF EXISTS tokens;
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
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    username VARCHAR(100) UNIQUE,
    gender VARCHAR(10),
    date_of_birth DATE,
    country VARCHAR(100),
    profile_picture TEXT,
    invited_flag BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    delete_flag BOOLEAN DEFAULT FALSE
);

-- Create the groups table
CREATE TABLE IF NOT EXISTS groups (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    currency VARCHAR(10) NOT NULL,
    created_by INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    delete_flag BOOLEAN DEFAULT FALSE
);

-- Create a junction table to associate users with groups
CREATE TABLE IF NOT EXISTS group_users (
    id SERIAL PRIMARY KEY,
    group_id INT NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_by INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    delete_flag BOOLEAN DEFAULT FALSE
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
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    delete_flag BOOLEAN DEFAULT FALSE
);

-- Create the expense_users table
CREATE TABLE IF NOT EXISTS expense_users (
    id SERIAL PRIMARY KEY,
    expense_id INT NOT NULL REFERENCES expenses(id) ON DELETE CASCADE,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    paid_to_user INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    share NUMERIC(10, 2) NOT NULL,
    flag BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    delete_flag BOOLEAN DEFAULT FALSE
);

-- Create a new table for storing multiple images for groups
CREATE TABLE IF NOT EXISTS group_images (
    id SERIAL PRIMARY KEY,
    group_id INT NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    image_url TEXT NOT NULL,
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    delete_flag BOOLEAN DEFAULT FALSE
);

-- Create a tokens table
CREATE TABLE IF NOT EXISTS tokens (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_logon TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create the api_keys table
CREATE TABLE IF NOT EXISTS api_keys (
    id SERIAL PRIMARY KEY,
    consumer_name VARCHAR(255) NOT NULL,
    api_key TEXT NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create or replace function to update the updated_at column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add trigger to the users table
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_trigger
        WHERE tgname = 'set_updated_at_users'
    ) THEN
        CREATE TRIGGER set_updated_at_users
        BEFORE UPDATE ON users
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
    END IF;
END
$$;

-- Add trigger to the groups table
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_trigger
        WHERE tgname = 'set_updated_at_groups'
    ) THEN
        CREATE TRIGGER set_updated_at_groups
        BEFORE UPDATE ON groups
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
    END IF;
END
$$;

-- Add trigger to the expenses table
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_trigger
        WHERE tgname = 'set_updated_at_expenses'
    ) THEN
        CREATE TRIGGER set_updated_at_expenses
        BEFORE UPDATE ON expenses
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
    END IF;
END
$$;

-- Add trigger to the expense_users table
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_trigger
        WHERE tgname = 'set_updated_at_expense_users'
    ) THEN
        CREATE TRIGGER set_updated_at_expense_users
        BEFORE UPDATE ON expense_users
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
    END IF;
END
$$;

