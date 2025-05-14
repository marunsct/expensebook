class Group {
  constructor(id, name, currency, created_by) {
    this.id = id;
    this.name = name;
    this.currency = currency;
    this.created_by = created_by;
  }

  static async create(client, name, currency, created_by) {
    const res = await client.query(
      "INSERT INTO groups (name, currency, created_by) VALUES ($1, $2, $3) RETURNING *",
      [name, currency, created_by]
    );
    return new Group(
      res.rows[0].id,
      res.rows[0].name,
      res.rows[0].currency,
      res.rows[0].created_by
    );
  }

  static async addUser(client, groupId, userId, created_by) {
    // Check if the user is marked as deleted
    const userRes = await client.query(
      "SELECT delete_flag FROM users WHERE id = $1",
      [userId]
    );
    if (userRes.rows.length === 0 || userRes.rows[0].delete_flag) {
      throw new Error("Cannot add a deleted user to a group.");
    }

    await client.query(
      "INSERT INTO group_users (group_id, user_id, created_by) VALUES ($1, $2, $3)",
      [groupId, userId, created_by]
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
  static async deleteUserFromGroup(client, groupId, userId) {
    await client.query(
      `UPDATE group_users
             SET delete_flag = TRUE
             WHERE group_id = $1 AND user_id = $2`,
      [groupId, userId]
    );
  }

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
}
module.exports = {
  Group,
};
