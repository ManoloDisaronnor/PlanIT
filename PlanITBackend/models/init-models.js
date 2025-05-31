var DataTypes = require("sequelize").DataTypes;
var _event = require("./event");
var _eventImages = require("./eventImages");
var _eventsFilter = require("./eventsFilter");
var _filter = require("./filter");
var _friends = require("./friends");
var _groupInvitedToEvent = require("./groupInvitedToEvent");
var _groupMember = require("./groupMember");
var _groups = require("./groups");
var _message = require("./message");
var _messagesUser = require("./messagesUser");
var _notification = require("./notification");
var _user = require("./user");
var _userJoinedToEvent = require("./userJoinedToEvent");
var _userNotification = require("./userNotification");

function initModels(sequelize) {
  var event = _event(sequelize, DataTypes);
  var eventImages = _eventImages(sequelize, DataTypes);
  var eventsFilter = _eventsFilter(sequelize, DataTypes);
  var filter = _filter(sequelize, DataTypes);
  var friends = _friends(sequelize, DataTypes);
  var groupInvitedToEvent = _groupInvitedToEvent(sequelize, DataTypes);
  var groupMember = _groupMember(sequelize, DataTypes);
  var groups = _groups(sequelize, DataTypes);
  var message = _message(sequelize, DataTypes);
  var messagesUser = _messagesUser(sequelize, DataTypes);
  var notification = _notification(sequelize, DataTypes);
  var user = _user(sequelize, DataTypes);
  var userJoinedToEvent = _userJoinedToEvent(sequelize, DataTypes);
  var userNotification = _userNotification(sequelize, DataTypes);

  event.belongsToMany(filter, { as: 'filters_filters', through: eventsFilter, foreignKey: "event", otherKey: "filters" });
  event.belongsToMany(groups, { as: 'groups_groups', through: groupInvitedToEvent, foreignKey: "event", otherKey: "groups" });
  event.belongsToMany(user, { as: 'participant_users', through: userJoinedToEvent, foreignKey: "event", otherKey: "participant" });
  filter.belongsToMany(event, { as: 'event_events', through: eventsFilter, foreignKey: "filters", otherKey: "event" });
  groups.belongsToMany(event, { as: 'event_event_group_invited_to_events', through: groupInvitedToEvent, foreignKey: "groups", otherKey: "event" });
  message.belongsToMany(user, { as: 'user_users', through: messagesUser, foreignKey: "message", otherKey: "user" });
  user.belongsToMany(event, { as: 'event_event_user_joined_to_events', through: userJoinedToEvent, foreignKey: "participant", otherKey: "event" });
  user.belongsToMany(message, { as: 'message_messages', through: messagesUser, foreignKey: "user", otherKey: "message" });
  eventImages.belongsTo(event, { as: "event_event", foreignKey: "event"});
  event.hasMany(eventImages, { as: "event_images", foreignKey: "event"});
  eventsFilter.belongsTo(event, { as: "event_event", foreignKey: "event"});
  event.hasMany(eventsFilter, { as: "events_filters", foreignKey: "event"});
  groupInvitedToEvent.belongsTo(event, { as: "event_event", foreignKey: "event"});
  event.hasMany(groupInvitedToEvent, { as: "group_invited_to_events", foreignKey: "event"});
  userJoinedToEvent.belongsTo(event, { as: "event_event", foreignKey: "event"});
  event.hasMany(userJoinedToEvent, { as: "user_joined_to_events", foreignKey: "event"});
  eventsFilter.belongsTo(filter, { as: "filters_filter", foreignKey: "filters"});
  filter.hasMany(eventsFilter, { as: "events_filters", foreignKey: "filters"});
  groupInvitedToEvent.belongsTo(groups, { as: "groups_group", foreignKey: "groups"});
  groups.hasMany(groupInvitedToEvent, { as: "group_invited_to_events", foreignKey: "groups"});
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
  event.belongsTo(user, { as: "founder_user", foreignKey: "founder"});
  user.hasMany(event, { as: "events", foreignKey: "founder"});
  eventImages.belongsTo(user, { as: "userUploaded_user", foreignKey: "userUploaded"});
  user.hasMany(eventImages, { as: "event_images", foreignKey: "userUploaded"});
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
  userJoinedToEvent.belongsTo(user, { as: "participant_user", foreignKey: "participant"});
  user.hasMany(userJoinedToEvent, { as: "user_joined_to_events", foreignKey: "participant"});
  userNotification.belongsTo(user, { as: "user_user", foreignKey: "user"});
  user.hasMany(userNotification, { as: "user_notifications", foreignKey: "user"});

  return {
    event,
    eventImages,
    eventsFilter,
    filter,
    friends,
    groupInvitedToEvent,
    groupMember,
    groups,
    message,
    messagesUser,
    notification,
    user,
    userJoinedToEvent,
    userNotification,
  };
}
module.exports = initModels;
module.exports.initModels = initModels;
module.exports.default = initModels;
