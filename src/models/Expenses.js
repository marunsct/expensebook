const e = require("express");

class Expense {
  constructor(
    id,
    description,
    currency,
    amount,
    group_id,
    split_method,
    paid_by_user,
    image,
    created_by,
    splits
  ) {
    this.id = id;
    this.description = description;
    this.currency = currency;
    this.amount = amount;
    this.group_id = group_id;
    this.split_method = split_method;
    this.paid_by_user = paid_by_user;
    this.image = image;
    this.created_by = created_by;
    this.splits = splits;
  }

  static roundToTwoDecimals(num) {
    return Math.round((num + Number.EPSILON) * 100) / 100;
  }
/**
 * Creates a new expense with specified splits and contributors
 * @param {Object} client - Database client
 * @param {string} description - Expense description
 * @param {string} currency - Currency code
 * @param {number} amount - Total expense amount
 * @param {number} group_id - Group ID
 * @param {string} split_method - One of: 'equal', 'parts', 'percentage', 'custom'
 * @param {Array<{userId: number, amount: number}>} contributors - Array of contributors
 * @param {string} [image] - Optional image URL
 * @param {number} created_by - User ID of creator
 * @param {Array<{userId: number, amount?: number, percentage?: number, counter?: number}>} splits - Split definitions
 * @returns {Promise<Object>} Created expense with splits
 * @throws {Error} If validation fails or database operation fails
 */
  static async create(
    client,
    description,
    currency,
    amount,
    group_id,
    split_method,
    contributors,
    image,
    created_by,
    splits
  ) {
    if (!amount || amount <= 0) {
      throw new Error('Invalid amount: must be greater than 0');
    }
    if (!Array.isArray(contributors) || contributors.length === 0) {
      throw new Error('At least one contributor is required');
    }
    if (!Array.isArray(splits)) {
      throw new Error('Splits must be an array');
    }

    // Handle negative amounts in splits
    if (splits.some(s => Number(s.amount) < 0)) {
      throw new Error('Negative amounts in splits are not allowed');
    }

    // Handle duplicate user IDs
    const allUserIds = Array.from(
      new Set([
        ...contributors.map(c => c.userId),
        ...splits.map(s => s.userId)
      ])
    );
    console.log("All users involved:", allUserIds);
    const uniqueUserIds = new Set(allUserIds);
    if (uniqueUserIds.size !== allUserIds.length) {
      throw new Error('Duplicate user IDs found in contributors or splits');
    }

    let calContributors = [...contributors];
    let totalParts = 0;
    let totalPercentage = 0;
    // Step 2: Calculate each user's share based on split method
    let userShares = {};
    if (split_method === 'equal') {
      // For equal split, calculate share per user
      const totalAmountOwed = splits.reduce((sum, s) => sum + Number(s.amount || 0), 0);
      if (totalAmountOwed === amount) {
        const sharePerUser = amount / splits.length;
        splits.forEach(s => {
          userShares[s.userId] = sharePerUser;
        });
        contributors.forEach(c => {
          if (!(c.userId in userShares)) userShares[c.userId] = 0;
        });
      } else {
        const sharePerUser = amount / allUserIds.length;
        allUserIds.forEach(userId => {
          userShares[userId] = sharePerUser;
        });
      }

    } else if (split_method === 'parts') {
      const totalAmountOwed = splits.reduce((sum, s) => sum + Number(s.amount || 0), 0);
      if (totalAmountOwed === amount) {
        totalParts = splits.reduce((sum, s) => sum + Number(s.counter || 0), 0);
        splits.forEach(s => {
          userShares[s.userId] = (Number(s.counter || 0) / totalParts) * amount;
        });
        contributors.forEach(c => {
          if (!(c.userId in userShares)) userShares[c.userId] = 0;
        });
      } else {
        let partialParts = splits.reduce((sum, s) => sum + Number(s.counter || 0), 0);
        totalParts = partialParts * (amount / totalAmountOwed);
        splits.forEach(s => {
          userShares[s.userId] = (Number(s.counter || 0) / totalParts) * amount;
        });
        // in this scenario only one contributor is present without entry in splits
        contributors.forEach(c => {
          if (!(c.userId in userShares)) userShares[c.userId] = ((totalParts - partialParts) * amount) / totalParts ;
        });
      }
      
    } else if (split_method === 'percentage') { 
      totalPercentage = splits.reduce((sum, s) => sum + Number(s.counter || 0), 0);
      splits.forEach(s => {
        userShares[s.userId] = this.roundToTwoDecimals((Number(s.counter || 0) / 100) * amount);
      });
      if (totalPercentage === 100) {
        contributors.forEach(c => {
          if (!(c.userId in userShares)) userShares[c.userId] = 0;
        });
      } else {
        contributors.forEach(c => {
          // in this scenario only one contributor is present without entry in splits
          if (!(c.userId in userShares)) userShares[c.userId] = ((100 - totalPercentage) * amount) / 100;
        });
      }

      // Validate percentage totals
      if (totalPercentage > 100) {
        throw new Error('Total percentage cannot exceed 100%');
      }

    } else if (split_method === 'custom') {
      const totalAmountOwed = splits.reduce((sum, s) => sum + Number(s.amount || 0), 0);
      if (totalAmountOwed === amount) {
        splits.forEach(s => {
          userShares[s.userId] = Number(s.amount);
        });
        contributors.forEach(c => {
          if (!(c.userId in userShares)) userShares[c.userId] = 0;
        });
      } else {
        splits.forEach(s => {
          userShares[s.userId] = (Number(s.percentage || 0) / 100) * amount;
        });
        contributors.forEach(c => {
          if (!(c.userId in userShares)) userShares[c.userId] = amount - totalAmountOwed;
        });
      }
    }
    console.log("User shares:", userShares);

    // Add structured logging
    const logger = {
      debug: (message, data) => console.log(`[DEBUG] ${message}`, JSON.stringify(data, null, 2)),
      error: (message, error) => console.error(`[ERROR] ${message}`, error)
    };

    // Use in code
    logger.debug('User shares calculated', { userShares, split_method });

    // Step 3: Create expense entries
    let expenseEntries = [];
    
    // 3a. Create entries for contributors based on their actual contribution
    const contributorMap = new Map(contributors.map(c => [c.userId, c]));
    const splitMap = new Map(splits.map(s => [s.userId, s]));

    contributors.forEach(contributor => {
      const userId = contributor.userId;
      const paidAmount = Number(contributor.amount);
      const share = userShares[userId] || 0;
      if (paidAmount > share) {
        expenseEntries.push({
          userId: userId,
          paidToUser: userId,
          amount: share
        });
        
      } else if (paidAmount < share) {
            // Add entry for their share
      expenseEntries.push({
        userId: userId,
        paidToUser: userId,
        amount: paidAmount // Use their share, not their contribution
      });
      }else if (paidAmount === share) {
        expenseEntries.push({
          userId: userId,
          paidToUser: userId,
          amount: paidAmount
        });
      }

    });

    console.log("Expense entries for contributors:", expenseEntries);

    // 3b. Calculate who owes whom
    let balances = {};
    allUserIds.forEach(userId => {
      const paid = contributorMap.get(userId)?.amount || 0;
      const share = userShares[userId] || 0;
      balances[userId] = Number(paid) - share;
    });
    console.log("User balances:", balances);

    // 3c. Create entries for repayments
    let debtors = [];
    let creditors = [];
    
    Object.entries(balances).forEach(([userId, balance]) => {
      if (balance < 0) {
        debtors.push({ userId: Number(userId), amount: -balance });
      } else if (balance > 0) {
        creditors.push({ userId: Number(userId), amount: balance });
      }
    });

    // Sort by amount to settle larger debts first
    debtors.sort((a, b) => b.amount - a.amount);
    creditors.sort((a, b) => b.amount - a.amount);

    // Create repayment entries
    let i = 0, j = 0;
    while (i < debtors.length && j < creditors.length) {
      const debtor = debtors[i];
      const creditor = creditors[j];
      const settleAmount = Math.min(debtor.amount, creditor.amount);

      if (settleAmount > 0) {
        expenseEntries.push({
          userId: debtor.userId,
          paidToUser: creditor.userId,
          amount: settleAmount
        });
      }

      debtor.amount -= settleAmount;
      creditor.amount -= settleAmount;

      if (debtor.amount === 0) i++;
      if (creditor.amount === 0) j++;
    }

    // Step 4: Validate that sum of all amounts equals total expense amount
    const totalAmount = expenseEntries.reduce((sum, entry) => sum + entry.amount, 0);
    if (Math.abs(totalAmount - amount) > 0.01) {
      throw new Error(`Sum of expense entries (${totalAmount}) does not equal total amount (${amount})`);
    }

    console.log("Final expense entries:", expenseEntries);

    // Create the expense
    const expense = await client.query(
      `INSERT INTO expenses (description, currency, amount, group_id, split_method, created_by)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [description, currency, amount, group_id, split_method, created_by]
    );

    // Create the expense entries in database
    const dbEntries = await Promise.all(expenseEntries.map(entry => {
      // Get the counter value based on split method
      let counter = 0;
      if (split_method === 'parts' || split_method === 'percentage') {
        // Find the original split entry to get the counter value
        const originalSplit = splits.find(s => s.userId === entry.userId);
        counter = originalSplit ? Number(originalSplit.counter || 0) : 0;
      }

      return client.query(
        `INSERT INTO expense_users (expense_id, user_id, paid_to_user, share, counter)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [expense.rows[0].id, entry.userId, entry.paidToUser, entry.amount, counter]
      );
    }));
    try {
      await client.query('COMMIT');
      const result = {
        ...expense.rows[0],
        splits: dbEntries.map(entry => entry.rows[0])
      };
      expenseEntries = null; // Clear large array
      return result;
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  };


  static async addSplit(client, expenseId, userId, paidToUser, share) {
    const split = await client.query(
      `INSERT INTO expense_users (expense_id, user_id, paid_to_user, share)
             VALUES ($1, $2, $3, $4)`,
      [expenseId, userId, paidToUser, share]
    );
    console.log("Split added:", split, split.rows[0]);
    return split.rows[0];
  }

  // Method to get all expenses
  static async getAll(client) {
    const res = await client.query(
      `SELECT e.id, e.description, e.currency, e.amount, e.group_id, e.split_method, e.paid_by_user, e.image_url, e.created_by, e.created_at,
                    json_agg(
                        json_build_object(
                            'user_id', eu.user_id,
                            'paid_to_user', eu.paid_to_user,
                            'share', eu.share
                        )
                    ) AS splits
             FROM expenses e
             LEFT JOIN expense_users eu ON e.id = eu.expense_id
             WHERE e.flag = FALSE AND e.delete_flag = FALSE
             GROUP BY e.id`
    );

    return res.rows.map((row) => ({
      id: row.id,
      description: row.description,
      currency: row.currency,
      amount: row.amount,
      groupId: row.group_id,
      splitMethod: row.split_method,
      paidByUser: row.paid_by_user,
      image: row.image_url,
      createdBy: row.created_by,
      createdAt: row.created_at,
      splits: row.splits || [],
    }));
  }

  /**
   * Settle up all expenses between two users.
   * @param {Object} client - The database client.
   * @param {Number} userId - The ID of the user initiating the settlement.
   * @param {Number} otherUserId - The ID of the other user involved in the settlement.
   */
  static async settleUp(client, userId, otherUserId) {
    try {
      // Mark all relevant entries in the expense_users table as settled (flag = true)
      await client.query(
        `UPDATE expense_users
                 SET flag = true
                 WHERE (user_id = $1 AND paid_to_user = $2)
                    OR (user_id = $2 AND paid_to_user = $1)`,
        [userId, otherUserId]
      );

      // Check if all entries for each expense in expense_users are settled
      const expensesToUpdate = await client.query(
        `SELECT e.id
                 FROM expenses e
                 LEFT JOIN expense_users eu ON e.id = eu.expense_id
                 WHERE eu.flag = false
                 GROUP BY e.id
                 HAVING COUNT(eu.id) = 0`
      );

      // Mark the corresponding expenses as settled (flag = true)
      const expenseIds = expensesToUpdate.rows.map((row) => row.id);
      if (expenseIds.length > 0) {
        await client.query(
          `UPDATE expenses
                     SET flag = true
                     WHERE id = ANY($1::int[])`,
          [expenseIds]
        );
      }

      return { message: "Expenses settled successfully." };
    } catch (error) {
      console.error("Error settling up expenses:", error);
      throw new Error("Error settling up expenses.");
    }
  }

  /**
   * Retrieves all unsettled expenses for a given user.
   * @param {Object} client - The database client.
   * @param {Number} userId - The ID of the user whose unsettled expenses to fetch.
   * @returns {Promise<Object[]>} A promise that resolves to an array of unsettled expenses.
   *  Each expense is an object with the following properties:
   *  - expense_id (Number)
   *  - description (String)
   *  - currency (String)
   *  - amount (Number)
   *  - groupId (Number|null)
   *  - splitMethod (String)
   *  - paidByUser (Number)
   *  - image (String|null)
   *  - createdBy (Number)
   *  - splits (Object[])
   *    - user_id (Number)
   *    - paid_to_user (Number)
   *    - share (Number)
   */
  static async getUnsettledExpenses(client, userId) {
    const res = await client.query(
      `SELECT e.id, e.description, e.currency, e.amount, e.group_id, e.split_method, e.paid_by_user, e.image_url, e.created_by,
                    json_agg(
                        json_build_object(
                            'user_id', eu.user_id,
                            'paid_to_user', eu.paid_to_user,
                            'share', eu.share
                        )
                    ) AS splits
             FROM expenses e
             LEFT JOIN expense_users eu ON e.id = eu.expense_id
             WHERE (eu.user_id = $1 OR eu.paid_to_user = $1) AND eu.flag = false and e.delete_flag = false
             GROUP BY e.id`,
      [userId]
    );

    return res.rows.map((row) => ({
      expense_id: row.id,
      description: row.description,
      currency: row.currency,
      amount: row.amount,
      groupId: row.group_id,
      splitMethod: row.split_method,
      paidByUser: row.paid_by_user,
      image: row.image_url ? true : false, // TODO: check if image is present ,
      createdBy: row.created_by,
      splits: row.splits || [],
    }));
  }

  static async getUnsettledExpensesAfterDate(client, userId, date) {
    const res = await client.query(
      `SELECT e.id, e.description, e.currency, e.amount, e.group_id, e.split_method, e.paid_by_user, e.image_url, e.created_by,
                        json_agg(
                            json_build_object(
                                'user_id', eu.user_id,
                                'paid_to_user', eu.paid_to_user,
                                'share', eu.share
                            )
                        ) AS splits
                 FROM expenses e
                 LEFT JOIN expense_users eu ON e.id = eu.expense_id
                 WHERE (eu.user_id = $1 OR eu.paid_to_user = $1) AND eu.flag = false and e.delete_flag = false and (e.created_at > $1 or e.updated_at > $1 or e.updated_at or eu.created_at > $1 or eu.updated_at > $1) 
                 GROUP BY e.id`,
      [userId, date]
    );

    return res.rows.map((row) => ({
      expense_id: row.id,
      description: row.description,
      currency: row.currency,
      amount: row.amount,
      groupId: row.group_id,
      splitMethod: row.split_method,
      paidByUser: row.paid_by_user,
      image: row.image_url ? true : false, // TODO: check if image is present
      createdBy: row.created_by,
      splits: row.splits || [],
    }));
  }

  // Validate split method specific requirements
  static validateSplitMethod(split_method, splits, amount) {
    switch (split_method) {
      case 'equal':
        return this.validateEqualSplit(splits, amount);
      case 'parts':
        return this.validatePartsSplit(splits, amount);
      case 'percentage':
        return this.validatePercentageSplit(splits, amount);
      case 'custom':
        return this.validateCustomSplit(splits, amount);
      default:
        throw new Error(`Invalid split method: ${split_method}`);
    }
  }

  // Add retry logic for database operations
  static async withRetry(operation, maxRetries = 3) {
    for (let i = 0; i < maxRetries; i++) {
      try {
        return await operation();
      } catch (error) {
        if (i === maxRetries - 1) throw error;
        await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, i)));
      }
    }
  }

  /**
   * Gets expense data in the same format as create method input, including primary keys
   * @param {Object} client - Database client
   * @param {number} expenseId - ID of the expense to retrieve
   * @returns {Promise<Object>} Expense data in create method format
   */
  static async getExpenseForEdit(client, expenseId) {
    // Get expense and all related entries
    const res = await client.query(
      `SELECT 
        e.id,
        e.description,
        e.currency,
        e.amount,
        e.group_id,
        e.split_method,
        e.image_url,
        e.created_by,
        json_agg(
          json_build_object(
            'id', eu.id,
            'userId', eu.user_id,
            'paidToUser', eu.paid_to_user,
            'amount', eu.share,
            'counter', eu.counter
          )
        ) as entries
      FROM expenses e
      LEFT JOIN expense_users eu ON e.id = eu.expense_id
      WHERE e.id = $1 AND e.delete_flag = FALSE and e.flag = false
      GROUP BY e.id`,
      [expenseId]
    );

    if (res.rows.length === 0) {
      throw new Error('Expense not found');
    }

    const expense = res.rows[0];
    const entries = expense.entries || [];

    // Separate contributors and splits
    const contributors = [];
    const splits = [];
    const seenUsers = new Set();

    entries.forEach(entry => {
      // If this is a self-paid entry (userId === paidToUser), it's a contributor
      if (entry.userId === entry.paidToUser) {
        // Only add each contributor once
        if (!seenUsers.has(entry.userId)) {
          contributors.push({
            id: entry.id,
            userId: entry.userId,
            amount: entry.amount
          });
          seenUsers.add(entry.userId);
        }
      } else {
        // This is a split entry
        splits.push({
          id: entry.id,
          userId: entry.userId,
          amount: entry.amount,
          counter: entry.counter
        });
      }
    });

    // Format the response to match create method input
    return {
      id: expense.id,
      description: expense.description,
      currency: expense.currency,
      amount: expense.amount,
      group_id: expense.group_id,
      split_method: expense.split_method,
      image: expense.image_url,
      created_by: expense.created_by,
      contributors: contributors,
      splits: splits
    };
  }

  /**
   * Gets multiple expenses in the same format as create method input
   * @param {Object} client - Database client
   * @param {number} groupId - Optional group ID to filter expenses
   * @returns {Promise<Array<Object>>} Array of expense data in create method format
   */
  static async getExpensesForEdit(client, groupId = null) {
    const query = `
      SELECT 
        e.id,
        e.description,
        e.currency,
        e.amount,
        e.group_id,
        e.split_method,
        e.image_url,
        e.created_by,
        json_agg(
          json_build_object(
            'id', eu.id,
            'userId', eu.user_id,
            'paidToUser', eu.paid_to_user,
            'amount', eu.share,
            'counter', eu.counter
          )
        ) as entries
      FROM expenses e
      LEFT JOIN expense_users eu ON e.id = eu.expense_id
      WHERE e.delete_flag = FALSE and e.flag = false
      ${groupId ? 'AND e.group_id = $1' : ''}
      GROUP BY e.id
      ORDER BY e.created_at DESC`;

    const res = await client.query(
      query,
      groupId ? [groupId] : []
    );

    return res.rows.map(expense => {
      const entries = expense.entries || [];
      const contributors = [];
      const splits = [];
      const seenUsers = new Set();

      entries.forEach(entry => {
        if (entry.userId === entry.paidToUser) {
          if (!seenUsers.has(entry.userId)) {
            contributors.push({
              id: entry.id,
              userId: entry.userId,
              amount: entry.amount
            });
            seenUsers.add(entry.userId);
          }
        } else {
          splits.push({
            id: entry.id,
            userId: entry.userId,
            amount: entry.amount,
            counter: entry.counter
          });
        }
      });

      return {
        id: expense.id,
        description: expense.description,
        currency: expense.currency,
        amount: expense.amount,
        group_id: expense.group_id,
        split_method: expense.split_method,
        image: expense.image_url,
        created_by: expense.created_by,
        contributors: contributors,
        splits: splits
      };
    });
  }

  /**
   * Gets expenses for multiple groups and organizes them by group ID
   * @param {Object} client - Database client
   * @param {Array<number>} groupIds - Array of group IDs to fetch expenses for
   * @returns {Promise<Object>} Object with group IDs as keys and arrays of expenses as values
   */
  static async getExpensesByGroups(client, groupIds) {
    if (!Array.isArray(groupIds) || groupIds.length === 0) {
      throw new Error('At least one group ID is required');
    }

    const query = `
      SELECT 
        e.id,
        e.description,
        e.currency,
        e.amount,
        e.group_id,
        e.split_method,
        e.image_url,
        e.created_by,
        e.created_at,
        json_agg(
          json_build_object(
            'id', eu.id,
            'userId', eu.user_id,
            'paidToUser', eu.paid_to_user,
            'amount', eu.share,
            'counter', eu.counter
          )
        ) as entries
      FROM expenses e
      LEFT JOIN expense_users eu ON e.id = eu.expense_id
      WHERE e.delete_flag = FALSE 
      AND e.flag = false
      AND e.group_id = ANY($1)
      GROUP BY e.id
      ORDER BY e.created_at DESC`;

    const res = await client.query(query, [groupIds]);

    // Initialize result object with empty arrays for each group
    const result = groupIds.reduce((acc, groupId) => {
      acc[groupId] = [];
      return acc;
    }, {});

    // Process each expense and add it to the appropriate group
    res.rows.forEach(expense => {
      const entries = expense.entries || [];
      const contributors = [];
      const splits = [];
      const seenUsers = new Set();

      entries.forEach(entry => {
        if (entry.userId === entry.paidToUser) {
          if (!seenUsers.has(entry.userId)) {
            contributors.push({
              id: entry.id,
              userId: entry.userId,
              amount: entry.amount
            });
            seenUsers.add(entry.userId);
          }
        } else {
          splits.push({
            id: entry.id,
            userId: entry.userId,
            amount: entry.amount,
            counter: entry.counter
          });
        }
      });

      const formattedExpense = {
        id: expense.id,
        description: expense.description,
        currency: expense.currency,
        amount: expense.amount,
        group_id: expense.group_id,
        split_method: expense.split_method,
        image: expense.image_url,
        created_by: expense.created_by,
        created_at: expense.created_at,
        contributors: contributors,
        splits: splits
      };

      // Add the expense to its group's array
      result[expense.group_id].push(formattedExpense);
    });

    return result;
  }
}

module.exports = {
  Expense,
};