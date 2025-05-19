const { pool } = require('./index'); // Adjust the path to your db connection file
const bcrypt = require('bcrypt');
require('dotenv').config();

const seedLargeDataset = async () => {
    if (process.env.NODE_ENV !== 'development') {
        console.log('Skipping test data generation. NODE_ENV is not set to development.');
        return;
    }

    console.log('Seeding database with a large dataset for extended testing...');

    try {
        // Hash the password for all users
        const hashedPassword = await bcrypt.hash('12345', 10);

        // Insert 100 users
        console.log('Inserting users...');
        const userPromises = [];
        for (let i = 1; i <= 100; i++) {
            userPromises.push(
                pool.query(
                    `INSERT INTO users (first_name, last_name, username, email, phone, password, gender, date_of_birth, country, profile_picture)
                     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
                    [
                        `FirstName${i}`,
                        `LastName${i}`,
                        `username${i}`,
                        `user${i}@example.com`,
                        `123456789${i}`,
                        hashedPassword,
                        i % 2 === 0 ? 'Male' : 'Female',
                        `199${i % 10}-01-01`,
                        i % 2 === 0 ? 'USA' : 'Canada',
                        `http://example.com/profile${i}.jpg`,
                    ]
                )
            );
        }
        await Promise.all(userPromises);

        // Insert 10 groups
        console.log('Inserting groups...');
        const groupPromises = [];
        for (let i = 1; i <= 10; i++) {
            groupPromises.push(
                pool.query(
                    `INSERT INTO groups (name, currency, created_by)
                     VALUES ($1, $2, $3)`,
                    [`Group${i}`, i % 2 === 0 ? 'USD' : 'CAD', i]
                )
            );
        }
        await Promise.all(groupPromises);

        // Insert group users
        console.log('Inserting group users...');
        const groupUserPromises = [];
        for (let groupId = 1; groupId <= 10; groupId++) {
            for (let userId = 1; userId <= 10; userId++) {
                groupUserPromises.push(
                    pool.query(
                        `INSERT INTO group_users (group_id, user_id, created_by)
                         VALUES ($1, $2, $3)`,
                        [groupId, userId, groupId]
                    )
                );
            }
        }
        await Promise.all(groupUserPromises);

        // Insert group expenses
        console.log('Inserting group expenses...');
        const groupExpensePromises = [];
        for (let groupId = 1; groupId <= 10; groupId++) {
            for (let expenseId = 1; expenseId <= 5; expenseId++) {
                groupExpensePromises.push(
                    pool.query(
                        `INSERT INTO expenses (description, currency, amount, group_id, split_method, paid_by_user, image_url, created_by)
                         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
                        [
                            `Group Expense ${expenseId} for Group ${groupId}`,
                            groupId % 2 === 0 ? 'USD' : 'CAD',
                            (expenseId + groupId) * 10,
                            groupId,
                            'equal',
                            groupId,
                            `http://example.com/expense${expenseId}_group${groupId}.jpg`,
                            groupId,
                        ]
                    )
                );
            }
        }
        await Promise.all(groupExpensePromises);

        // Insert expense splits
        console.log('Inserting expense splits...');
        const expenseSplitPromises = [];
        for (let expenseId = 1; expenseId <= 50; expenseId++) {
            // Determine split_method for this expense
            // For demo: alternate between 'equal', 'parts', 'percentage', 'custom'
            let splitMethod;
            if (expenseId % 4 === 1) splitMethod = 'equal';
            else if (expenseId % 4 === 2) splitMethod = 'parts';
            else if (expenseId % 4 === 3) splitMethod = 'percentage';
            else splitMethod = 'custom';

            for (let userId = 1; userId <= 5; userId++) {
                let counter = 0;
                if (splitMethod === 'parts') {
                    counter = userId; // e.g., user 1 gets 1 part, user 2 gets 2 parts, etc.
                } else if (splitMethod === 'percentage') {
                    counter = 20; // 5 users, each gets 20%
                }
                // For 'equal' and 'custom', counter remains 0

                expenseSplitPromises.push(
                    pool.query(
                        `INSERT INTO expense_users (expense_id, user_id, paid_to_user, share, counter)
                         VALUES ($1, $2, $3, $4, $5)`,
                        [expenseId, userId, (expenseId % 5) + 1, 10.0, counter]
                    )
                );
            }
        }
        await Promise.all(expenseSplitPromises);

        // Insert group images
        console.log('Inserting group images...');
        const groupImagePromises = [];
        for (let groupId = 1; groupId <= 10; groupId++) {
            for (let imageId = 1; imageId <= 3; imageId++) {
                groupImagePromises.push(
                    pool.query(
                        `INSERT INTO group_images (group_id, image_url)
                         VALUES ($1, $2)`,
                        [groupId, `http://example.com/group${groupId}_image${imageId}.jpg`]
                    )
                );
            }
        }
        await Promise.all(groupImagePromises);

        console.log('Large dataset seeded successfully!');
    } catch (error) {
        console.error('Error seeding large dataset:', error);
    } finally {
        pool.end(); // Close the database connection
    }
};

module.exports = { seedLargeDataset };