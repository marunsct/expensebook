const bcrypt = require("bcrypt");

class User {
  constructor(id, first_name, last_name, username, email, phone) {
    this.id = id;
    this.first_name = first_name;
    this.last_name = last_name;
    this.email = email;
    this.phone = phone;
    this.username = username;
  }

  static async findById(client, id) {
    const res = await client.query("SELECT * FROM users WHERE id = $1", [id]);
    return res.rows[0]
      ? new User(
          res.rows[0].id,
          res.rows[0].first_name,
          res.rows[0].last_name,
          res.rows[0].email,
          res.rows[0].phone,
          res.rows[0].username
        )
      : null;
  }

  static async create(
    client,
    first_name,
    last_name,
    username,
    email,
    phone,
    hashedPassword
  ) {
    console.log("Creating user:", {
      first_name,
      last_name,
      email,
      phone,
      username,
      hashedPassword,
    });
    // Check if the user already exists based on email or phone
    const existingUserRes = await client.query(
      "SELECT * FROM users WHERE email = $1 OR phone = $2",
      [email, phone]
    );
    if (existingUserRes.rows.length > 0) {
      throw new Error("User already exists with this email or phone number.");
    }
    const res = await client.query(
      "INSERT INTO users (first_name, last_name, username, email, phone, password) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *",
      [
        first_name,
        last_name,
        username,
        email || null,
        phone || null,
        hashedPassword,
      ]
    );
    return new User(
      res.rows[0].id,
      res.rows[0].first_name,
      res.rows[0].last_name,
      res.rows[0].email,
      res.rows[0].phone,
      res.rows[0].username
    );
  }

  static async getUserDetails(client, userId, req) {
    try {
      // Fetch all groups the user is assigned to
      const groupsRes = await client.query(
        `SELECT g.id, g.name, g.currency, g.created_at
         FROM groups g
         INNER JOIN group_users gu ON g.id = gu.group_id
         WHERE gu.user_id = $1 and g.delete_flag = FALSE`,
        [userId]
      );

      const groups = groupsRes.rows;

      // Fetch all group images
      const groupImagesRes = await client.query(
        `SELECT gi.group_id, gi.image_url
         FROM group_images gi
         WHERE gi.group_id IN (
             SELECT g.id
             FROM groups g
             INNER JOIN group_users gu ON g.id = gu.group_id
             WHERE gu.user_id = $1
         )`,
        [userId]
      );

      const groupImages = groupImagesRes.rows;

      // Fetch all expenses the user is involved in
      const expensesRes = await client.query(
        `SELECT e.id, e.description, e.currency, e.amount, e.group_id, e.split_method, e.paid_by_user, e.image_url, e.created_at
         FROM expenses e
         INNER JOIN expense_users eu ON e.id = eu.expense_id
         WHERE eu.user_id = $1`,
        [userId]
      );

      const expenses = expensesRes.rows;

      // Fetch all expense splits for all expenses
      const splitsRes = await client.query(
        `SELECT eu.expense_id, eu.user_id, eu.paid_to_user, eu.share
         FROM expense_users eu
         WHERE eu.expense_id IN (
             SELECT e.id
             FROM expenses e
             INNER JOIN expense_users eu ON e.id = eu.expense_id
             WHERE eu.user_id = $1
         )`,
        [userId]
      );

      const splits = splitsRes.rows;

      // Organize expenses into groups and non-grouped expenses
      const groupExpense = groups.map((group) => {
        const groupExpenses = expenses
          .filter((expense) => expense.group_id === group.id)
          .map((expense) => ({
            ...expense,
            expense_split: splits.filter(
              (split) => split.expense_id === expense.id
            ),
          }));

        const images = groupImages
          .filter((image) => image.group_id === group.id)
          .map((image) => image.image_url);

        return {
          group: {
            ...group,
            images,
            expenses: groupExpenses,
          },
        };
      });

      const nonGroupExpense = expenses
        .filter((expense) => expense.group_id === null)
        .map((expense) => ({
          ...expense,
          expense_split: splits.filter(
            (split) => split.expense_id === expense.id
          ),
        }));

      return {
        groupExpense,
        nonGroupExpense,
      };
    } catch (error) {
      console.error("Error fetching user details:", error);
      throw new Error(req.__("errors.fetch_user_details"));
    }
  }

  static async getUserBalances(client, userId, req) {
    try {
      // Query to calculate how much the user owes to others, grouped by currency
      const owesRes = await client.query(
        `SELECT eu.paid_to_user AS user_id, e.currency, SUM(eu.share) AS total
         FROM expense_users eu
         INNER JOIN expenses e ON eu.expense_id = e.id
         WHERE eu.user_id = $1 AND e.flag = FALSE AND eu.flag = FALSE
         GROUP BY eu.paid_to_user, e.currency`,
        [userId]
      );

      const owes = owesRes.rows;

      // Query to calculate how much others owe to the user, grouped by currency
      const owedRes = await client.query(
        `SELECT eu.user_id AS user_id, e.currency, SUM(eu.share) AS total
         FROM expense_users eu
         INNER JOIN expenses e ON eu.expense_id = e.id
         WHERE eu.paid_to_user = $1 AND e.flag = FALSE AND eu.flag = FALSE
         GROUP BY eu.user_id, e.currency`,
        [userId]
      );

      const owed = owedRes.rows;

      // Combine the results to calculate the net balance by currency
      const balances = {};

      // Process amounts the user owes to others
      owes.forEach((row) => {
        const key = `${row.user_id}-${row.currency}`;
        if (!balances[key]) {
          balances[key] = {
            user_id: row.user_id,
            currency: row.currency,
            balance: 0,
          };
        }
        balances[key].balance -= parseFloat(row.total);
      });

      // Process amounts others owe to the user
      owed.forEach((row) => {
        const key = `${row.user_id}-${row.currency}`;
        if (!balances[key]) {
          balances[key] = {
            user_id: row.user_id,
            currency: row.currency,
            balance: 0,
          };
        }
        balances[key].balance += parseFloat(row.total);
      });

      // Format the result
      const result = Object.values(balances).filter(
        (entry) => entry.balance !== 0
      );

      return result;
    } catch (error) {
      console.error("Error fetching user balances:", error);
      throw new Error(req.__("errors.fetch_user_balances"));
    }
  }

  static async updateDetails(client, userId, updates) {
    const allowedFields = [
      "first_name",
      "last_name",
      "username",
      "gender",
      "date_of_birth",
      "country",
      "profile_picture",
    ];
    const fieldsToUpdate = Object.keys(updates).filter((field) =>
      allowedFields.includes(field)
    );

    if (fieldsToUpdate.length === 0) {
      throw new Error("No valid fields to update.");
    }

    const setClause = fieldsToUpdate
      .map((field, index) => `${field} = $${index + 2}`)
      .join(", ");
    const values = [userId, ...fieldsToUpdate.map((field) => updates[field])];

    const query = `UPDATE users SET ${setClause} WHERE id = $1 RETURNING id, first_name, last_name, username, gender, date_of_birth, country, profile_picture`;
    const res = await client.query(query, values);

    if (res.rows.length === 0) {
      throw new Error("User not found.");
    }

    return res.rows[0];
  }

  static async changePassword(client, userId, currentPassword, newPassword) {
    // Fetch the user's current password hash
    const res = await client.query("SELECT password FROM users WHERE id = $1", [
      userId,
    ]);
    if (res.rows.length === 0) {
      throw new Error("User not found.");
    }

    const hashedPassword = res.rows[0].password;

    // Validate the current password
    const isPasswordValid = await bcrypt.compare(
      currentPassword,
      hashedPassword
    );
    if (!isPasswordValid) {
      throw new Error("Current password is incorrect.");
    }

    // Ensure the new password is not the same as the current password
    const isSamePassword = await bcrypt.compare(newPassword, hashedPassword);
    if (isSamePassword) {
      throw new Error(
        "New password cannot be the same as the current password."
      );
    }

    // Hash the new password
    const newHashedPassword = await bcrypt.hash(newPassword, 10);

    // Update the password in the database
    await client.query("UPDATE users SET password = $1 WHERE id = $2", [
      newHashedPassword,
      userId,
    ]);

    return { message: "Password updated successfully." };
  }

  // Create an invited user
  static async createInvitedUser(client, email, hashedPassword) {
    const res = await client.query(
      `INSERT INTO users (email, password, invited_flag)
         VALUES ($1, $2, TRUE)
         ON CONFLICT (email) DO NOTHING
         RETURNING id, email, invited_flag`,
      [email, hashedPassword]
    );

    if (res.rows.length === 0) {
      const existingUser = await client.query(
        `SELECT id, email, invited_flag FROM users WHERE email = $1`,
        [email]
      );
    
      // Update the password in the database
      await client.query(
        "UPDATE users SET password = $1, delete_flag = $3 WHERE id = $2",
        [hashedPassword, existingUser.rows[0].id, false]
      );
      return existingUser.rows[0];
    }

    return res.rows[0];
  }

  // Update the invited user's status upon signup
  static async updateInvitedUserToRegular(client, email, updates) {
    const allowedFields = [
      "first_name",
      "last_name",
      "username",
      "phone",
      "password",
      "gender",
      "date_of_birth",
      "country",
      "profile_picture",
    ];
    const fieldsToUpdate = Object.keys(updates).filter((field) =>
      allowedFields.includes(field)
    );

    if (fieldsToUpdate.length === 0) {
      throw new Error("No valid fields to update.");
    }

    const setClause = fieldsToUpdate
      .map((field, index) => `${field} = $${index + 2}`)
      .join(", ");
    const values = [email, ...fieldsToUpdate.map((field) => updates[field])];

    const query = `
      UPDATE users
      SET ${setClause}, invited_flag = FALSE
      WHERE email = $1 AND invited_flag = TRUE
      RETURNING id, first_name, last_name, username, email, phone, gender, date_of_birth, country, profile_picture
    `;
    const res = await client.query(query, values);

    if (res.rows.length === 0) {
      throw new Error("Invited user not found or already signed up.");
    }

    return res.rows[0];
  }

  // Check if the user owes anyone
  static async hasOpenExpenses(client, userId) {
    const res = await client.query(
      `SELECT SUM(eu.share) AS total_owed
         FROM expense_users eu
         WHERE eu.user_id = $1 AND eu.flag = FALSE`,
      [userId]
    );

    return parseFloat(res.rows[0].total_owed) > 0; // Return true if the user owes money
  }

  // Mark the user as deleted
  static async closeAccount(client, userId) {
    const res = await client.query(
      `UPDATE users
         SET delete_flag = TRUE
         WHERE id = $1
         RETURNING id, email, delete_flag`,
      [userId]
    );

    if (res.rows.length === 0) {
      throw new Error("User not found.");
    }

    return res.rows[0];
  }
}

module.exports = {
  User,
};
