const { pool } = require('./index'); // Adjust the path to your db connection file
const bcrypt = require('bcrypt');
require('dotenv').config();

const seedDatabase = async () => {
    if (process.env.NODE_ENV !== 'development') {
        console.log('Skipping test data generation. NODE_ENV is not set to development.');
        return;
    }

    console.log('Seeding database with test data...');

    try {
        // Hash passwords for test users
        const hashedPassword1 = await bcrypt.hash('password123', 10);
        const hashedPassword2 = await bcrypt.hash('password456', 10);
        const hashedPassword3 = await bcrypt.hash('password789', 10);

        // Insert test users
        await pool.query(`
            INSERT INTO users (first_name, last_name, username, email, phone, password, gender, date_of_birth, country, profile_picture)
            VALUES
            ('John', 'Doe', 'johndoe', 'john.doe@example.com', '1234567890', $1, 'Male', '1990-01-01', 'USA', 'http://example.com/john.jpg'),
            ('Jane', 'Smith', 'janesmith', 'jane.smith@example.com', '0987654321', $2, 'Female', '1992-05-15', 'Canada', 'http://example.com/jane.jpg'),
            ('Alice', 'Brown', 'alicebrown', 'alice.brown@example.com', '1122334455', $3, 'Female', '1988-03-22', 'UK', 'http://example.com/alice.jpg');
        `, [hashedPassword1, hashedPassword2, hashedPassword3]);

        // Insert test groups
        await pool.query(`
            INSERT INTO groups (name, currency, created_by)
            VALUES
            ('Friends Group', 'USD', 1),
            ('Work Group', 'CAD', 2),
            ('Family Group', 'GBP', 3);
        `);

        // Insert test group users
        await pool.query(`
            INSERT INTO group_users (group_id, user_id, created_by)
            VALUES
            (1, 1, 1), -- John in Friends Group
            (1, 2, 1), -- Jane in Friends Group
            (2, 2, 2), -- Jane in Work Group
            (2, 3, 2), -- Alice in Work Group
            (3, 1, 3), -- John in Family Group
            (3, 3, 3); -- Alice in Family Group
        `);

        // Insert test expenses
        await pool.query(`
            INSERT INTO expenses (description, currency, amount, group_id, split_method, paid_by_user, image_url, created_by)
            VALUES
            ('Dinner at Restaurant', 'USD', 100.00, 1, 'equal', 1, 'http://example.com/receipt1.jpg', 1),
            ('Office Supplies', 'CAD', 50.00, 2, 'equal', 2, 'http://example.com/receipt2.jpg', 2),
            ('Family Vacation', 'GBP', 500.00, 3, 'equal', 3, 'http://example.com/receipt3.jpg', 3);
        `);

        // Insert test expense splits
        await pool.query(`
            INSERT INTO expense_users (expense_id, user_id, paid_to_user, share)
            VALUES
            (1, 1, 1, 50.00), -- John paid for himself
            (1, 2, 1, 50.00), -- Jane owes John
            (2, 2, 2, 25.00), -- Jane paid for herself
            (2, 3, 2, 25.00), -- Alice owes Jane
            (3, 3, 3, 250.00), -- Alice paid for herself
            (3, 1, 3, 250.00); -- John owes Alice
        `);

        // Insert test group images
        await pool.query(`
            INSERT INTO group_images (group_id, image_url)
            VALUES
            (1, 'http://example.com/friends_group1.jpg'),
            (1, 'http://example.com/friends_group2.jpg'),
            (2, 'http://example.com/work_group1.jpg'),
            (3, 'http://example.com/family_group1.jpg');
        `);

        console.log('Database seeded successfully!');
    } catch (error) {
        console.error('Error seeding database:', error);
    } finally {
        pool.end(); // Close the database connection
    }
};

module.exports = {seedDatabase};