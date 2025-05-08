const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('message', {
    id: {
      type: DataTypes.STRING(28),
      allowNull: false,
      primaryKey: true
    },
    type: {
      type: DataTypes.BLOB,
      allowNull: false
    },
    content: {
      type: DataTypes.STRING(1500),
      allowNull: false
    },
    user: {
      type: DataTypes.STRING(28),
      allowNull: false,
      references: {
        model: 'user',
        key: 'uid'
      }
    },
    groups: {
      type: DataTypes.STRING(28),
      allowNull: false,
      references: {
        model: 'groups',
        key: 'id'
      }
    },
    datetime: {
      type: DataTypes.DATE,
      allowNull: false
    }
  }, {
    sequelize,
    tableName: 'message',
    timestamps: false,
    indexes: [
      {
        name: "FK1_user_message",
        using: "BTREE",
        fields: [
          { name: "user" },
        ]
      },
      {
        name: "FK2_group_message",
        using: "BTREE",
        fields: [
          { name: "groups" },
        ]
      },
    ]
  });
};
