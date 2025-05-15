var DataTypes = require("sequelize").DataTypes;
var _friends = require("./friends");
var _groupMember = require("./groupMember");
var _groups = require("./groups");
var _message = require("./message");
var _messagesUser = require("./messagesUser");
var _notification = require("./notification");
var _user = require("./user");
var _userNotification = require("./userNotification");

function initModels(sequelize) {
  var friends = _friends(sequelize, DataTypes);
  var groupMember = _groupMember(sequelize, DataTypes);
  var groups = _groups(sequelize, DataTypes);
  var message = _message(sequelize, DataTypes);
  var messagesUser = _messagesUser(sequelize, DataTypes);
  var notification = _notification(sequelize, DataTypes);
  var user = _user(sequelize, DataTypes);
  var userNotification = _userNotification(sequelize, DataTypes);

  message.belongsToMany(user, { as: 'user_users', through: messagesUser, foreignKey: "message", otherKey: "user" });
  user.belongsToMany(message, { as: 'message_messages', through: messagesUser, foreignKey: "user", otherKey: "message" });
  groupMember.belongsTo(groups, { as: "groups_group", foreignKey: "groups"});
  groups.hasMany(groupMember, { as: "group_members", foreignKey: "groups"});
  message.belongsTo(groups, { as: "groups_group", foreignKey: "groups"});
  groups.hasMany(message, { as: "messages", foreignKey: "groups"});
  message.belongsTo(message, { as: "reference_message", foreignKey: "reference"});
  message.hasMany(message, { as: "messages", foreignKey: "reference"});
  messagesUser.belongsTo(message, { as: "message_message", foreignKey: "message"});
  message.hasMany(messagesUser, { as: "messages_users", foreignKey: "message"});
  userNotification.belongsTo(notification, { as: "notification_notification", foreignKey: "notification"});
  notification.hasMany(userNotification, { as: "user_notifications", foreignKey: "notification"});
  friends.belongsTo(user, { as: "user_send_user", foreignKey: "user_send"});
  user.hasMany(friends, { as: "friends", foreignKey: "user_send"});
  friends.belongsTo(user, { as: "user_requested_user", foreignKey: "user_requested"});
  user.hasMany(friends, { as: "user_requested_friends", foreignKey: "user_requested"});
  groupMember.belongsTo(user, { as: "user_user", foreignKey: "user"});
  user.hasMany(groupMember, { as: "group_members", foreignKey: "user"});
  message.belongsTo(user, { as: "user_user", foreignKey: "user"});
  user.hasMany(message, { as: "messages", foreignKey: "user"});
  messagesUser.belongsTo(user, { as: "user_user", foreignKey: "user"});
  user.hasMany(messagesUser, { as: "messages_users", foreignKey: "user"});
  userNotification.belongsTo(user, { as: "user_user", foreignKey: "user"});
  user.hasMany(userNotification, { as: "user_notifications", foreignKey: "user"});

  return {
    friends,
    groupMember,
    groups,
    message,
    messagesUser,
    notification,
    user,
    userNotification,
  };
}
module.exports = initModels;
module.exports.initModels = initModels;
module.exports.default = initModels;
