const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('groupMember', {
    user: {
      type: DataTypes.STRING(28),
      allowNull: false,
      primaryKey: true,
      references: {
        model: 'user',
        key: 'uid'
      }
    },
    groups: {
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true,
      references: {
        model: 'groups',
        key: 'id'
      }
    },
    admin: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    joined: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    date: {
      type: DataTypes.DATE,
      allowNull: false
    }
  }, {
    sequelize,
    tableName: 'group_member',
    timestamps: false,
    indexes: [
      {
        name: "PRIMARY",
        unique: true,
        using: "BTREE",
        fields: [
          { name: "user" },
          { name: "groups" },
        ]
      },
      {
        name: "FK2_group",
        using: "BTREE",
        fields: [
          { name: "groups" },
        ]
      },
    ]
  });
};
