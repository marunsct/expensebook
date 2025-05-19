const { Expense } = require("../models/Expenses");
class Group {
  constructor(id, name, currency, created_by) {
    this.id = id;
    this.name = name;
    this.currency = currency;
    this.created_by = created_by;
  }

  static async create(client, name, currency, created_by, updated_by = null) {
    const res = await client.query(
      "INSERT INTO groups (name, currency, created_by, created_at, updated_at, updated_by, delete_flag, deleted_at) VALUES ($1, $2, $3, DEFAULT, DEFAULT, $4, DEFAULT, DEFAULT) RETURNING *",
      [name, currency, created_by, updated_by]
    );
    return new Group(
      res.rows[0].id,
      res.rows[0].name,
      res.rows[0].currency,
      res.rows[0].created_by
    );
  }

  static async addUser(client, groupId, userId, created_by, updated_by = null) {
    // Check if the user is marked as deleted
    const userRes = await client.query(
      "SELECT delete_flag FROM users WHERE id = $1",
      [userId]
    );
    if (userRes.rows.length === 0 || userRes.rows[0].delete_flag) {
      throw new Error("Cannot add a deleted user to a group.");
    }

    await client.query(
      "INSERT INTO group_users (group_id, user_id, created_by, joined_at, updated_at, updated_by, delete_flag, deleted_at) VALUES ($1, $2, $3, DEFAULT, DEFAULT, $4, DEFAULT, DEFAULT)",
      [groupId, userId, created_by, updated_by]
    );
  }

  // Check if the user has open expenses in the group
  static async hasOpenExpenses(client, groupId, userId) {
    const res = await client.query(
      `SELECT e.id
             FROM expenses e
             INNER JOIN expense_users eu ON e.id = eu.expense_id
             WHERE e.group_id = $1 AND eu.user_id = $2 AND e.flag = FALSE AND e.delete_flag = FALSE`,
      [groupId, userId]
    );
    return res.rows.length > 0; // Return true if there are open expenses
  }

  // Mark the user as deleted in the group_users table
  static async deleteUserFromGroup(client, groupId, userId, updated_by = null) {
    let query = `UPDATE group_users SET delete_flag = TRUE, deleted_at = CURRENT_TIMESTAMP`;
    const values = [groupId, userId];
    if (updated_by !== null) {
      query += `, updated_by = $3`;
      values.push(updated_by);
    }
    query += ` WHERE group_id = $1 AND user_id = $2`;
    await client.query(query, values);
  }
  /*
  static async getUserGroups(client, userId) {
    const groupsRes = await client.query(
      `SELECT g.id, g.name, g.currency, gi.image_url, g.created_by
         FROM groups g
         INNER JOIN group_users gu ON g.id = gu.group_id
         LEFT JOIN group_images gi ON g.id = gi.group_id AND gi.delete_flag = FALSE
         WHERE gu.user_id = $1 AND g.delete_flag = FALSE`,
      [userId]
    );

    const groups = groupsRes.rows;

    const result = [];

    for (const group of groups) {
      const groupData = { ...group };

      // Get group members
      const membersRes = await client.query(
        `SELECT u.id, u.first_name
             FROM users u
             INNER JOIN group_users gu ON u.id = gu.user_id
             WHERE gu.group_id = $1 AND u.delete_flag = FALSE`,
        [group.id]
      );
      groupData.members = membersRes.rows;

      // Get group expenses
      const expensesRes = await client.query(
        `SELECT e.id, e.description, e.currency, e.amount, e.split_method, e.paid_by_user, e.image_url, e.created_by
             FROM expenses e
             WHERE e.group_id = $1 AND e.delete_flag = FALSE and e.flag = FALSE`,
        [group.id]
      );
      const expenses = expensesRes.rows;
      const expResult = [];
      for (const expense of expenses) {
        const expenseData = { ...expense };

        // Get expense splits
        const splitsRes = await client.query(
          `SELECT eu.user_id, eu.paid_to_user, eu.share
                 FROM expense_users eu
                 WHERE eu.expense_id = $1 AND eu.flag = FALSE AND eu.user_id != eu.paid_to_user`,
          [expense.id]
        );

        expenseData.splits = splitsRes.rows;
        expResult.push(expenseData);
      }

      groupData.Expenses = expResult;
      result.push({ Groups: groupData });
    }

    return result;
  }
  */
  static async getUserGroups(client, userId) {
    const groupsRes = await client.query(
      `SELECT 
      g.id, 
      g.name, 
      g.currency, 
      gi.image_url, 
      g.created_by,
      json_agg(
        json_build_object(
          'id', gu.id,
          'group_id', gu.group_id,
          'first_name', u.first_name,
          'last_name', u.last_name,
          'username', u.username,
          'created_by', gu.created_by,
          'joined_at', gu.joined_at
        )
      ) AS members
    FROM groups g
    LEFT JOIN group_images gi ON g.id = gi.group_id AND gi.delete_flag = FALSE
    INNER JOIN group_users gu ON g.id = gu.group_id AND gu.delete_flag = FALSE
    INNER JOIN users u ON u.id = gu.user_id AND u.delete_flag = FALSE
    WHERE g.delete_flag = FALSE
      AND EXISTS (
        SELECT 1 FROM group_users gu2
        WHERE gu2.group_id = g.id AND gu2.user_id = $1 AND gu2.delete_flag = FALSE
      )
    GROUP BY g.id, g.name, g.currency, gi.image_url, g.created_by`,
      [userId]
    );
    const groups = groupsRes.rows;
    const allGroups = Array.from( new Set(groups.map(group => group.id)));
    const groupExpenses = await Expense.getExpensesByGroups(client, allGroups);

    const result = groups.map(group => ({ ...group, Expenses: groupExpenses[group.id] }));

    return result;
  }
}
module.exports = {
  Group,
};
