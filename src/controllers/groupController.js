const { pool } = require("../db");
const { Group } = require("../models/Groups");
const logger = require("../middleware/logger");
const i18n = req.__ ? req : require("../i18n/i18n");
// Create a group
const createGroup = async (req, res) => {
  const { name, currency, created_by } = req.body;
  try {
    const group = await Group.create(pool, name, currency, created_by);
    logger.info(`Group created: ${name}`);
    res.status(201).json(group);
  } catch (error) {
    logger.error(
      req.__("errors.create_group_error") || "Error creating group",
      { error }
    );
    res
      .status(500)
      .json({ error: req.__("errors.create_group_error") || "Error creating group" });
  }
};

// Add a user to a group
const addUserToGroup = async (req, res) => {
  const { groupId } = req.params;
  const { userId, created_by } = req.body;

  if (!groupId || !userId) {
    return res
      .status(400)
      .json({ error: req.__("errors.missing_group_or_user") });
  }

  try {
    // Use the Group model to add the user to the group
    await Group.addUser(pool, groupId, userId, created_by);
    res.status(201).json({ message: req.__("messages.user_added_to_group") });
  } catch (error) {
    console.error("Error adding user to group:", error);
    res.status(500).json({ error: req.__("errors.add_user_to_group_error") });
  }
};

// Upload a group image
const uploadGroupImage = async (req, res) => {
  const { groupId } = req.params;
  const { image_url } = req.body;
  try {
    const groupImage = await Group.addImage(pool, groupId, image_url);
    logger.info(`Image uploaded for groupId=${groupId}`);
    res.status(201).json(groupImage);
  } catch (error) {
    logger.error(req.__("errors.upload_group_image_error"), { error });
    res.status(500).json({ error: req.__("errors.upload_group_image_error") });
  }
};

// Fetch all images for a group
const getGroupImages = async (req, res) => {
  const { groupId } = req.params;
  try {
    const images = await Group.getImages(pool, groupId);
    logger.info(`Fetched images for groupId=${groupId}`);
    res.status(200).json(images);
  } catch (error) {
    logger.error(
      req.__("errors.fetch_group_images_error") || "Error fetching group images",
      { error }
    );
    res
      .status(500)
      .json({ error: req.__("errors.fetch_group_images_error") || "Error fetching group images" });
  }
};

// Delete a user from a group
const deleteUserFromGroup = async (req, res) => {
  const { groupId, userId } = req.params;
  if (!groupId || !userId) {
    logger.warn(req.__("errors.missing_group_or_user"));
    return res.status(400).json({ error: req.__("errors.missing_group_or_user") });
  }
  try {
    const hasOpenExpenses = await Group.hasOpenExpenses(pool, groupId, userId);
    if (hasOpenExpenses) {
      logger.warn(req.__("errors.user_has_open_expenses"));
      return res.status(400).json({ error: req.__("errors.user_has_open_expenses") });
    }
    await Group.deleteUserFromGroup(pool, groupId, userId);
    logger.info(`User ${userId} deleted from group ${groupId}`);
    res.status(200).json({ message: req.__("messages.user_deleted_from_group") });
  } catch (error) {
    logger.error(req.__("errors.delete_user_from_group_error"), { error });
    res.status(500).json({ error: req.__("errors.delete_user_from_group_error") });
  }
};

const getUserGroups = async (req, res) => {
  const { userId } = req.params;
  try {
    logger.info(req.__("messages.fetching_groups", { userId }));
    const groups = await Group.getUserGroups(pool, userId);
    res.status(200).json(groups);
  } catch (error) {
    logger.error(
      req.__("errors.fetch_user_groups_error") + ` (${userId}): ${error.message}`
    );
    res.status(500).json({ error: req.__("errors.fetch_user_groups_error") });
  }
};

module.exports = {
  createGroup,
  addUserToGroup,
  uploadGroupImage,
  getGroupImages,
  deleteUserFromGroup,
  getUserGroups,
};
