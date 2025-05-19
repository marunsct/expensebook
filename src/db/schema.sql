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
    updated_by INT REFERENCES users(id) ON DELETE SET NULL,
    delete_flag BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMP
);

-- Create the groups table
CREATE TABLE IF NOT EXISTS groups (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    currency VARCHAR(10) NOT NULL,
    created_by INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_by INT REFERENCES users(id) ON DELETE SET NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    delete_flag BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMP
);

-- Create a junction table to associate users with groups
CREATE TABLE IF NOT EXISTS group_users (
    id SERIAL PRIMARY KEY,
    group_id INT NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_by INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_by INT REFERENCES users(id) ON DELETE SET NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    delete_flag BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMP
);

-- Create the expenses table
CREATE TABLE IF NOT EXISTS expenses (
    id SERIAL PRIMARY KEY,
    description TEXT NOT NULL,
    currency VARCHAR(10) NOT NULL,
    amount NUMERIC(10, 2) NOT NULL,
    group_id INT REFERENCES groups(id) ON DELETE CASCADE,
    split_method VARCHAR(50) NOT NULL,
    paid_by_user INT NULL REFERENCES users(id) ON DELETE CASCADE,
    image_url TEXT,
    flag BOOLEAN DEFAULT FALSE, -- expense settled flag
    created_by INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_by INT REFERENCES users(id) ON DELETE SET NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    delete_flag BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMP
);

-- Create the expense_users table
CREATE TABLE IF NOT EXISTS expense_users (
    id SERIAL PRIMARY KEY,
    expense_id INT NOT NULL REFERENCES expenses(id) ON DELETE CASCADE,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    paid_to_user INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    share NUMERIC(10, 2) NOT NULL,
    counter NUMERIC(10, 2),
    flag BOOLEAN DEFAULT FALSE, -- expense splits settled flag
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_by INT REFERENCES users(id) ON DELETE SET NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    delete_flag BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMP
);

-- Create a new table for storing multiple images for groups
CREATE TABLE IF NOT EXISTS group_images (
    id SERIAL PRIMARY KEY,
    group_id INT NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    image_url TEXT NOT NULL,
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_by INT REFERENCES users(id) ON DELETE SET NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    delete_flag BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMP
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
    IF NEW.updated_at IS NULL THEN
        NEW.updated_at = CURRENT_TIMESTAMP;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create or replace function to set deleted_at when delete_flag is set
CREATE OR REPLACE FUNCTION set_deleted_at_column()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.delete_flag = TRUE AND (OLD.delete_flag IS DISTINCT FROM TRUE) THEN
        NEW.deleted_at = CURRENT_TIMESTAMP;
    END IF;
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
    IF NOT EXISTS (
        SELECT 1
        FROM pg_trigger
        WHERE tgname = 'set_deleted_at_users'
    ) THEN
        CREATE TRIGGER set_deleted_at_users
        BEFORE UPDATE ON users
        FOR EACH ROW
        EXECUTE FUNCTION set_deleted_at_column();
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
    IF NOT EXISTS (
        SELECT 1
        FROM pg_trigger
        WHERE tgname = 'set_deleted_at_groups'
    ) THEN
        CREATE TRIGGER set_deleted_at_groups
        BEFORE UPDATE ON groups
        FOR EACH ROW
        EXECUTE FUNCTION set_deleted_at_column();
    END IF;
END
$$;

-- Add trigger to the group_users table
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_trigger
        WHERE tgname = 'set_updated_at_group_users'
    ) THEN
        CREATE TRIGGER set_updated_at_group_users
        BEFORE UPDATE ON group_users
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
    END IF;
    IF NOT EXISTS (
        SELECT 1
        FROM pg_trigger
        WHERE tgname = 'set_deleted_at_group_users'
    ) THEN
        CREATE TRIGGER set_deleted_at_group_users
        BEFORE UPDATE ON group_users
        FOR EACH ROW
        EXECUTE FUNCTION set_deleted_at_column();
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
    IF NOT EXISTS (
        SELECT 1
        FROM pg_trigger
        WHERE tgname = 'set_deleted_at_expenses'
    ) THEN
        CREATE TRIGGER set_deleted_at_expenses
        BEFORE UPDATE ON expenses
        FOR EACH ROW
        EXECUTE FUNCTION set_deleted_at_column();
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
    IF NOT EXISTS (
        SELECT 1
        FROM pg_trigger
        WHERE tgname = 'set_deleted_at_expense_users'
    ) THEN
        CREATE TRIGGER set_deleted_at_expense_users
        BEFORE UPDATE ON expense_users
        FOR EACH ROW
        EXECUTE FUNCTION set_deleted_at_column();
    END IF;
END
$$;

-- Add trigger to the group_images table
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_trigger
        WHERE tgname = 'set_updated_at_group_images'
    ) THEN
        CREATE TRIGGER set_updated_at_group_images
        BEFORE UPDATE ON group_images
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
    END IF;
    IF NOT EXISTS (
        SELECT 1
        FROM pg_trigger
        WHERE tgname = 'set_deleted_at_group_images'
    ) THEN
        CREATE TRIGGER set_deleted_at_group_images
        BEFORE UPDATE ON group_images
        FOR EACH ROW
        EXECUTE FUNCTION set_deleted_at_column();
    END IF;
END
$$;

-- Add indexes for performance and query optimization
CREATE INDEX IF NOT EXISTS idx_group_users_group_id ON group_users(group_id);
CREATE INDEX IF NOT EXISTS idx_group_users_user_id ON group_users(user_id);
CREATE INDEX IF NOT EXISTS idx_expenses_group_id ON expenses(group_id);
CREATE INDEX IF NOT EXISTS idx_expense_users_expense_id ON expense_users(expense_id);
CREATE INDEX IF NOT EXISTS idx_expense_users_user_id ON expense_users(user_id);
CREATE INDEX IF NOT EXISTS idx_expense_users_paid_to_user ON expense_users(paid_to_user);
CREATE INDEX IF NOT EXISTS idx_group_images_group_id ON group_images(group_id);

-- Add unique constraint to prevent duplicate splits
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'uq_expense_users_expense_user_paid'
    ) THEN
        ALTER TABLE expense_users
            ADD CONSTRAINT uq_expense_users_expense_user_paid UNIQUE (expense_id, user_id, paid_to_user);
    END IF;
END$$;

-- Add comments for documentation
COMMENT ON COLUMN users.updated_by IS 'User who last updated this record';
COMMENT ON COLUMN users.deleted_at IS 'Timestamp when the user was soft deleted';
COMMENT ON COLUMN groups.updated_by IS 'User who last updated this group';
COMMENT ON COLUMN groups.deleted_at IS 'Timestamp when the group was soft deleted';
COMMENT ON COLUMN group_users.updated_by IS 'User who last updated this group membership';
COMMENT ON COLUMN group_users.deleted_at IS 'Timestamp when the group membership was soft deleted';
COMMENT ON COLUMN expenses.updated_by IS 'User who last updated this expense';
COMMENT ON COLUMN expenses.deleted_at IS 'Timestamp when the expense was soft deleted';
COMMENT ON COLUMN expense_users.updated_by IS 'User who last updated this expense split';
COMMENT ON COLUMN expense_users.deleted_at IS 'Timestamp when the expense split was soft deleted';
COMMENT ON COLUMN group_images.updated_by IS 'User who last updated this group image';
COMMENT ON COLUMN group_images.deleted_at IS 'Timestamp when the group image was soft deleted';

