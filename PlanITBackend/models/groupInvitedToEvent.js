const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('groupInvitedToEvent', {
    event: {
      type: DataTypes.STRING(28),
      allowNull: false,
      primaryKey: true,
      references: {
        model: 'event',
        key: 'id'
      }
    },
    groups: {
      type: DataTypes.STRING(28),
      allowNull: false,
      primaryKey: true,
      references: {
        model: 'groups',
        key: 'id'
      }
    }
  }, {
    sequelize,
    tableName: 'group_invited_to_event',
    timestamps: false,
    indexes: [
      {
        name: "PRIMARY",
        unique: true,
        using: "BTREE",
        fields: [
          { name: "event" },
          { name: "groups" },
        ]
      },
      {
        name: "FK2_event_groups",
        using: "BTREE",
        fields: [
          { name: "groups" },
        ]
      },
    ]
  });
};
